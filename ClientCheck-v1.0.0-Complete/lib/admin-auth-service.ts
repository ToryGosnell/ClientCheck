/**
 * Admin Authentication Service
 * Handles admin user creation, password hashing, and verification
 */

import * as crypto from "crypto";

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "moderator" | "super_admin";
  createdAt: number;
  lastLogin?: number;
  active: boolean;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  error?: string;
}

export class AdminAuthService {
  // Mock admin database (in production, use real database)
  private static adminUsers: Map<string, AdminUser> = new Map();

  /**
   * Hash password using PBKDF2
   */
  static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltValue = salt || crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(password, saltValue, 100000, 64, "sha512")
      .toString("hex");

    return { hash, salt: saltValue };
  }

  /**
   * Verify password against hash
   */
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  /**
   * Create new admin user
   */
  static createAdminUser(data: {
    email: string;
    password: string;
    role?: "admin" | "moderator" | "super_admin";
  }): { success: boolean; admin?: AdminUser; error?: string } {
    // Validate email
    if (!data.email || !data.email.includes("@")) {
      return { success: false, error: "Invalid email address" };
    }

    // Validate password
    if (!data.password || data.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    // Check if user already exists
    if (this.adminUsers.has(data.email)) {
      return { success: false, error: "Admin user already exists" };
    }

    // Hash password
    const { hash, salt } = this.hashPassword(data.password);

    // Create admin user
    const admin: AdminUser = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      passwordHash: `${salt}:${hash}`,
      role: data.role || "admin",
      createdAt: Date.now(),
      active: true,
    };

    this.adminUsers.set(data.email, admin);

    console.log(`✅ Admin user created: ${data.email} (${admin.role})`);

    return { success: true, admin };
  }

  /**
   * Admin login
   */
  static login(email: string, password: string): LoginResult {
    // Find admin user
    const admin = this.adminUsers.get(email);

    if (!admin) {
      console.warn(`❌ Login failed: Admin user not found (${email})`);
      return { success: false, error: "Invalid credentials" };
    }

    if (!admin.active) {
      console.warn(`❌ Login failed: Admin account inactive (${email})`);
      return { success: false, error: "Admin account is inactive" };
    }

    // Verify password
    const [salt, hash] = admin.passwordHash.split(":");
    if (!this.verifyPassword(password, hash, salt)) {
      console.warn(`❌ Login failed: Invalid password (${email})`);
      return { success: false, error: "Invalid credentials" };
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");

    // Update last login
    admin.lastLogin = Date.now();
    this.adminUsers.set(email, admin);

    console.log(`✅ Admin login successful: ${email}`);

    return { success: true, token, admin };
  }

  /**
   * Verify admin session token
   */
  static verifyToken(token: string): { valid: boolean; admin?: AdminUser } {
    // In production, verify JWT or session token
    // For now, just check if token exists and is valid format
    if (!token || token.length < 32) {
      return { valid: false };
    }

    console.log("✅ Token verified");

    return { valid: true };
  }

  /**
   * Get admin user by email
   */
  static getAdminByEmail(email: string): AdminUser | undefined {
    return this.adminUsers.get(email);
  }

  /**
   * Update admin password
   */
  static updatePassword(
    email: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const admin = this.adminUsers.get(email);

    if (!admin) {
      return { success: false, error: "Admin user not found" };
    }

    // Verify current password
    const [salt, hash] = admin.passwordHash.split(":");
    if (!this.verifyPassword(currentPassword, hash, salt)) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    // Hash new password
    const { hash: newHash, salt: newSalt } = this.hashPassword(newPassword);

    // Update admin
    admin.passwordHash = `${newSalt}:${newHash}`;
    this.adminUsers.set(email, admin);

    console.log(`✅ Password updated for admin: ${email}`);

    return { success: true };
  }

  /**
   * Deactivate admin account
   */
  static deactivateAdmin(email: string): { success: boolean; error?: string } {
    const admin = this.adminUsers.get(email);

    if (!admin) {
      return { success: false, error: "Admin user not found" };
    }

    admin.active = false;
    this.adminUsers.set(email, admin);

    console.log(`✅ Admin account deactivated: ${email}`);

    return { success: true };
  }

  /**
   * Reactivate admin account
   */
  static reactivateAdmin(email: string): { success: boolean; error?: string } {
    const admin = this.adminUsers.get(email);

    if (!admin) {
      return { success: false, error: "Admin user not found" };
    }

    admin.active = true;
    this.adminUsers.set(email, admin);

    console.log(`✅ Admin account reactivated: ${email}`);

    return { success: true };
  }

  /**
   * List all admin users
   */
  static listAdmins(): AdminUser[] {
    return Array.from(this.adminUsers.values());
  }

  /**
   * Get admin statistics
   */
  static getStats(): {
    totalAdmins: number;
    activeAdmins: number;
    inactiveAdmins: number;
    roleBreakdown: Record<string, number>;
  } {
    const admins = Array.from(this.adminUsers.values());
    const roleBreakdown: Record<string, number> = {};

    admins.forEach((admin) => {
      roleBreakdown[admin.role] = (roleBreakdown[admin.role] || 0) + 1;
    });

    return {
      totalAdmins: admins.length,
      activeAdmins: admins.filter((a) => a.active).length,
      inactiveAdmins: admins.filter((a) => !a.active).length,
      roleBreakdown,
    };
  }

  /**
   * Initialize default admin user (for development)
   */
  static initializeDefaultAdmin(): { success: boolean; error?: string } {
    const defaultEmail = "admin@contractorvet.com";
    const defaultPassword = "SecureAdminPassword123!";

    // Check if default admin already exists
    if (this.adminUsers.has(defaultEmail)) {
      console.log("✅ Default admin already exists");
      return { success: true };
    }

    const result = this.createAdminUser({
      email: defaultEmail,
      password: defaultPassword,
      role: "super_admin",
    });

    if (result.success) {
      console.log(`✅ Default admin created: ${defaultEmail}`);
      console.log(`⚠️  IMPORTANT: Change this password immediately in production!`);
    }

    return result;
  }

  /**
   * Reset admin password (admin-only action)
   */
  static resetAdminPassword(email: string): { success: boolean; tempPassword?: string; error?: string } {
    const admin = this.adminUsers.get(email);

    if (!admin) {
      return { success: false, error: "Admin user not found" };
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString("hex");

    // Hash temporary password
    const { hash, salt } = this.hashPassword(tempPassword);

    // Update admin
    admin.passwordHash = `${salt}:${hash}`;
    this.adminUsers.set(email, admin);

    console.log(`✅ Password reset for admin: ${email}`);

    return { success: true, tempPassword };
  }
}

// Initialize default admin on module load
AdminAuthService.initializeDefaultAdmin();
