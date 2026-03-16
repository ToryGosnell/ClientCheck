import * as jose from "jose";
import { TRPCError } from "@trpc/server";

/**
 * JWT Service for token generation and validation
 * Handles access tokens, refresh tokens, and token expiration
 */

const rawSecret = process.env.JWT_SECRET;
const rawRefreshSecret = process.env.JWT_REFRESH_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && (!rawSecret || rawSecret.length < 32)) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 characters in production. Do not use default/placeholder values."
  );
}
if (isProduction && (!rawRefreshSecret || rawRefreshSecret.length < 32)) {
  throw new Error(
    "JWT_REFRESH_SECRET must be set and at least 32 characters in production. Do not use default/placeholder values."
  );
}

const JWT_SECRET = rawSecret || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET = rawRefreshSecret || "your-refresh-secret-change-in-production";

const secret = new TextEncoder().encode(JWT_SECRET);
const refreshSecret = new TextEncoder().encode(JWT_REFRESH_SECRET);

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  /**
   * Generate access token (short-lived, 1 hour)
   */
  static async generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    return token;
  }

  /**
   * Generate refresh token (long-lived, 7 days)
   */
  static async generateRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(refreshSecret);

    return token;
  }

  /**
   * Verify access token
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const verified = await jose.jwtVerify(token, secret);
      return verified.payload as JWTPayload;
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired access token",
      });
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const verified = await jose.jwtVerify(token, refreshSecret);
      return verified.payload as JWTPayload;
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired refresh token",
      });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = await this.generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    const newRefreshToken = await this.generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Extract token from Authorization header
   */
  static extractToken(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1];
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jose.decodeJwt(token);
      return decoded as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return null;

    return new Date(decoded.exp * 1000);
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    return new Date() > expiration;
  }
}

/**
 * TRPC middleware for JWT validation
 */
export function withJWTValidation(procedure: any) {
  return procedure.use(async ({ ctx, next }) => {
    const authHeader = ctx.req?.headers.authorization;
    const token = JWTService.extractToken(authHeader);

    if (!token) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authorization token required",
      });
    }

    const payload = await JWTService.verifyAccessToken(token);

    return next({
      ctx: {
        ...ctx,
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
        },
      },
    });
  });
}

/**
 * TRPC middleware for optional JWT validation
 */
export function withOptionalJWTValidation(procedure: any) {
  return procedure.use(async ({ ctx, next }) => {
    const authHeader = ctx.req?.headers.authorization;
    const token = JWTService.extractToken(authHeader);

    if (token) {
      try {
        const payload = await JWTService.verifyAccessToken(token);
        return next({
          ctx: {
            ...ctx,
            user: {
              id: payload.userId,
              email: payload.email,
              role: payload.role,
            },
          },
        });
      } catch (error) {
        // Token invalid, continue without auth
      }
    }

    return next();
  });
}
