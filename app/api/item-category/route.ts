import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemCategoryData } from "@/models/Item";
import { ObjectId } from "mongodb";

// ✅ Utility function for consistent responses
const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
  return NextResponse.json({ success, message, data }, { status });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📝 POST request body:", body); // Debug log

    // ✅ Handle image - store base64 directly in MongoDB
    let imageUrl: string | undefined;
    
    if (body.imageBase64) {
      // Validate it's a proper base64 image
      if (!body.imageBase64.startsWith('data:image/')) {
        return createResponse(400, false, "Invalid image format. Must be a base64 image string starting with 'data:image/'");
      }
      
      // Validate size (max 2MB recommended)
      const base64Size = (body.imageBase64.length * 3) / 4; // Approximate byte size
      const maxSize = 2 * 1024 * 1024; // 2MB
      
      if (base64Size > maxSize) {
        return createResponse(400, false, `Image too large. Maximum size is 2MB, current size: ${Math.round(base64Size/1024)}KB`);
      }
      
      imageUrl = body.imageBase64; // Store base64 directly
      console.log("📸 Image will be stored as base64 (size:", Math.round(base64Size/1024), "KB)");
      
      // Remove from body to avoid duplication
      delete body.imageBase64;
    }
    
    // Prepare data for validation
    const dataToValidate = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add image URL if we have one
    if (imageUrl !== undefined) {
      dataToValidate.imageUrl = imageUrl;
    } else if (body.imageUrl) {
      // Keep existing image URL if provided
      dataToValidate.imageUrl = body.imageUrl;
    } else {
      // Default placeholder
      dataToValidate.imageUrl = "/placeholder-category.svg";
    }

    // Validate the data
    const parsed = validateItemCategoryData(dataToValidate);

    console.log("✅ Parsed Data:", {
      ...parsed,
      imageUrl: parsed.imageUrl ? `${parsed.imageUrl.substring(0, 50)}...` : 'No image'
    });

    const client = await clientPromise;
    const db = client.db("gold");

    console.log("✅ Connected to DB: gold");

    // Insert the category
    const result = await db.collection("itemCategories").insertOne(parsed);

    console.log("✅ Insert Result:", {
      acknowledged: result.acknowledged,
      insertedId: result.insertedId
    });

    if (!result.acknowledged) {
      throw new Error("Database insertion failed");
    }

    return createResponse(201, true, "Category created successfully", {
      _id: result.insertedId,
      ...parsed,
    });
    
  } catch (error: any) {
    console.error("❌ POST /item-category Error:", error);
    
    // Provide specific error messages
    if (error.name === 'ValidationError') {
      return createResponse(400, false, `Validation error: ${error.message}`);
    }
    
    if (error.message?.includes('Database')) {
      return createResponse(500, false, "Database error occurred");
    }
    
    return createResponse(500, false, "Failed to create category");
  }
}

// ✅ GET all categories
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const categories = await db.collection("itemCategories").find({}).toArray();

    console.log(`✅ Retrieved ${categories.length} categories`);

    // Optional: Optimize response for base64 images
    const optimizedCategories = categories.map(category => {
      // For categories with base64 images, you might want to add metadata
      const optimized = { ...category };
      
      if (optimized.imageUrl && optimized.imageUrl.startsWith('data:image/')) {
        // Add flag indicating it's a base64 image
        optimized.isBase64Image = true;
        // Optionally, you could create a thumbnail or smaller version
        // optimized.thumbnail = createThumbnail(optimized.imageUrl);
      }
      
      return optimized;
    });

    return createResponse(200, true, "Item categories retrieved successfully", optimizedCategories);
    
  } catch (error) {
    console.error("❌ GET /item-category Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}