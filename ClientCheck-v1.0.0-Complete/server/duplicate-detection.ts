import { getDb } from "./db";
import { customers } from "../drizzle/schema";
import { eq, and, or, like, sql } from "drizzle-orm";

export interface DuplicateCandidate {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  reviewCount: number;
  similarity: number; // 0-100
}

/**
 * Find potential duplicate customers based on name and location
 */
export async function findDuplicateCandidates(
  firstName: string,
  lastName: string,
  city: string,
  state: string
): Promise<DuplicateCandidate[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Search for customers with same name in same city/state
  const candidates = await db
    .select()
    .from(customers)
    .where(
      and(
        like(customers.firstName, `%${firstName}%`),
        like(customers.lastName, `%${lastName}%`),
        eq(customers.city, city),
        eq(customers.state, state),
        eq(customers.isDuplicate, false)
      )
    );

  // Calculate similarity score (0-100)
  return candidates.map((c) => {
    let similarity = 0;

    // Exact name match = 50 points
    if (
      c.firstName.toLowerCase() === firstName.toLowerCase() &&
      c.lastName.toLowerCase() === lastName.toLowerCase()
    ) {
      similarity += 50;
    } else {
      // Partial match = 25 points
      similarity += 25;
    }

    // Same city/state = 30 points
    if (c.city === city && c.state === state) {
      similarity += 30;
    }

    // Has reviews = 20 points (more likely to be real customer)
    if (c.reviewCount > 0) {
      similarity += 20;
    }

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      reviewCount: c.reviewCount,
      similarity: Math.min(similarity, 100),
    };
  });
}

/**
 * Merge duplicate customer into primary customer
 * All reviews and data from duplicate are reassigned to primary
 */
export async function mergeCustomers(
  primaryCustomerId: number,
  duplicateCustomerId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update all reviews from duplicate to primary
  await db
    .update(customers)
    .set({
      mergedIntoId: primaryCustomerId,
      isDuplicate: true,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, duplicateCustomerId));

  return {
    success: true,
    message: `Customer ${duplicateCustomerId} merged into ${primaryCustomerId}`,
  };
}

/**
 * Get all duplicate records for a customer
 */
export async function getDuplicatesForCustomer(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const duplicates = await db
    .select()
    .from(customers)
    .where(eq(customers.mergedIntoId, customerId));

  return duplicates;
}

/**
 * Unmerge a duplicate customer (restore independence)
 */
export async function unmergeCustomer(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(customers)
    .set({
      mergedIntoId: null,
      isDuplicate: false,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  return { success: true };
}
