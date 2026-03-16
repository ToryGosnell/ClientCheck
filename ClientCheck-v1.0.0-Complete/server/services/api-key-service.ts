import crypto from "crypto";
import { db } from "@/server/_core/db";
import { apiKeys } from "@/drizzle/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * API Key Management Service
 * Handles generation, rotation, and validation of API keys for partner integrations
 */

export interface APIKeyMetadata {
  integrationName: string;
  environment: "sandbox" | "production";
  scopes: string[];
  lastUsed?: Date;
  usageCount: number;
}

export class APIKeyService {
  /**
   * Generate new API key
   */
  static async generateKey(
    integrationId: number,
    integrationName: string,
    environment: "sandbox" | "production",
    scopes: string[]
  ) {
    // Generate secure random key
    const keyPrefix = `${integrationName.substring(0, 3)}_${environment.substring(0, 1)}`.toUpperCase();
    const randomPart = crypto.randomBytes(32).toString("hex");
    const apiKey = `${keyPrefix}_${randomPart}`;

    // Hash key for storage
    const hashedKey = this.hashKey(apiKey);

    // Store in database
    const result = await db.insert(apiKeys).values({
      integrationId,
      integrationName,
      environment,
      keyHash: hashedKey,
      keyPrefix: keyPrefix,
      scopes: JSON.stringify(scopes),
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: null,
      usageCount: 0,
      expiresAt: this.calculateExpiration(environment),
    });

    return {
      apiKey, // Only returned once at creation
      keyPrefix,
      environment,
      scopes,
      expiresAt: this.calculateExpiration(environment),
    };
  }

  /**
   * Validate API key
   */
  static async validateKey(apiKey: string): Promise<{
    valid: boolean;
    integrationId?: number;
    integrationName?: string;
    environment?: "sandbox" | "production";
    scopes?: string[];
    error?: string;
  }> {
    const hashedKey = this.hashKey(apiKey);

    const result = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashedKey), eq(apiKeys.isActive, true)))
      .limit(1);

    if (!result.length) {
      return { valid: false, error: "Invalid API key" };
    }

    const key = result[0];

    // Check expiration
    if (key.expiresAt && new Date() > key.expiresAt) {
      return { valid: false, error: "API key expired" };
    }

    // Update last used and usage count
    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        usageCount: (key.usageCount || 0) + 1,
      })
      .where(eq(apiKeys.keyHash, hashedKey));

    return {
      valid: true,
      integrationId: key.integrationId,
      integrationName: key.integrationName,
      environment: key.environment as "sandbox" | "production",
      scopes: JSON.parse(key.scopes || "[]"),
    };
  }

  /**
   * Rotate API key (revoke old, generate new)
   */
  static async rotateKey(integrationId: number, oldKeyPrefix: string) {
    // Find and deactivate old key
    const oldKey = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.integrationId, integrationId),
          eq(apiKeys.keyPrefix, oldKeyPrefix),
          eq(apiKeys.isActive, true)
        )
      )
      .limit(1);

    if (!oldKey.length) {
      throw new Error("API key not found");
    }

    const key = oldKey[0];

    // Deactivate old key
    await db
      .update(apiKeys)
      .set({ isActive: false, revokedAt: new Date() })
      .where(eq(apiKeys.keyHash, key.keyHash));

    // Generate new key with same scopes
    const scopes = JSON.parse(key.scopes || "[]");
    return this.generateKey(
      integrationId,
      key.integrationName,
      key.environment as "sandbox" | "production",
      scopes
    );
  }

  /**
   * Revoke API key
   */
  static async revokeKey(keyPrefix: string) {
    const result = await db
      .update(apiKeys)
      .set({ isActive: false, revokedAt: new Date() })
      .where(eq(apiKeys.keyPrefix, keyPrefix));

    return result;
  }

  /**
   * Get API keys for integration
   */
  static async getIntegrationKeys(integrationId: number) {
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.integrationId, integrationId));
  }

  /**
   * Check if key has scope
   */
  static hasScope(scopes: string[], requiredScope: string): boolean {
    return scopes.includes(requiredScope) || scopes.includes("*");
  }

  /**
   * Hash API key for storage
   */
  private static hashKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  }

  /**
   * Calculate expiration date based on environment
   */
  private static calculateExpiration(environment: "sandbox" | "production"): Date {
    const expirationDays = environment === "production" ? 90 : 365; // Prod keys expire sooner
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    return expirationDate;
  }

  /**
   * Clean up expired keys (run periodically)
   */
  static async cleanupExpiredKeys() {
    const result = await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(lt(apiKeys.expiresAt, new Date()), eq(apiKeys.isActive, true)));

    return result;
  }

  /**
   * Get API key usage statistics
   */
  static async getKeyStats(keyPrefix: string) {
    const result = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, keyPrefix))
      .limit(1);

    if (!result.length) {
      throw new Error("API key not found");
    }

    const key = result[0];
    return {
      keyPrefix: key.keyPrefix,
      integrationName: key.integrationName,
      environment: key.environment,
      isActive: key.isActive,
      usageCount: key.usageCount,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
    };
  }
}

/**
 * Middleware to validate API key from request headers
 */
export async function validateAPIKeyMiddleware(context: any) {
  const apiKey = context.req?.headers["x-api-key"];

  if (!apiKey) {
    return {
      valid: false,
      error: "API key required",
    };
  }

  return APIKeyService.validateKey(apiKey as string);
}

/**
 * TRPC middleware for API key validation
 */
export function withAPIKeyValidation(procedure: any) {
  return procedure.use(async ({ ctx, next }) => {
    const apiKey = ctx.req?.headers["x-api-key"];

    if (!apiKey) {
      throw new Error("API key required in X-API-Key header");
    }

    const validation = await APIKeyService.validateKey(apiKey as string);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Add API key info to context
    return next({
      ctx: {
        ...ctx,
        apiKey: {
          integrationId: validation.integrationId,
          integrationName: validation.integrationName,
          environment: validation.environment,
          scopes: validation.scopes,
        },
      },
    });
  });
}
