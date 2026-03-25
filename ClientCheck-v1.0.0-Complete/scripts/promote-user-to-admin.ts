/**
 * Promote a user to role `admin` by email (after they have signed in once via OAuth so the row exists).
 *
 * This app uses OAuth — there is no local password for `admin@clientcheck.local`. Sign in with an IdP
 * that maps to that email (or any email), then run:
 *
 *   npx cross-env NODE_ENV=development tsx scripts/promote-user-to-admin.ts you@example.com
 *
 * Default email: admin@clientcheck.local
 *
 * Alternative (SQL):
 *   UPDATE users SET role = 'admin' WHERE LOWER(TRIM(email)) = LOWER(TRIM('admin@clientcheck.local'));
 */
import "dotenv/config";
import mysql, { type RowDataPacket } from "mysql2/promise";

async function main() {
  const email = (process.argv[2] ?? "admin@clientcheck.local").trim();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  try {
    const [res] = await conn.execute(`UPDATE users SET role = 'admin' WHERE LOWER(TRIM(COALESCE(email,''))) = LOWER(TRIM(?))`, [
      email,
    ]);
    const affected = (res as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      const [rows] = await conn.query<RowDataPacket[]>("SELECT id, email, role FROM users WHERE LOWER(TRIM(COALESCE(email,''))) = LOWER(TRIM(?)) LIMIT 1", [
        email,
      ]);
      if (rows.length === 0) {
        console.warn(`No user with email "${email}". Sign in once via OAuth to create the row, then re-run.`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(`Promoted to admin (rows updated: ${affected}). email=${email}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
