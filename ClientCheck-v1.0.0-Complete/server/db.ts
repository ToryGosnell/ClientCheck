import { and, desc, eq, gte, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { Pool as MysqlCallbackPool } from "mysql2";
import {
  contractorProfiles,
  customerProfileViews,
  customerResponses,
  customerRiskScores,
  customers,
  reviewHelpfulVotes,
  reviewDisputes,
  reviewPhotos,
  disputePhotos,
  reviews,
  users,
  type Customer,
  type InsertCustomer,
  type InsertReview,
  type InsertUser,
  type User,
} from "../drizzle/schema";
import { sortCustomersBySearchRanking } from "../shared/customer-search-ranking";
import { ENV } from "./_core/env";
import { normalizeEmail } from "../shared/customer-helpers";

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

type AppDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function loadVerifiedCustomerEmailsSet(database: AppDatabase): Promise<Set<string>> {
  const rows = await database
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.role, "customer"), eq(users.isVerified, true)));
  const set = new Set<string>();
  for (const r of rows) {
    const n = normalizeEmail(r.email);
    if (n) set.add(n);
  }
  return set;
}

export function customerEmailIsIdentityVerified(
  customerEmail: string | null | undefined,
  verifiedEmails: Set<string>,
): boolean {
  const n = normalizeEmail(customerEmail);
  return n != null && verifiedEmails.has(n);
}

export async function enrichCustomersWithIdentityVerified<T extends { email?: string | null }>(
  database: AppDatabase,
  rows: T[],
): Promise<Array<T & { identityVerified: boolean }>> {
  if (rows.length === 0) return [];
  const verifiedEmails = await loadVerifiedCustomerEmailsSet(database);
  return rows.map((r) => ({
    ...r,
    identityVerified: customerEmailIsIdentityVerified(r.email ?? null, verifiedEmails),
  }));
}

export async function enrichReviewRowsWithCustomerIdentityVerified<T extends { customerEmail?: string | null }>(
  database: AppDatabase,
  rows: T[],
): Promise<Array<T & { customerIdentityVerified: boolean }>> {
  if (rows.length === 0) return [];
  const verifiedEmails = await loadVerifiedCustomerEmailsSet(database);
  return rows.map((r) => ({
    ...r,
    customerIdentityVerified: customerEmailIsIdentityVerified(r.customerEmail ?? null, verifiedEmails),
  }));
}

/**
 * Use the same mysql2 pool as Drizzle (driver uses createPool({ uri })), so REST search does not
 * rely on a second pool that might parse DATABASE_URL differently.
 */
async function resolveMysqlPromisePool(): Promise<mysql.Pool | null> {
  const db = await getDb();
  if (db) {
    const raw = (db as unknown as { $client?: MysqlCallbackPool }).$client;
    if (raw && typeof raw.promise === "function") {
      return raw.promise();
    }
    console.error("[db] Drizzle instance has no mysql2 $client; falling back to standalone pool");
  }
  return getMysqlPool();
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

/**
 * Records a one-time "shared customer profile" referral on the signed-in user (`userId`).
 * Does not overwrite an existing `referredByUserId`.
 */
export async function recordShareReferralOnce(params: {
  userId: number;
  referrerUserId: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const userId = Math.floor(Number(params.userId));
  const referrerUserId = Math.floor(Number(params.referrerUserId));
  if (!Number.isFinite(userId) || userId < 1 || !Number.isFinite(referrerUserId) || referrerUserId < 1) {
    return { ok: false, reason: "invalid" };
  }
  if (userId === referrerUserId) {
    return { ok: false, reason: "self" };
  }

  const dbConn = await getDb();
  if (!dbConn) {
    return { ok: false, reason: "no_db" };
  }

  const refRow = await dbConn.select({ id: users.id }).from(users).where(eq(users.id, referrerUserId)).limit(1);
  if (refRow.length === 0) {
    return { ok: false, reason: "referrer_not_found" };
  }

  const me = await dbConn
    .select({ referredByUserId: users.referredByUserId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (me.length === 0) {
    return { ok: false, reason: "user_not_found" };
  }
  if (me[0].referredByUserId != null) {
    return { ok: false, reason: "already_set" };
  }

  await dbConn.update(users).set({ referredByUserId: referrerUserId }).where(eq(users.id, userId));
  return { ok: true };
}

/** Active users may authenticate; soft-deleted / suspended may not. */
export function isUserAccountActive(user: Pick<Partial<User>, "accountStatus" | "deletedAt">): boolean {
  if (user.deletedAt != null) return false;
  const status = user.accountStatus ?? "active";
  return status === "active";
}

/**
 * Soft-delete a contractor user: keeps the `users` row (and foreign keys) so customers and reviews stay intact.
 * Clears PII on the user and contractor profile; sets subscription cancelled separately (caller).
 */
export async function softDeleteContractorUser(userId: number): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const now = new Date();
  await dbConn.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        accountStatus: "deleted",
        deletedAt: now,
        name: "Former contractor",
        email: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    await tx
      .update(contractorProfiles)
      .set({
        trade: null,
        licenseNumber: null,
        company: null,
        city: null,
        state: null,
        bio: null,
        idDocumentUrl: null,
        licenseDocumentUrl: null,
        insuranceDocumentUrl: null,
        verificationNotes: null,
        updatedAt: now,
      })
      .where(eq(contractorProfiles.userId, userId));
  });
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

export async function updateContractorLicense(userId: number, licenseNumber: string) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const existing = await getContractorProfile(userId);
  if (existing) {
    await dbConn
      .update(contractorProfiles)
      .set({
        licenseNumber,
        verificationStatus: "pending",
        verificationSubmittedAt: new Date(),
      })
      .where(eq(contractorProfiles.userId, userId));
  } else {
    await dbConn.insert(contractorProfiles).values({
      userId,
      licenseNumber,
      verificationStatus: "pending",
      verificationSubmittedAt: new Date(),
    });
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────

/** Columns we may SELECT — intersected with SHOW COLUMNS so MySQL never references missing fields. */
const CUSTOMERS_SELECT_COLUMNS: (keyof Customer)[] = [
  "id",
  "firstName",
  "lastName",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zip",
  "normalizedName",
  "normalizedPhone",
  "normalizedEmail",
  "normalizedAddressKey",
  "searchText",
  "mergedIntoId",
  "isDuplicate",
  "overallRating",
  "calculatedOverallScore",
  "reviewCount",
  "wouldWorkAgainYesCount",
  "wouldWorkAgainNoCount",
  "wouldWorkAgainNaCount",
  "redFlagCount",
  "criticalRedFlagCount",
  "greenFlagCount",
  "ratingPaymentReliability",
  "ratingCommunication",
  "ratingScopeChanges",
  "ratingPropertyRespect",
  "ratingPermitPulling",
  "ratingOverallJobExperience",
  "riskLevel",
  "contractorProfileViewCount",
  "createdByUserId",
  "createdAt",
  "updatedAt",
];

let _mysqlPool: mysql.Pool | null = null;
let _customersColumnSet: Set<string> | null = null;

function getMysqlPool(): mysql.Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Match drizzle-orm/mysql2 driver: createPool({ uri: connectionString })
  if (!_mysqlPool) _mysqlPool = mysql.createPool({ uri: url });
  return _mysqlPool;
}

/** Call after migrations if the server stays up (optional; restarts reload columns). */
export function invalidateCustomersColumnCache() {
  _customersColumnSet = null;
}

async function loadCustomersColumnSet(): Promise<Set<string>> {
  if (_customersColumnSet) return _customersColumnSet;
  const pool = await resolveMysqlPromisePool();
  if (!pool) return new Set();
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM `customers`");
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error("[loadCustomersColumnSet] SHOW COLUMNS returned no rows for `customers`");
      return new Set();
    }
    _customersColumnSet = new Set(
      rows
        .map((r) => {
          const row = r as RowDataPacket & { Field?: unknown; field?: unknown };
          return String(row.Field ?? row.field ?? "");
        })
        .filter(Boolean),
    );
    return _customersColumnSet;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string; sqlMessage?: string; sqlState?: string };
    console.error("[loadCustomersColumnSet] SHOW COLUMNS failed:", err);
    console.error("[loadCustomersColumnSet] mysql detail:", {
      code: e.code,
      errno: e.errno,
      sqlMessage: e.sqlMessage,
      sqlState: e.sqlState,
    });
    throw err;
  }
}

