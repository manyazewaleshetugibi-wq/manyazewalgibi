# MongoDB -> PostgreSQL Migration Tool

Copies **all data** from the MongoDB Atlas `gold` database into your own
PostgreSQL server (VPS). The table structure comes from your app's existing
`prisma/schema.prisma` (already exported to `schema.sql` in this folder).

**Tested end-to-end:** 52 collections / 121,616 documents migrated with 0 failures.

---

## What's in this folder

| File               | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| `schema.sql`       | Full PostgreSQL schema (tables + indexes), from Prisma schema   |
| `inspect-mongo.js` | Read-only: lists Mongo collections + document counts            |
| `migrate.js`       | Copies all data Mongo -> PostgreSQL                             |
| `verify.js`        | Compares counts between Mongo and PostgreSQL after migration    |
| `.env.example`     | Template for your connection settings                           |

## Requirements

- Node.js 18+ (Node 22 recommended)
- Network access from the VPS to MongoDB Atlas **and** to your local PostgreSQL

> If Atlas blocks the connection, add your VPS IP in Atlas:
> Network Access -> Add IP Address (or allow `0.0.0.0/0` temporarily).

---

## Steps on the VPS

### 1. Copy this folder to the VPS

```bash
scp -r migration/ user@your-vps:/opt/migration/
```

### 2. Install dependencies

```bash
cd /opt/migration
npm install --omit=dev
```

### 3. Create the target database (once)

```bash
sudo -u postgres psql -c "CREATE DATABASE gold;"
sudo -u postgres psql -c "CREATE USER myuser WITH PASSWORD 'mypassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gold TO myuser;"
```

(Or use an existing database/user — up to you.)

### 4. Configure connections

```bash
cp .env.example .env
nano .env
```

```env
MONGODB_URI=mongodb+srv://manyazewaleshetugibi_db_user:maneadmin@gold.iezvpb1.mongodb.net/gold?retryWrites=true&w=majority
MONGO_DB=gold
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/gold?schema=public
```

> URL-encode special characters in passwords: `@` -> `%40`, `#` -> `%23`, `:` -> `%3A`

### 5. Run!

```bash
# optional: look before you leap
node inspect-mongo.js

# create tables + migrate all data
node migrate.js --create-schema

# verify every collection matches
node verify.js
```

That's it. Expected output ends with:

```
ALL COLLECTIONS MATCH.
```

---

## Useful options for migrate.js

| Flag              | Effect                                                      |
|-------------------|-------------------------------------------------------------|
| `--create-schema` | Create tables/indexes first (skips ones that exist)         |
| `--only=a,b`      | Migrate only these collections                              |
| `--exclude=a,b`   | Skip these collections                                      |
| `--truncate`      | Empty all PG tables first (**destructive**)                 |
| `--batch-size=N`  | Rows per insert batch (default 500, auto-capped by columns) |
| `--dry-run`       | Read everything, write nothing                              |

## Safe to re-run

Every insert uses `ON CONFLICT ("id") DO NOTHING`, so if the migration is
interrupted just run it again — already-migrated rows are skipped and only
the remainder is copied. Re-run `migrate.js` right before switching your app
to pick up documents created during the transition window.

## After migrating

Point your Next.js app at the new database by setting in the project `.env`:

```env
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/gold?schema=public
```

Then keep this folder around until you're confident — it's also your backup
copy path if anything looks wrong.

## Notes

- Mongo `_id` becomes the Postgres `id` column (text) — relations that store
  ObjectIds as strings keep working unchanged.
- Nested objects/arrays are stored as JSONB; string arrays become real
  `text[]` columns; dates become timestamps.
- Documents with fields not present in the Prisma schema still migrate; the
  extra fields are dropped and counted (`droppedUnknownFields`).
- A detailed per-collection report is written to `migration-report.json`.
