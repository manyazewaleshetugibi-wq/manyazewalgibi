import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const waiterId = searchParams.get("waiterId");
    const bookId = searchParams.get("bookId");

    // Default to today
    const fromDate = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    // Build match query for completed orders in date range
    const matchQuery: any = {
      status: { $regex: /^completed$/i },
      createdAt: { $gte: fromDate, $lte: toDate },
    };

    if (waiterId && waiterId !== "all") {
      matchQuery.waiterId = waiterId;
    }

    // Get all completed orders in the date range
    const orders = await db.collection("orders").find(matchQuery).toArray();

    // Extract book items from orders
    // Books have their itemId in the "books" collection, not "items"
    const bookSalesMap = new Map<string, {
      bookId: string;
      title: string;
      category: string;
      price: number;
      imageUrl: string;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
    }>();

    for (const order of orders) {
      for (const item of order.items || []) {
        if (!item.itemId) continue;

        // Check if this item is a book (exists in books collection)
        // We use a cache to avoid repeated DB lookups
        let bookInfo = bookSalesMap.get(item.itemId);

        if (!bookInfo && !bookSalesMap.has(`_checked_${item.itemId}`)) {
          // Check if this itemId exists in the books collection
          const { ObjectId } = await import("mongodb");
          let bookData = null;
          try {
            if (ObjectId.isValid(item.itemId)) {
              bookData = await db.collection("books").findOne({ _id: new ObjectId(item.itemId) });
            }
          } catch {}

          if (bookData) {
            bookInfo = {
              bookId: item.itemId,
              title: bookData.title || item.itemName || "Unknown Book",
              category: bookData.category || "",
              price: bookData.price || item.unitPrice || 0,
              imageUrl: bookData.cloudinaryData?.url || bookData.imageUrl || "",
              totalQuantity: 0,
              totalRevenue: 0,
              orderCount: 0,
            };
            bookSalesMap.set(item.itemId, bookInfo);
          } else {
            // Mark as checked but not a book
            bookSalesMap.set(`_checked_${item.itemId}`, null as any);
          }
        }

        // If it's a book, accumulate sales
        if (bookInfo && !String(item.itemId).startsWith("_checked_")) {
          bookInfo.totalQuantity += Number(item.quantity) || 0;
          bookInfo.totalRevenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
          bookInfo.orderCount += 1;
        }
      }
    }

    // Convert map to array and filter by bookId if specified
    let soldBooks = Array.from(bookSalesMap.values()).filter(b => b && b.bookId && !b.bookId.startsWith("_checked_"));

    if (bookId) {
      soldBooks = soldBooks.filter(b => b.bookId === bookId);
    }

    // Sort by totalRevenue descending
    soldBooks.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate totals
    const totalSold = soldBooks.reduce((sum, b) => sum + b.totalQuantity, 0);
    const totalRevenue = soldBooks.reduce((sum, b) => sum + b.totalRevenue, 0);
    const totalOrders = soldBooks.reduce((sum, b) => sum + b.orderCount, 0);

    // Daily breakdown
    const dailyMap = new Map<string, { date: string; quantity: number; revenue: number; orders: number }>();
    for (const order of orders) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      for (const item of order.items || []) {
        if (!item.itemId || !bookSalesMap.has(item.itemId)) continue;
        const bookInfo = bookSalesMap.get(item.itemId);
        if (!bookInfo || bookInfo.bookId.startsWith("_checked_")) continue;

        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.quantity += Number(item.quantity) || 0;
          existing.revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
          existing.orders += 1;
        } else {
          dailyMap.set(dateKey, {
            date: dateKey,
            quantity: Number(item.quantity) || 0,
            revenue: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
            orders: 1,
          });
        }
      }
    }
    const dailySales = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      soldBooks,
      dailySales,
      summary: {
        totalSold,
        totalRevenue,
        totalOrders,
        dateRange: { start: fromDate, end: toDate },
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching sold books:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
