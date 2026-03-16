/**
 * Customer Privacy Middleware
 * Filters sensitive customer data (phone, address) based on user permissions
 * Ensures data is only visible to admins and the contractor who entered it
 */

import { filterCustomerData, canViewSensitiveData } from "./customer-privacy-service";

export interface PrivacyContext {
  userId: number;
  userRole: string;
}

/**
 * Filter customer data in API responses
 */
export function filterCustomerResponse(
  customer: any,
  context: PrivacyContext
): any {
  if (!customer) return null;

  return filterCustomerData(customer, context.userId, context.userRole);
}

/**
 * Filter array of customers
 */
export function filterCustomersResponse(
  customers: any[],
  context: PrivacyContext
): any[] {
  if (!customers) return [];

  return customers.map((customer) =>
    filterCustomerResponse(customer, context)
  );
}

/**
 * Middleware for Express/tRPC to add privacy filtering
 */
export function createPrivacyMiddleware() {
  return (context: PrivacyContext) => {
    return {
      filterCustomer: (customer: any) =>
        filterCustomerResponse(customer, context),
      filterCustomers: (customers: any[]) =>
        filterCustomersResponse(customers, context),
      canViewSensitive: (createdByUserId: number) =>
        canViewSensitiveData(context.userId, context.userRole, createdByUserId),
    };
  };
}

/**
 * Check if request is authorized to access sensitive data
 */
export function checkSensitiveDataAccess(
  userId: number,
  userRole: string,
  createdByUserId: number
): boolean {
  return canViewSensitiveData(userId, userRole, createdByUserId);
}

/**
 * Throw error if user not authorized
 */
export function requireSensitiveDataAccess(
  userId: number,
  userRole: string,
  createdByUserId: number
): void {
  if (!canViewSensitiveData(userId, userRole, createdByUserId)) {
    throw new Error(
      "Unauthorized: You do not have permission to access this sensitive data"
    );
  }
}

/**
 * Sanitize customer for public API (removes all sensitive data)
 */
export function sanitizeCustomerForPublic(customer: any): any {
  if (!customer) return null;

  return {
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
    // phone: REMOVED
    // address: REMOVED
    // email: REMOVED
  };
}

/**
 * Sanitize array of customers for public API
 */
export function sanitizeCustomersForPublic(customers: any[]): any[] {
  if (!customers) return [];

  return customers.map((customer) => sanitizeCustomerForPublic(customer));
}
