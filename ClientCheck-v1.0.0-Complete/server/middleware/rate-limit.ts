import { TRPCError } from "@trpc/server";

/**
 * Rate limiting middleware for API endpoints
 * Implements token bucket algorithm with in-memory storage
 * For production, use Redis
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly refillInterval: number; // milliseconds

  constructor(maxTokens: number = 100, tokensPerSecond: number = 10) {
    this.maxTokens = maxTokens;
    this.refillRate = tokensPerSecond;
    this.refillInterval = 1000 / tokensPerSecond;
  }

  /**
   * Check if request is allowed and consume token
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.maxTokens,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.refillInterval) * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if token available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for key
   */
  getRemaining(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxTokens;
    return Math.floor(bucket.tokens);
  }

  /**
   * Clear bucket for key
   */
  clear(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all buckets
   */
  clearAll(): void {
    this.buckets.clear();
  }
}

// Global rate limiters for different endpoints
export const globalLimiter = new RateLimiter(1000, 100); // 100 requests/sec, burst 1000
export const authLimiter = new RateLimiter(10, 1); // 1 request/sec, burst 10
export const searchLimiter = new RateLimiter(100, 10); // 10 requests/sec, burst 100
export const reviewLimiter = new RateLimiter(50, 5); // 5 requests/sec, burst 50

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter,
  keyExtractor: (context: any) => string
) {
  return (context: any) => {
    const key = keyExtractor(context);

    if (!limiter.isAllowed(key)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Remaining: ${limiter.getRemaining(key)} requests`,
      });
    }
  };
}

/**
 * Extract rate limit key from context
 */
export function getRateLimitKey(
  context: any,
  type: "user" | "ip" | "global" = "user"
): string {
  switch (type) {
    case "user":
      return `user:${context.user?.id || "anonymous"}`;
    case "ip":
      return `ip:${context.req?.ip || "unknown"}`;
    case "global":
      return "global";
    default:
      return "global";
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Auth endpoints
  LOGIN: { limiter: authLimiter, keyType: "ip" as const },
  REGISTER: { limiter: authLimiter, keyType: "ip" as const },
  REFRESH_TOKEN: { limiter: globalLimiter, keyType: "user" as const },

  // Search endpoints
  SEARCH_CUSTOMERS: { limiter: searchLimiter, keyType: "user" as const },
  SEARCH_CONTRACTORS: { limiter: searchLimiter, keyType: "user" as const },

  // Review endpoints
  CREATE_REVIEW: { limiter: reviewLimiter, keyType: "user" as const },
  GET_REVIEWS: { limiter: globalLimiter, keyType: "user" as const },

  // Integration endpoints
  CREATE_IMPORT: { limiter: globalLimiter, keyType: "user" as const },
  GET_IMPORT_HISTORY: { limiter: globalLimiter, keyType: "user" as const },

  // Admin endpoints
  MANAGE_USERS: { limiter: globalLimiter, keyType: "user" as const },
  VIEW_AUDIT_LOGS: { limiter: globalLimiter, keyType: "user" as const },
};

/**
 * Apply rate limiting to TRPC procedure
 */
export function withRateLimit(
  procedure: any,
  limiter: RateLimiter,
  keyType: "user" | "ip" | "global" = "user"
) {
  return procedure.use(async ({ ctx, next }) => {
    const key = getRateLimitKey(ctx, keyType);

    if (!limiter.isAllowed(key)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Max ${limiter.getRemaining(key)} requests allowed.`,
      });
    }

    return next();
  });
}
