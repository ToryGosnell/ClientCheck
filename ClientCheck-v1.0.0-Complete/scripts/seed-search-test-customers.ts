/**
 * Inserts search-test customers (unique 555 phones).
 * Adapts to actual `customers` columns (SHOW COLUMNS) so older DBs without normalized* still work.
 *
 * Usage: npm run db:seed:search
 */
import "dotenv/config";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import {
  buildCustomerSearchText,
  normalizeAddress,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "../shared/customer-helpers";

const SEED_OPEN_ID = "seed-search-test-contractor";

type SeedRow = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  reviewCount?: number;
  overallRating?: string;
  riskLevel?: string;
};

const ROWS: SeedRow[] = [
  { firstName: "Karen", lastName: "Mitchell", phone: "+1-602-555-0101", email: "karen.mitchell@example.com", address: "1423 Elm St", city: "Phoenix", state: "AZ", zip: "85001", reviewCount: 4, overallRating: "3.20", riskLevel: "medium" },
  { firstName: "Karen", lastName: "Martinez", phone: "+1-520-555-0102", email: "karen.martinez@example.com", address: "88 Cactus Ln", city: "Tucson", state: "AZ", zip: "85701", reviewCount: 2, overallRating: "4.10", riskLevel: "low" },
  { firstName: "Karen", lastName: "MacDonald", phone: "+1-303-555-0103", email: "karen.macdonald@example.com", address: "2100 Mountain View Dr", city: "Denver", state: "CO", zip: "80202", reviewCount: 1, overallRating: "4.50", riskLevel: "low" },
  { firstName: "Sarah", lastName: "Mitchell", phone: "+1-512-555-0104", email: "sarah.mitchell@example.com", address: "404 Oak Blvd", city: "Austin", state: "TX", zip: "78701", reviewCount: 6, overallRating: "4.80", riskLevel: "low" },
  { firstName: "Sarah", lastName: "Jones", phone: "+1-214-555-0105", email: "sarah.jones@example.com", address: "900 Commerce St", city: "Dallas", state: "TX", zip: "75201", reviewCount: 3, overallRating: "3.90", riskLevel: "low" },
  { firstName: "Mike", lastName: "Thompson", phone: "+1-206-555-0106", email: "mike.thompson@example.com", address: "77 Pine St", city: "Seattle", state: "WA", zip: "98101", reviewCount: 5, overallRating: "4.20", riskLevel: "low" },
  { firstName: "John", lastName: "Davis", phone: "+1-503-555-0107", email: "john.davis@example.com", address: "300 River Rd", city: "Portland", state: "OR", zip: "97201", reviewCount: 8, overallRating: "3.50", riskLevel: "medium" },
  { firstName: "James", lastName: "Wilson", phone: "+1-305-555-0108", email: "james.wilson@example.com", address: "1 Ocean Dr", city: "Miami", state: "FL", zip: "33139", reviewCount: 2, overallRating: "4.00", riskLevel: "low" },
  { firstName: "Emily", lastName: "Brown", phone: "+1-404-555-0109", email: "emily.brown@example.com", address: "55 Peachtree Ave", city: "Atlanta", state: "GA", zip: "30303", reviewCount: 4, overallRating: "4.60", riskLevel: "low" },
  { firstName: "Lisa", lastName: "Anderson", phone: "+1-312-555-0110", email: "lisa.anderson@example.com", address: "200 Lake St", city: "Chicago", state: "IL", zip: "60601", reviewCount: 7, overallRating: "3.80", riskLevel: "low" },
  { firstName: "David", lastName: "Garcia", phone: "+1-713-555-0111", email: "david.garcia@example.com", address: "44 Bayou St", city: "Houston", state: "TX", zip: "77002", reviewCount: 1, overallRating: "4.30", riskLevel: "unknown" },
  { firstName: "Amanda", lastName: "Chen", phone: "+1-619-555-0112", email: "amanda.chen@example.com", address: "1200 Harbor Way", city: "San Diego", state: "CA", zip: "92101", reviewCount: 9, overallRating: "4.70", riskLevel: "low" },
  { firstName: "Robert", lastName: "Lee", phone: "+1-617-555-0113", email: "robert.lee@example.com", address: "8 Beacon St", city: "Boston", state: "MA", zip: "02108", reviewCount: 3, overallRating: "3.40", riskLevel: "medium" },
  { firstName: "Jennifer", lastName: "White", phone: "+1-615-555-0114", email: "jennifer.white@example.com", address: "500 Music Row", city: "Nashville", state: "TN", zip: "37203", reviewCount: 2, overallRating: "4.90", riskLevel: "low" },
  { firstName: "Chris", lastName: "Taylor", phone: "+1-702-555-0115", email: "chris.taylor@example.com", address: "777 Strip Blvd", city: "Las Vegas", state: "NV", zip: "89101", reviewCount: 5, overallRating: "4.10", riskLevel: "low" },
  { firstName: "Marcus", lastName: "Nguyen", phone: "+1-415-555-0116", email: "marcus.nguyen@example.com", address: "90 Market St", city: "San Francisco", state: "CA", zip: "94102", reviewCount: 0, overallRating: "0.00", riskLevel: "unknown" },
];

