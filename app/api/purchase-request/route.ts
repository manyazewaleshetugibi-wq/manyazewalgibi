import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createResponse } from "@/lib/utils";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const stockId = searchParams.get('stockId');
    const role = searchParams.get('role');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const specificDate = searchParams.get('date');
    
    const client = await clientPromise;
    const db = client.db("gold");
    
    let query: any = {};
    
    if (specificDate) {
      query.requestDate = specificDate;
    } else if (startDate || endDate) {
      query.requestDate = {};
      if (startDate) query.requestDate.$gte = startDate;
      if (endDate) query.requestDate.$lte = endDate;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    if (stockId) {
      query.stockId = stockId;
    }
    
    if (role === 'finance') {
      query.status = { $in: ['pending', 'delivered', 'purchased'] };
    } else if (role === 'stock_manager') {
      query.status = { $in: ['purchased', 'completed'] };
    }
    
    const requests = await db.collection("purchase_requests")
      .find(query)
      .sort({ requestDate: -1, createdAt: -1 })
      .toArray();
    
    const requestsWithStockInfo = await Promise.all(requests.map(async (request) => {
      try {
        let stock = null;
        if (ObjectId.isValid(request.stockId)) {
          stock = await db.collection("stocks").findOne({ _id: new ObjectId(request.stockId) });
        }
        
        return {
          ...request,
          currentStockLevel: stock?.currentStock || request.currentStock,
          stockUnit: stock?.unit || request.unit,
          minimumStock: stock?.minimumStock || request.minimumStock,
          requiredAmount: stock?.requiredAmount || request.requiredAmount || 0,
        };
      } catch (err) {
        return {
          ...request,
          currentStockLevel: request.currentStock,
          stockUnit: request.unit,
          minimumStock: request.minimumStock,
          requiredAmount: request.requiredAmount || 0,
        };
      }
    }));
    
    const groupedByDate = requestsWithStockInfo.reduce((acc: any, request) => {
      const date = request.requestDate;
      if (!acc[date]) {
        acc[date] = {
          date, 
          totalRequests: 0,
          totalEstimatedCost: 0,
          pending: 0,
          delivered: 0,
          purchased: 0,
          completed: 0,
        };
      }
      acc[date].totalRequests++;
      acc[date].totalEstimatedCost += request.estimatedTotalCost || 0;
      acc[date][request.status]++;
      return acc;
    }, {});
    
    return createResponse(200, true, "Purchase requests retrieved successfully", {
      requests: requestsWithStockInfo,
      summary: Object.values(groupedByDate),
      totalCount: requestsWithStockInfo.length,
    });
  } catch (error) {
    console.error("GET /purchase-request Error:", error);
    return createResponse(500, false, "Internal Server Error", null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("gold");
    
    if (!body.stockId) {
      return createResponse(400, false, "Stock ID is required", null);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const existingRequest = await db.collection("purchase_requests").findOne({
      stockId: body.stockId,
      requestDate: today,
    });
    
    if (existingRequest) {
      return createResponse(400, false, "A request already exists for this stock today", null);
    }
    
    let stock = null;
    if (ObjectId.isValid(body.stockId)) {
      stock = await db.collection("stocks").findOne({ _id: new ObjectId(body.stockId) });
    }
    
    if (!stock) {
      return createResponse(404, false, "Stock not found");
    }
    
    const request = {
      stockId: body.stockId,
      stockName: stock.name,
      categoryId: stock.categoryId,
      unit: stock.unit,
      reorderFrequency: stock.reorderFrequency || 'monthly',
      requiredAmount: stock.requiredAmount || 0,
      requestDate: today,
      requestDateTime: new Date(),
      requestedQuantity: body.requestedQuantity,
      currentStock: stock.currentStock,
      minimumStock: stock.minimumStock,
      estimatedUnitPrice: body.estimatedUnitPrice || 0,
      estimatedTotalCost: body.requestedQuantity * (body.estimatedUnitPrice || 0),
      isDelivered: false,
      isPurchased: false,
      isConfirmed: false,
      reason: 'manual',
      status: 'pending',
      notes: body.notes || 'Manual purchase request',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection("purchase_requests").insertOne(request);
    
    return createResponse(201, true, "Purchase request created successfully", { id: result.insertedId });
  } catch (error) {
    console.error("POST /purchase-request Error:", error);
    return createResponse(400, false, "Invalid request data", error instanceof Error ? error.message : null);
  }
}
