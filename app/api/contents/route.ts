import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

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
    const contentData = await req.json();
    
    // Ensure that `scheduleTime` is properly parsed as a Date object
    contentData.scheduleTime = new Date(contentData.scheduleTime);

    const { _id, ...rest } = contentData;

    const result = await prisma.content.create({
      data: { id: randomUUID(), ...rest } as any,
    });

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
