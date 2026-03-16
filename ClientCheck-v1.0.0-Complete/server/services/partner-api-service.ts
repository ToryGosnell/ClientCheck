import crypto from "crypto";
import { partnerApiKeys } from "../../drizzle/schema";
import { getDb } from "../db";

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createPartnerApiKey(partnerName: string, contactEmail?: string) {
  const rawKey = `cc_${crypto.randomBytes(18).toString("hex")}`;
  const apiKeyHash = hashKey(rawKey);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(partnerApiKeys).values({
    partnerName,
    contactEmail,
    apiKeyHash,
    status: "active",
    rateLimitPerHour: 500,
  });
  return { apiKey: rawKey, partnerName };
}

export async function getPartnerOverview() {
  const db = await getDb();
  if (!db) return { totalPartners: 0, activePartners: 0, rateLimitPerHour: 500 };
  const rows = await db.select().from(partnerApiKeys);
  return {
    totalPartners: rows.length,
    activePartners: rows.filter((r) => r.status === "active").length,
    revokedPartners: rows.filter((r) => r.status === "revoked").length,
    rateLimitPerHour: rows[0]?.rateLimitPerHour ?? 500,
  };
}
