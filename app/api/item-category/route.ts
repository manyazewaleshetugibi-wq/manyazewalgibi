// app/api/item-category/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { z } from "zod";

// Make imageUrl optional in the schema
const ItemCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["FOOD", "DRINK", "OTHER", "BOOK"]),
  imageUrl: z.string().optional(), // Made optional
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export function validateItemCategoryData(rawData: any) {
  return ItemCategorySchema.parse(rawData);
}

// ✅ Utility function for consistent responses
const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
  return NextResponse.json({ success, message, data }, { status });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📝 POST request body:", body);

    // Prepare data for validation
    const dataToValidate = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only add imageUrl if it exists, otherwise omit it
    if (!body.imageUrl) {
      delete dataToValidate.imageUrl;
    }

    // Validate the data
    const parsed = validateItemCategoryData(dataToValidate);

    const client = await clientPromise;
    const db = client.db("gold");

    // Insert the category
    const result = await db.collection("itemCategories").insertOne(parsed);

    if (!result.acknowledged) {
      throw new Error("Database insertion failed");
    }

    return createResponse(201, true, "Category created successfully", {
      _id: result.insertedId,
      ...parsed,
    });
    
  } catch (error: any) {
    console.error("❌ POST /item-category Error:", error);
    
    if (error.name === 'ZodError') {
      return createResponse(400, false, `Validation error: ${error.errors?.[0]?.message || error.message}`);
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
    return createResponse(200, true, "Item categories retrieved successfully", categories);
    
  } catch (error) {
    console.error("❌ GET /item-category Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}

// ✅ PUT update category
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return createResponse(400, false, "Category ID is required");
    }

    const body = await req.json();
    
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };
    
    // Remove imageUrl if not provided
    if (!body.imageUrl) {
      delete updateData.imageUrl;
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    const result = await db.collection("itemCategories").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return createResponse(404, false, "Category not found");
    }
    
    return createResponse(200, true, "Category updated successfully");
    
  } catch (error: any) {
    console.error("❌ PUT /item-category Error:", error);
    return createResponse(500, false, "Failed to update category");
  }
}

// ✅ DELETE category
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return createResponse(400, false, "Category ID is required");
    }
    
    const client = await clientPromise;
    const db = client.db("gold");
    
    const result = await db.collection("itemCategories").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return createResponse(404, false, "Category not found");
    }
    
    return createResponse(200, true, "Category deleted successfully");
    
  } catch (error: any) {
    console.error("❌ DELETE /item-category Error:", error);
    return createResponse(500, false, "Failed to delete category");
  }
}
