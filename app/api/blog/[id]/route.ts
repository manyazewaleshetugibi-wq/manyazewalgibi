import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { BlogSchema } from "@/models/Blogs";
import { uploadImage } from "@/types/utils/uploadImages";
import { ObjectId } from "mongodb";
import { requireRole } from "@/lib/api-auth";
import { sanitizeBlogHtml } from "@/lib/sanitize";

// Cloudinary Configuration (for thumbnail generation)
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';

// Generate video thumbnail URL from Cloudinary public_id
function generateVideoThumbnailUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/w_300,h_200,c_fill/${publicId}.jpg`;
}

// GET single blog with view tracking
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params first
    const { id } = await params;
    
    // Validate ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Increment view count
    await db.collection("blogs").updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 } }
    );
    
    // Get blog with all fields including video data
    const blog = await db.collection("blogs").findOne(
      { _id: new ObjectId(id) }
    );

    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    // Format blog data with video thumbnail if needed
    const formattedBlog = {
      _id: blog._id.toString(),
      title: blog.title || "",
      content: blog.content || "",
      category: blog.category || "OTHER",
      tags: blog.tags || [],
      Image: blog.Image || "",
      Video: blog.Video || "",
      mediaType: blog.mediaType || "none",
      isActive: blog.isActive !== undefined ? blog.isActive : true,
      excerpt: blog.excerpt || "",
      views: blog.views || 0,
      // Video upload fields
      uploadStatus: blog.uploadStatus || "completed",
      uploadProgress: blog.uploadProgress || 100,
      fileUrl: blog.fileUrl || blog.Video || blog.Image || "",
      thumbnailUrl: blog.thumbnailUrl || "",
      publicId: blog.publicId || "",
      format: blog.format || "",
      fileSize: blog.fileSize || 0,
      originalFileName: blog.originalFileName || "",
      mimeType: blog.mimeType || "",
      error: blog.error || "",
      // Dates
      publishedAt: blog.publishedAt ? blog.publishedAt.toISOString() : new Date().toISOString(),
      createdAt: blog.createdAt ? blog.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: blog.updatedAt ? blog.updatedAt.toISOString() : new Date().toISOString(),
      completedAt: blog.completedAt ? blog.completedAt.toISOString() : undefined,
      failedAt: blog.failedAt ? blog.failedAt.toISOString() : undefined,
    };

    // Generate thumbnail for video if not already set
    if (blog.mediaType === 'video' && blog.publicId && !formattedBlog.thumbnailUrl) {
      formattedBlog.thumbnailUrl = generateVideoThumbnailUrl(blog.publicId);
    }

    // Get related blogs (same category)
    const relatedBlogs = await db.collection("blogs")
      .find({
        _id: { $ne: new ObjectId(id) },
        category: blog.category,
        isActive: true
      })
      .limit(3)
      .project({
        title: 1,
        excerpt: 1,
        Image: 1,
        Video: 1,
        mediaType: 1,
        thumbnailUrl: 1,
        createdAt: 1
      })
      .toArray();

    // Format related blogs
    const formattedRelatedBlogs = relatedBlogs.map(relBlog => ({
      _id: relBlog._id.toString(),
      title: relBlog.title || "",
      excerpt: relBlog.excerpt || "",
      Image: relBlog.Image || "",
      Video: relBlog.Video || "",
      mediaType: relBlog.mediaType || "none",
      thumbnailUrl: relBlog.thumbnailUrl || "",
      createdAt: relBlog.createdAt ? relBlog.createdAt.toISOString() : new Date().toISOString(),
    }));

    // Get previous and next blogs
    const [prevBlog, nextBlog] = await Promise.all([
      db.collection("blogs")
        .findOne(
          {
            _id: { $lt: new ObjectId(id) },
            isActive: true
          },
          {
            sort: { _id: -1 },
            projection: { title: 1, _id: 1, mediaType: 1, thumbnailUrl: 1 }
          }
        ),
      db.collection("blogs")
        .findOne(
          {
            _id: { $gt: new ObjectId(id) },
            isActive: true
          },
          {
            sort: { _id: 1 },
            projection: { title: 1, _id: 1, mediaType: 1, thumbnailUrl: 1 }
          }
        )
    ]);

    // Format navigation blogs
    const formatNavBlog = (navBlog: any) => {
      if (!navBlog) return null;
      return {
        _id: navBlog._id.toString(),
        title: navBlog.title || "",
        mediaType: navBlog.mediaType || "none",
        thumbnailUrl: navBlog.thumbnailUrl || "",
      };
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          ...formattedBlog,
          related: formattedRelatedBlogs,
          navigation: {
            prev: formatNavBlog(prevBlog),
            next: formatNavBlog(nextBlog)
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
  } catch (error: any) {
    console.error("Error fetching blog:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch blog",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update a blog
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;

    // Await params first
    const { id } = await params;
    
    // Validate ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();
    let { 
      title, 
      content: rawContent, 
      category, 
      tags, 
      imageBase64, 
      videoUrl,
      mediaSource,
      videoSource,
      publishedAt, 
      isActive 
    } = body;
    const content = sanitizeBlogHtml(rawContent);

    // For updates, we only handle text changes and URL updates, not file uploads
    // File uploads should be done through the main POST endpoint

    // Validate partial input
    const parsed = BlogSchema.partial()
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
        { 
          success: false, 
          message: "Validation failed",
          errors: parsed.error.format() 
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Get existing blog first
    const existingBlog = await db.collection("blogs").findOne({ 
      _id: new ObjectId(id) 
    });

    if (!existingBlog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    const updateFields: any = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    // Generate new excerpt if content changed
    if (content && content.length > 0) {
      updateFields.excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');
    }

    // Handle image URL update if imageBase64 is a URL string (not base64)
    if (imageBase64 && imageBase64.startsWith('http')) {
      updateFields.Image = imageBase64;
      if (mediaSource === 'image') {
        updateFields.mediaType = 'image';
        updateFields.Video = ''; // Clear video if switching to image
        updateFields.fileUrl = imageBase64;
      }
    }

    // Handle video URL update
    if (videoUrl && videoUrl.startsWith('http')) {
      updateFields.Video = videoUrl;
      if (mediaSource === 'video') {
        updateFields.mediaType = 'video';
        updateFields.Image = ''; // Clear image if switching to video
        updateFields.fileUrl = videoUrl; // Update fileUrl for video
      }
    }

    // Handle media type changes
    if (mediaSource === 'none') {
      updateFields.mediaType = 'none';
      updateFields.Image = '';
      updateFields.Video = '';
      updateFields.fileUrl = '';
    }

    const result = await db.collection("blogs").updateOne(
      { _id: new ObjectId(id) },
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
  } catch (error: any) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;

    // Await params first
    const { id } = await params;
    
    // Validate ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid blog ID format" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    const client = await clientPromise;
    const db = client.db("gold");

    let result;
    
    if (permanent) {
      // Hard delete
      result = await db.collection("blogs").deleteOne({
        _id: new ObjectId(id)
      });
    } else {
      // Soft delete (recommended)
      result = await db.collection("blogs").updateOne(
        { _id: new ObjectId(id) },
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
  } catch (error: any) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete blog",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}