// app/api/order/generateOrderNumber.ts
import { Prisma } from "@prisma/client";

const padNum = (n: number) => `ORD-${String(n).padStart(6, "0")}`;

/**
 * Generates a unique order number.
 *
 * The old approach sorted orderNumber `desc` and parsed `ORD-(\d+)`. A
 * non-numeric number (e.g. a test order like "ORD-TESTDEL") sorts ABOVE every
 * numeric one, so the regex silently failed and the counter reset to
 * ORD-000001 on every order — producing dozens of identical order numbers.
 *
 * This computes the max NUMERIC suffix properly and skips any number that is
 * already in use, so it never resets and never collides.
 */
export async function generateOrderNumber(prisma: Prisma.TransactionClient | any): Promise<string> {
  let maxOrderNum = 0;

  try {
    const rows: { max: bigint | null }[] = await prisma.$queryRaw`
      SELECT MAX((regexp_match("orderNumber", '^ORD-0*([0-9]+)$'))[1]::bigint) AS max
      FROM "orders"
      WHERE "orderNumber" ~ '^ORD-[0-9]+$'
    `;
    maxOrderNum = Number(rows?.[0]?.max || 0);
  } catch {
    // Fallback for environments where raw SQL is unavailable: scan the most
    // recent ORD- prefixed numbers (they increase over time) and take the max.
    const candidates: any[] = await prisma.order.findMany({
      where: { orderNumber: { startsWith: "ORD-" } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { orderNumber: true },
    });
    for (const c of candidates) {
      const m = c?.orderNumber?.match(/^ORD-(\d+)$/);
      if (m) maxOrderNum = Math.max(maxOrderNum, parseInt(m[1], 10));
    }
  }

  let nextOrderNum = maxOrderNum + 1;
  let orderNumber = padNum(nextOrderNum);

  // Guard against collisions (e.g. concurrent submissions): keep incrementing
  // until we find a number that is not already used.
  for (let attempt = 0; attempt < 25; attempt++) {
    const used = await prisma.order.count({ where: { orderNumber } });
    if (used === 0) return orderNumber;
    nextOrderNum++;
    orderNumber = padNum(nextOrderNum);
  }

  return padNum(Date.now());
}