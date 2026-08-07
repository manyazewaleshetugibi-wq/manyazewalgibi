import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'healthy-menu';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

async function uploadToCloudinary(file: File): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_IMAGE_FOLDER);
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const publicId = `${CLOUDINARY_IMAGE_FOLDER}/${timestamp}_${randomString}`;
    formData.append('public_id', publicId);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    
    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

// ✅ FIXED: GET single item by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise to get the id
    const { id } = await params;
    
    const item = await prisma.healthyMenu.findUnique({ where: { id } });
    
    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: { ...item, _id: item.id } });
    
  } catch (error) {
    console.error("GET /api/healthy-menu/[id] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ FIXED: PUT update item by ID
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise to get the id
    const { id } = await params;
    
    const formData = await req.formData();
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const categoryId = formData.get("categoryId") as string;
    const preparationTime = formData.get("preparationTime") as string;
    const isActive = formData.get("isActive");
    const isFeatured = formData.get("isFeatured");
    const nutritionalInfoString = formData.get("nutritionalInfo") as string;
    const dietaryInfoString = formData.get("dietaryInfo") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";
    
    const existingItem = await prisma.healthyMenu.findUnique({ where: { id } });
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
          { success: false, message: `Invalid image file type` },
          { status: 400 }
        );
      }
      
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, message: `Image file too large` },
          { status: 400 }
        );
      }
      
      try {
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = (cloudinaryData as any).url;
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { success: false, message: uploadError.message },
          { status: 500 }
        );
      }
    }
    
    let nutritionalInfo = existingItem.nutritionalInfo;
    if (nutritionalInfoString) {
      try {
        nutritionalInfo = JSON.parse(nutritionalInfoString);
      } catch (error) {
        // keep existing
      }
    }
    
    let dietaryInfo = existingItem.dietaryInfo;
    if (dietaryInfoString) {
      try {
        dietaryInfo = JSON.parse(dietaryInfoString);
      } catch (error) {
        // keep existing
      }
    }
    
    let requiredStock = (existingItem.requiredStock as any) || [];
    if (requiredStockString) {
      try {
        requiredStock = JSON.parse(requiredStockString);
      } catch (error) {
        // keep existing
      }
    }
    
    const updateData: any = {
      name: name !== undefined ? name : existingItem.name,
      description: description !== undefined ? description : existingItem.description,
      price: price !== undefined ? parseFloat(price) : existingItem.price,
      categoryId: categoryId !== undefined ? categoryId : existingItem.categoryId,
      preparationTime: preparationTime !== undefined ? parseFloat(preparationTime) : existingItem.preparationTime,
      isActive: isActive !== undefined ? isActive === "true" : existingItem.isActive,
      isFeatured: isFeatured !== undefined ? isFeatured === "true" : existingItem.isFeatured,
      imageUrl,
      cloudinaryData,
      nutritionalInfo,
      dietaryInfo,
      requiredStock: requiredStock.map((stock: any) => ({
        stockId: stock.stockId,
        quantity: stock.quantity,
      })),
      updatedAt: new Date(),
    };
    
    try {
      await prisma.healthyMenu.update({ where: { id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json(
          { success: false, message: "Item not found" },
          { status: 404 }
        );
      }
      throw e;
    }
    
    const updatedItem = await prisma.healthyMenu.findUnique({ where: { id } });
    
    return NextResponse.json(
      {
        success: true,
        message: "Item updated successfully",
        data: updatedItem ? { ...updatedItem, _id: updatedItem.id } : updatedItem,
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

// ✅ FIXED: DELETE item by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params promise to get the id
    const { id } = await params;
    
    const item = await prisma.healthyMenu.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }
    
    const result = await prisma.healthyMenu.deleteMany({ where: { id } });
    
    if (result.count === 0) {
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
    console.error("Error deleting healthy menu item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
