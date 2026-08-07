import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { DeliveryOrderSchema } from "@/models/DeliveryOrders";

import { auth } from "@/auth";
import { requireRole } from "@/lib/api-auth";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_PHOTO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';

// Define valid statuses
const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED", 
  "PREPARING",
  "PICKUP",  
  "SERVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED"
] as const;

type OrderStatus = typeof VALID_STATUSES[number];

// Helper to enrich orders with user details and item details (replaces Mongo $lookup pipeline)
async function enrichOrders(orders: any[]) {
  const userIds = Array.from(new Set(orders.map(o => o.userId).filter(Boolean)));
  const userDetails = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } } })
    : [];
  const userMap = new Map(userDetails.map(u => [u.id, u]));

  const itemIds = Array.from(new Set(
    orders.flatMap(o => ((o.items as any) || []).map((i: any) => i?.itemId).filter(Boolean))
  ));
  const items = itemIds.length
    ? await prisma.item.findMany({ where: { id: { in: itemIds } } })
    : [];
  const itemMap = new Map(items.map(it => [it.id, it]));

  return orders.map(order => {
    const enriched: any = { ...order, _id: order.id };

    if (order.userId) {
      const u = userMap.get(order.userId);
      if (u) enriched.userDetails = u;
    }

    const rawItems: any[] = Array.isArray(order.items) ? (order.items as any[]) : [];
    enriched.items = rawItems.map(item => {
      const enrichedItem: any = { ...item };
      const details = item?.itemId ? itemMap.get(item.itemId) : null;
      if (details) enrichedItem.itemDetails = details;
      return enrichedItem;
    });

    return enriched;
  });
}

