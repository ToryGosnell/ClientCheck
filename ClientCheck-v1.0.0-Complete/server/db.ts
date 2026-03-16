import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  contractorProfiles,
  customers,
  reviewHelpfulVotes,
  reviewDisputes,
  reviewPhotos,
  disputePhotos,
  reviews,
  users,
  type InsertCustomer,
  type InsertReview,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Contractor Profiles ──────────────────────────────────────────────────────

export async function getContractorProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertContractorProfile(
  userId: number,
  data: { trade?: string; licenseNumber?: string; company?: string; city?: string; state?: string; bio?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getContractorProfile(userId);
  if (existing) {
    await db
      .update(contractorProfiles)
      .set(data)
      .where(eq(contractorProfiles.userId, userId));
    return existing.id;
  } else {
    const result = await db.insert(contractorProfiles).values({ userId, ...data });
    return result[0].insertId as number;
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function searchCustomers(query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  const results = await db
    .select()
    .from(customers)
    .where(
      or(
        like(customers.firstName, q),
        like(customers.lastName, q),
        like(customers.phone, q),
        like(customers.address, q),
        like(customers.city, q),
        sql`CONCAT(${customers.firstName}, ' ', ${customers.lastName}) LIKE ${q}`
      )
    )
    .orderBy(desc(customers.reviewCount))
    .limit(limit);

  // Enrich each result with aggregated ratings from merged duplicates
  const enrichedResults = await Promise.all(
    results.map(async (customer) => {
      const reviewData = await getReviewsForCustomer(customer.id);
      const aggregatedRatings = (reviewData as any).aggregatedRatings || {};
      return {
        ...customer,
        // Use aggregated overall rating if available, otherwise use customer's rating
        overallRating: aggregatedRatings.overallRating || customer.overallRating,
        // Use review count from aggregated data
        reviewCount: aggregatedRatings.reviewCount || customer.reviewCount,
      };
    })
  );

  return enrichedResults;
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  // Normalize phone number by removing non-digits
  const normalizedPhone = phone.replace(/\D/g, "");
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, normalizedPhone))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  return result[0].insertId as number;
}

export async function getRecentlyFlaggedCustomers(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customers)
    .where(eq(customers.riskLevel, "high"))
    .orderBy(desc(customers.updatedAt))
    .limit(limit);
}

export async function getTopRatedCustomers(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customers)
    .where(eq(customers.riskLevel, "low"))
    .orderBy(desc(customers.overallRating))
    .limit(limit);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviewsForCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return { reviews: [], aggregatedRatings: {} };

  // Get all customer IDs that are merged into this one
  const mergedCustomers = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.mergedIntoId, customerId));

  const customerIds = [customerId, ...mergedCustomers.map((c) => c.id)];

  // Get all reviews for this customer and merged duplicates
  const allReviews = await db
    .select({
      id: reviews.id,
      customerId: reviews.customerId,
      contractorUserId: reviews.contractorUserId,
      overallRating: reviews.overallRating,
      ratingPaymentReliability: reviews.ratingPaymentReliability,
      ratingCommunication: reviews.ratingCommunication,
      ratingScopeChanges: reviews.ratingScopeChanges,
      ratingPropertyRespect: reviews.ratingPropertyRespect,
      ratingPermitPulling: reviews.ratingPermitPulling,
      ratingOverallJobExperience: reviews.ratingOverallJobExperience,
      reviewText: reviews.reviewText,
      jobType: reviews.jobType,
      jobDate: reviews.jobDate,
      jobAmount: reviews.jobAmount,
      redFlags: reviews.redFlags,
      helpfulCount: reviews.helpfulCount,
      createdAt: reviews.createdAt,
      contractorName: users.name,
      contractorTrade: contractorProfiles.trade,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.contractorUserId, users.id))
    .leftJoin(contractorProfiles, eq(reviews.contractorUserId, contractorProfiles.userId))
    .where(sql`${reviews.customerId} IN (${sql.raw(customerIds.join(","))})`)
    .orderBy(desc(reviews.createdAt));

  // Calculate aggregated ratings
  const aggregatedRatings = {
    overallRating: 0,
    ratingPaymentReliability: 0,
    ratingCommunication: 0,
    ratingScopeChanges: 0,
    ratingPropertyRespect: 0,
    ratingPermitPulling: 0,
    ratingOverallJobExperience: 0,
    reviewCount: allReviews.length,
  };

  if (allReviews.length > 0) {
    aggregatedRatings.overallRating =
      allReviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / allReviews.length;
    aggregatedRatings.ratingPaymentReliability =
      allReviews.reduce((sum, r) => sum + (r.ratingPaymentReliability || 0), 0) / allReviews.length;
    aggregatedRatings.ratingCommunication =
      allReviews.reduce((sum, r) => sum + (r.ratingCommunication || 0), 0) / allReviews.length;
    aggregatedRatings.ratingScopeChanges =
      allReviews.reduce((sum, r) => sum + (r.ratingScopeChanges || 0), 0) / allReviews.length;
    aggregatedRatings.ratingPropertyRespect =
      allReviews.reduce((sum, r) => sum + (r.ratingPropertyRespect || 0), 0) / allReviews.length;
    aggregatedRatings.ratingPermitPulling =
      allReviews.reduce((sum, r) => sum + (r.ratingPermitPulling || 0), 0) / allReviews.length;
    aggregatedRatings.ratingOverallJobExperience =
      allReviews.reduce((sum, r) => sum + (r.ratingOverallJobExperience || 0), 0) / allReviews.length;
  }

  return { reviews: allReviews, aggregatedRatings };
}

