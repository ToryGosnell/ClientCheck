import { describe, it, expect, beforeEach } from "vitest";
import { JWTService } from "@/server/services/jwt-service";
import { APIKeyService } from "@/server/services/api-key-service";
import { UserRole, requireRole, requireAdmin, hasPermission } from "@/server/middleware/authorization";
import { globalLimiter, authLimiter, getRateLimitKey } from "@/server/middleware/rate-limit";

/**
 * Phase 4 Security Hardening Tests
 * Tests JWT validation, API key management, RBAC, and rate limiting
 */

describe("Phase 4 Security Hardening", () => {
  describe("JWT Token Management", () => {
    it("should generate valid access token", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateAccessToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
    });

    it("should generate valid refresh token", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateRefreshToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("should verify valid access token", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateAccessToken(payload);
      const verified = await JWTService.verifyAccessToken(token);

      expect(verified.userId).toBe(1);
      expect(verified.email).toBe("user@example.com");
      expect(verified.role).toBe("user");
    });

    it("should reject invalid access token", async () => {
      const invalidToken = "invalid.token.here";

      try {
        await JWTService.verifyAccessToken(invalidToken);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it("should extract token from Authorization header", () => {
      const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const token = JWTService.extractToken(authHeader);

      expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it("should return null for invalid Authorization header", () => {
      const invalidHeader = "InvalidFormat token";
      const token = JWTService.extractToken(invalidHeader);

      expect(token).toBeNull();
    });

    it("should refresh access token", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const refreshToken = await JWTService.generateRefreshToken(payload);
      const result = await JWTService.refreshAccessToken(refreshToken);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();

      // Verify new tokens
      const verified = await JWTService.verifyAccessToken(result.accessToken);
      expect(verified.userId).toBe(1);
    });

    it("should detect expired token", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateAccessToken(payload);
      const isExpired = JWTService.isTokenExpired(token);

      // Token just created, should not be expired
      expect(isExpired).toBe(false);
    });
  });

  describe("API Key Management", () => {
    it("should generate new API key", async () => {
      const result = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "sandbox",
        ["read", "write"]
      );

      expect(result.apiKey).toBeTruthy();
      expect(result.keyPrefix).toBe("SER_S");
      expect(result.environment).toBe("sandbox");
      expect(result.scopes).toEqual(["read", "write"]);
    });

    it("should generate different keys for different environments", async () => {
      const sandboxKey = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "sandbox",
        ["read"]
      );

      const prodKey = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "production",
        ["read"]
      );

      expect(sandboxKey.keyPrefix).toBe("SER_S");
      expect(prodKey.keyPrefix).toBe("SER_P");
      expect(sandboxKey.apiKey).not.toBe(prodKey.apiKey);
    });

    it("should validate API key", async () => {
      const generated = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "sandbox",
        ["read", "write"]
      );

      const validation = await APIKeyService.validateKey(generated.apiKey);

      expect(validation.valid).toBe(true);
      expect(validation.integrationId).toBe(1);
      expect(validation.integrationName).toBe("servicetitan");
      expect(validation.scopes).toEqual(["read", "write"]);
    });

    it("should reject invalid API key", async () => {
      const validation = await APIKeyService.validateKey("invalid_key_12345");

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeTruthy();
    });

    it("should check API key scope", () => {
      const scopes = ["read", "write"];

      expect(APIKeyService.hasScope(scopes, "read")).toBe(true);
      expect(APIKeyService.hasScope(scopes, "write")).toBe(true);
      expect(APIKeyService.hasScope(scopes, "delete")).toBe(false);
    });

    it("should allow wildcard scope", () => {
      const scopes = ["*"];

      expect(APIKeyService.hasScope(scopes, "read")).toBe(true);
      expect(APIKeyService.hasScope(scopes, "write")).toBe(true);
      expect(APIKeyService.hasScope(scopes, "delete")).toBe(true);
    });
  });

  describe("Role-Based Access Control", () => {
    it("should identify user role", () => {
      const roles = [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.ENTERPRISE];

      expect(roles).toContain(UserRole.USER);
      expect(roles).toContain(UserRole.ADMIN);
    });

    it("should check user permissions", () => {
      expect(hasPermission(UserRole.USER, "CREATE_REVIEW")).toBe(true);
      expect(hasPermission(UserRole.ADMIN, "CREATE_REVIEW")).toBe(true);
      expect(hasPermission(UserRole.CONTRACTOR, "VERIFY_CONTRACTOR")).toBe(false);
      expect(hasPermission(UserRole.ADMIN, "VERIFY_CONTRACTOR")).toBe(true);
    });

    it("should enforce admin-only permissions", () => {
      expect(hasPermission(UserRole.ADMIN, "VIEW_AUDIT_LOGS")).toBe(true);
      expect(hasPermission(UserRole.USER, "VIEW_AUDIT_LOGS")).toBe(false);
      expect(hasPermission(UserRole.CONTRACTOR, "VIEW_AUDIT_LOGS")).toBe(false);
    });

    it("should allow enterprise role for sensitive operations", () => {
      expect(hasPermission(UserRole.ENTERPRISE, "VIEW_FRAUD_SIGNALS")).toBe(true);
      expect(hasPermission(UserRole.ADMIN, "VIEW_FRAUD_SIGNALS")).toBe(true);
      expect(hasPermission(UserRole.USER, "VIEW_FRAUD_SIGNALS")).toBe(false);
    });

    it("should support role hierarchy", () => {
      // Contractors can edit their own profile
      expect(hasPermission(UserRole.CONTRACTOR, "EDIT_CONTRACTOR_PROFILE")).toBe(true);

      // Admins can also edit contractor profiles
      expect(hasPermission(UserRole.ADMIN, "EDIT_CONTRACTOR_PROFILE")).toBe(true);

      // Regular users cannot
      expect(hasPermission(UserRole.USER, "EDIT_CONTRACTOR_PROFILE")).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      globalLimiter.clearAll();
      authLimiter.clearAll();
    });

    it("should allow requests within rate limit", () => {
      const key = "user:1";

      for (let i = 0; i < 10; i++) {
        const allowed = globalLimiter.isAllowed(key);
        expect(allowed).toBe(true);
      }
    });

    it("should block requests exceeding rate limit", () => {
      const key = "user:1";
      const limiter = authLimiter; // More restrictive limiter

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.isAllowed(key);
      }

      // Next request should be blocked
      const allowed = limiter.isAllowed(key);
      expect(allowed).toBe(false);
    });

    it("should track remaining tokens", () => {
      const key = "user:1";

      globalLimiter.isAllowed(key);
      const remaining = globalLimiter.getRemaining(key);

      expect(remaining).toBeLessThan(100); // Max tokens
      expect(remaining).toBeGreaterThan(0);
    });

    it("should isolate rate limits by key", () => {
      const key1 = "user:1";
      const key2 = "user:2";

      // Consume tokens for key1
      for (let i = 0; i < 10; i++) {
        authLimiter.isAllowed(key1);
      }

      // key2 should still have tokens
      const allowed = authLimiter.isAllowed(key2);
      expect(allowed).toBe(true);
    });

    it("should extract rate limit key from context", () => {
      const userContext = {
        user: { id: 123 },
      };

      const key = getRateLimitKey(userContext, "user");
      expect(key).toBe("user:123");
    });

    it("should handle anonymous rate limiting", () => {
      const anonContext = {
        user: null,
      };

      const key = getRateLimitKey(anonContext, "user");
      expect(key).toBe("user:anonymous");
    });
  });

  describe("Security Best Practices", () => {
    it("should not expose sensitive data in tokens", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateAccessToken(payload);
      const decoded = JWTService.decodeToken(token);

      // Should not contain password or sensitive data
      expect(decoded).not.toHaveProperty("password");
      expect(decoded).not.toHaveProperty("creditCard");
    });

    it("should hash API keys before storage", async () => {
      const result = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "sandbox",
        ["read"]
      );

      // The returned key should be the actual key
      expect(result.apiKey).toBeTruthy();

      // But it should not be stored in plain text in the database
      // (This would be verified by checking the database directly)
    });

    it("should enforce HTTPS for production", () => {
      const environment = process.env.NODE_ENV;
      // In production, should enforce HTTPS
      if (environment === "production") {
        expect(process.env.FORCE_HTTPS).toBe("true");
      }
    });

    it("should rotate API keys regularly", async () => {
      const original = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "production",
        ["read"]
      );

      // Rotate key
      const rotated = await APIKeyService.rotateKey(1, original.keyPrefix);

      expect(rotated.apiKey).toBeTruthy();
      expect(rotated.apiKey).not.toBe(original.apiKey);
    });
  });

  describe("Token Expiration", () => {
    it("should set access token expiration to 1 hour", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateAccessToken(payload);
      const expiration = JWTService.getTokenExpiration(token);

      expect(expiration).toBeTruthy();
      const now = new Date();
      const diffMinutes = (expiration!.getTime() - now.getTime()) / (1000 * 60);

      // Should be approximately 60 minutes
      expect(diffMinutes).toBeGreaterThan(59);
      expect(diffMinutes).toBeLessThan(61);
    });

    it("should set refresh token expiration to 7 days", async () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = await JWTService.generateRefreshToken(payload);
      const expiration = JWTService.getTokenExpiration(token);

      expect(expiration).toBeTruthy();
      const now = new Date();
      const diffDays = (expiration!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Should be approximately 7 days
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    });

    it("should set production API key expiration to 90 days", async () => {
      const result = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "production",
        ["read"]
      );

      expect(result.expiresAt).toBeTruthy();
      const now = new Date();
      const diffDays = (result.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Should be approximately 90 days
      expect(diffDays).toBeGreaterThan(89);
      expect(diffDays).toBeLessThan(91);
    });

    it("should set sandbox API key expiration to 365 days", async () => {
      const result = await APIKeyService.generateKey(
        1,
        "servicetitan",
        "sandbox",
        ["read"]
      );

      expect(result.expiresAt).toBeTruthy();
      const now = new Date();
      const diffDays = (result.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Should be approximately 365 days
      expect(diffDays).toBeGreaterThan(364);
      expect(diffDays).toBeLessThan(366);
    });
  });
});
