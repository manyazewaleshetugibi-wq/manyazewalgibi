#!/usr/bin/env node
/**
 * Read-only inspection of the source MongoDB database.
 * Lists every collection, document count, and a sample of field names/types.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node inspect-mongo.js
 */

const { MongoClient } = require("mongodb");

const URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://manyazewaleshetugibi_db_user:maneadmin@gold.iezvpb1.mongodb.net/gold?retryWrites=true&w=majority";
const DB_NAME = process.env.MONGO_DB || "gold";

function describeValue(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (v instanceof Date) return "date";
  if (typeof v === "object" && v._bsontype) return v._bsontype;
  return typeof v;
}

async function main() {
  console.log(`Connecting to MongoDB (db: ${DB_NAME}) ...`);
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  console.log("Connected.\n");

  const db = client.db(DB_NAME);
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log("No collections found in this database.");
    await client.close();
    return;
  }

  const report = [];
  for (const col of collections) {
    const name = col.name;
    try {
      const count = await db.collection(name).countDocuments();
      // Sample up to 5 docs to gather union of top-level fields
      const sample = await db
        .collection(name)
        .find({})
        .limit(5)
        .toArray();
      const fields = new Map();
      for (const doc of sample) {
        for (const [k, v] of Object.entries(doc)) {
          fields.set(k, describeValue(v));
        }
      }
      report.push({ name, count, fieldCount: fields.size });
    } catch (e) {
      report.push({ name, count: `ERROR: ${e.message}`, fieldCount: "-" });
    }
  }

  // Sort by count desc
  report.sort((a, b) => {
    const ca = typeof a.count === "number" ? a.count : -1;
    const cb = typeof b.count === "number" ? b.count : -1;
    return cb - ca;
  });

  console.log("=== COLLECTIONS ===");
  let totalDocs = 0;
  for (const r of report) {
    if (typeof r.count === "number") totalDocs += r.count;
    console.log(
      `${String(r.name).padEnd(35)} docs: ${String(r.count).padStart(8)}   sampledFields: ${r.fieldCount}`
    );
  }
  console.log("-".repeat(60));
  console.log(`Total collections: ${report.length}, total documents: ${totalDocs}`);

  // Save detailed field map to JSON for building the migration mapping
  const detail = {};
  for (const col of collections) {
    const name = col.name;
    const sample = await db
      .collection(name)
      .find({})
      .limit(20)
      .toArray();
    const fieldTypes = {};
    for (const doc of sample) {
      for (const [k, v] of Object.entries(doc)) {
        const t = describeValue(v);
        if (!fieldTypes[k]) fieldTypes[k] = new Set();
        fieldTypes[k].add(t);
      }
    }
    detail[name] = Object.fromEntries(
      Object.entries(fieldTypes).map(([k, v]) => [k, [...v].join("|")])
    );
  }

  const fs = require("fs");
  fs.writeFileSync(
    __dirname + "/mongo-inspection.json",
    JSON.stringify({ dbName: DB_NAME, collections: detail }, null, 2)
  );
  console.log("\nDetailed field/type map saved to migration/mongo-inspection.json");

  await client.close();
}

main().catch((e) => {
  console.error("Inspection failed:", e.message);
  process.exit(1);
});