export async function getReviewsByContractor(contractorUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reviews.id,
      customerId: reviews.customerId,
      overallRating: reviews.overallRating,
      reviewText: reviews.reviewText,
      jobType: reviews.jobType,
      jobDate: reviews.jobDate,
      redFlags: reviews.redFlags,
      helpfulCount: reviews.helpfulCount,
      createdAt: reviews.createdAt,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerCity: customers.city,
      customerState: customers.state,
    })
    .from(reviews)
    .leftJoin(customers, eq(reviews.customerId, customers.id))
    .where(eq(reviews.contractorUserId, contractorUserId))
    .orderBy(desc(reviews.createdAt));
}

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviews).values(data);
  const reviewId = result[0].insertId as number;
  await recalculateCustomerRatings(data.customerId);
  return reviewId;
}

export async function updateReview(
  reviewId: number,
  contractorUserId: number,
  data: Partial<InsertReview>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(reviews)
    .set(data)
    .where(and(eq(reviews.id, reviewId), eq(reviews.contractorUserId, contractorUserId)));
  const review = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (review[0]) {
    await recalculateCustomerRatings(review[0].customerId);
  }
}

export async function deleteReview(reviewId: number, contractorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const review = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!review[0] || review[0].contractorUserId !== contractorUserId) {
    throw new Error("Review not found or unauthorized");
  }
  await db
    .delete(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.contractorUserId, contractorUserId)));
  await recalculateCustomerRatings(review[0].customerId);
}

export async function markReviewHelpful(reviewId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(reviewHelpfulVotes)
    .where(and(eq(reviewHelpfulVotes.reviewId, reviewId), eq(reviewHelpfulVotes.userId, userId)))
    .limit(1);
  if (existing[0]) {
    await db
      .delete(reviewHelpfulVotes)
      .where(and(eq(reviewHelpfulVotes.reviewId, reviewId), eq(reviewHelpfulVotes.userId, userId)));
    await db
      .update(reviews)
      .set({ helpfulCount: sql`${reviews.helpfulCount} - 1` })
      .where(eq(reviews.id, reviewId));
    return false;
  } else {
    await db.insert(reviewHelpfulVotes).values({ reviewId, userId });
    await db
      .update(reviews)
      .set({ helpfulCount: sql`${reviews.helpfulCount} + 1` })
      .where(eq(reviews.id, reviewId));
    return true;
  }
}

