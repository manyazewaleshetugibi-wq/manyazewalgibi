#!/usr/bin/env node
/**
 * Verifies migration completeness: compares document counts in MongoDB
 * against row counts in PostgreSQL for every mapped collection.
 *
 * Usage: node verify.js
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { Client } = require("pg");

function loadEnvFile() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnvFile();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;
const mongoDbName = process.env.MONGO_DB || "gold";
if (!MONGODB_URI || !DATABASE_URL) {
  console.error("Set MONGODB_URI and DATABASE_URL first.");
  process.exit(1);
}

(async () => {
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(mongoDbName);

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  console.log(
    "collection".padEnd(30) +
      "mongo".padStart(9) +
      "postgres".padStart(10) +
      "match".padStart(8)
  );
  console.log("-".repeat(60));

  let allOk = true;
  for (const name of collections) {
    const mongoCount = await db.collection(name).countDocuments();
    let pgCount = null;
    try {
      // _id maps to id column
      const r = await pg.query(`SELECT COUNT(*)::int AS c FROM "${name}"`);
      pgCount = r.rows[0].c;
    } catch {
      pgCount = "no table";
    }
    const ok = pgCount === mongoCount;
    if (!ok) allOk = false;
    console.log(
      name.padEnd(30) +
        String(mongoCount).padStart(9) +
        String(pgCount).padStart(10) +
        String(ok ? "OK" : "MISMATCH").padStart(8)
    );
  }

  console.log("-".repeat(60));
  console.log(allOk ? "ALL COLLECTIONS MATCH." : "There are mismatches - see above.");

  await mongo.close();
  await pg.end();
})().catch((e) => {
  console.error("Verification failed:", e.message);
  process.exit(1);
});
