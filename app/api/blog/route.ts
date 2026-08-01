import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { BlogSchema } from "@/models/Blogs";
import { ObjectId } from "mongodb";
import { requireRole } from "@/lib/api-auth";
import { sanitizeBlogHtml } from "@/lib/sanitize";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_VIDEO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET || 'goldgold';
const CLOUDINARY_PHOTO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_VIDEO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'videos';
const CLOUDINARY_PHOTO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_PHOTO_FOLDER || 'photoss';
const CLOUDINARY_RAW_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_RAW_FOLDER || 'raw_files';
const CLOUDINARY_BLOG_FOLDER = 'blogs';

// Max file sizes
const MAX_FILE_SIZES = {
  video: 100 * 1024 * 1024, // 100MB
  image: 10 * 1024 * 1024,  // 10MB
};

// Allowed types
const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov', 'video/avi'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

// Upload file to Cloudinary
async function uploadToCloudinary(
  file: File,
  type: 'video' | 'image',
  onProgress?: (progress: number) => void
): Promise<{ 
  url: string; 
  publicId: string; 
  format: string; 
  bytes: number; 
  resourceType: string;
  thumbnailUrl?: string;
}> {
  let interval: NodeJS.Timeout | null = null;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', type === 'video' ? CLOUDINARY_VIDEO_UPLOAD_PRESET : CLOUDINARY_PHOTO_UPLOAD_PRESET);
    formData.append('folder', `${CLOUDINARY_BLOG_FOLDER}/${type}s`);
    
    // Add resource type
    const resourceType = type === 'video' ? 'video' : 'image';
    
    // Add public_id for better organization
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `${CLOUDINARY_BLOG_FOLDER}/${type}s/${timestamp}_${randomString}_${safeFileName.replace(/\.[^/.]+$/, "")}`;
    formData.append('public_id', publicId);
    
    // Add tags for organization
    formData.append('tags', `${type},blog`);
    
    // Add context/metadata
    formData.append('context', `type=${type}|filename=${file.name}|uploaded_at=${timestamp}`);
    
    // For videos, add eager transformations for thumbnail
    if (type === 'video') {
      formData.append('eager', 'w_300,h_200,c_fill');
      formData.append('eager_async', 'true');
    }
    
    // Simulate upload progress
    if (onProgress) {
      let progress = 0;
      const step = type === 'image' ? 20 : 10; // Faster steps for images
      const intervalTime = type === 'image' ? 100 : 200; // Faster interval for images

      interval = setInterval(() => {
        progress += step;
        const maxProgress = 90;
        if (progress > maxProgress) progress = maxProgress;
        onProgress(progress);
      }, intervalTime);
    }
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (interval) clearInterval(interval);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary response error:', errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (onProgress) {
      onProgress(100); // Complete
    }
    
    // Generate thumbnail URL for videos
    let thumbnailUrl;
    if (type === 'video') {
      thumbnailUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/w_300,h_200,c_fill/${data.public_id}.jpg`;
    }
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format || 'raw',
      bytes: data.bytes,
      resourceType: data.resource_type,
      thumbnailUrl,
    };
    
  } catch (error: any) {
    if (interval) clearInterval(interval);
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

// Generate video thumbnail URL from Cloudinary public_id
function generateVideoThumbnailUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/w_300,h_200,c_fill/${publicId}.jpg`;
}

