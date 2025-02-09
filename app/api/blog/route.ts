import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { BlogSchema } from "@/models/Blogs";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";

// Get all blogs
export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const blogs = await db.collection("blogs").find().toArray();
    
    return NextResponse.json({ success: true, data: blogs }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch blogs", error }, { status: 500 });
  }
}

// Create a new blog (with image upload)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { title, content, category, tags, imageBase64, publishedAt, isActive } = body;

    // Validate input using Zod schema
    const parsed = BlogSchema.omit({ Image: true }).safeParse({ title, content, category, tags, publishedAt, isActive });
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.format() }, { status: 400 });
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageBase64) {
      imageUrl = await uploadImage(imageBase64);
    }

    const client = await clientPromise;
    const db = client.db();
    const newBlog = {
      ...parsed.data,
      Image: imageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection("blogs").insertOne(newBlog);

    return NextResponse.json({ success: true, data: { _id: result.insertedId, ...newBlog } }, { status: 201 });
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json({ success: false, message: "Failed to create blog", error }, { status: 500 });
  }
}
