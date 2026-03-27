// lib/localCron.ts
import { processAllCompletedOrders } from "../app/api/utils/stockHelpers";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Start local stock processing cron
 * Runs every 1 minute in development
 */
export function startLocalStockCron() {
  if (intervalId) {
    console.log('⚠️ Local stock cron already running');
    return;
  }
  
  console.log('🚀 Starting local stock cron (every 1 minute)...');
  console.log('📦 Will automatically process pending orders every 60 seconds');
  console.log('💡 Press Ctrl+C to stop\n');
  
  // Run immediately on start
  setTimeout(() => runStockCheck(), 1000);
  
  // Then run every 1 minute
  intervalId = setInterval(runStockCheck, 60000); // 60,000ms = 1 minute
}

/**
 * Stop local stock cron
 */
export function stopLocalStockCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Local stock cron stopped');
  }
}

/**
 * Run stock check and processing
 */
async function runStockCheck() {
  if (isRunning) {
    console.log(`[${getTimestamp()}] ⏭️ Skipping - previous run still in progress`);
    return;
  }
  
  isRunning = true;
  const startTime = Date.now();
  
  try {
    console.log(`[${getTimestamp()}] 🔄 Checking for pending orders...`);
    
    const result = await processAllCompletedOrders();
    
    const duration = Date.now() - startTime;
    
    if (result.totalOrders === 0) {
      console.log(`[${getTimestamp()}] ✅ No pending orders (${duration}ms)`);
    } else {
      console.log(`[${getTimestamp()}] ✅ Processed: ${result.processedOrders}/${result.totalOrders} orders (${duration}ms)`);
      
      if (result.failedOrders > 0) {
        console.log(`[${getTimestamp()}] ⚠️ Failed: ${result.failedOrders} orders - will retry next minute`);
      }
    }
    
  } catch (error) {
    console.error(`[${getTimestamp()}] ❌ Stock processing error:`, error);
  } finally {
    isRunning = false;
  }
}

/**
 * Get formatted timestamp
 */
function getTimestamp(): string {
  return new Date().toLocaleTimeString();
}

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
  startLocalStockCron();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopLocalStockCron();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  stopLocalStockCron();
  process.exit(0);
});