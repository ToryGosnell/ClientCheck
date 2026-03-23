/**
 * Algolia indexing for customer search (server-only; uses admin API key).
 * Client search uses EXPO_PUBLIC_* search key + same index name.
 */
import { algoliasearch, type Algoliasearch } from "algoliasearch";
import { asc, eq } from "drizzle-orm";
import { customers } from "../drizzle/schema";
import { getDb } from "./db";
import type { Customer } from "../drizzle/schema";

const APP_ID = process.env.ALGOLIA_APP_ID ?? "";
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY ?? "";
const INDEX_NAME = process.env.ALGOLIA_CUSTOMERS_INDEX_NAME ?? "";

let _adminClient: Algoliasearch | null | undefined;

function getAdminClient(): Algoliasearch | null {
  if (_adminClient !== undefined) return _adminClient;
  if (!APP_ID || !ADMIN_KEY) {
    _adminClient = null;
    return null;
  }
  _adminClient = algoliasearch(APP_ID, ADMIN_KEY);
  return _adminClient;
}

export function isAlgoliaAdminConfigured(): boolean {
  return !!(APP_ID && ADMIN_KEY && INDEX_NAME);
}

export function customerToAlgoliaRecord(row: Customer) {
  const firstName = row.firstName ?? "";
  const lastName = row.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return {
    objectID: String(row.id),
    id: row.id,
    firstName,
    lastName,
    fullName,
    city: row.city ?? "",
    state: (row.state ?? "").toUpperCase(),
    phone: row.phone ?? "",
    normalizedPhone: row.normalizedPhone ?? "",
    email: row.email ?? "",
    searchText: row.searchText ?? "",
    reviewCount: row.reviewCount,
    overallRating: String(row.overallRating ?? "0"),
    calculatedOverallScore: String(row.calculatedOverallScore ?? "0"),
    riskLevel: row.riskLevel ?? "unknown",
    wouldWorkAgainNoCount: row.wouldWorkAgainNoCount,
    criticalRedFlagCount: row.criticalRedFlagCount,
  };
}

async function ensureIndexSettings(client: Algoliasearch): Promise<void> {
  await client.setSettings({
    indexName: INDEX_NAME,
    indexSettings: {
      searchableAttributes: [
        "fullName",
        "firstName",
        "lastName",
        "phone",
        "normalizedPhone",
        "email",
        "city",
        "state",
        "searchText",
      ],
      attributesForFaceting: ["filterOnly(state)"],
    },
  });
}

export async function syncCustomerToAlgoliaById(customerId: number): Promise<void> {
  const client = getAdminClient();
  if (!client || !INDEX_NAME) return;

  const db = await getDb();
  if (!db) return;

  const rows = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  const row = rows[0];
  if (!row) {
    await client.deleteObject({ indexName: INDEX_NAME, objectID: String(customerId) });
    return;
  }
  if (row.isDuplicate) {
    await client.deleteObject({ indexName: INDEX_NAME, objectID: String(customerId) });
    return;
  }

  await client.saveObjects({
    indexName: INDEX_NAME,
    objects: [customerToAlgoliaRecord(row)],
  });
}

export async function deleteCustomerFromAlgolia(customerId: number): Promise<void> {
  const client = getAdminClient();
  if (!client || !INDEX_NAME) return;
  await client.deleteObject({ indexName: INDEX_NAME, objectID: String(customerId) });
}

export async function syncAllCustomersToAlgolia(options?: { batchSize?: number }): Promise<{
  indexed: number;
  batches: number;
}> {
  const client = getAdminClient();
  if (!client || !INDEX_NAME) {
    throw new Error("Algolia admin not configured");
  }

  await ensureIndexSettings(client);

  const batchSize = Math.min(Math.max(options?.batchSize ?? 500, 50), 1000);
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let offset = 0;
  let indexed = 0;
  let batches = 0;

  for (;;) {
    const batch = await db
      .select()
      .from(customers)
      .where(eq(customers.isDuplicate, false))
      .orderBy(asc(customers.id))
      .limit(batchSize)
      .offset(offset);

    if (batch.length === 0) break;

    const objects = batch.map(customerToAlgoliaRecord);
    await client.saveObjects({ indexName: INDEX_NAME, objects });
    indexed += objects.length;
    batches += 1;
    offset += batchSize;
  }

  return { indexed, batches };
}

/** Fire-and-forget safe wrapper for DB write paths */
export function scheduleAlgoliaCustomerSync(customerId: number): void {
  void syncCustomerToAlgoliaById(customerId).catch((e) => {
    console.warn("[Algolia] scheduleAlgoliaCustomerSync failed:", (e as Error).message);
  });
}
