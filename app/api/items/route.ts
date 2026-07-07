import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemData } from "@/models/Item";
import { ObjectId } from "mongodb";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'items';

// Max file size for images
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

/**
 * Uploads an image to Cloudinary
 */
async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ 
  url: string; 
  publicId: string; 
  format: string; 
  bytes: number;
  width?: number;
  height?: number;
}> {
  let interval: NodeJS.Timeout | null = null;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_IMAGE_FOLDER);
    
    // Add public_id for better organization
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `${CLOUDINARY_IMAGE_FOLDER}/${timestamp}_${randomString}_${safeFileName.replace(/\.[^/.]+$/, "")}`;
    formData.append('public_id', publicId);
    
    // Add tags for organization
    formData.append('tags', 'item');
    
    // Add context/metadata
    formData.append('context', `type=item_image|filename=${file.name}|uploaded_at=${timestamp}`);
    
    // Simulate upload progress
    if (onProgress) {
      let progress = 0;
      interval = setInterval(() => {
        progress += 20;
        if (progress > 90) progress = 90;
        onProgress(progress);
      }, 100);
    }
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (interval) clearInterval(interval);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary response error:', errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (onProgress) {
      onProgress(100); // Complete
    }
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
    };
    
  } catch (error: any) {
    if (interval) clearInterval(interval);
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

/**
 * Handles creating a new item with Cloudinary image upload
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    console.log("Received item creation request");
    
    // Parse form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const cost = parseFloat(formData.get("cost") as string);
    const categoryId = formData.get("categoryId") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const imageFile = formData.get("image") as File | null;
    const isFasting = formData.get("isFasting") === "true"; // ADDED: Parse isFasting

    // Basic validation
    if (!name || !description || !categoryId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Name, description, and category are required" 
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID" },
        { status: 400 }
      );
    }

    // Parse requiredStock
    let requiredStock = [];
    try {
      requiredStock = requiredStockString ? JSON.parse(requiredStockString) : [];
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid requiredStock format" },
        { status: 400 }
      );
    }

    // Validate requiredStock IDs (POST)
    for (const stock of requiredStock) {
      if (!ObjectId.isValid(stock.stockId)) {
        return NextResponse.json(
          { success: false, message: `Invalid stock ID: ${stock.stockId}` },
          { status: 400 }
        );
      }
      for (const alt of (stock.alternatives || [])) {
        if (!ObjectId.isValid(alt.stockId)) {
          return NextResponse.json(
            { success: false, message: `Invalid alternative stock ID: ${alt.stockId}` },
            { status: 400 }
          );
        }
      }
    }

    // Handle image upload
    let imageUrl = "";
    let cloudinaryData: any = null;

    if (imageFile && imageFile.size > 0) {
      // Validate image file
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { 
            success: false, 
            message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
          },
          { status: 400 }
        );
      }

      try {
        console.log('Starting image upload to Cloudinary...');
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
        console.log('Image upload successful:', cloudinaryData);
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { 
            success: false, 
            message: uploadError.message || "Failed to upload image" 
          },
          { status: 500 }
        );
      }
    }

    // Prepare item data - ADDED isFasting field
    const itemData = {
      name,
      description,
      price,
      cost,
      categoryId,
      imageUrl,
      requiredStock,
      cloudinaryData,
      isFasting, // ADDED
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate item data
    const validatedData = validateItemData(itemData);

    // Connect to database
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Insert into database
    const result = await db.collection("items").insertOne({
      ...validatedData,
      categoryId: new ObjectId(validatedData.categoryId),
      requiredStock: validatedData.requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
        alternatives: (stock.alternatives || []).map((alt: any) => ({
          stockId: new ObjectId(alt.stockId),
          quantity: alt.quantity,
          label: alt.label || '',
        })),
      })),
      imageUrl,
      cloudinaryData,
      isFasting: validatedData.isFasting || false, // ADDED
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fetch the created item to return
    const createdItem = await db.collection("items").findOne({ _id: result.insertedId });

    return NextResponse.json(
      {
        success: true,
        message: "Item created successfully",
        data: createdItem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ GET all items — enriched with stock names for requiredStock & alternatives
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const items = await db.collection("items").find({}).toArray();

    // Collect all unique stockIds across all items (default + alternatives)
    const allStockIds = new Set<string>();
    for (const item of items) {
      for (const ing of item.requiredStock || []) {
        if (ing.stockId) allStockIds.add(ing.stockId.toString());
        for (const alt of ing.alternatives || []) {
          if (alt.stockId) allStockIds.add(alt.stockId.toString());
        }
      }
    }

    // Fetch all referenced stocks in one query
    const stockNameMap = new Map<string, string>();
    const stockUnitMap = new Map<string, string>();
    if (allStockIds.size > 0) {
      const stocks = await db.collection("stocks")
        .find({ _id: { $in: [...allStockIds].map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) } })
        .project({ _id: 1, name: 1, unit: 1 })
        .toArray();
      for (const s of stocks) {
        stockNameMap.set(s._id.toString(), s.name);
        stockUnitMap.set(s._id.toString(), s.unit || '');
      }
    }

    // Attach stockName and stockUnit to each ingredient and its alternatives
    const enrichedItems = items.map(item => ({
      ...item,
      requiredStock: (item.requiredStock || []).map((ing: any) => ({
        ...ing,
        stockName: stockNameMap.get(ing.stockId?.toString()) || ing.stockId?.toString() || '',
        stockUnit: stockUnitMap.get(ing.stockId?.toString()) || '',
        alternatives: (ing.alternatives || []).map((alt: any) => ({
          ...alt,
          stockName: stockNameMap.get(alt.stockId?.toString()) || alt.label || alt.stockId?.toString() || '',
          stockUnit: stockUnitMap.get(alt.stockId?.toString()) || '',
        })),
      })),
    }));

    return NextResponse.json({ success: true, items: enrichedItems }, { status: 200 });
  } catch (error) {
    console.error("GET /item Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ PUT - Update item with optional image update
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid item ID" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    
    // Parse form data - ADDED isFasting
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const cost = formData.get("cost") as string;
    const categoryId = formData.get("categoryId") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";
    const isFasting = formData.get("isFasting") === "true"; // ADDED

    // Connect to database
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get existing item
    const existingItem = await db.collection("items").findOne({ _id: new ObjectId(id) });
    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    let imageUrl = existingItem.imageUrl;
    let cloudinaryData = existingItem.cloudinaryData;

    // Handle image removal
    if (removeImage) {
      imageUrl = "";
      cloudinaryData = null;
      // Note: You might want to delete from Cloudinary here
      // if (existingItem.cloudinaryData?.publicId) {
      //   await deleteFromCloudinary(existingItem.cloudinaryData.publicId);
      // }
    }

    // Handle new image upload
    if (imageFile && imageFile.size > 0) {
      // Validate image file
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { 
            success: false, 
            message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
          },
          { status: 400 }
        );
      }

      try {
        console.log('Starting image upload to Cloudinary for update...');
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
        console.log('Image upload successful:', cloudinaryData);
        
        // Optionally delete old image from Cloudinary
        // if (existingItem.cloudinaryData?.publicId) {
        //   await deleteFromCloudinary(existingItem.cloudinaryData.publicId);
        // }
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { 
            success: false, 
            message: uploadError.message || "Failed to upload image" 
          },
          { status: 500 }
        );
      }
    }

    // Parse requiredStock
    let requiredStock = existingItem.requiredStock || [];
    if (requiredStockString) {
      try {
        requiredStock = JSON.parse(requiredStockString);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: "Invalid requiredStock format" },
          { status: 400 }
        );
      }
    }

    // Validate requiredStock IDs (PUT)
    for (const stock of requiredStock) {
      if (!ObjectId.isValid(stock.stockId)) {
        return NextResponse.json(
          { success: false, message: `Invalid stock ID: ${stock.stockId}` },
          { status: 400 }
        );
      }
      for (const alt of (stock.alternatives || [])) {
        if (!ObjectId.isValid(alt.stockId)) {
          return NextResponse.json(
            { success: false, message: `Invalid alternative stock ID: ${alt.stockId}` },
            { status: 400 }
          );
        }
      }
    }

    // Build final data to save — convert IDs to ObjectId directly, no Zod validation needed
    const dataToSave: any = {
      name: name !== undefined ? name : existingItem.name,
      description: description !== undefined ? description : existingItem.description,
      price: price !== undefined ? parseFloat(price) : existingItem.price,
      cost: cost !== undefined ? parseFloat(cost) : existingItem.cost,
      categoryId: new ObjectId(categoryId !== undefined ? categoryId : existingItem.categoryId.toString()),
      imageUrl,
      cloudinaryData,
      requiredStock: requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
        alternatives: (stock.alternatives || []).map((alt: any) => ({
          stockId: new ObjectId(alt.stockId),
          quantity: alt.quantity,
          label: alt.label || '',
        })),
      })),
      isFasting: isFasting !== undefined ? isFasting : existingItem.isFasting || false,
      updatedAt: new Date(),
    };

    // Update item
    const result = await db.collection("items").updateOne(
      { _id: new ObjectId(id) },
      { $set: dataToSave }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    // Fetch updated item
    const updatedItem = await db.collection("items").findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      {
        success: true,
        message: "Item updated successfully",
        data: updatedItem,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Delete item and optionally delete from Cloudinary
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid item ID" },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get item first to get Cloudinary publicId
    const item = await db.collection("items").findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    // TODO: Optionally delete from Cloudinary if needed
    // if (item.cloudinaryData?.publicId) {
    //   // Delete from Cloudinary
    //   await deleteFromCloudinary(item.cloudinaryData.publicId);
    // }

    // Delete from database
    const result = await db.collection("items").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Item deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}