export async function getRecentReviews(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reviews.id,
      customerId: reviews.customerId,
      overallRating: reviews.overallRating,
      reviewText: reviews.reviewText,
      jobType: reviews.jobType,
      redFlags: reviews.redFlags,
      helpfulCount: reviews.helpfulCount,
      createdAt: reviews.createdAt,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerCity: customers.city,
      customerState: customers.state,
      customerRiskLevel: customers.riskLevel,
      contractorName: users.name,
      contractorTrade: contractorProfiles.trade,
    })
    .from(reviews)
    .leftJoin(customers, eq(reviews.customerId, customers.id))
    .leftJoin(users, eq(reviews.contractorUserId, users.id))
    .leftJoin(contractorProfiles, eq(reviews.contractorUserId, contractorProfiles.userId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recalculateCustomerRatings(customerId: number) {
  const db = await getDb();
  if (!db) return;
  const allReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.customerId, customerId));

  if (allReviews.length === 0) {
    await db
      .update(customers)
      .set({
        overallRating: "0.00",
        reviewCount: 0,
        ratingPaymentReliability: "0.00",
        ratingCommunication: "0.00",
        ratingScopeChanges: "0.00",
        ratingPropertyRespect: "0.00",
        ratingPermitPulling: "0.00",
        ratingOverallJobExperience: "0.00",
        riskLevel: "unknown",
      })
      .where(eq(customers.id, customerId));
    return;
  }

  const avg = (field: keyof (typeof allReviews)[0]) => {
    const sum = allReviews.reduce((acc, r) => acc + ((r[field] as number) || 0), 0);
    return (sum / allReviews.length).toFixed(2);
  };

  const overallAvg = parseFloat(avg("overallRating"));
  const riskLevel = overallAvg === 0 ? "unknown" : overallAvg >= 4.0 ? "low" : overallAvg >= 2.5 ? "medium" : "high";

  await db
    .update(customers)
    .set({
      overallRating: avg("overallRating"),
      reviewCount: allReviews.length,
      ratingPaymentReliability: avg("ratingPaymentReliability"),
      ratingCommunication: avg("ratingCommunication"),
      ratingScopeChanges: avg("ratingScopeChanges"),
      ratingPropertyRespect: avg("ratingPropertyRespect"),
      ratingPermitPulling: avg("ratingPermitPulling"),
      ratingOverallJobExperience: avg("ratingOverallJobExperience"),
      riskLevel,
    })
    .where(eq(customers.id, customerId));
}


// ─── Review Disputes ──────────────────────────────────────────────────────────

export async function getReviewById(reviewId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);
  return result[0] || null;
}

export async function addReviewPhotos(reviewId: number, photoUrls: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const photoUrl of photoUrls) {
    await db.insert(reviewPhotos).values({ reviewId, photoUrl });
  }
}

export async function addDisputePhotos(disputeId: number, photoUrls: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const photoUrl of photoUrls) {
    await db.insert(disputePhotos).values({ disputeId, photoUrl });
  }
}

export async function createDispute(data: {
  reviewId: number;
  customerId: number;
  status: "open" | "responded" | "resolved" | "dismissed";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reviewDisputes).values({
    reviewId: data.reviewId,
    customerId: data.customerId,
    status: data.status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: (result as any).insertId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function respondToDispute(
  disputeId: number,
  response: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reviewDisputes)
    .set({
      customerResponse: response,
      status: "responded",
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reviewDisputes.id, disputeId));

  return {
    id: disputeId,
    status: "responded",
    customerResponse: response,
    respondedAt: new Date(),
  };
}

export async function getDisputesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(reviewDisputes)
    .where(eq(reviewDisputes.customerId, customerId))
    .orderBy(desc(reviewDisputes.createdAt));
}

export async function getDisputesByReview(reviewId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(reviewDisputes)
    .where(eq(reviewDisputes.reviewId, reviewId))
    .orderBy(desc(reviewDisputes.createdAt));
}

export async function resolveDispute(
  disputeId: number,
  resolution: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");


  await db
    .update(reviewDisputes)
    .set({
      status: "resolved",
      resolution: resolution,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reviewDisputes.id, disputeId));

  return {
    id: disputeId,
    status: "resolved",
    resolution: resolution,
    resolvedAt: new Date(),
  };
}
