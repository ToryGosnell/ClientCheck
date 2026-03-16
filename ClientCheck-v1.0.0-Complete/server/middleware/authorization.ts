import { TRPCError } from "@trpc/server";
import { Context } from "../_core/trpc";

/**
 * Authorization middleware for role-based access control
 * Defines roles: user, contractor, admin, enterprise
 */

export enum UserRole {
  USER = "user",
  CONTRACTOR = "contractor",
  ADMIN = "admin",
  ENTERPRISE = "enterprise",
}

export interface AuthorizedContext extends Context {
  userId: number;
  role: UserRole;
  email: string;
}

/**
 * Verify user is authenticated
 */
export function requireAuth(ctx: Context): AuthorizedContext {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return {
    ...ctx,
    userId: ctx.user.id,
    role: (ctx.user.role as UserRole) || UserRole.USER,
    email: ctx.user.email,
  };
}

/**
 * Verify user has specific role
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (ctx: Context) => {
    const authCtx = requireAuth(ctx);

    if (!allowedRoles.includes(authCtx.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
      });
    }

    return authCtx;
  };
}

/**
 * Verify user is admin
 */
export function requireAdmin(ctx: Context): AuthorizedContext {
  return requireRole([UserRole.ADMIN, UserRole.ENTERPRISE])(ctx);
}

/**
 * Verify user is contractor
 */
export function requireContractor(ctx: Context): AuthorizedContext {
  return requireRole([UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.ENTERPRISE])(ctx);
}

/**
 * Verify user owns resource
 */
export function requireOwnership(userId: number, ctx: Context): AuthorizedContext {
  const authCtx = requireAuth(ctx);

  if (authCtx.userId !== userId && authCtx.role !== UserRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  return authCtx;
}

/**
 * Audit log for all mutations
 */
export async function auditLog(
  db: any,
  userId: number,
  action: string,
  resourceType: string,
  resourceId: number,
  changes?: Record<string, any>,
  status: "success" | "failure" = "success"
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      changes: changes ? JSON.stringify(changes) : null,
      status,
      timestamp: new Date(),
      ipAddress: null, // Would be extracted from request context
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

/**
 * Permission matrix for common operations
 */
export const PERMISSIONS = {
  // Review operations
  CREATE_REVIEW: [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN],
  EDIT_REVIEW: [UserRole.ADMIN], // Only admins can edit reviews
  DELETE_REVIEW: [UserRole.ADMIN],
  VIEW_REVIEW: [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN],

  // Fraud operations
  VIEW_FRAUD_SIGNALS: [UserRole.ADMIN, UserRole.ENTERPRISE],
  MARK_FRAUD_REVIEWED: [UserRole.ADMIN, UserRole.ENTERPRISE],
  ESCALATE_FRAUD: [UserRole.ADMIN, UserRole.ENTERPRISE],

  // Contractor operations
  VERIFY_CONTRACTOR: [UserRole.ADMIN],
  VIEW_CONTRACTOR_PROFILE: [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN],
  EDIT_CONTRACTOR_PROFILE: [UserRole.CONTRACTOR, UserRole.ADMIN],

  // Integration operations
  CREATE_INTEGRATION: [UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.ENTERPRISE],
  MANAGE_INTEGRATION: [UserRole.ADMIN, UserRole.ENTERPRISE],
  VIEW_INTEGRATION_HISTORY: [UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.ENTERPRISE],

  // Referral operations
  VIEW_REFERRALS: [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN],
  SEND_REFERRAL: [UserRole.USER, UserRole.CONTRACTOR, UserRole.ADMIN],
  MANAGE_REFERRALS: [UserRole.ADMIN],

  // Admin operations
  VIEW_AUDIT_LOGS: [UserRole.ADMIN, UserRole.ENTERPRISE],
  MANAGE_USERS: [UserRole.ADMIN],
  MANAGE_SETTINGS: [UserRole.ADMIN],
};

/**
 * Check if user has permission for operation
 */
export function hasPermission(role: UserRole, operation: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[operation];
  return allowedRoles.includes(role);
}