// Get all blogs with pagination, filtering, and upload status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'publishedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const mediaType = searchParams.get('mediaType') || '';
    const showAll = searchParams.get('showAll') === 'true';
    const includeUploads = searchParams.get('includeUploads') === 'true';

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }

    if (mediaType && mediaType !== 'all') {
      query.mediaType = mediaType;
    }
    
    // Only show active blogs by default
    if (!showAll) {
      query.isActive = true;
    }
    
    // Get total count for pagination
    const total = await db.collection("blogs").countDocuments(query);
    
    // Determine sort direction
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions: any = { [sortBy]: sortDirection };
    
    // Get paginated results
    let blogs = await db.collection("blogs")
      .find(query)
      .sort(sortOptions)
      .skip(page * limit)
      .limit(limit)
      .toArray();

    // Convert ObjectId to string and format dates for JSON serialization
    const formattedBlogs = blogs.map(blog => {
      const formattedBlog: any = {
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
      };

      // Format dates
      const formatDate = (date: any) => {
        if (date && date instanceof Date) {
          return date.toISOString();
        }
        return new Date().toISOString();
      };

      formattedBlog.publishedAt = formatDate(blog.publishedAt);
      formattedBlog.createdAt = formatDate(blog.createdAt);
      formattedBlog.updatedAt = formatDate(blog.updatedAt);
      formattedBlog.completedAt = formatDate(blog.completedAt);
      formattedBlog.failedAt = formatDate(blog.failedAt);

      // Generate thumbnail if video and not already set
      if (blog.mediaType === 'video' && blog.publicId && !formattedBlog.thumbnailUrl) {
        formattedBlog.thumbnailUrl = generateVideoThumbnailUrl(blog.publicId);
      }

      // If includeUploads is false and upload is not completed, filter out
      if (!includeUploads && formattedBlog.uploadStatus !== 'completed') {
        return null;
      }

      return formattedBlog;
    }).filter(Boolean); // Remove null values

    return NextResponse.json(
      {
        success: true,
        data: formattedBlogs,
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
  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch blogs",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        data: [],
        pagination: {
          page: 0,
          limit: 10,
          total: 0,
          pages: 0
        }
      },
      { status: 500 }
    );
  }
}

