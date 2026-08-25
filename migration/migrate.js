#!/usr/bin/env node
/**
 * MongoDB -> PostgreSQL data migration tool.
 *
 * Copies every document from the source MongoDB database into the matching
 * PostgreSQL table (schema comes from prisma/schema.prisma, see schema.sql).
 *
 * Features:
 *  - Type conversion driven by the live PostgreSQL column types:
 *      ObjectId/Long/Decimal128 -> text / number
 *      Date                     -> timestamp (or ISO string for text columns)
 *      objects & arrays         -> jsonb (stringified)
 *      arrays                   -> text[] where the column is an array type
 *  - Batched inserts with per-row fallback on constraint errors.
 *  - Idempotent: ON CONFLICT (id) DO NOTHING, safe to re-run.
 *  - Unknown Mongo fields that have no PG column are dropped and counted.
 *
 * Usage:
 *   node migrate.js [--create-schema] [--only=a,b] [--exclude=a,b]
 *                   [--batch-size=500] [--dry-run] [--truncate]
 *
 * Environment (process env or migration/.env file):
 *   MONGODB_URI   mongodb+srv://user:pass@host/db?...
 *   MONGO_DB      database name (default: parsed from URI or "gold")
 *   DATABASE_URL  postgresql://user:pass@host:5432/dbname
 */

const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const { Client } = require("pg");

// ---------------------------------------------------------------- env ----
function loadEnvFile() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnvFile();

// --------------------------------------------------------------- args ----
const args = process.argv.slice(2);
function flag(name) {
  return args.includes(`--${name}`);
}
function opt(name, dflt) {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : dflt;
}

