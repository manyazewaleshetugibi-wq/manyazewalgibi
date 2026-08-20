import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { requireRole } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const limit = Number.parseInt(searchParams.get("limit") || "10");
      const page = Number.parseInt(searchParams.get("page") || "1");
      const skip = (page - 1) * limit;
  
      const contents = await prisma.content.findMany({ skip, take: limit });
      const total = await prisma.content.count();
  
      return NextResponse.json({
        success: true,
        data: contents.map(c => ({ ...c, _id: c.id })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching content:", error);
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
  }

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;
    
    const contentData = await req.json();
    
    // Validate required fields
    if (!contentData.platformName || !contentData.content || !contentData.postType) {
      return NextResponse.json({ success: false, error: "Missing required fields: platformName, content, postType" }, { status: 400 });
    }
    
    // Ensure that `scheduleTime` is properly parsed as a Date object
    contentData.scheduleTime = contentData.scheduleTime ? new Date(contentData.scheduleTime) : new Date();

    const { _id, id, createdAt, updatedAt, ...rest } = contentData;

    const result = await prisma.content.create({
      data: { id: randomUUID(), ...rest } as any,
    });

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
