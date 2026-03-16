/**
 * Customer Privacy Service
 * Handles access control for sensitive customer data (phone, address)
 * - Phone and address are ONLY visible to:
 *   1. Admin users
 *   2. The contractor who entered the customer record
 * - Used only for internal matching, never displayed publicly
 */

export interface CustomerPublicView {
  id: number;
  firstName: string;
  lastName: string;
  // phone: HIDDEN
  // address: HIDDEN
  city: string;
  state: string;
  zip: string;
  overallRating: string;
  reviewCount: number;
  riskLevel: string;
  createdAt: Date;
}

export interface CustomerPrivateView extends CustomerPublicView {
  phone: string;
  address: string;
  email?: string;
  createdByUserId: number;
}

/**
 * Check if user can view sensitive customer data
 */
export function canViewSensitiveData(
  userId: number,
  userRole: string,
  createdByUserId: number
): boolean {
  // Admin can always view
  if (userRole === "admin") {
    return true;
  }

  // Contractor can only view if they created the record
  if (userRole === "user" && userId === createdByUserId) {
    return true;
  }

  return false;
}

/**
 * Filter customer data based on user permissions
 */
export function filterCustomerData(
  customer: any,
  userId: number,
  userRole: string
): CustomerPublicView | CustomerPrivateView {
  const canViewSensitive = canViewSensitiveData(userId, userRole, customer.createdByUserId);

  const publicView: CustomerPublicView = {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    overallRating: customer.overallRating,
    reviewCount: customer.reviewCount,
    riskLevel: customer.riskLevel,
    createdAt: customer.createdAt,
  };

  if (!canViewSensitive) {
    return publicView;
  }

  // Return full data with sensitive fields
  return {
    ...publicView,
    phone: customer.phone,
    address: customer.address,
    email: customer.email,
    createdByUserId: customer.createdByUserId,
  };
}

/**
 * Filter multiple customers
 */
export function filterCustomersData(
  customers: any[],
  userId: number,
  userRole: string
): (CustomerPublicView | CustomerPrivateView)[] {
  return customers.map((customer) =>
    filterCustomerData(customer, userId, userRole)
  );
}

/**
 * Get customer for internal matching (admin/creator only)
 * Returns full data or null if unauthorized
 */
export function getCustomerForMatching(
  customer: any,
  userId: number,
  userRole: string
): CustomerPrivateView | null {
  if (!canViewSensitiveData(userId, userRole, customer.createdByUserId)) {
    return null;
  }

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    address: customer.address,
    email: customer.email,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    overallRating: customer.overallRating,
    reviewCount: customer.reviewCount,
    riskLevel: customer.riskLevel,
    createdAt: customer.createdAt,
    createdByUserId: customer.createdByUserId,
  };
}

/**
 * Check if phone number can be used for matching
 * Only allows if user is admin or created the customer
 */
export function canUsePhoneForMatching(
  userId: number,
  userRole: string,
  createdByUserId: number
): boolean {
  return canViewSensitiveData(userId, userRole, createdByUserId);
}

/**
 * Audit log for sensitive data access
 */
export interface SensitiveDataAccessLog {
  userId: number;
  customerId: number;
  action: "view" | "match" | "export";
  timestamp: Date;
  reason?: string;
}

// In-memory audit log (replace with database in production)
const accessLogs: SensitiveDataAccessLog[] = [];

/**
 * Log sensitive data access
 */
export function logSensitiveDataAccess(
  userId: number,
  customerId: number,
  action: "view" | "match" | "export",
  reason?: string
): void {
  accessLogs.push({
    userId,
    customerId,
    action,
    timestamp: new Date(),
    reason,
  });

  console.log(
    `[Privacy] User ${userId} accessed sensitive data for customer ${customerId}: ${action}`
  );
}

/**
 * Get access logs for audit (admin only)
 */
export function getAccessLogs(userRole: string): SensitiveDataAccessLog[] {
  if (userRole !== "admin") {
    return [];
  }

  return accessLogs;
}

/**
 * Get access logs for specific customer (admin only)
 */
export function getCustomerAccessLogs(
  customerId: number,
  userRole: string
): SensitiveDataAccessLog[] {
  if (userRole !== "admin") {
    return [];
  }

  return accessLogs.filter((log) => log.customerId === customerId);
}
