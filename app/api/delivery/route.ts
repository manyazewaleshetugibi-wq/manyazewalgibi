import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DeliveryOrderSchema } from "@/models/DeliveryOrders";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/auth";

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

    const session = await getServerSession(authOptions);

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

    let totalAmount = 0;
    let taxAmount = 0;
    let finalAmount = 0;

    // Fetch unitPrice for each item and calculate subtotal
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

      // Calculate subtotal for the item
      const unitPrice = itemData.price;
      const subtotal = item.quantity * unitPrice;

      // Add subtotal to the total amount
      totalAmount += subtotal;

      // Add item with all details
      itemsWithDetails.push({
        itemId: item.itemId,
        quantity: item.quantity,
        notes: item.notes || '',
        subtotal: subtotal,
        unitPrice: unitPrice,
        itemName: itemData.name,
        price: unitPrice
      });
    }

    // Calculate tax and final amount
    taxAmount = totalAmount * 0.15;
    finalAmount = totalAmount + taxAmount - (body.discount || 0) + (body.deliveryFee || 0);

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

    // Prepare the order data
    const orderData = {
      orderNumber: body.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
      userId: session?.user?.id,
      customerId: body.customerId || session?.user?.id,
      items: itemsWithDetails,
      deliveryInfo: deliveryInfo, // Now includes location coordinates
      specialRequirements: body.specialRequirements || '',
      status: 'PENDING',
      paymentMethod: body.paymentMethod || 'ONLINE',
      paymentScreenshotUrl: paymentScreenshotUrl,
      transactionId: body.transactionId || `TXN-${Date.now()}`,
      deliveryFee: body.deliveryFee || 0,
      discount: body.discount || 0,
      subtotal: totalAmount,
      tax: taxAmount,
      totalAmount: body.totalAmount || finalAmount,
      finalAmount: finalAmount,
      delivery: true,
      inTable: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("💾 Saving order with:", {
      orderNumber: orderData.orderNumber,
      hasScreenshot: !!orderData.paymentScreenshotUrl,
      hasCoordinates: !!orderData.deliveryInfo?.location?.coordinates,
      coordinates: orderData.deliveryInfo?.location?.coordinates
    });

    // Validate with schema
    const validatedOrder = DeliveryOrderSchema.parse(orderData);

    // Insert order into the database
    const result = await db.collection("orders").insertOne(validatedOrder);

    console.log("✅ Order created successfully:", {
      id: result.insertedId,
      orderNumber: orderData.orderNumber,
      hasCoordinates: !!orderData.deliveryInfo?.location?.coordinates
    });

    return NextResponse.json(
      {
        success: true,
        orderId: result.insertedId,
        orderNumber: orderData.orderNumber,
        finalAmount,
        tax: taxAmount,
        paymentScreenshotUrl: orderData.paymentScreenshotUrl,
        hasCoordinates: !!orderData.deliveryInfo?.location?.coordinates
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Order placement error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
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