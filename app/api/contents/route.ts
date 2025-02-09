import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import Content from "@/models/Content";

export async function GET(req: NextRequest) {
    try {
      const client = await clientPromise;
      const db = client.db();
      const contentCollection = db.collection("contents");
  
      const { searchParams } = new URL(req.url);
      const limit = Number.parseInt(searchParams.get("limit") || "10");
      const page = Number.parseInt(searchParams.get("page") || "1");
      const skip = (page - 1) * limit;
  
      const contents = await contentCollection.find().skip(skip).limit(limit).toArray();
      const total = await contentCollection.countDocuments();
  
      return NextResponse.json({
        success: true,
        data: contents,
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
    const client = await clientPromise;
    const db = client.db();
    const contentCollection = db.collection("contents");

    const contentData = await req.json();
    
    // Ensure that `scheduleTime` is properly parsed as a Date object
    contentData.scheduleTime = new Date(contentData.scheduleTime);

    const result = await contentCollection.insertOne(contentData);

    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}