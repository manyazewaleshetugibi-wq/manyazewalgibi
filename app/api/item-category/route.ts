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

    // Prepare data for validation
    const dataToValidate = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // The frontend now sends a Cloudinary URL directly.
    // If body.imageUrl is present and not an empty string, use it. Otherwise, use a placeholder.
    if (body.imageUrl) {
      dataToValidate.imageUrl = body.imageUrl;
      console.log("📸 Using provided image URL:", body.imageUrl);
    } else {
      // Default placeholder
      dataToValidate.imageUrl = "/placeholder-category.svg";
    }

    // Validate the data
    const parsed = validateItemCategoryData(dataToValidate);

    console.log("✅ Parsed Data:", {
      ...parsed,
      imageUrl: parsed.imageUrl
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