export async function POST(req: NextRequest) {
  try {
    let body;
    let paymentScreenshotFile: File | null = null;

    // Handle Content-Type to support both JSON and Multipart FormData
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const orderDataString = formData.get("orderData") as string;
      
      if (!orderDataString) {
        return NextResponse.json({ error: "Missing order data" }, { status: 400 });
      }
      
      try {
        body = JSON.parse(orderDataString);
      } catch (e) {
        return NextResponse.json({ error: "Invalid JSON in orderData" }, { status: 400 });
      }
      
      paymentScreenshotFile = formData.get("paymentScreenshot") as File | null;
    } else {
      try {
        body = await req.json();
      } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }

    const session = await auth();

    // Validate that items are present in the request body
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Upload payment screenshot to Cloudinary if it exists
    let paymentScreenshotUrl = null;
    if (paymentScreenshotFile) {
      try {

        const arrayBuffer = await paymentScreenshotFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const dataUri = `data:${paymentScreenshotFile.type};base64,${base64Data}`;
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', dataUri);
        uploadFormData.append('upload_preset', CLOUDINARY_PHOTO_UPLOAD_PRESET);
        
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: uploadFormData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          paymentScreenshotUrl = uploadData.secure_url;

        } else {
          const errorText = await uploadRes.text();
          console.error("❌ Cloudinary upload failed:", errorText);
          return NextResponse.json(
            { error: "Failed to upload payment screenshot" },
            { status: 400 }
          );
        }
      } catch (uploadError) {
        console.error("❌ Error uploading to Cloudinary", uploadError);
        return NextResponse.json(
          { error: "Failed to upload payment screenshot" },
          { status: 400 }
        );
      }
    } else {
      // If no file was uploaded, check if URL was provided in body
      if (body.paymentScreenshotUrl) {
        paymentScreenshotUrl = body.paymentScreenshotUrl;

      } else {
        return NextResponse.json(
          { error: "Payment screenshot is required" },
          { status: 400 }
        );
      }
    }

    const subtotalFromFrontend = body.subtotal || 0;      // Price without tax
    const taxFromFrontend = body.tax || 0;                // Tax amount
    const totalAmountFromFrontend = body.totalAmount || 0; // Price with tax
    const deliveryFee = body.deliveryFee || 0;
    const discount = body.discount || 0;
    const packagingCharge = body.packagingCharge || 0;
    const categoryChargesTotal = body.categoryChargesTotal || 0;
    
    // Calculate final amount using frontend values
    const finalAmount = totalAmountFromFrontend + deliveryFee + packagingCharge - discount;

    // Process items with their correct tax breakdown
    const itemsWithDetails = [];
    for (const item of body.items) {
      // Fetch the item details from the database
      const itemData = await prisma.item.findFirst({
        where: { id: item.itemId }
      });

      if (!itemData) {
        return NextResponse.json(
          { error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }

      const priceWithTax = itemData.price ?? 0;
      const priceWithoutTax = priceWithTax / 1.15;
      const itemTaxAmount = priceWithTax - priceWithoutTax;
      const quantity = Number(item.quantity) || 0;
      
      // Use frontend values if provided, otherwise calculate
      const itemSubtotal = item.subtotal || (priceWithoutTax * quantity);
      const itemTaxTotal = item.taxTotal || (itemTaxAmount * quantity);
      const itemTotal = item.total || (priceWithTax * quantity);

      itemsWithDetails.push({
        itemId: item.itemId,
        quantity: quantity,
        notes: item.notes || '',
        subtotal: itemSubtotal,
        unitPrice: priceWithTax,
        priceWithoutTax: priceWithoutTax,
        taxAmount: itemTaxAmount,
        taxTotal: itemTaxTotal,
        total: itemTotal,
        itemName: itemData.name
      });
    }

    // Prepare delivery info with coordinates if available
    const deliveryInfo = {
      fullName: body.deliveryInfo?.fullName || '',
      phoneNumber: body.deliveryInfo?.phoneNumber || '',
      email: body.deliveryInfo?.email || '',
      address: body.deliveryInfo?.address || '',
      city: body.deliveryInfo?.city || 'Addis Ababa',
      landmark: body.deliveryInfo?.landmark || '',
      deliveryInstructions: body.deliveryInfo?.deliveryInstructions || '',
      location: body.deliveryInfo?.location || null // This will store coordinates
    };

    // Prepare the order data with CORRECT values
    const orderData = {
      orderNumber: body.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
      userId: session?.user?.id,
      customerId: body.customerId || session?.user?.id,
      items: itemsWithDetails,
      deliveryInfo: deliveryInfo,
      specialRequirements: body.specialRequirements || '',
      status: 'PENDING',
      paymentMethod: body.paymentMethod || 'ONLINE',
      paymentScreenshotUrl: paymentScreenshotUrl,
      transactionId: body.transactionId || `TXN-${Date.now()}`,
      deliveryFee: deliveryFee,
      packagingCharge: packagingCharge,
      categoryChargesTotal: categoryChargesTotal,
      discount: discount,
      subtotal: subtotalFromFrontend,        // Use frontend value (excl. tax)
      tax: taxFromFrontend,                  // Use frontend value (tax amount)
      totalAmount: totalAmountFromFrontend,  // Use frontend value (incl. tax)
      finalAmount: finalAmount,              // totalAmount + delivery - discount
      delivery: true,
      inTable: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };



    // Validate with schema
    const validatedOrder = DeliveryOrderSchema.parse(orderData);

    const data: any = { id: randomUUID(), ...validatedOrder };
    if (data.deliveryInfo === null) data.deliveryInfo = Prisma.DbNull;
    if (data.paymentScreenshotUrl === null) data.paymentScreenshotUrl = Prisma.DbNull;

    // Insert order into the database
    const result = await prisma.order.create({ data });



    return NextResponse.json(
      {
        success: true,
        orderId: result.id,
        orderNumber: orderData.orderNumber,
        finalAmount,
        tax: taxFromFrontend,
        subtotal: subtotalFromFrontend,
        totalAmount: totalAmountFromFrontend,
        paymentScreenshotUrl: orderData.paymentScreenshotUrl,
        hasCoordinates: !!orderData.deliveryInfo?.location?.coordinates
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Order placement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "kitchen", "delivery"]);
    if (response) return response;

    // Parse query parameters
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const includeAll = url.searchParams.get("all") === "true";
    
    // Build match query
    let matchQuery: any = {
      delivery: true
    };

    if (statusParam) {
      if (statusParam === "all") {
        matchQuery = { delivery: true };
      } else if (statusParam === "notConfirmed") {
        matchQuery = {
          delivery: true,
          status: { not: "CONFIRMED" }
        };
      } else {
        if (!VALID_STATUSES.includes(statusParam as OrderStatus)) {
          return NextResponse.json(
            { error: `Invalid status parameter` },
            { status: 400 }
          );
        }
        matchQuery.status = statusParam;
      }
    } else {
      matchQuery = {
        delivery: true,
        status: { not: "CONFIRMED" }
      };
    }

    if (includeAll) {
      matchQuery = { delivery: true };
    }

    // Fetch orders with location data
    const orders = await prisma.order.findMany({
      where: matchQuery,
      orderBy: { createdAt: 'desc' }
    });

    const enrichedOrders = await enrichOrders(orders);

    return NextResponse.json(
      { 
        success: true,
        orders: enrichedOrders,
        count: enrichedOrders.length,
        filter: matchQuery
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
