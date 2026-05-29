import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { z } from "zod";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'healthy-menu';

// Max file size for images
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// Validation schema for healthy menu items
const HealthyMenuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().min(0),
  cost: z.number().min(0).optional(),
  imageUrl: z.string().optional(),
  cloudinaryData: z.any().optional(),
  requiredStock: z.array(z.object({
    stockId: z.string(),
    quantity: z.number().min(0),
  })).optional(),
  nutritionalInfo: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbohydrates: z.number().min(0),
    fat: z.number().min(0),
  }).optional(),
  preparationTime: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  healthLabels: z.array(z.string()).optional(), // Special field for healthy menu
  dietaryInfo: z.object({
    isGlutenFree: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    isVegetarian: z.boolean().optional(),
    isDairyFree: z.boolean().optional(),
    isLowCarb: z.boolean().optional(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export function validateHealthyMenuItemData(rawData: any) {
  return HealthyMenuItemSchema.parse(rawData);
}

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
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `${CLOUDINARY_IMAGE_FOLDER}/${timestamp}_${randomString}_${safeFileName.replace(/\.[^/.]+$/, "")}`;
    formData.append('public_id', publicId);
    
    formData.append('tags', 'healthy_menu');
    formData.append('context', `type=healthy_item|filename=${file.name}|uploaded_at=${timestamp}`);
    
    if (onProgress) {
      let progress = 0;
      interval = setInterval(() => {
        progress += 20;
        if (progress > 90) progress = 90;
        onProgress(progress);
      }, 100);
    }
    
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
      onProgress(100);
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

// GET all healthy menu items
export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const categoryId = searchParams.get("categoryId");
    const isActive = searchParams.get("isActive");
    
    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid item ID" },
          { status: 400 }
        );
      }
      
      const item = await db.collection("healthy_menu").findOne({ 
        _id: new ObjectId(id) 
      });
      
      if (!item) {
        return NextResponse.json(
          { success: false, error: "Item not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        data: item 
      });
    }
    
    // Build query filters
    const query: any = {};
    
    if (categoryId && ObjectId.isValid(categoryId)) {
      query.categoryId = new ObjectId(categoryId);
    }
    
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    
    const items = await db.collection("healthy_menu")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json({ 
      success: true, 
      items,
      total: items.length
    });
    
  } catch (error) {
    console.error("GET /api/healthy-menu Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST - Create new healthy menu item
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    console.log("Received healthy menu item creation request");
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const cost = parseFloat(formData.get("cost") as string);
    const categoryId = formData.get("categoryId") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const nutritionalInfoString = formData.get("nutritionalInfo") as string;
    const preparationTime = parseFloat(formData.get("preparationTime") as string);
    const isActive = formData.get("isActive") === "true";
    const isFeatured = formData.get("isFeatured") === "true";
    const imageFile = formData.get("image") as File | null;

    if (!name || !description || !categoryId) {
      return NextResponse.json(
        { success: false, message: "Name, description, and category are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID" },
        { status: 400 }
      );
    }

    let requiredStock = [];
    try {
      requiredStock = requiredStockString ? JSON.parse(requiredStockString) : [];
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid requiredStock format" },
        { status: 400 }
      );
    }

    let nutritionalInfo = null;
    try {
      nutritionalInfo = nutritionalInfoString ? JSON.parse(nutritionalInfoString) : null;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid nutritionalInfo format" },
        { status: 400 }
      );
    }

    let imageUrl = "";
    let cloudinaryData: any = null;

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { success: false, message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { success: false, message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` },
          { status: 400 }
        );
      }

      try {
        console.log('Starting image upload to Cloudinary for healthy menu...');
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
        console.log('Image upload successful:', cloudinaryData);
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    const itemData = {
      name,
      description,
      price,
      cost: cost || 0,
      categoryId: new ObjectId(categoryId),
      imageUrl,
      cloudinaryData,
      requiredStock: requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
      })),
      nutritionalInfo,
      preparationTime: preparationTime || 10,
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured || false,
      healthLabels: [], // Can be updated later
      dietaryInfo: {
        isGlutenFree: false,
        isVegan: false,
        isVegetarian: false,
        isDairyFree: false,
        isLowCarb: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db("gold");

    const result = await db.collection("healthy_menu").insertOne(itemData);

    const createdItem = await db.collection("healthy_menu").findOne({ _id: result.insertedId });

    return NextResponse.json(
      {
        success: true,
        message: "Healthy menu item created successfully",
        data: createdItem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating healthy menu item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT - Update healthy menu item
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid item ID is required" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const cost = formData.get("cost") as string;
    const categoryId = formData.get("categoryId") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const nutritionalInfoString = formData.get("nutritionalInfo") as string;
    const preparationTime = formData.get("preparationTime") as string;
    const isActive = formData.get("isActive");
    const isFeatured = formData.get("isFeatured");
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    const client = await clientPromise;
    const db = client.db("gold");

    const existingItem = await db.collection("healthy_menu").findOne({ _id: new ObjectId(id) });
    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    let imageUrl = existingItem.imageUrl;
    let cloudinaryData = existingItem.cloudinaryData;

    if (removeImage) {
      imageUrl = "";
      cloudinaryData = null;
    }

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { success: false, message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { success: false, message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` },
          { status: 400 }
        );
      }

      try {
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image" },
          { status: 500 }
        );
      }
    }

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

    let nutritionalInfo = existingItem.nutritionalInfo;
    if (nutritionalInfoString) {
      try {
        nutritionalInfo = JSON.parse(nutritionalInfoString);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: "Invalid nutritionalInfo format" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      name: name !== undefined ? name : existingItem.name,
      description: description !== undefined ? description : existingItem.description,
      price: price !== undefined ? parseFloat(price) : existingItem.price,
      cost: cost !== undefined ? parseFloat(cost) : existingItem.cost,
      categoryId: categoryId !== undefined ? new ObjectId(categoryId) : existingItem.categoryId,
      imageUrl,
      cloudinaryData,
      requiredStock: requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
      })),
      nutritionalInfo,
      preparationTime: preparationTime !== undefined ? parseFloat(preparationTime) : existingItem.preparationTime,
      isActive: isActive !== undefined ? isActive === "true" : existingItem.isActive,
      isFeatured: isFeatured !== undefined ? isFeatured === "true" : existingItem.isFeatured,
      updatedAt: new Date(),
    };

    await db.collection("healthy_menu").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedItem = await db.collection("healthy_menu").findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      {
        success: true,
        message: "Healthy menu item updated successfully",
        data: updatedItem,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating healthy menu item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete healthy menu item
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid item ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");

    const item = await db.collection("healthy_menu").findOne({ _id: new ObjectId(id) });
    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    const result = await db.collection("healthy_menu").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Healthy menu item deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting healthy menu item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