const CREATE_SCHEMA = flag("create-schema");
const DRY_RUN = flag("dry-run");
const TRUNCATE = flag("truncate");
const ONLY = opt("only", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const EXCLUDE = new Set(
  opt("exclude", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
let BATCH_SIZE = parseInt(opt("batch-size", "500"), 10) || 500;

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI (set it in migration/.env or environment)");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL (target PostgreSQL, set in migration/.env)");
  process.exit(1);
}
const mongoDbName =
  process.env.MONGO_DB ||
  (() => {
    try {
      const u = new URL(MONGODB_URI.replace("mongodb+srv://", "https://").replace("mongodb://", "https://"));
      return decodeURIComponent(u.pathname.replace(/^\//, "")) || "gold";
    } catch {
      return "gold";
    }
  })();

// ------------------------------------------------------------ helpers ----
const q = (id) => `"${String(id).replace(/"/g, '""')}"`;

function pgQuoteLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" && Number.isFinite(v)) {
    return Number.isInteger(v) ? String(v) : String(v);
  }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  // escape single quotes / backslashes
  const s = String(v).replace(/'/g, "''").replace(/\\/g, "\\\\");
  return `'${s}'`;
}

/** Build a multi-row INSERT ... ON CONFLICT (id) DO NOTHING statement. */
function buildInsert(table, cols, rows) {
  const colList = cols.map(q).join(", ");
  const values = [];
  const params = [];
  let p = 0;
  for (const row of rows) {
    const ph = cols.map(() => `$${++p}`);
    values.push(`(${ph.join(", ")})`);
    for (const c of cols) params.push(row[c]);
  }
  const sql =
    `INSERT INTO ${q(table)} (${colList}) VALUES ${values.join(", ")} ` +
    `ON CONFLICT ("id") DO NOTHING`;
  return { sql, params };
}

/** Convert a BSON value to a JS value suitable for the given PG column type. */
function convertValue(value, colType) {
  if (value === null || value === undefined) return null;

  // Unwrap common BSON scalars first
  if (value instanceof ObjectId) value = value.toString();
  else if (value && typeof value === "object") {
    if (value._bsontype === "Long") value = value.toNumber();
    else if (value._bsontype === "Decimal128")
      value = parseFloat(value.toString());
    else if (value._bsontype === "Timestamp") value = value.toDate();
    else if (value._bsontype === "Binary")
      value = Buffer.from(value.buffer).toString("base64");
  }

  const isJson = colType === "json" || colType === "jsonb";
  const isArrayCol = colType.endsWith("[]");

  if (isArrayCol) {
    const elemType = colType.slice(0, -2); // e.g. text[] -> text
    let arr = Array.isArray(value) ? value : [value];
    arr = arr
      .filter((x) => x !== null && x !== undefined)
      .map((x) => convertValue(x, elemType))
      .map((x) => (x instanceof Date ? x.toISOString() : x));
    return arr;
  }

  if (isJson) {
    // jsonb accepts only valid JSON text/scalars: strings MUST be quoted,
    // objects/arrays serialized, Dates become ISO strings.
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (typeof value === "string") return JSON.stringify(value);
    if (Array.isArray(value) || typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    }
    return value; // numbers & booleans are valid JSON scalars
  }

  switch (colType) {
    case "timestamp with time zone":
    case "timestamp without time zone":
    case "date":
    case "time":
      if (value instanceof Date) return value;
      if (typeof value === "number") {
        const n = new Date(value);
        return isNaN(n.getTime()) ? null : n;
      }
      if (typeof value === "string" && value !== "") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d;
      }
      return null;
    case "smallint":
    case "integer":
    case "bigint":
    case "real":
    case "double precision": {
      const n = typeof value === "boolean" ? (value ? 1 : 0) : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case "numeric":
    case "money": {
      if (typeof value === "boolean") return value ? 1 : 0;
      const s = typeof value === "object" ? JSON.stringify(value) : String(value);
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string")
        return ["true", "t", "1", "yes", "y"].includes(value.toLowerCase());
      return null;
    default: {
      // text / varchar / char / uuid / unknown
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value);
    }
  }
}

async function getTableColumns(pg, table) {
  const res = await pg.query(
    `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const cols = {};
  for (const r of res.rows) {
    let t = r.data_type;
    if (t === "ARRAY") t = r.udt_name.replace(/^_/, "") + "[]";
    cols[r.column_name] = t;
  }
  return cols; // { name: 'text', quantity: 'double precision', ... }
}

const IGNORED_ERROR_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object
  "42701", // duplicate_column
  "42P16", // invalid_table_definition (already exists variants)
  "42P06", // duplicate_schema
  "23505", // unique_violation (row-level handled separately too)
]);

// ------------------------------------------------------------- main ------
(async () => {
  console.log("=== MongoDB -> PostgreSQL migration ===");
  console.log(`Source DB : ${mongoDbName}`);
  console.log(`Target    : ${DATABASE_URL.replace(/:[^:@/]+@/, ":****@")}`);
  console.log(
    `Options   : create-schema=${CREATE_SCHEMA} dry-run=${DRY_RUN} truncate=${TRUNCATE} batch=${BATCH_SIZE}\n`
  );

  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();
  // Speed up bulk load; safe because the migration is idempotent/re-runnable.
  try {
    await pg.query("SET synchronous_commit = OFF");
  } catch {}
  console.log("Connected to PostgreSQL.");

  if (CREATE_SCHEMA) {
    const schemaPath = path.join(__dirname, "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      console.error("schema.sql not found next to migrate.js");
      process.exit(1);
    }
    const statements = fs
      .readFileSync(schemaPath, "utf8")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    let created = 0,
      skipped = 0;
    for (const stmt of statements) {
      try {
        await pg.query(stmt);
        created++;
      } catch (e) {
        if (IGNORED_ERROR_CODES.has(e.code)) skipped++;
        else throw e;
      }
    }
    console.log(`Schema: ${created} statements applied, ${skipped} already existed.\n`);
  }

  if (TRUNCATE) {
    const res = await pg.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public'`
    );
    for (const r of res.rows) {
      await pg.query(`TRUNCATE TABLE ${q(r.tablename)} CASCADE`);
    }
    console.log(`Truncated ${res.rowCount} tables.\n`);
  }

  const mongo = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await mongo.connect();
  const db = mongo.db(mongoDbName);
  console.log("Connected to MongoDB.");

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  let targets = collections.filter((c) => !EXCLUDE.has(c));
  if (ONLY.length) targets = collections.filter((c) => ONLY.includes(c));

  const report = [];
  const noTable = [];

  for (const name of targets) {
    let tableCols;
    try {
      tableCols = await getTableColumns(pg, name);
    } catch {
      /* checked below */
    }
    if (!tableCols || Object.keys(tableCols).length === 0) {
      const count = await db.collection(name).countDocuments();
      if (count > 0) noTable.push({ name, count });
      continue;
    }

    const colNames = Object.keys(tableCols);
    // Keep total bind params per statement under ~55k (PG limit 65535)
    const effBatch = Math.max(20, Math.min(BATCH_SIZE, Math.floor(55000 / colNames.length)));
    const cursor = db.collection(name).find({}).batchSize(effBatch);

    let read = 0,
      inserted = 0,
      failed = 0,
      droppedFields = 0,
      buffer = [],
      dupSkipped = 0;

    const flush = async () => {
      if (!buffer.length) return;
      const rows = buffer.splice(0, buffer.length);
      if (DRY_RUN) return;
      try {
        const { sql, params } = buildInsert(name, colNames, rows);
        const r = await pg.query(sql, params);
        inserted += r.rowCount;
      } catch (batchErr) {
        // Fallback: insert row by row so one bad row doesn't kill the batch
        for (const row of rows) {
          try {
            const { sql, params } = buildInsert(name, colNames, [row]);
            const r = await pg.query(sql, params);
            inserted += r.rowCount;
            if (r.rowCount === 0) dupSkipped++;
          } catch (rowErr) {
            failed++;
            if (failed <= 3) {
              console.warn(
                `  [${name}] row error (${rowErr.code || ""} ${
                  rowErr.detail || rowErr.message
                }). id=${row.id}`
              );
            }
          }
        }
      }
    };

    let doc;
    while ((doc = await cursor.next())) {
      read++;
      const row = {};
      for (const cn of colNames) {
        if (cn === "id") {
          row.id = doc._id != null ? convertValue(doc._id, "text") : null;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(doc, cn)) {
          row[cn] = convertValue(doc[cn], tableCols[cn]);
        } else {
          row[cn] = null;
        }
      }
      droppedFields += Object.keys(doc).filter(
        (k) => k !== "_id" && !tableCols[k]
      ).length;

      buffer.push(row);
      if (buffer.length >= effBatch) await flush();

      if (read % 20000 === 0)
        console.log(`  [${name}] ${read.toLocaleString()} docs read...`);
    }
    await flush();

    report.push({ collection: name, read, inserted, dupSkipped, failed, droppedFields });
    console.log(
      `[${name}] read=${read.toLocaleString()} inserted=${inserted.toLocaleString()} skippedDupes=${dupSkipped} failed=${failed}` +
        (droppedFields ? ` droppedUnknownFields=${droppedFields}` : "")
    );
  }

  await mongo.close();
  await pg.end();

  console.log("\n=== SUMMARY ===");
  const totRead = report.reduce((a, r) => a + r.read, 0);
  const totIns = report.reduce((a, r) => a + r.inserted, 0);
  const totFail = report.reduce((a, r) => a + r.failed, 0);
  for (const r of report.sort((a, b) => b.read - a.read)) {
    console.log(
      `${r.collection.padEnd(30)} read=${String(r.read).padStart(7)}  inserted=${String(
        r.inserted
      ).padStart(7)}  failed=${r.failed}`
    );
  }
  console.log("-".repeat(70));
  console.log(
    `TOTAL read=${totRead.toLocaleString()} inserted=${totIns.toLocaleString()} failed=${totFail}`
  );
  if (noTable.length) {
    console.log("\nCollections WITHOUT a PostgreSQL table (skipped):");
    for (const t of noTable) console.log(`  ${t.name}: ${t.count} docs`);
  }
  if (DRY_RUN) console.log("\n(dry-run mode: nothing was written)");

  fs.writeFileSync(
    path.join(__dirname, "migration-report.json"),
    JSON.stringify({ at: new Date().toISOString(), report, noTable }, null, 2)
  );
  console.log("\nReport saved to migration/migration-report.json");

  process.exit(totFail > 0 ? 2 : 0);
})().catch((e) => {
  console.error("MIGRATION FAILED:", e);
  process.exit(1);
});
