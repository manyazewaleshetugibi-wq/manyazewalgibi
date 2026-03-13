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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Item ID" },
        { status: 400 }
      )
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const item = await db.collection('items').findOne({ _id: new ObjectId(id) })

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Item ID" }, { status: 400 });
    }

    const formData = await req.formData();
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

    // 🔥 FIXED: Handle image upload properly
    let imageUrl = existingItem.imageUrl;
    let cloudinaryData = existingItem.cloudinaryData;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    // Handle image removal
    if (removeImage) {
      imageUrl = "";
      cloudinaryData = null;
      // Note: You might want to delete from Cloudinary here
      // if (existingItem.cloudinaryData?.publicId) {
      //   await deleteFromCloudinary(existingItem.cloudinaryData.publicId);
      // }
    }

    // Handle new image upload - DIRECT TO CLOUDINARY, NOT TO BASE64
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
        // Upload directly to Cloudinary using the File object
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

    // Parse other form data
    const body = {
      name: formData.get("name"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
      price: Number(formData.get("price")),
      preparationTime: Number(formData.get("preparationTime")),
      isActive: formData.get("isActive") === "true",
      isFeatured: formData.get("isFeatured") === "true",
      nutritionalInfo: JSON.parse(formData.get("nutritionalInfo") as string || "{}"),
      requiredStock: JSON.parse(formData.get("requiredStock") as string || "[]"),
    };

    // Validate item data - use the new imageUrl and cloudinaryData
    const validatedData = validateItemData({
      ...body,
      imageUrl,
      cloudinaryData, // Include cloudinaryData in validation
    });

    // Ensure valid category and stock IDs
    if (!ObjectId.isValid(validatedData.categoryId)) {
      return NextResponse.json({ success: false, message: "Invalid category ID" }, { status: 400 });
    }

    validatedData.requiredStock.forEach((stock: any) => {
      if (!ObjectId.isValid(stock.stockId)) {
        throw new Error(`Invalid stock ID: ${stock.stockId}`);
      }
    });

    // Prepare update data
    const updateData = {
      ...validatedData,
      categoryId: new ObjectId(validatedData.categoryId),
      requiredStock: validatedData.requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
      })),
      imageUrl,
      cloudinaryData, // Store Cloudinary metadata
      updatedAt: new Date(),
    };

    const updateResult = await db.collection("items").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Item not updated" }, { status: 404 });
    }

    // Fetch updated item to return
    const updatedItem = await db.collection("items").findOne({ _id: new ObjectId(id) });

    return NextResponse.json({ 
      success: true, 
      message: "Item updated successfully",
      data: updatedItem 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error updating item:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Item ID" }, { status: 400 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get item first to get Cloudinary publicId (if you want to delete from Cloudinary)
    const item = await db.collection("items").findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    // TODO: Optionally delete from Cloudinary if needed
    // if (item.cloudinaryData?.publicId) {
    //   // Delete from Cloudinary
    //   await deleteFromCloudinary(item.cloudinaryData.publicId);
    // }

    const deleteResult = await db.collection("items").deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}