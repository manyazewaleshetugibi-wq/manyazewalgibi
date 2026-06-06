import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createResponse } from "@/lib/utils";

function getNextReorderDate(frequency: string, fromDate: Date): Date {
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
  const days = map[frequency] || 30;
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return createResponse(400, false, "Invalid request ID format");
    }
    
    const client = await clientPromise;
    const db = client.db("gold");
    const request = await db.collection("purchase_requests").findOne({ _id: new ObjectId(id) });
    
    if (!request) {
      return createResponse(404, false, "Purchase request not found");
    }
    
    let stock = null;
    if (ObjectId.isValid(request.stockId)) {
      stock = await db.collection("stocks").findOne({ _id: new ObjectId(request.stockId) });
    }
    
    const requestWithStock = {
      ...request,
      currentStockLevel: stock?.currentStock || 0,
      stockUnit: stock?.unit || request.unit,
      requiredAmount: stock?.requiredAmount || request.requiredAmount || 0,
    };
    
    return createResponse(200, true, "Purchase request retrieved successfully", requestWithStock);
  } catch (error) {
    console.error("GET /purchase-request/[id] Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return createResponse(400, false, "Invalid request ID format");
    }
    
    const body = await req.json();
    const { action, actualUnitPrice, actualTotalCost, userId, notes } = body;
    
    const client = await clientPromise;
    const db = client.db("gold");
    
    const request = await db.collection("purchase_requests").findOne({ _id: new ObjectId(id) });
    if (!request) {
      return createResponse(404, false, "Purchase request not found");
    }
    
    let updateData: any = {
      updatedAt: new Date(),
      notes: notes || request.notes,
    };
    
    if (action === 'delivered') {
      updateData.isDelivered = !request.isDelivered;
      if (updateData.isDelivered) {
        updateData.deliveredAt = new Date();
        updateData.deliveredBy = userId;
        updateData.status = 'delivered';
      } else {
        updateData.deliveredAt = null;
        updateData.deliveredBy = null;
        updateData.status = 'pending';
      }
    } 
    else if (action === 'purchased') {
      if (!request.isDelivered) {
        return createResponse(400, false, "Cannot mark as purchased before delivery", null);
      }
      
      updateData.isPurchased = !request.isPurchased;
      if (updateData.isPurchased) {
        updateData.purchasedAt = new Date();
        updateData.purchasedBy = userId;
        updateData.status = 'purchased';
        
        if (actualUnitPrice) {
          updateData.actualUnitPrice = actualUnitPrice;
          updateData.actualTotalCost = actualTotalCost || (actualUnitPrice * request.requestedQuantity);
        }
      } else {
        updateData.purchasedAt = null;
        updateData.purchasedBy = null;
        updateData.status = 'delivered';
        updateData.actualUnitPrice = null;
        updateData.actualTotalCost = null;
      }
    } 
    else if (action === 'confirm') {
      if (!request.isPurchased) {
        return createResponse(400, false, "Cannot confirm before purchase is completed", null);
      }
      
      updateData.isConfirmed = !request.isConfirmed;
      if (updateData.isConfirmed) {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = userId;
        updateData.status = 'completed';
        
        let stock = null;
        if (ObjectId.isValid(request.stockId)) {
          stock = await db.collection("stocks").findOne({ _id: new ObjectId(request.stockId) });
        }
        
        if (stock) {
          // Get the actual price values
          const actualUnitPriceValue = request.actualUnitPrice || actualUnitPrice || request.estimatedUnitPrice;
          const actualTotalCostValue = request.actualTotalCost || actualTotalCost || (actualUnitPriceValue * request.requestedQuantity);
          
          // Get old stock value for logging
          const oldStock = stock.currentStock;
          
          // Update stock to required amount
          const requiredAmount = stock.requiredAmount || request.requiredAmount || request.requestedQuantity;
          const newStock = requiredAmount;
          
          console.log(`📦 Updating stock ${stock.name}: ${oldStock} → ${newStock} ${stock.unit}`);
          
          await db.collection("stocks").updateOne(
            { _id: stock._id },
            { $set: { currentStock: newStock, updatedAt: new Date() } }
          );
          
          // =============================================
          // REGISTER PURCHASE (Same as Buy button functionality)
          // =============================================
          const purchaseRecord = {
            stockId: request.stockId,
            stockName: request.stockName,
            purchaseDate: new Date().toISOString(),
            quantity: request.requestedQuantity,
            unitPrice: actualUnitPriceValue,
            supplier: "Purchase Request System",
            totalCost: actualTotalCostValue,
            purchaseRequestId: id,
            reorderFrequency: request.reorderFrequency,
            nextReorderDate: getNextReorderDate(request.reorderFrequency, new Date()),
            isRecurring: true,
            notes: `Auto-registered from purchase request confirmation. Required amount: ${requiredAmount} ${stock.unit}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const purchaseResult = await db.collection("stock_purchases").insertOne(purchaseRecord);
          console.log(`✅ Purchase registered: ${request.requestedQuantity} ${stock.unit} of ${request.stockName} at ${actualUnitPriceValue} ETB/unit`);
          
          // EXPENSE REGISTRATION REMOVED - No longer creating expense records
        }
      } else {
        updateData.confirmedAt = null;
        updateData.confirmedBy = null;
        updateData.status = 'purchased';
      }
    }
    
    const result = await db.collection("purchase_requests").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return createResponse(404, false, "Purchase request not found");
    }
    
    return createResponse(200, true, "Purchase request updated successfully", updateData);
  } catch (error) {
    console.error("PUT /purchase-request/[id] Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return createResponse(400, false, "Invalid request ID format");
    }
    
    const client = await clientPromise;
    const db = client.db("gold");
    
    // Delete associated purchase records
    await db.collection("stock_purchases").deleteMany({ purchaseRequestId: id });
    
    // EXPENSE DELETION REMOVED - No longer deleting expense records
    
    const result = await db.collection("purchase_requests").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return createResponse(404, false, "Purchase request not found");
    }
    
    return createResponse(200, true, "Purchase request and associated purchase records deleted successfully");
  } catch (error) {
    console.error("DELETE /purchase-request/[id] Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}