function rowToValues(row: SeedRow, createdByUserId: number): Record<string, string | number | boolean> {
  const base = {
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    createdByUserId,
    isDuplicate: false,
    reviewCount: row.reviewCount ?? 0,
    overallRating: row.overallRating ?? "0.00",
    riskLevel: row.riskLevel ?? "unknown",
    normalizedName: normalizeName(`${row.firstName} ${row.lastName}`),
    normalizedPhone: normalizePhone(row.phone) ?? row.phone.replace(/\D/g, ""),
    normalizedEmail: normalizeEmail(row.email) ?? "",
    normalizedAddressKey: normalizeAddress(row.address, row.city, row.state, row.zip) ?? "",
    searchText: buildCustomerSearchText({
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
    }),
  };
  return base as Record<string, string | number | boolean>;
}

async function getCustomerColumns(conn: Connection): Promise<Set<string>> {
  const [rows] = await conn.query<RowDataPacket[]>("SHOW COLUMNS FROM customers");
  return new Set(rows.map((r) => String(r.Field)));
}

async function resolveCreatedByUserId(conn: Connection): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM users ORDER BY id ASC LIMIT 1");
  const first = rows[0] as { id: number } | undefined;
  if (first?.id) return Number(first.id);

  await conn.execute(
    "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
    [SEED_OPEN_ID, "Search seed contractor", "seed-search@clientcheck.local", "seed", "user"],
  );
  const [r2] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE openId = ? LIMIT 1", [SEED_OPEN_ID]);
  const id = (r2[0] as { id: number } | undefined)?.id;
  if (!id) throw new Error("Failed to read seed user id after insert");
  return Number(id);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const conn = await mysql.createConnection(url);
  const cols = await getCustomerColumns(conn);
  const createdByUserId = await resolveCreatedByUserId(conn);

  let inserted = 0;
  let skipped = 0;
  for (const row of ROWS) {
    const [dup] = await conn.query<RowDataPacket[]>("SELECT id FROM customers WHERE phone = ? LIMIT 1", [row.phone]);
    if (dup.length > 0) {
      console.log("skip (exists)", row.firstName, row.lastName, row.phone);
      skipped += 1;
      continue;
    }
    const full = rowToValues(row, createdByUserId);
    const keys = Object.keys(full).filter((k) => cols.has(k));
    if (!keys.includes("firstName") || !keys.includes("lastName") || !keys.includes("phone")) {
      throw new Error("customers table missing required columns firstName/lastName/phone");
    }
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO customers (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;
    const params = keys.map((k) => full[k]);
    await conn.execute(sql, params);
    console.log("inserted", row.firstName, row.lastName);
    inserted += 1;
  }
  await conn.end();
  console.log(`Done. inserted=${inserted} skipped=${skipped} (createdByUserId=${createdByUserId}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
