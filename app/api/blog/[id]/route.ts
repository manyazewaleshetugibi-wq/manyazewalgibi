import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { BlogSchema } from "@/models/Blogs";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";

// GET single blog with view tracking
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    
    // Increment view count
    await db.collection("blogs").updateOne(
      { _id: new ObjectId(params.id) },
      { $inc: { views: 1 } }
    );
    
    // Get blog with previous and next navigation
    const blog = await db.collection("blogs").findOne(
      { _id: new ObjectId(params.id) },
      { projection: { content: 1, title: 1, category: 1, tags: 1, Image: 1, createdAt: 1, views: 1 } }
    );

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    // Get related blogs (same category)
    const relatedBlogs = await db.collection("blogs")
      .find({
        _id: { $ne: new ObjectId(params.id) },
        category: blog.category,
        isActive: true
      })
      .limit(3)
      .project({
        title: 1,
        excerpt: 1,
        Image: 1,
        createdAt: 1
      })
      .toArray();

    // Get previous and next blogs
    const [prevBlog, nextBlog] = await Promise.all([
      db.collection("blogs")
        .findOne(
          {
            _id: { $lt: new ObjectId(params.id) },
            isActive: true
          },
          {
            sort: { _id: -1 },
            projection: { title: 1, _id: 1 }
          }
        ),
      db.collection("blogs")
        .findOne(
          {
            _id: { $gt: new ObjectId(params.id) },
            isActive: true
          },
          {
            sort: { _id: 1 },
            projection: { title: 1, _id: 1 }
          }
        )
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...blog,
          related: relatedBlogs,
          navigation: {
            prev: prevBlog,
            next: nextBlog
          }
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );
  } catch (error) {
    console.error("Error fetching blog:", error);
    
    // Check if it's an invalid ObjectId
    if (error.message?.includes("ObjectId")) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Failed to fetch blog" },
      { status: 500 }
    );
  }
}

// PUT - Update a blog
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    let { title, content, category, tags, imageBase64, publishedAt, isActive } = body;

    // Validate partial input
    const parsed = BlogSchema.partial()
      .omit({ Image: true })
      .safeParse({
        title,
        content,
        category,
        tags: Array.isArray(tags) ? tags : tags?.split(',').map((t: string) => t.trim()) || [],
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        isActive
      });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.format() },
        { status: 400 }
      );
    }

    // Upload new image if provided
    let imageUrl: string | undefined;
    if (imageBase64) {
      imageUrl = await uploadImage(imageBase64, 'blogs');
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    const updateFields: any = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    // Generate new excerpt if content changed
    if (content && content.length > 0) {
      updateFields.excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');
    }

    // Add image URL if uploaded
    if (imageUrl) {
      updateFields.Image = imageUrl;
    }

    const result = await db.collection("blogs").updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Blog updated successfully",
        updatedFields: Object.keys(updateFields)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update blog",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete or hard delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    const client = await clientPromise;
    const db = client.db("gold");

    let result;
    
    if (permanent) {
      // Hard delete
      result = await db.collection("blogs").deleteOne({
        _id: new ObjectId(params.id)
      });
    } else {
      // Soft delete (recommended)
      result = await db.collection("blogs").updateOne(
        { _id: new ObjectId(params.id) },
        { 
          $set: { 
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: permanent ? "Blog permanently deleted" : "Blog archived successfully"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete blog" },
      { status: 500 }
    );
  }
}