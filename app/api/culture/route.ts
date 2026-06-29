// app/api/culture/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCurrentUserData } from "../utils/orderHelpers";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'culture';

// Max file size for images
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

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
    formData.append('tags', 'culture');
    
    // Add context/metadata
    formData.append('context', `type=culture_image|filename=${file.name}|uploaded_at=${timestamp}`);
    
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

// Helper function to check if user is admin
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(role);
};

// GET - Fetch all cultures
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    const cultures = await db.collection("cultures")
      .find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      cultures,
      count: cultures.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching cultures:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch cultures" },
      { status: 500 }
    );
  }
}

// POST - Create new culture
export async function POST(req: NextRequest) {
  try {
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("image") as File | null;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, message: "Description is required" },
        { status: 400 }
      );
    }

    let imageUrl = "";
    let cloudinaryData = null;

    // Handle image upload
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

    const cultureData = {
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      cloudinaryData,
      createdBy: userData?.name || userData?.email || "Unknown",
      createdByEmail: userData?.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const result = await db.collection("cultures").insertOne(cultureData);
    const createdCulture = await db.collection("cultures").findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      message: "Culture created successfully",
      data: createdCulture,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating culture:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT - Update existing culture
export async function PUT(req: NextRequest) {
  try {
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("image") as File | null;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid culture ID is required" },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get existing culture
    const existingCulture = await db.collection("cultures").findOne({ _id: new ObjectId(id) });
    if (!existingCulture) {
      return NextResponse.json(
        { success: false, message: "Culture not found" },
        { status: 404 }
      );
    }

    let imageUrl = existingCulture.imageUrl;
    let cloudinaryData = existingCulture.cloudinaryData;

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

    const updateData = {
      title: title ? title.trim() : existingCulture.title,
      description: description ? description.trim() : existingCulture.description,
      imageUrl,
      cloudinaryData,
      updatedAt: new Date(),
      updatedBy: userData?.name || userData?.email,
    };

    const result = await db.collection("cultures").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Culture not found" },
        { status: 404 }
      );
    }

    const updatedCulture = await db.collection("cultures").findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: "Culture updated successfully",
      data: updatedCulture,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating culture:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete culture
export async function DELETE(req: NextRequest) {
  try {
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid culture ID is required" },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const culture = await db.collection("cultures").findOne({ _id: new ObjectId(id) });
    if (!culture) {
      return NextResponse.json(
        { success: false, message: "Culture not found" },
        { status: 404 }
      );
    }

    // Soft delete
    const result = await db.collection("cultures").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: userData?.name || userData?.email
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: "Culture deleted successfully",
      modifiedCount: result.modifiedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting culture:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}