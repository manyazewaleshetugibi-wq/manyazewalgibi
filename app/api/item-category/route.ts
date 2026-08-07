// app/api/item-category/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";

// Make imageUrl optional in the schema
const ItemCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["FOOD", "DRINK", "OTHER", "BOOK"]),
  station: z.enum(["BARISTA", "COFFEE_MAKER", "ALL"]).default("ALL").optional(),
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

    // Insert the category
    const result = await prisma.itemCategory.create({
      data: {
        id: randomUUID(),
        name: parsed.name,
        description: parsed.description,
        type: parsed.type,
        imageUrl: parsed.imageUrl,
      },
    });

    return createResponse(201, true, "Category created successfully", {
      _id: result.id,
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
    const categories = await prisma.itemCategory.findMany();


    return createResponse(200, true, "Item categories retrieved successfully", categories.map((c: any) => ({
      ...c,
      _id: c.id,
    })));
    
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
    
    const updateData: any = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type !== undefined && { type: body.type }),
    };
    
    // Remove imageUrl if not provided
    if (body.imageUrl) {
      updateData.imageUrl = body.imageUrl;
    }

    try {
      await prisma.itemCategory.update({ where: { id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return createResponse(404, false, "Category not found");
      }
      throw e;
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
    
    const result = await prisma.itemCategory.deleteMany({ where: { id } });
    
    if (result.count === 0) {
      return createResponse(404, false, "Category not found");
    }
    
    return createResponse(200, true, "Category deleted successfully");
    
  } catch (error: any) {
    console.error("❌ DELETE /item-category Error:", error);
    return createResponse(500, false, "Failed to delete category");
  }
}
