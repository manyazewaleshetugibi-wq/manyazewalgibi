import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createResponse } from "@/lib/utils";
import { ObjectId } from "mongodb";

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getFrequencyDays(frequency: string): number {
  const map: Record<string, number> = {
    daily: 1,
    weekly: 7,
    "15days": 15,
    monthly: 30,
    "2months": 60,
    "3months": 90,
    "6months": 180,
    "9months": 270,
    yearly: 365,
  };
  return map[frequency] || 30;
}

function has21HoursPassed(lastGeneratedAt: Date): boolean {
  const now = new Date();
  const hoursDiff = (now.getTime() - lastGeneratedAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 21;
}

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    
    let settings = await db.collection("system_settings").findOne({ key: "last_purchase_request_generation" });
    const lastGenerationTime = settings?.value ? new Date(settings.value) : null;
    
    if (lastGenerationTime && !has21HoursPassed(lastGenerationTime)) {
      const hoursLeft = 21 - ((new Date().getTime() - lastGenerationTime.getTime()) / (1000 * 60 * 60));
      return createResponse(429, false, `Please wait ${Math.ceil(hoursLeft)} hours before generating new requests`, {
        hoursRemaining: Math.ceil(hoursLeft),
        lastGeneratedAt: lastGenerationTime
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const stocks = await db.collection("stocks").find({ isActive: true }).toArray();
    const existingTodayRequests = await db.collection("purchase_requests").find({ requestDate: today }).toArray();
    const existingStockIdsToday = new Set(existingTodayRequests.map(r => r.stockId));
    const purchases = await db.collection("stock_purchases").find().toArray();
    
    const generatedRequests = [];
    
    for (const stock of stocks) {
      const stockIdStr = stock._id.toString();
      
      if (existingStockIdsToday.has(stockIdStr)) {
        continue;
      }
      
      let requestedQuantity = 0;
      let reason: 'minimum_stock_reached' | 'reorder_frequency_due' = 'minimum_stock_reached';
      let needsReorder = false;
      
      // Calculate using requiredAmount - currentStock
      if (stock.requiredAmount > 0) {
        requestedQuantity = Math.max(0, stock.requiredAmount - stock.currentStock);
        
        if (requestedQuantity > 0) {
          needsReorder = true;
          reason = 'minimum_stock_reached';
        }
      }
      
      // Check reorder frequency
      if (!needsReorder) {
        const stockPurchases = purchases.filter(p => p.stockId === stockIdStr);
        if (stockPurchases.length > 0) {
          const lastPurchase = stockPurchases.sort((a, b) => 
            new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
          )[0];
          
          const lastPurchaseDate = new Date(lastPurchase.purchaseDate);
          const daysSince = daysBetween(lastPurchaseDate, new Date());
          const frequencyDays = getFrequencyDays(stock.reorderFrequency || 'monthly');
          
          if (daysSince >= frequencyDays && stock.requiredAmount > 0) {
            needsReorder = true;
            reason = 'reorder_frequency_due';
            requestedQuantity = Math.max(0, stock.requiredAmount - stock.currentStock);
          }
        }
      }
      
      if (needsReorder && requestedQuantity > 0) {
        const stockPurchases = purchases.filter(p => p.stockId === stockIdStr);
        const lastPurchases = stockPurchases
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
          .slice(0, 3);
        
        const avgUnitPrice = lastPurchases.length > 0
          ? lastPurchases.reduce((sum, p) => sum + p.unitPrice, 0) / lastPurchases.length
          : 0;
        
        const request = {
          stockId: stockIdStr,
          stockName: stock.name,
          categoryId: stock.categoryId,
          unit: stock.unit,
          reorderFrequency: stock.reorderFrequency || 'monthly',
          requiredAmount: stock.requiredAmount || 0,
          requestDate: today,
          requestDateTime: new Date(),
          requestedQuantity: requestedQuantity,
          currentStock: stock.currentStock,
          minimumStock: stock.minimumStock,
          estimatedUnitPrice: avgUnitPrice,
          estimatedTotalCost: requestedQuantity * avgUnitPrice,
          isDelivered: false,
          isPurchased: false,
          isConfirmed: false,
          reason: reason,
          status: 'pending',
          notes: `Auto-generated: Required: ${stock.requiredAmount}, Current: ${stock.currentStock}, Need: ${requestedQuantity}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await db.collection("purchase_requests").insertOne(request);
        generatedRequests.push({ ...request, _id: result.insertedId });
      }
    }
    
    await db.collection("system_settings").updateOne(
      { key: "last_purchase_request_generation" },
      { $set: { value: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
    
    return createResponse(200, true, `${generatedRequests.length} purchase requests generated`, {
      count: generatedRequests.length,
      requests: generatedRequests,
      date: today,
      lastGeneratedAt: new Date()
    });
  } catch (error) {
    console.error("POST /purchase-request/generate Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const settings = await db.collection("system_settings").findOne({ key: "last_purchase_request_generation" });
    const lastGenerationTime = settings?.value ? new Date(settings.value) : null;
    
    let canGenerate = true;
    let hoursRemaining = 0;
    
    if (lastGenerationTime) {
      const hoursPassed = (new Date().getTime() - lastGenerationTime.getTime()) / (1000 * 60 * 60);
      if (hoursPassed < 21) {
        canGenerate = false;
        hoursRemaining = Math.ceil(21 - hoursPassed);
      }
    }
    
    return createResponse(200, true, "Generation status", {
      canGenerate,
      hoursRemaining,
      lastGeneratedAt: lastGenerationTime
    });
  } catch (error) {
    console.error("GET /purchase-request/generate Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}














