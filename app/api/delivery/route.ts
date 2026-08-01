import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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

export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

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
        console.log("📤 Uploading payment screenshot to Cloudinary...");
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
          console.log("✅ Cloudinary upload successful:", paymentScreenshotUrl);
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
        console.log("📦 Using provided payment screenshot URL:", paymentScreenshotUrl);
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
      if (!ObjectId.isValid(item.itemId)) {
        return NextResponse.json(
          { error: "Invalid item ID format" },
          { status: 400 }
        );
      }

      // Fetch the item details from the database
      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item.itemId) });

      if (!itemData) {
        return NextResponse.json(
          { error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }

      const priceWithTax = itemData.price;
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

    console.log("💾 Saving order with values:", {
      orderNumber: orderData.orderNumber,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      totalAmount: orderData.totalAmount,
      deliveryFee: orderData.deliveryFee,
      finalAmount: orderData.finalAmount,
      hasScreenshot: !!orderData.paymentScreenshotUrl,
      hasCoordinates: !!orderData.deliveryInfo?.location?.coordinates,
      itemsCount: itemsWithDetails.length
    });

    // Validate with schema
    const validatedOrder = DeliveryOrderSchema.parse(orderData);

    // Insert order into the database
    const result = await db.collection("orders").insertOne(validatedOrder);

    console.log("✅ Order created successfully:", {
      id: result.insertedId,
      orderNumber: orderData.orderNumber,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      totalAmount: orderData.totalAmount,
      finalAmount: orderData.finalAmount,
      hasCoordinates: !!orderData.deliveryInfo?.location?.coordinates
    });

    return NextResponse.json(
      {
        success: true,
        orderId: result.insertedId,
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

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

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
          status: { $ne: "CONFIRMED" }
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
        status: { $ne: "CONFIRMED" }
      };
    }

    if (includeAll) {
      matchQuery = { delivery: true };
    }

    // Fetch orders with location data
    const orders = await db.collection("orders").aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $and: [{ $ne: ["$userId", null] }, { $ne: ["$userId", ""] }] },
              then: { $toObjectId: "$userId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userIdObj",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      { $unwind: "$items" },
      {
        $addFields: {
          "items.itemIdObj": { $toObjectId: "$items.itemId" }
        }
      },
      {
        $lookup: {
          from: "items",
          localField: "items.itemIdObj",
          foreignField: "_id",
          as: "items.itemDetails"
        }
      },
      {
        $unwind: {
          path: "$items.itemDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          items: { $push: "$items" }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { items: "$items" }]
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    return NextResponse.json(
      { 
        success: true,
        orders,
        count: orders.length,
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
