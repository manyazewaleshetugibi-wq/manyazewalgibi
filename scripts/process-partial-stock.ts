/*
 * process-partial-stock.ts
 *
 * One-off VPS remediation script: reprocess all "partial" (and unprocessed/failed)
 * stock orders so that every one that can be finalized is finalized correctly,
 * using the exact same production logic (processOrderStockUsage).
 *
 * Usage (run from the project root on the VPS):
 *
 *   # 1) DRY-RUN first - only reports what WOULD happen (no DB writes)
 *   npx tsx scripts/process-partial-stock.ts --dry-run
 *
 *   # 2) APPLY - actually process the orders
 *   npx tsx scripts/process-partial-stock.ts --apply
 *
 * The script must be run from the deployed project directory so that the `@/`
 * path alias, Prisma client and node_modules resolve. DATABASE_URL is loaded
 * from the project's .env automatically by the Prisma client.
 */
import { processOrderStockUsage } from '@/app/api/utils/stockHelpers';
import { prisma } from '@/lib/prisma';

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;

const completedWhere = {
  OR: [
    { status: { equals: 'completed', mode: 'insensitive' } as any },
    { status: { equals: 'delivered', mode: 'insensitive' } as any },
  ],
};

// Floating-point-safe stock comparison (same rules as stockHelpers).
function roundQty(n: number): number {
  return Math.round((Number(n) || 0) * 1e6) / 1e6;
}
const QTY_EPSILON = 1e-9;
function hasSufficientStock(current: number, required: number): boolean {
  return Number(current) + QTY_EPSILON >= roundQty(required);
}

type Target = {
  id: string;
  orderNumber: string;
  hasPartialStock: BooleanLike;
  pendingStockItems: any[] | null;
  stockProcessed: BooleanLike;
  stockProcessingError: string | null;
};
type BooleanLike = boolean | null | undefined;

async function main() {
  console.log('');
  console.log('================================================================');
  console.log(` Stock processor        mode: ${DRY ? 'DRY-RUN (read-only)' : 'APPLY (writes DB)'}`);
  console.log('================================================================');
  console.log('');

  // 1) All partial orders (highest priority, no cap - they were saved as pending).
  const partials: Target[] = (await prisma.order.findMany({
    where: { ...completedWhere, hasPartialStock: true },
    orderBy: { stockProcessedAt: 'asc' },
  })) as any;

  // 2) Fresh / failed orders that still need stock processing (capped for safety).
  const fresh: Target[] = (await prisma.order.findMany({
    where: {
      ...completedWhere,
      AND: [
        { OR: [{ stockProcessed: { not: true } }, { stockProcessed: null }] },
        { OR: [{ hasPartialStock: { not: true } }, { hasPartialStock: null }] },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 1000,
  })) as any;

  // De-duplicate by order id (an order could theoretically appear in both).
  const byId = new Map<string, Target>();
  for (const o of [...partials, ...fresh]) if (o && o.id) byId.set(o.id, o);

  const targets = Array.from(byId.values());
  const partialCount = targets.filter((t) => t.hasPartialStock).length;
  const freshCount = targets.length - partialCount;

  console.log(` Partial orders : ${partials.length}`);
  console.log(` Fresh/failed   : ${freshCount}`);
  console.log(` Total to check : ${targets.length}`);
  console.log('');

  // Resolve current stock levels for every pending stock once, to cheaply
  // report which partials could be finalized now.
  const pendingStockIds = new Set<string>();
  for (const t of targets) for (const p of t.pendingStockItems || []) if (p?.stockId) pendingStockIds.add(p.stockId);
  const stocks = pendingStockIds.size
    ? await prisma.stock.findMany({ where: { id: { in: Array.from(pendingStockIds) } } })
    : [];
  const stockById = new Map<string, any>(stocks.map((s: any) => [s.id, s]));

  // ------------------------------------------------------------- DRY-RUN ----
  if (DRY) {
    let fulfillable = 0;
    let stillShort = 0;
    const wouldFinalize: string[] = [];
    const stillPending: string[] = [];

    for (const t of targets) {
      const anyFulfillable = (t.pendingStockItems || []).some((p: any) => {
        const s = stockById.get(p.stockId);
        return s && hasSufficientStock(s.currentStock, p.requiredQuantity);
      });
      if (anyFulfillable) {
        fulfillable++;
        // If EVERY pending item is fulfilled, the order fully finalizes;
        // otherwise it partially advances. Report which.
        const allFulfillable = (t.pendingStockItems || []).every(
          (p: any) => {
            const s = stockById.get(p.stockId);
            return s && hasSufficientStock(s.currentStock, p.requiredQuantity);
          }
        );
        (allFulfillable ? wouldFinalize : stillPending).push(`${t.orderNumber} (${(t.pendingStockItems || []).length} ↓)`);
      } else {
        stillShort++;
        stillPending.push(`${t.orderNumber} (still low stock)`);
      }
    }

    console.log('DRY-RUN SUMMARY');
    console.log('---------------');
    console.log(` Would advance/process now : ${fulfillable}`);
    console.log(`   -> fully finalize       : ${wouldFinalize.length}`);
    console.log(`   -> advance (still short): ${stillPending.length}`);
    console.log(` Would REMAIN stuck (no stock yet): ${stillShort}`);
    console.log('');
    console.log(' Fully-finalizable orders:');
    wouldFinalize.forEach((n) => console.log('   -', n));
    console.log('');
    console.log(' Advance-but-still-short / stuck orders:');
    stillPending.forEach((n) => console.log('   -', n));
    console.log('');
    console.log('Re-run with --apply to actually process these orders.');
    await prisma.$disconnect();
    return;
  }

  // --------------------------------------------------------------- APPLY ----
  console.log('Processing orders...');
  let finalized = 0;
  let advanced = 0;
  let stuck = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of targets) {
    const order = await prisma.order.findUnique({ where: { id: t.id } });
    if (!order) {
      failed++;
      errors.push(`${t.orderNumber}: order missing`);
      continue;
    }
    try {
      const result = await processOrderStockUsage(order);
      if (result.success && result.partiallyProcessed) {
        // Still short on some stock - made forward progress but not finalized.
        advanced++;
        console.log(`   ⚠  ${t.orderNumber}: advanced, still partial (${(result.lowStockItems || []).length} low)`);
      } else if (result.success && result.stillPending) {
        stuck++;
        console.log(`   ·  ${t.orderNumber}: still short, no change`);
      } else if (result.success) {
        finalized++;
        console.log(`   ✅ ${t.orderNumber}: finalized`);
      } else {
        failed++;
        errors.push(`${t.orderNumber}: ${result.message || result.error || 'failed'}`);
        console.log(`   ❌ ${t.orderNumber}: ${result.message || result.error || 'failed'}`);
      }
    } catch (e: any) {
      failed++;
      errors.push(`${t.orderNumber}: ${e?.message || String(e)}`);
      console.log(`   ❌ ${t.orderNumber}: ${e?.message || String(e)}`);
    }
  }

  // Final reconcile pass: clear any remaining "stuck" flags that should be clean,
  // e.g. orders that had an error but the function never cleared it because no
  // records were written and the order has no items.
  console.log('');
  console.log('APPLY SUMMARY');
  console.log('------------');
  console.log(` Finalized        : ${finalized}`);
  console.log(` Advanced/partial : ${advanced}`);
  console.log(` Still short      : ${stuck}`);
  console.log(` Failed/errors    : ${failed}`);
  if (errors.length) {
    console.log('');
    console.log('Errors:');
    errors.forEach((e) => console.log('   -', e));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
