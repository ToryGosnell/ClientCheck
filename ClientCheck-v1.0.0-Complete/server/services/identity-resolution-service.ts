import { and, eq, ne } from "drizzle-orm";
import { customerIdentityMatches, customerIdentityProfiles, customerMergeEvents, customers } from "../../drizzle/schema";
import { getDb } from "../db";
import { writeAuditLog } from "./audit-log-service";

export function normalizePhone(phone?: string | null) {
  return phone ? phone.replace(/\D/g, "") : null;
}
export function normalizeEmail(email?: string | null) {
  return email ? email.trim().toLowerCase() : null;
}
export function normalizeAddress(address?: string | null) {
  return address ? address.trim().toLowerCase().replace(/\s+/g, " ") : null;
}
export function normalizeName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim().toLowerCase().replace(/\s+/g, " ");
}

export function computeScore(source: any, target: any) {
  let score = 0;
  const reasons: string[] = [];
  if (normalizePhone(source.phone) && normalizePhone(source.phone) === normalizePhone(target.phone)) { score += 50; reasons.push("phone_match"); }
  if (normalizeEmail(source.email) && normalizeEmail(source.email) === normalizeEmail(target.email)) { score += 25; reasons.push("email_match"); }
  if (normalizeAddress(source.address) === normalizeAddress(target.address) && source.zip === target.zip) { score += 20; reasons.push("address_match"); }
  if (normalizeName(source.firstName, source.lastName) === normalizeName(target.firstName, target.lastName)) { score += 15; reasons.push("name_match"); }
  return { score: Math.min(score, 100), reasons };
}

export async function upsertCustomerIdentityProfile(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return null;
  const payload = {
    customerId,
    normalizedPhone: normalizePhone(customer.phone),
    normalizedEmail: normalizeEmail(customer.email),
    normalizedAddress: normalizeAddress(customer.address),
    normalizedName: normalizeName(customer.firstName, customer.lastName),
    confidenceScore: 50,
    duplicateClusterKey: `${normalizePhone(customer.phone) || ""}:${customer.zip}`,
  };
  const existing = await db.select().from(customerIdentityProfiles).where(eq(customerIdentityProfiles.customerId, customerId)).limit(1);
  if (existing[0]) {
    await db.update(customerIdentityProfiles).set(payload).where(eq(customerIdentityProfiles.customerId, customerId));
  } else {
    await db.insert(customerIdentityProfiles).values(payload);
  }
  return payload;
}

export async function findPotentialIdentityMatches(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  const [source] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!source) return [];
  const all = await db.select().from(customers).where(ne(customers.id, customerId));
  const suggested = [] as any[];
  for (const target of all) {
    const { score, reasons } = computeScore(source, target);
    if (score >= 50) {
      const existing = await db.select().from(customerIdentityMatches).where(and(eq(customerIdentityMatches.sourceCustomerId, customerId), eq(customerIdentityMatches.targetCustomerId, target.id))).limit(1);
      if (existing[0]) {
        await db.update(customerIdentityMatches).set({ matchScore: score, matchReasonsJson: JSON.stringify(reasons) }).where(eq(customerIdentityMatches.id, existing[0].id));
      } else {
        await db.insert(customerIdentityMatches).values({ sourceCustomerId: customerId, targetCustomerId: target.id, matchScore: score, matchReasonsJson: JSON.stringify(reasons), status: "suggested" });
      }
      suggested.push({ customerId: target.id, matchScore: score, reasons });
    }
  }
  return suggested.sort((a, b) => b.matchScore - a.matchScore);
}

export async function mergeCustomers(sourceCustomerId: number, targetCustomerId: number, mergedByUserId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set({ mergedIntoId: targetCustomerId, isDuplicate: true }).where(eq(customers.id, sourceCustomerId));
  await db.insert(customerMergeEvents).values({ sourceCustomerId, targetCustomerId, mergedByUserId, reason: reason ?? null });
  await db.update(customerIdentityMatches).set({ status: "merged", reviewedByUserId: mergedByUserId }).where(and(eq(customerIdentityMatches.sourceCustomerId, sourceCustomerId), eq(customerIdentityMatches.targetCustomerId, targetCustomerId)));
  await writeAuditLog({ actorUserId: mergedByUserId, actorRole: "admin", action: "customer.merge", entityType: "customer", entityId: `${sourceCustomerId}->${targetCustomerId}`, metadata: { reason } });
  return { success: true };
}
