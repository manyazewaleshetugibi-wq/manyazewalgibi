import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { BlogSchema } from "@/models/Blogs";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";

// Get a single blog
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const blog = await db.collection("blogs").findOne({ _id: new ObjectId(params.id) });

    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: blog }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch blog", error }, { status: 500 });
  }
}

// Update a blog (with optional image upload)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    let { title, content, category, tags, imageBase64, publishedAt, isActive } = body;

    // Validate partial input
    const parsed = BlogSchema.partial().omit({ Image: true }).safeParse({ title, content, category, tags, publishedAt, isActive });
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.format() }, { status: 400 });
    }

    // Upload new image if provided
    let imageUrl: string | undefined;
    if (imageBase64) {
      imageUrl = await uploadImage(imageBase64);
    }

    const client = await clientPromise;
    const db = client.db();
    const updateFields = {
      ...parsed.data,
      ...(imageUrl && { Image: imageUrl }),
      updatedAt: new Date(),
    };

    const result = await db.collection("blogs").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Blog updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json({ success: false, message: "Failed to update blog", error }, { status: 500 });
  }
}

// Delete a blog
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("blogs").deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Blog deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json({ success: false, message: "Failed to delete blog", error }, { status: 500 });
  }
}
