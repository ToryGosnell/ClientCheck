import fs from "fs";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

console.log("Connecting to DB...");

const sql = fs.readFileSync(
  "drizzle/0029_first_party_auth_primitives.sql",
  "utf-8"
);

const connection = await mysql.createConnection({
  uri: DATABASE_URL,
  multipleStatements: true,
});

try {
  console.log("Running auth migration...");
  await connection.query(sql);
  console.log("Auth migration complete");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await connection.end();
}
