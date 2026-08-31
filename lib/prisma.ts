import { PrismaClient } from "@prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL || "";

  if (url.includes("neon.tech")) {
    const pool = new Pool({ connectionString: url });
    return new PrismaClient({ adapter: new PrismaNeon(pool) });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

export default prisma;