// Create a new blog with Cloudinary upload
export async function POST(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;

    const formData = await req.formData();
    console.log("Received POST request with FormData");
    
    const title = formData.get("title") as string;
    const content = sanitizeBlogHtml(formData.get("content") as string);
    const category = formData.get("category") as any;
    const tagsString = formData.get("tags") as string;
    const publishedAt = formData.get("publishedAt") as string;
    const isActive = formData.get("isActive") === "true";
    
    let mediaSource = (formData.get("mediaSource") as string) || "none";
    let videoSource = formData.get("videoSource") as string;
    const videoUrl = formData.get("videoUrl") as string;
    
    const imageFile = formData.get("imageFile") as File | null;
    const videoFile = formData.get("videoFile") as File | null;

    // Auto-detect media source and video source based on files
    if (imageFile && imageFile.size > 0) {
      mediaSource = "image";
    } else if (videoFile && videoFile.size > 0) {
      mediaSource = "video";
      videoSource = "upload";
    }

    console.log('Form data:', { 
      title, 
      description: content?.substring(0, 50), 
      category, 
      mediaSource, 
      videoSource,
      hasImageFile: !!imageFile,
      hasVideoFile: !!videoFile,
      videoUrl 
    });

    // Basic validation
    if (!title || !content || !category) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Title, content, and category are required" 
        },
        { status: 400 }
      );
    }

    if (!mediaSource || mediaSource === "none") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Media source is required. Please select image or video." 
        },
        { status: 400 }
      );
    }

    // If video source is URL, validate URL
    if (mediaSource === "video" && videoSource === "url" && videoUrl && !videoUrl.startsWith('http')) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid video URL. Must start with http(s)://" 
        },
        { status: 400 }
      );
    }

    // Validate file type and size if files are provided
    if (mediaSource === "image" && imageFile) {
      const allowedTypes = ALLOWED_TYPES.image;
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid image file type. Allowed types: ${allowedTypes.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_FILE_SIZES.image) {
        const maxSizeMB = MAX_FILE_SIZES.image / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { 
            success: false, 
            error: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
          },
          { status: 400 }
        );
      }
    }

    if (mediaSource === "video" && videoSource === "upload" && videoFile) {
      const allowedTypes = ALLOWED_TYPES.video;
      if (!allowedTypes.includes(videoFile.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid video file type. Allowed types: ${allowedTypes.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (videoFile.size > MAX_FILE_SIZES.video) {
        const maxSizeMB = MAX_FILE_SIZES.video / (1024 * 1024);
        const fileSizeMB = videoFile.size / (1024 * 1024);
        return NextResponse.json(
          { 
            success: false, 
            error: `Video file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
          },
          { status: 400 }
        );
      }
    }

    // Generate excerpt from content
    const excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');

    // Process tags
    const processedTags = tagsString 
      ? tagsString.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const client = await clientPromise;
    const db = client.db("gold");

    // Step 1: Create a pending blog record
    let blogDoc: any = { 
      title,
      content,
      category,
      tags: processedTags,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      isActive,
      excerpt,
      views: 0,
      uploadProgress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Set initial media type
    blogDoc.mediaType = mediaSource as "image" | "video" | "none";

    if (mediaSource === "video" && videoSource === "url" && videoUrl) {
      // If a video URL is provided, create the complete document right away
      blogDoc = {
        ...blogDoc,
        Video: videoUrl,
        fileUrl: videoUrl,
        uploadStatus: "completed",
        completedAt: new Date(),
      };
    } else {
      // If a file is to be uploaded, set the status to uploading
      blogDoc.uploadStatus = "uploading";
    }

    console.log('Creating blog document:', blogDoc);
    
    const result = await db.collection("blogs").insertOne(blogDoc);
    const blogId = result.insertedId;

    console.log('Blog created with ID:', blogId);

    // Update progress in database callback
    const updateProgress = async (progress: number) => {
      try {
        await db.collection("blogs").updateOne(
          { _id: blogId },
          { 
            $set: { 
              uploadProgress: progress, 
              uploadStatus: progress === 100 ? 'processing' : 'uploading',
              updatedAt: new Date()
            } 
          }
        );
        console.log(`Progress updated: ${progress}%`);
      } catch (progressError) {
        console.error('Error updating progress:', progressError);
      }
    };

    // Handle file upload if applicable
    let cloudinaryResult;
    if (mediaSource === "image" && imageFile) {
      try {
        console.log('Starting image upload to Cloudinary...');
        cloudinaryResult = await uploadToCloudinary(imageFile, 'image', updateProgress);
        
        console.log('Image upload successful:', cloudinaryResult);
        
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        
        // Update with error status
        await db.collection("blogs").updateOne(
          { _id: blogId },
          { 
            $set: { 
              uploadStatus: "failed", 
              uploadProgress: 0,
              error: uploadError.message,
              failedAt: new Date(),
              updatedAt: new Date(),
            } 
          }
        );
        
        return NextResponse.json(
          { 
            success: false, 
            error: uploadError.message || "Failed to upload image" 
          },
          { status: 500 }
        );
      }
    } else if (mediaSource === "video" && videoSource === "upload" && videoFile) {
      try {
        console.log('Starting video upload to Cloudinary...');
        cloudinaryResult = await uploadToCloudinary(videoFile, 'video', updateProgress);
        
        console.log('Video upload successful:', cloudinaryResult);
        
      } catch (uploadError: any) {
        console.error('Video upload error:', uploadError);
        
        // Update with error status
        await db.collection("blogs").updateOne(
          { _id: blogId },
          { 
            $set: { 
              uploadStatus: "failed", 
              uploadProgress: 0,
              error: uploadError.message,
              failedAt: new Date(),
              updatedAt: new Date(),
            } 
          }
        );
        
        return NextResponse.json(
          { 
            success: false, 
            error: uploadError.message || "Failed to upload video" 
          },
          { status: 500 }
        );
      }
    }

    // Step 3: Update blog record with Cloudinary URL if applicable
    if (cloudinaryResult) {
      const updatedBlog: any = {
        fileUrl: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        format: cloudinaryResult.format,
        fileSize: cloudinaryResult.bytes,
        originalFileName: mediaSource === 'image' ? imageFile?.name : videoFile?.name,
        mimeType: mediaSource === 'image' ? imageFile?.type : videoFile?.type,
        uploadStatus: "completed",
        uploadProgress: 100,
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      // Set the appropriate field based on media type
      if (mediaSource === 'image') {
        updatedBlog.Image = cloudinaryResult.url;
        updatedBlog.thumbnailUrl = cloudinaryResult.url; // Image is its own thumbnail
      } else if (mediaSource === 'video') {
        updatedBlog.Video = cloudinaryResult.url;
        updatedBlog.thumbnailUrl = cloudinaryResult.thumbnailUrl || generateVideoThumbnailUrl(cloudinaryResult.publicId);
      }
      
      await db.collection("blogs").updateOne(
        { _id: blogId },
        { $set: updatedBlog }
      );

      console.log('Blog updated with Cloudinary data');
    }

    // Get the complete blog record to return
    const blog = await db.collection("blogs").findOne({ _id: blogId });

    // Format the response
    const responseBlog: any = {
      _id: blog?._id.toString(),
      title: blog?.title || "",
      content: blog?.content || "",
      category: blog?.category || "OTHER",
      tags: blog?.tags || [],
      Image: blog?.Image || "",
      Video: blog?.Video || "",
      mediaType: blog?.mediaType || "none",
      isActive: blog?.isActive !== undefined ? blog.isActive : true,
      excerpt: blog?.excerpt || "",
      views: blog?.views || 0,
      uploadStatus: blog?.uploadStatus || "completed",
      uploadProgress: blog?.uploadProgress || 100,
      fileUrl: blog?.fileUrl || blog?.Video || blog?.Image || "",
      thumbnailUrl: blog?.thumbnailUrl || "",
      publicId: blog?.publicId || "",
      format: blog?.format || "",
      fileSize: blog?.fileSize || 0,
      originalFileName: blog?.originalFileName || "",
      mimeType: blog?.mimeType || "",
      error: blog?.error || "",
    };

    // Format dates
    const formatDate = (date: any) => {
      if (date && date instanceof Date) {
        return date;
      }
      return new Date();
    };

    responseBlog.publishedAt = formatDate(blog?.publishedAt);
    responseBlog.createdAt = formatDate(blog?.createdAt);
    responseBlog.updatedAt = formatDate(blog?.updatedAt);
    responseBlog.completedAt = formatDate(blog?.completedAt);
    responseBlog.failedAt = formatDate(blog?.failedAt);

    // Validate using BlogSchema
    const parsed = BlogSchema.safeParse(responseBlog);
    
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.format());
      // Still return success but with validation warnings
      console.warn("Blog created but validation warnings:", parsed.error.format());
    }

    return NextResponse.json(
      {
        success: true,
        data: responseBlog,
        message: "Blog created successfully"
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create blog",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Update blog (for updates, we use JSON - no file upload)
export async function PUT(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const body = await req.json();
    
    console.log("Updating blog ID:", id, "Data:", JSON.stringify(body, null, 2));
    
    const { 
      title, 
      content: rawContent, 
      category, 
      tags, 
      imageBase64, 
      videoBase64, 
      videoUrl,
      mediaSource = "none",
      videoSource,
      publishedAt, 
      isActive
    } = body;
    const content = sanitizeBlogHtml(rawContent);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Blog ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Blog ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Get existing blog
    const existingBlog = await db.collection("blogs").findOne({ _id: new ObjectId(id) });
    if (!existingBlog) {
      return NextResponse.json(
        { success: false, error: "Blog not found" },
        { status: 404 }
      );
    }

    // Generate excerpt from content
    const contentToUse = content || existingBlog.content || "";
    const excerpt = contentToUse.substring(0, 150) + (contentToUse.length > 150 ? '...' : '');

    // Process tags
    let processedTags: string[] = [];
    if (Array.isArray(tags)) {
      processedTags = tags;
    } else if (typeof tags === 'string') {
      processedTags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    } else {
      processedTags = existingBlog.tags || [];
    }

    // Handle media updates - for updates, we only handle URL changes, not file uploads
    let imageUrl = existingBlog.Image;
    let videoMediaUrl = existingBlog.Video;
    let finalMediaType = existingBlog.mediaType || "none";

    // Handle image removal or URL update
    if (mediaSource === "image") {
      if (imageBase64 === null) {
        // Remove image
        imageUrl = "";
        finalMediaType = "none";
      } else if (imageBase64 && imageBase64.startsWith('http')) {
        // Update image URL
        imageUrl = imageBase64;
        finalMediaType = "image";
        videoMediaUrl = ""; // Clear video when switching to image
      }
    } else if (mediaSource === "video") {
      // Handle video URL updates
      imageUrl = ""; // Clear image when switching to video
      
      if (videoSource === "url" && videoUrl) {
        try {
          new URL(videoUrl);
          videoMediaUrl = videoUrl;
          finalMediaType = "video";
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid video URL" },
            { status: 400 }
          );
        }
      } else if (videoSource === "none" || (!videoBase64 && !videoUrl && !existingBlog.Video)) {
        // No video provided and no existing video
        videoMediaUrl = "";
        finalMediaType = "none";
      } else {
        // Keep existing video
        videoMediaUrl = existingBlog.Video || "";
        finalMediaType = "video";
      }
    } else if (mediaSource === "none") {
      // Remove all media
      imageUrl = "";
      videoMediaUrl = "";
      finalMediaType = "none";
    }

    // Prepare update data
    const updateData = {
      title: title !== undefined ? title : existingBlog.title,
      content: content !== undefined ? content : existingBlog.content,
      category: category !== undefined ? category : existingBlog.category,
      tags: processedTags,
      publishedAt: publishedAt ? new Date(publishedAt) : existingBlog.publishedAt,
      isActive: isActive !== undefined ? isActive : existingBlog.isActive,
      Image: imageUrl || "",
      Video: videoMediaUrl || "",
      mediaType: finalMediaType,
      excerpt,
      updatedAt: new Date(),
      views: existingBlog.views || 0,
      createdAt: existingBlog.createdAt || new Date(),
      // Preserve upload-related fields
      uploadStatus: existingBlog.uploadStatus || "completed",
      uploadProgress: existingBlog.uploadProgress || 100,
      fileUrl: (finalMediaType === 'video' ? videoMediaUrl : (finalMediaType === 'image' ? imageUrl : "")) || "",
      thumbnailUrl: existingBlog.thumbnailUrl || "",
      publicId: existingBlog.publicId || "",
      format: existingBlog.format || "",
      fileSize: existingBlog.fileSize || 0,
      originalFileName: existingBlog.originalFileName || "",
      mimeType: existingBlog.mimeType || "",
      error: existingBlog.error || "",
    };

    console.log("Update data:", updateData);

    // Validate using BlogSchema
    const parsed = BlogSchema.safeParse(updateData);
    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.format());
      return NextResponse.json(
        { 
          success: false, 
          error: "Validation failed",
          details: parsed.error.format() 
        },
        { status: 400 }
      );
    }

    const result = await db.collection("blogs").updateOne(
      { _id: new ObjectId(id) },
      { $set: parsed.data }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Blog not found" },
        { status: 404 }
      );
    }

    // Prepare response data
    const responseData = {
      _id: id,
      ...parsed.data,
      publishedAt: parsed.data.publishedAt.toISOString(),
      createdAt: parsed.data.createdAt.toISOString(),
      updatedAt: parsed.data.updatedAt.toISOString()
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: "Blog updated successfully"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update blog",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Delete blog
export async function DELETE(req: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Blog ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Blog ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Get blog first to get Cloudinary publicId for cleanup
    const blog = await db.collection("blogs").findOne({ _id: new ObjectId(id) });

    if (!blog) {
      return NextResponse.json(
        { success: false, error: "Blog not found" },
        { status: 404 }
      );
    }

    // TODO: Optionally delete from Cloudinary if needed
    // if (blog.publicId) {
    //   // Delete from Cloudinary
    //   // This requires additional logic and Cloudinary admin API key
    // }

    const result = await db.collection("blogs").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Blog not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Blog deleted successfully"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete blog",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