/** Quote a MySQL identifier from information_schema / SHOW COLUMNS (may contain reserved chars). */
function tickIdent(name: string): string {
  const s = String(name);
  if (!s) throw new Error("Empty SQL identifier");
  return `\`${s.replace(/`/g, "``")}\``;
}

/**
 * Map drizzle logical column names to whatever the live MySQL table actually uses
 * (camelCase vs snake_case, case differences). Prevents ER_BAD_FIELD_ERROR on SELECT/WHERE/ORDER BY.
 */
function resolveDbColumn(cols: Set<string>, logical: string): string | null {
  if (cols.has(logical)) return logical;
  const lowerLogical = logical.toLowerCase();
  for (const c of cols) {
    if (c.toLowerCase() === lowerLogical) return c;
  }
  const snake = logical
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  if (cols.has(snake)) return snake;
  for (const c of cols) {
    if (c.toLowerCase() === snake) return c;
  }
  return null;
}

function alignCustomerRow(row: RowDataPacket, pairs: { logical: string; actual: string }[]): RowDataPacket {
  const out: RowDataPacket = { ...row };
  for (const { logical, actual } of pairs) {
    if (logical !== actual && row[actual] !== undefined) {
      out[logical] = row[actual];
    }
  }
  return out;
}

/** Map a DB row to `Customer` for tRPC when the live table has fewer columns than `drizzle/schema`. */
function rowToCustomer(row: RowDataPacket): Customer {
  const g = (k: string) => row[k];
  const num = (k: string, d: number) => {
    const v = g(k);
    if (v == null || v === "") return d;
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const str = (k: string, d = "") => (g(k) != null && g(k) !== "" ? String(g(k)) : d);
  const strNull = (k: string) => (g(k) != null && String(g(k)) !== "" ? String(g(k)) : null);
  const dec = (k: string, d = "0.00") => (g(k) != null ? String(g(k)) : d);
  const bool = (k: string, d = false) => {
    const v = g(k);
    if (v === true || v === 1 || v === "1") return true;
    if (v === false || v === 0 || v === "0") return false;
    return d;
  };
  const dt = (k: string) => {
    const v = g(k);
    if (v == null) return new Date();
    return v instanceof Date ? v : new Date(String(v));
  };
  return {
    id: num("id", 0),
    firstName: str("firstName", ""),
    lastName: str("lastName", ""),
    phone: str("phone", ""),
    email: strNull("email"),
    address: str("address", ""),
    city: str("city", ""),
    state: str("state", ""),
    zip: str("zip", ""),
    normalizedName: strNull("normalizedName"),
    normalizedPhone: strNull("normalizedPhone"),
    normalizedEmail: strNull("normalizedEmail"),
    normalizedAddressKey: strNull("normalizedAddressKey"),
    searchText: strNull("searchText"),
    mergedIntoId: g("mergedIntoId") != null ? num("mergedIntoId", 0) : null,
    isDuplicate: bool("isDuplicate", false),
    overallRating: dec("overallRating", "0.00"),
    calculatedOverallScore: dec("calculatedOverallScore", "0.00"),
    reviewCount: num("reviewCount", 0),
    wouldWorkAgainYesCount: num("wouldWorkAgainYesCount", 0),
    wouldWorkAgainNoCount: num("wouldWorkAgainNoCount", 0),
    wouldWorkAgainNaCount: num("wouldWorkAgainNaCount", 0),
    redFlagCount: num("redFlagCount", 0),
    criticalRedFlagCount: num("criticalRedFlagCount", 0),
    greenFlagCount: num("greenFlagCount", 0),
    ratingPaymentReliability: dec("ratingPaymentReliability", "0.00"),
    ratingCommunication: dec("ratingCommunication", "0.00"),
    ratingScopeChanges: dec("ratingScopeChanges", "0.00"),
    ratingPropertyRespect: dec("ratingPropertyRespect", "0.00"),
    ratingPermitPulling: dec("ratingPermitPulling", "0.00"),
    ratingOverallJobExperience: dec("ratingOverallJobExperience", "0.00"),
    riskLevel: (str("riskLevel", "unknown") as Customer["riskLevel"]) || "unknown",
    contractorProfileViewCount: num("contractorProfileViewCount", 0),
    createdByUserId:
      g("createdByUserId") != null && g("createdByUserId") !== ""
        ? num("createdByUserId", 0)
        : null,
    createdAt: dt("createdAt"),
    updatedAt: dt("updatedAt"),
  };
}

/**
 * Ranking CASE (lower tier = better). Only references columns present in `cols`.
 * Tiers: name → normalizedName → city → searchText → phone/email/normalizedPhone → state.
 */
function buildSearchRankCase(
  cols: Set<string>,
  qt: string,
  q: string,
  digitsOnly: string,
): { sql: string; params: unknown[] } {
  const ql = qt.toLowerCase();
  const chunks: string[] = [];
  const params: unknown[] = [];
  const hasFN = cols.has("firstName");
  const hasLN = cols.has("lastName");

  if (hasFN && hasLN) {
    chunks.push(`WHEN LOWER(TRIM(CONCAT(${tickIdent("firstName")}, ' ', ${tickIdent("lastName")}))) = ? THEN 1`);
    params.push(ql);
    chunks.push(
      `WHEN LOWER(TRIM(${tickIdent("firstName")})) = ? OR LOWER(TRIM(${tickIdent("lastName")})) = ? THEN 2`,
    );
    params.push(ql, ql);
    chunks.push(
      `WHEN LOWER(TRIM(CONCAT(${tickIdent("firstName")}, ' ', ${tickIdent("lastName")}))) LIKE CONCAT(?, '%') THEN 3`,
    );
    params.push(ql);
    chunks.push(
      `WHEN LOWER(TRIM(${tickIdent("firstName")})) LIKE CONCAT(?, '%') OR LOWER(TRIM(${tickIdent("lastName")})) LIKE CONCAT(?, '%') THEN 4`,
    );
    params.push(ql, ql);
    chunks.push(
      `WHEN LOWER(TRIM(CONCAT(${tickIdent("firstName")}, ' ', ${tickIdent("lastName")}))) LIKE CONCAT('%', ?, '%') THEN 5`,
    );
    params.push(ql);
    chunks.push(
      `WHEN LOWER(TRIM(${tickIdent("firstName")})) LIKE CONCAT('%', ?, '%') OR LOWER(TRIM(${tickIdent("lastName")})) LIKE CONCAT('%', ?, '%') THEN 6`,
    );
    params.push(ql, ql, ql);
  } else if (hasFN) {
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("firstName")})) = ? THEN 1`);
    params.push(ql);
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("firstName")})) LIKE CONCAT(?, '%') THEN 3`);
    params.push(ql);
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("firstName")})) LIKE CONCAT('%', ?, '%') THEN 5`);
    params.push(ql);
  } else if (hasLN) {
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("lastName")})) = ? THEN 1`);
    params.push(ql);
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("lastName")})) LIKE CONCAT(?, '%') THEN 3`);
    params.push(ql);
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("lastName")})) LIKE CONCAT('%', ?, '%') THEN 5`);
    params.push(ql);
  }

  if (cols.has("normalizedName")) {
    chunks.push(
      `WHEN COALESCE(${tickIdent("normalizedName")}, '') <> '' AND LOWER(TRIM(${tickIdent("normalizedName")})) LIKE CONCAT(?, '%') THEN 7`,
    );
    params.push(ql);
    chunks.push(
      `WHEN COALESCE(${tickIdent("normalizedName")}, '') <> '' AND LOWER(TRIM(${tickIdent("normalizedName")})) LIKE CONCAT('%', ?, '%') THEN 8`,
    );
    params.push(ql);
  }
  if (cols.has("city")) {
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("city")})) LIKE CONCAT('%', ?, '%') THEN 9`);
    params.push(ql);
  }
  if (cols.has("searchText")) {
    chunks.push(
      `WHEN COALESCE(${tickIdent("searchText")}, '') <> '' AND LOWER(${tickIdent("searchText")}) LIKE CONCAT('%', ?, '%') THEN 10`,
    );
    params.push(ql);
  }

  const t11: string[] = [];
  const t11p: unknown[] = [];
  if (cols.has("phone")) {
    t11.push(`${tickIdent("phone")} LIKE ?`);
    t11p.push(q);
  }
  if (cols.has("email")) {
    t11.push(`LOWER(TRIM(COALESCE(${tickIdent("email")}, ''))) LIKE ?`);
    t11p.push(`%${ql}%`);
  }
  if (digitsOnly.length >= 2 && cols.has("normalizedPhone")) {
    t11.push(`LOWER(TRIM(${tickIdent("normalizedPhone")})) LIKE ?`);
    t11p.push(`%${digitsOnly}%`);
  }
  if (t11.length) {
    chunks.push(`WHEN (${t11.join(" OR ")}) THEN 11`);
    params.push(...t11p);
  }

  if (cols.has("state")) {
    chunks.push(`WHEN LOWER(TRIM(${tickIdent("state")})) LIKE CONCAT('%', ?, '%') THEN 12`);
    params.push(ql);
  }

  const inner = chunks.length ? chunks.join("\n    ") : "";
  const rankSql = inner ? `CASE\n    ${inner}\n    ELSE 99\n  END` : "99";
  return { sql: rankSql, params };
}

export async function searchCustomers(query: string, limit = 15, state?: string, city?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[searchCustomers] getDb() unavailable");
    return [];
  }
  const q = `%${query}%`;
  const qt = query.trim();
  const digitsOnly = query.replace(/\D/g, "");
  const normalizedQ = `%${qt.toLowerCase().replace(/\s+/g, " ")}%`;

  const matchOr = [
    like(customers.firstName, q),
    like(customers.lastName, q),
    like(customers.phone, q),
    like(customers.email, q),
    like(customers.city, q),
    like(customers.state, q),
    sql`CONCAT(${customers.firstName}, ' ', ${customers.lastName}) LIKE ${q}`,
    like(customers.normalizedName, normalizedQ),
    like(customers.searchText, normalizedQ),
  ];
  if (digitsOnly.length >= 2) {
    matchOr.push(like(customers.normalizedPhone, `%${digitsOnly}%`));
  }

  const conditions = [eq(customers.isDuplicate, false), or(...matchOr)];

  const stateUpper = state && state.length === 2 ? state.toUpperCase() : null;
  if (stateUpper) conditions.push(eq(customers.state, stateUpper));
  if (city) conditions.push(like(customers.city, `%${city}%`));

  /**
   * Ranking (lower tier = higher in results). Name tiers use LOWER() so "karen" ranks like "Karen".
   *
   * 1–6: display name (exact full → exact first/last → prefix full → prefix first/last → contains full → contains first/last)
   * 7–8: normalizedName prefix / contains
   * 9: city
   * 10: searchText
   * 11: phone / email / normalizedPhone (digits, only if query has 2+ digits)
   * 12: state column text
   *
   * With a 2-letter state filter, WHERE state = ? already limits rows to that state.
   * Same tier: higher reviewCount, then newer updatedAt.
   */
  const nameRank =
    digitsOnly.length >= 2
      ? sql`CASE
    WHEN LOWER(TRIM(CONCAT(${customers.firstName}, ' ', ${customers.lastName}))) = LOWER(${qt}) THEN 1
    WHEN LOWER(TRIM(${customers.firstName})) = LOWER(${qt}) OR LOWER(TRIM(${customers.lastName})) = LOWER(${qt}) THEN 2
    WHEN LOWER(TRIM(CONCAT(${customers.firstName}, ' ', ${customers.lastName}))) LIKE CONCAT(LOWER(${qt}), '%') THEN 3
    WHEN LOWER(TRIM(${customers.firstName})) LIKE CONCAT(LOWER(${qt}), '%')
      OR LOWER(TRIM(${customers.lastName})) LIKE CONCAT(LOWER(${qt}), '%') THEN 4
    WHEN LOWER(TRIM(CONCAT(${customers.firstName}, ' ', ${customers.lastName}))) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 5
    WHEN LOWER(TRIM(${customers.firstName})) LIKE CONCAT('%', LOWER(${qt}), '%')
      OR LOWER(TRIM(${customers.lastName})) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 6
    WHEN COALESCE(${customers.normalizedName}, '') <> '' AND LOWER(TRIM(${customers.normalizedName})) LIKE CONCAT(LOWER(${qt}), '%') THEN 7
    WHEN COALESCE(${customers.normalizedName}, '') <> '' AND LOWER(${customers.normalizedName}) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 8
    WHEN LOWER(TRIM(${customers.city})) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 9
    WHEN COALESCE(${customers.searchText}, '') <> '' AND LOWER(${customers.searchText}) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 10
    WHEN ${customers.phone} LIKE ${q}
      OR LOWER(TRIM(COALESCE(${customers.email}, ''))) LIKE CONCAT('%', LOWER(${qt}), '%')
      OR LOWER(TRIM(${customers.normalizedPhone})) LIKE ${`%${digitsOnly}%`} THEN 11
    WHEN LOWER(TRIM(${customers.state})) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 12
    ELSE 99
  END`
      : sql`CASE
    WHEN LOWER(TRIM(CONCAT(${customers.firstName}, ' ', ${customers.lastName}))) = LOWER(${qt}) THEN 1
    WHEN LOWER(TRIM(${customers.firstName})) = LOWER(${qt}) OR LOWER(TRIM(${customers.lastName})) = LOWER(${qt}) THEN 2
    WHEN LOWER(TRIM(CONCAT(${customers.firstName}, ' ', ${customers.lastName}))) LIKE CONCAT(LOWER(${qt}), '%') THEN 3
    WHEN LOWER(TRIM(${customers.firstName})) LIKE CONCAT(LOWER(${qt}), '%')
      OR LOWER(TRIM(${customers.lastName})) LIKE CONCAT(LOWER(${qt}), '%') THEN 4
    WHEN LOWER(TRIM(CONCAT(${customers.firstName}, ' ', ${customers.lastName}))) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 5
    WHEN LOWER(TRIM(${customers.firstName})) LIKE CONCAT('%', LOWER(${qt}), '%')
      OR LOWER(TRIM(${customers.lastName})) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 6
    WHEN COALESCE(${customers.normalizedName}, '') <> '' AND LOWER(TRIM(${customers.normalizedName})) LIKE CONCAT(LOWER(${qt}), '%') THEN 7
    WHEN COALESCE(${customers.normalizedName}, '') <> '' AND LOWER(${customers.normalizedName}) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 8
    WHEN LOWER(TRIM(${customers.city})) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 9
    WHEN COALESCE(${customers.searchText}, '') <> '' AND LOWER(${customers.searchText}) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 10
    WHEN ${customers.phone} LIKE ${q}
      OR LOWER(TRIM(COALESCE(${customers.email}, ''))) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 11
    WHEN LOWER(TRIM(${customers.state})) LIKE CONCAT('%', LOWER(${qt}), '%') THEN 12
    ELSE 99
  END`;

  const results = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(nameRank, desc(customers.reviewCount), desc(customers.updatedAt))
    .limit(limit);

  if (process.env.NODE_ENV !== "production") {
    console.log("[searchCustomers]", {
      qt,
      stateUpper,
      city: city ?? null,
      limit,
      rowCount: results.length,
    });
  }

  if (results.length === 0) return results;
  const enriched = await enrichCustomersWithIdentityVerified(db, results);
  return sortCustomersBySearchRanking(enriched);
}

/**
 * Public customer search for REST GET /api/customers?search=
 * Case-insensitive on name (first, last, full), email, phone; digit match on normalized phone.
 *
 * Uses mysql2 + SHOW COLUMNS so we never SELECT or reference fields missing on older DBs
 * (Drizzle `.select()` without arguments lists every schema column and crashes with ER_BAD_FIELD_ERROR).
 */
export async function searchCustomersApi(query: string, limit = 500) {
  const pool = await resolveMysqlPromisePool();
  if (!pool) {
    console.warn("[searchCustomersApi] MySQL pool unavailable (getDb() / DATABASE_URL missing?)");
    return [];
  }
  const raw = query.trim();
  if (raw.length < 2) return [];

  const cols = await loadCustomersColumnSet();
  if (cols.size === 0) {
    console.warn("[searchCustomersApi] customers table missing or unreadable");
    return [];
  }

  const col = (logical: keyof Customer) => resolveDbColumn(cols, String(logical));

  const selectPairs = CUSTOMERS_SELECT_COLUMNS.map((logical) => {
    const actual = col(logical);
    return actual ? { logical: String(logical), actual } : null;
  }).filter((x): x is { logical: string; actual: string } => x != null);

  if (selectPairs.length === 0) {
    console.warn("[searchCustomersApi] no customer columns matched drizzle names (check naming vs DB)");
    return [];
  }

  const lowerPattern = `%${raw.toLowerCase()}%`;
  const digits = raw.replace(/\D/g, "");

  const orChunks: string[] = [];
  const params: unknown[] = [];

  const fName = col("firstName");
  const lName = col("lastName");
  const emailC = col("email");
  const phoneC = col("phone");
  const normPhone = col("normalizedPhone");

  if (fName && lName) {
    orChunks.push(
      `LOWER(CONCAT(COALESCE(${tickIdent(fName)},''), ' ', COALESCE(${tickIdent(lName)},''))) LIKE ?`,
    );
    params.push(lowerPattern);
  }
  if (fName) {
    orChunks.push(`LOWER(COALESCE(${tickIdent(fName)},'')) LIKE ?`);
    params.push(lowerPattern);
  }
  if (lName) {
    orChunks.push(`LOWER(COALESCE(${tickIdent(lName)},'')) LIKE ?`);
    params.push(lowerPattern);
  }
  if (emailC) {
    orChunks.push(`LOWER(COALESCE(${tickIdent(emailC)},'')) LIKE ?`);
    params.push(lowerPattern);
  }
  if (phoneC) {
    orChunks.push(`LOWER(COALESCE(${tickIdent(phoneC)},'')) LIKE ?`);
    params.push(lowerPattern);
  }
  if (digits.length >= 2 && normPhone) {
    orChunks.push(`LOWER(TRIM(COALESCE(${tickIdent(normPhone)},''))) LIKE ?`);
    params.push(`%${digits}%`);
  }

  if (orChunks.length === 0) {
    console.warn("[searchCustomersApi] no searchable columns resolved (first/last/email/phone/normalizedPhone)");
    return [];
  }

  const whereAnd: string[] = [`(${orChunks.join(" OR ")})`];
  const dupCol = col("isDuplicate");
  if (dupCol) {
    const d = tickIdent(dupCol);
    whereAnd.unshift(`(${d} IS NULL OR ${d} = 0 OR ${d} = FALSE)`);
  }

  const orderChunks: string[] = [];
  const rc = col("reviewCount");
  if (rc) orderChunks.push(`${tickIdent(rc)} DESC`);
  const ua = col("updatedAt");
  if (ua) orderChunks.push(`${tickIdent(ua)} DESC`);
  const idc = col("id");
  if (orderChunks.length === 0 && idc) orderChunks.push(`${tickIdent(idc)} DESC`);

  const lim = Math.min(Math.max(1, limit), 500);
  const orderBySql = orderChunks.length ? ` ORDER BY ${orderChunks.join(", ")}` : "";
  const sqlText = `SELECT ${selectPairs.map((p) => tickIdent(p.actual)).join(", ")} FROM ${tickIdent("customers")} WHERE ${whereAnd.join(" AND ")}${orderBySql} LIMIT ?`;
  params.push(lim);

  let rows: RowDataPacket[];
  try {
    const [r] = await pool.query<RowDataPacket[]>(sqlText, params);
    rows = Array.isArray(r) ? r : [];
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string; sqlMessage?: string; sql?: string; errno?: number };
    console.error("[searchCustomersApi] SELECT failed:", err);
    console.error("[searchCustomersApi] mysql detail:", {
      code: e.code,
      errno: e.errno,
      sqlMessage: e.sqlMessage,
      sql: e.sql,
    });
    throw err;
  }
  const mapped = rows
    .filter((row): row is RowDataPacket => row != null && typeof row === "object" && !Array.isArray(row))
    .map((row) => rowToCustomer(alignCustomerRow(row, selectPairs)));
  const drizzleDb = await getDb();
  if (!drizzleDb || mapped.length === 0) return mapped;
  const enriched = await enrichCustomersWithIdentityVerified(drizzleDb, mapped);
  return sortCustomersBySearchRanking(enriched);
}

export type DirectoryCustomerInsights = {
  matched: boolean;
  customerId: number | null;
  directoryReviewCount: number;
  contractorProfileViewCount: number;
  criticalRedFlagCount: number;
  directoryRiskLevel: Customer["riskLevel"];
  engineRiskScore: number | null;
  engineRiskLevel: "critical" | "high" | "medium" | "low" | null;
};

const EMPTY_DIRECTORY_INSIGHTS: DirectoryCustomerInsights = {
  matched: false,
  customerId: null,
  directoryReviewCount: 0,
  contractorProfileViewCount: 0,
  criticalRedFlagCount: 0,
  directoryRiskLevel: "unknown",
  engineRiskScore: null,
  engineRiskLevel: null,
};

/**
 * Match logged-in customer user to a directory row by email (normalized + raw trim).
 * Used for verification paywall triggers and profile-view counts.
 */
export async function getDirectoryCustomerInsightsForUser(userId: number): Promise<DirectoryCustomerInsights> {
  const database = await getDb();
  if (!database) return EMPTY_DIRECTORY_INSIGHTS;

  const [urow] = await database.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const em = normalizeEmail(urow?.email ?? null);
  if (!em) return EMPTY_DIRECTORY_INSIGHTS;

  const [crow] = await database
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.isDuplicate, false),
        or(eq(customers.normalizedEmail, em), sql`LOWER(TRIM(COALESCE(${customers.email},''))) = ${em}`),
      ),
    )
    .limit(1);

  if (!crow) return EMPTY_DIRECTORY_INSIGHTS;

  const [riskRow] = await database
    .select()
    .from(customerRiskScores)
    .where(eq(customerRiskScores.customerId, crow.id))
    .limit(1);

  return {
    matched: true,
    customerId: crow.id,
    directoryReviewCount: crow.reviewCount,
    contractorProfileViewCount: crow.contractorProfileViewCount ?? 0,
    criticalRedFlagCount: crow.criticalRedFlagCount,
    directoryRiskLevel: crow.riskLevel,
    engineRiskScore: riskRow?.riskScore ?? null,
    engineRiskLevel: riskRow?.riskLevel ?? null,
  };
}

/** Short-lived cache for weekly view stats (reduces repeated reads when share modal opens). */
const weeklyCustomerViewStatsCache = new Map<string, { at: number; value: number }>();
const WEEKLY_VIEW_STATS_TTL_MS = 60_000;

/**
 * Count of distinct contractors who viewed this customer's profile in the last 7 days.
 */
export async function getWeeklyDistinctCustomerProfileViews(customerId: number): Promise<number> {
  const id = Math.floor(Number(customerId));
  if (!Number.isFinite(id) || id < 1) return 0;

  const cacheKey = String(id);
  const now = Date.now();
  const cached = weeklyCustomerViewStatsCache.get(cacheKey);
  if (cached && now - cached.at < WEEKLY_VIEW_STATS_TTL_MS) {
    return cached.value;
  }

  const database = await getDb();
  if (!database) return 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [row] = await database
    .select({
      weeklyViews: sql<number>`count(distinct ${customerProfileViews.userId})`.mapWith(Number),
    })
    .from(customerProfileViews)
    .where(and(eq(customerProfileViews.customerId, id), gte(customerProfileViews.viewedAt, oneWeekAgo)));

  const value = Number.isFinite(row?.weeklyViews) ? Math.max(0, Math.floor(row!.weeklyViews)) : 0;
  weeklyCustomerViewStatsCache.set(cacheKey, { at: now, value });
  return value;
}

/** Increment when an authenticated contractor opens a directory customer profile. Returns new count or null if missing DB/customer. */
export async function incrementCustomerContractorProfileViews(
  customerId: number,
  contractorUserId: number,
): Promise<number | null> {
  const database = await getDb();
  if (!database) return null;
  const uid = Math.floor(Number(contractorUserId));
  if (!Number.isFinite(uid) || uid < 1) return null;

  try {
    const [exists] = await database
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!exists) return null;

    try {
      await database.insert(customerProfileViews).values({
        customerId,
        userId: uid,
        viewedAt: new Date(),
      });
      weeklyCustomerViewStatsCache.delete(String(customerId));
    } catch (insertErr) {
      console.warn("[incrementCustomerContractorProfileViews] profile view row insert failed:", insertErr);
    }

    await database
      .update(customers)
      .set({ contractorProfileViewCount: sql`${customers.contractorProfileViewCount} + 1` })
      .where(eq(customers.id, customerId));

    const [row] = await database
      .select({ contractorProfileViewCount: customers.contractorProfileViewCount })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    return row?.contractorProfileViewCount ?? null;
  } catch (err) {
    console.warn("[incrementCustomerContractorProfileViews]", err);
    return null;
  }
}

export async function getCustomerById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const rows = await database.select().from(customers).where(eq(customers.id, id)).limit(1);
  const c = rows[0] ?? null;
  if (!c) return null;
  const [enriched] = await enrichCustomersWithIdentityVerified(database, [c]);
  return enriched;
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
  if (data.createdByUserId == null) {
    throw new Error("createdByUserId is required when creating a customer");
  }
  const { normalizeName, normalizePhone, normalizeEmail, normalizeAddress, buildCustomerSearchText } = await import("../shared/customer-helpers");
  const enriched = {
    ...data,
    normalizedName: normalizeName(`${data.firstName} ${data.lastName}`),
    normalizedPhone: normalizePhone(data.phone) ?? data.phone,
    normalizedEmail: normalizeEmail(data.email as string),
    normalizedAddressKey: normalizeAddress(data.address as string, data.city as string, data.state as string, data.zip as string),
    searchText: buildCustomerSearchText(data as any),
  };
  const result = await db.insert(customers).values(enriched);
  const id = result[0].insertId as number;
  void import("./algolia-customers").then(({ scheduleAlgoliaCustomerSync }) =>
    scheduleAlgoliaCustomerSync(id),
  );
  return id;
}

/**
 * Find an existing customer by normalized identifiers, or create a new one.
 * Priority: exact email > exact phone > exact address+name > name+location.
 */
export async function findOrCreateCustomer(
  data: InsertCustomer,
): Promise<{ id: number; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { normalizeName, normalizePhone, normalizeEmail, normalizeAddress } = await import("../shared/customer-helpers");

  const nEmail = normalizeEmail(data.email as string);
  const nPhone = normalizePhone(data.phone);
  const nName = normalizeName(`${data.firstName} ${data.lastName}`);
  const nAddr = normalizeAddress(data.address as string, data.city as string, data.state as string, data.zip as string);

  // 1. Match by exact normalized email
  if (nEmail) {
    const rows = await db.select().from(customers)
      .where(and(eq(customers.normalizedEmail, nEmail), eq(customers.isDuplicate, false)))
      .limit(1);
    if (rows[0]) return { id: rows[0].id, isNew: false };
  }

  // 2. Match by exact normalized phone
  if (nPhone) {
    const rows = await db.select().from(customers)
      .where(and(eq(customers.normalizedPhone, nPhone), eq(customers.isDuplicate, false)))
      .limit(1);
    if (rows[0]) return { id: rows[0].id, isNew: false };
  }

  // 3. Match by normalized address key
  if (nAddr && nAddr.length > 5) {
    const rows = await db.select().from(customers)
      .where(and(eq(customers.normalizedAddressKey, nAddr), eq(customers.isDuplicate, false)))
      .limit(1);
    if (rows[0]) return { id: rows[0].id, isNew: false };
  }

  // 4. Match by normalized name + city/state
  if (nName && (data.city || data.state)) {
    const nameQ = nName;
    const rows = await db.select().from(customers)
      .where(and(
        eq(customers.normalizedName, nameQ),
        eq(customers.city, data.city || ""),
        eq(customers.state, data.state || ""),
        eq(customers.isDuplicate, false),
      ))
      .limit(1);
    if (rows[0]) return { id: rows[0].id, isNew: false };
  }

  // No match — create new
  const id = await createCustomer(data);
  return { id, isNew: true };
}

/**
 * Find potential customer matches based on normalized fields.
 * Returns ranked matches — exact identifier matches first, then name+location.
 */
export async function findPotentialCustomerMatches(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const {
    normalizeName, normalizePhone, normalizeEmail, normalizeAddress,
  } = await import("../shared/customer-helpers");

  const nPhone = normalizePhone(input.phone);
  const nEmail = normalizeEmail(input.email);
  const nName = input.firstName && input.lastName
    ? normalizeName(`${input.firstName} ${input.lastName}`)
    : null;
  const nAddr = normalizeAddress(input.address, input.city, input.state, input.zip);

  const conditions: ReturnType<typeof eq>[] = [];
  if (nEmail) conditions.push(eq(customers.normalizedEmail, nEmail));
  if (nPhone) conditions.push(eq(customers.normalizedPhone, nPhone));
  if (nAddr && nAddr.length > 5) conditions.push(eq(customers.normalizedAddressKey, nAddr));
  if (nName) {
    if (input.city || input.state) {
      conditions.push(
        sql`${customers.normalizedName} = ${nName} AND ${customers.city} = ${input.city || ""} AND ${customers.state} = ${input.state || ""}` as any,
      );
    }
    conditions.push(eq(customers.normalizedName, nName));
  }

  if (conditions.length === 0) return [];

  const rows = await db.select().from(customers)
    .where(and(eq(customers.isDuplicate, false), or(...conditions)))
    .orderBy(desc(customers.reviewCount))
    .limit(limit);

  // Rank: exact phone/email = 100, address = 80, name+location = 60, name-only = 40
  const ranked = rows
    .map((c) => {
      let matchScore = 0;
      const cNorm = c.normalizedPhone;
      if (nPhone && cNorm === nPhone) matchScore = Math.max(matchScore, 100);
      if (nEmail && c.normalizedEmail === nEmail) matchScore = Math.max(matchScore, 100);
      if (nAddr && c.normalizedAddressKey === nAddr) matchScore = Math.max(matchScore, 80);
      if (nName && c.normalizedName === nName) {
        const locMatch = c.city === (input.city || "") && c.state === (input.state || "");
        matchScore = Math.max(matchScore, locMatch ? 60 : 40);
      }
      return { ...c, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
  return enrichCustomersWithIdentityVerified(db, ranked);
}

export async function getRecentlyFlaggedCustomers(limit = 10) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database
    .select()
    .from(customers)
    .where(eq(customers.riskLevel, "high"))
    .orderBy(desc(customers.updatedAt))
    .limit(limit);
  return enrichCustomersWithIdentityVerified(database, rows);
}

export async function getTopRatedCustomers(limit = 10) {
  const database = await getDb();
  if (!database) return [];
  const rows = await database
    .select()
    .from(customers)
    .where(eq(customers.riskLevel, "low"))
    .orderBy(desc(customers.overallRating))
    .limit(limit);
  return enrichCustomersWithIdentityVerified(database, rows);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviewById(reviewId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: reviews.id,
      customerId: reviews.customerId,
      contractorUserId: reviews.contractorUserId,
      overallRating: reviews.overallRating,
      calculatedOverallRating: reviews.calculatedOverallRating,
      ratingPaymentReliability: reviews.ratingPaymentReliability,
      ratingCommunication: reviews.ratingCommunication,
      ratingScopeChanges: reviews.ratingScopeChanges,
      ratingPropertyRespect: reviews.ratingPropertyRespect,
      ratingPermitPulling: reviews.ratingPermitPulling,
      ratingOverallJobExperience: reviews.ratingOverallJobExperience,
      categoryDataJson: reviews.categoryDataJson,
      wouldWorkAgain: reviews.wouldWorkAgain,
      reviewText: reviews.reviewText,
      jobType: reviews.jobType,
      jobDate: reviews.jobDate,
      jobAmount: reviews.jobAmount,
      redFlags: reviews.redFlags,
      greenFlags: reviews.greenFlags,
      helpfulCount: reviews.helpfulCount,
      createdAt: reviews.createdAt,
      moderationStatus: reviews.moderationStatus,
      contractorName: users.name,
      contractorTrade: contractorProfiles.trade,
      contractorVerified: contractorProfiles.verificationStatus,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      customerCity: customers.city,
      customerState: customers.state,
      customerEmail: customers.email,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.contractorUserId, users.id))
    .leftJoin(contractorProfiles, eq(reviews.contractorUserId, contractorProfiles.userId))
    .leftJoin(customers, eq(reviews.customerId, customers.id))
    .where(eq(reviews.id, reviewId))
    .limit(1);
  const row = rows[0] ?? null;
  if (!row) return null;
  const database = await getDb();
  if (!database) return { ...row, customerIdentityVerified: false };
  const [enriched] = await enrichReviewRowsWithCustomerIdentityVerified(database, [row]);
  return enriched;
}

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
      calculatedOverallRating: reviews.calculatedOverallRating,
      ratingPaymentReliability: reviews.ratingPaymentReliability,
      ratingCommunication: reviews.ratingCommunication,
      ratingScopeChanges: reviews.ratingScopeChanges,
      ratingPropertyRespect: reviews.ratingPropertyRespect,
      ratingPermitPulling: reviews.ratingPermitPulling,
      ratingOverallJobExperience: reviews.ratingOverallJobExperience,
      categoryDataJson: reviews.categoryDataJson,
      wouldWorkAgain: reviews.wouldWorkAgain,
      reviewText: reviews.reviewText,
      jobType: reviews.jobType,
      jobDate: reviews.jobDate,
      jobAmount: reviews.jobAmount,
      redFlags: reviews.redFlags,
      greenFlags: reviews.greenFlags,
      helpfulCount: reviews.helpfulCount,
      createdAt: reviews.createdAt,
      contractorName: users.name,
      contractorTrade: contractorProfiles.trade,
      contractorVerified: contractorProfiles.verificationStatus,
      moderationStatus: reviews.moderationStatus,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.contractorUserId, users.id))
    .leftJoin(contractorProfiles, eq(reviews.contractorUserId, contractorProfiles.userId))
    .where(sql`${reviews.customerId} IN (${sql.raw(customerIds.join(","))})`)
    .orderBy(desc(reviews.createdAt));

  const { legacyToCategories, aggregateCategoryRatings, legacyToWouldWorkAgain, deserializeNewCategories } = await import("../shared/review-categories");
  const { parseFlags: parseFlagsHelper } = await import("../shared/review-flags");

  const perReviewCategories = allReviews.map((r) => {
    const parsed = deserializeNewCategories(r.categoryDataJson);
    return parsed?.categories ?? legacyToCategories(r as Record<string, unknown>);
  });

  const aggregatedCategories = aggregateCategoryRatings(perReviewCategories);

  // overallRating in the DB already reflects the wouldWorkAgain override,
  // so the aggregate is a straight average of stored values.
  const aggregatedRatings = {
    overallRating: (() => {
      const vals = allReviews
        .map((r) => r.overallRating)
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      return vals.length > 0 ? vals.reduce((sum, v) => sum + v, 0) / vals.length : 0;
    })(),
    calculatedOverallRating: (() => {
      const vals: number[] = [];
      for (const r of allReviews) {
        const parsed = deserializeNewCategories(r.categoryDataJson);
        let n: number | null = null;
        if (parsed != null && (parsed as { calculatedOverallRating?: unknown }).calculatedOverallRating != null) {
          const p = parseFloat(String((parsed as { calculatedOverallRating?: unknown }).calculatedOverallRating));
          if (!Number.isNaN(p)) n = p;
        }
        if (n == null && typeof r.overallRating === "number" && !Number.isNaN(r.overallRating)) {
          n = r.overallRating;
        }
        if (n != null) vals.push(n);
      }
      return vals.length > 0 ? vals.reduce((sum, v) => sum + v, 0) / vals.length : 0;
    })(),
    reviewCount: allReviews.length,
    categories: aggregatedCategories,
    wouldNotWorkAgainCount: allReviews.filter((r) => r.wouldWorkAgain === "no").length,
    redFlagCounts: (() => {
      const counts: Record<string, number> = {};
      for (const r of allReviews) {
        const { redFlags: rf } = parseFlagsHelper(r.redFlags);
        for (const f of rf) { counts[f] = (counts[f] || 0) + 1; }
      }
      return counts;
    })(),
    greenFlagCounts: (() => {
      const counts: Record<string, number> = {};
      for (const r of allReviews) {
        const { greenFlags: gf } = parseFlagsHelper(r.redFlags);
        for (const f of gf) { counts[f] = (counts[f] || 0) + 1; }
      }
      return counts;
    })(),
    ratingPaymentReliability: 0,
    ratingCommunication: 0,
    ratingScopeChanges: 0,
    ratingPropertyRespect: 0,
    ratingPermitPulling: 0,
    ratingOverallJobExperience: 0,
  };

  if (allReviews.length > 0) {
    const legacyAvg = (field: string) => {
      const vals = allReviews
        .map((r) => (r as Record<string, unknown>)[field])
        .filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };
    aggregatedRatings.ratingPaymentReliability = legacyAvg("ratingPaymentReliability");
    aggregatedRatings.ratingCommunication = legacyAvg("ratingCommunication");
    aggregatedRatings.ratingScopeChanges = legacyAvg("ratingScopeChanges");
    aggregatedRatings.ratingPropertyRespect = legacyAvg("ratingPropertyRespect");
    aggregatedRatings.ratingPermitPulling = legacyAvg("ratingPermitPulling");
    aggregatedRatings.ratingOverallJobExperience = legacyAvg("ratingOverallJobExperience");
  }

  const reviewIdsWithResponse = new Set<number>();
  if (allReviews.length > 0) {
    const ids = allReviews.map((r) => r.id);
    const respRows = await db
      .select({ reviewId: customerResponses.reviewId })
      .from(customerResponses)
      .where(inArray(customerResponses.reviewId, ids));
    for (const row of respRows) {
      reviewIdsWithResponse.add(row.reviewId);
    }
  }

  const reviewsWithMeta = allReviews.map((r) => ({
    ...r,
    hasCustomerResponse: reviewIdsWithResponse.has(r.id),
  }));

  return { reviews: reviewsWithMeta, aggregatedRatings };
}

export async function getReviewsByContractor(contractorUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const list = await db
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
      customerEmail: customers.email,
    })
    .from(reviews)
    .leftJoin(customers, eq(reviews.customerId, customers.id))
    .where(eq(reviews.contractorUserId, contractorUserId))
    .orderBy(desc(reviews.createdAt));
  return enrichReviewRowsWithCustomerIdentityVerified(db, list);
}

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.contractorUserId == null) {
    throw new Error("contractorUserId is required when creating a review");
  }
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
  if (!review[0] || review[0].contractorUserId == null || review[0].contractorUserId !== contractorUserId) {
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
  const database = await getDb();
  if (!database) return [];
  const list = await database
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
      customerEmail: customers.email,
      contractorName: users.name,
      contractorTrade: contractorProfiles.trade,
    })
    .from(reviews)
    .leftJoin(customers, eq(reviews.customerId, customers.id))
    .leftJoin(users, eq(reviews.contractorUserId, users.id))
    .leftJoin(contractorProfiles, eq(reviews.contractorUserId, contractorProfiles.userId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
  return enrichReviewRowsWithCustomerIdentityVerified(database, list);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recompute all customer aggregate fields from their reviews.
 * Includes reviews from merged duplicate customers.
 * Exported so it can be called from routers and admin tools.
 */
export async function recomputeCustomerAggregates(customerId: number) {
  const db = await getDb();
  if (!db) return;

  // Include reviews from merged duplicates
  const mergedCustomers = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.mergedIntoId, customerId));
  const customerIds = [customerId, ...mergedCustomers.map((c) => c.id)];

  const allReviews = await db
    .select()
    .from(reviews)
    .where(sql`${reviews.customerId} IN (${sql.raw(customerIds.join(","))})`);

  const { computeCustomerAggregates } = await import("../shared/customer-helpers");
  const agg = computeCustomerAggregates(allReviews as any);

  // Legacy flat averages (1–5 only; 0 = unset/N/A in newer reviews — exclude from mean)
  const avg = (field: string) => {
    const vals = allReviews
      .map((r) => (r as any)[field])
      .filter((v) => typeof v === "number" && v >= 1 && v <= 5);
    if (vals.length === 0) return "0.00";
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2);
  };

  await db
    .update(customers)
    .set({
      overallRating: agg.overallScore,
      calculatedOverallScore: agg.calculatedOverallScore,
      reviewCount: agg.reviewCount,
      wouldWorkAgainYesCount: agg.wouldWorkAgainYesCount,
      wouldWorkAgainNoCount: agg.wouldWorkAgainNoCount,
      wouldWorkAgainNaCount: agg.wouldWorkAgainNaCount,
      redFlagCount: agg.redFlagCount,
      criticalRedFlagCount: agg.criticalRedFlagCount,
      greenFlagCount: agg.greenFlagCount,
      ratingPaymentReliability: avg("ratingPaymentReliability"),
      ratingCommunication: avg("ratingCommunication"),
      ratingScopeChanges: avg("ratingScopeChanges"),
      ratingPropertyRespect: avg("ratingPropertyRespect"),
      ratingPermitPulling: avg("ratingPermitPulling"),
      ratingOverallJobExperience: avg("ratingOverallJobExperience"),
      riskLevel: agg.riskLevel,
    })
    .where(eq(customers.id, customerId));

  void import("./algolia-customers").then(({ scheduleAlgoliaCustomerSync }) =>
    scheduleAlgoliaCustomerSync(customerId),
  );
}

/** @deprecated Use recomputeCustomerAggregates instead */
const recalculateCustomerRatings = recomputeCustomerAggregates;


// ─── Review Disputes ──────────────────────────────────────────────────────────

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

type DisputeReasonDb =
  | "incorrect_information"
  | "wrong_individual"
  | "harassment_abuse"
  | "privacy_concern"
  | "outdated_information"
  | "other";

export async function createDispute(data: {
  reviewId: number;
  customerId: number;
  status:
    | "open"
    | "responded"
    | "resolved"
    | "dismissed"
    | "pending"
    | "under_review"
    | "awaiting_info"
    | "rejected";
  reason?: DisputeReasonDb | null;
  customerResponse?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reviewDisputes).values({
    reviewId: data.reviewId,
    customerId: data.customerId,
    status: data.status,
    reason: data.reason ?? null,
    customerResponse: data.customerResponse ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: (result[0] as any).insertId as number,
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
