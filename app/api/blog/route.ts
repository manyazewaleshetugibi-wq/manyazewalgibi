import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { BlogSchema } from "@/models/Blogs";
import { uploadImage } from "@/utils/uploadImages";

// Get all blogs with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const client = await clientPromise;
    const db = client.db("gold"); // Specify database name
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    // Only show active blogs by default
    if (!searchParams.has('showAll')) {
      query.isActive = true;
    }
    
    // Get total count for pagination
    const total = await db.collection("blogs").countDocuments(query);
    
    // Determine sort direction
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions: any = { [sortBy]: sortDirection };
    
    // Get paginated results
    const blogs = await db.collection("blogs")
      .find(query)
      .sort(sortOptions)
      .skip(page * limit)
      .limit(limit)
      .project({
        title: 1,
        excerpt: 1,
        category: 1,
        tags: 1,
        Image: 1,
        createdAt: 1,
        publishedAt: 1,
        isActive: 1,
        views: 1
      })
      .toArray();

    return NextResponse.json(
      {
        success: true,
        data: blogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch blogs",
        data: [],
        pagination: {
          page: 0,
          limit: 10,
          total: 0,
          pages: 0
        }
      },
      { status: 200 } // Return 200 with empty data instead of 500
    );
  }
}

// Create a new blog (with image upload)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { title, content, category, tags, imageBase64, publishedAt, isActive } = body;

    // Generate excerpt from content
    const excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');

    // Validate input using Zod schema
    const parsed = BlogSchema.omit({ Image: true }).safeParse({
      title,
      content,
      category,
      tags: Array.isArray(tags) ? tags : tags?.split(',').map((t: string) => t.trim()) || [],
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      isActive: isActive !== undefined ? isActive : true
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.format() },
        { status: 400 }
      );
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageBase64) {
      imageUrl = await uploadImage(imageBase64, 'blogs');
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    const newBlog = {
      ...parsed.data,
      excerpt,
      Image: imageUrl,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection("blogs").insertOne(newBlog);

    return NextResponse.json(
      {
        success: true,
        data: { _id: result.insertedId, ...newBlog },
        message: "Blog created successfully"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create blog",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}