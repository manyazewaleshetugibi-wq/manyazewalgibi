import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'goldgold';
const CLOUDINARY_VIDEO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'videos';
const CLOUDINARY_PHOTO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_PHOTO_FOLDER || 'photoss';
const CLOUDINARY_DOCUMENT_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_RAW_FOLDER || 'pdffiles';

const MAX_FILE_SIZES = {
  video: 100 * 1024 * 1024,  // 100MB
  audio: 50 * 1024 * 1024,   // 50MB
  document: 20 * 1024 * 1024, // 20MB for PDFs, DOCs, etc.
  image: 10 * 1024 * 1024,   // 10MB
};

const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/json'
  ],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

// Sanitize filename to remove whitespace and special characters
function sanitizeFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return baseName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]/g, '')
    .substring(0, 100);
}

// Get file extension
function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

// Upload file to Cloudinary
async function uploadToCloudinary(
  file: File,
  type: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    // Determine folder and upload endpoint
    let folder = CLOUDINARY_DOCUMENT_FOLDER;
    let uploadUrl = '';
    
    if (type === 'video') {
      folder = CLOUDINARY_VIDEO_FOLDER;
      uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
    } else if (type === 'audio') {
      folder = CLOUDINARY_VIDEO_FOLDER;
      uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
    } else if (type === 'image') {
      folder = CLOUDINARY_PHOTO_FOLDER;
      uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    } else if (type === 'document') {
      folder = CLOUDINARY_DOCUMENT_FOLDER;
      uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
    }
    
    // Use folder parameter
    formData.append('folder', folder);
    
    // Create public_id WITHOUT the folder prefix
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileExtension = getFileExtension(file.name);
    const publicId = `${timestamp}_${randomString}_${sanitizedFileName}`;
    
    console.log('📤 Upload details:', { 
      type, 
      uploadUrl,
      folder,
      publicId,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type
    });
    
    formData.append('public_id', publicId);
    formData.append('tags', `${type},training`);
    
    // Simulate progress
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(Math.min(progress, 90));
        if (progress >= 90) clearInterval(interval);
      }, 100);
    }
    
    console.log('🌐 Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloudinary error:', errorText);
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (onProgress) {
      onProgress(100);
    }
    
    // Construct proper viewable URL
    let viewableUrl = data.secure_url;
    
    // For documents (PDFs), construct raw URL for browser viewing
    if (type === 'document') {
      viewableUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload/${data.public_id}.${fileExtension}`;
      console.log('📄 Document URL for browser view:', viewableUrl);
    }
    
    console.log('✅ Upload success:', { 
      url: viewableUrl, 
      publicId: data.public_id,
      format: fileExtension
    });
    
    return {
      url: viewableUrl,
      publicId: data.public_id,
      format: fileExtension,
      bytes: data.bytes,
    };
    
  } catch (error: any) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

export async function POST(request: Request) {
  console.log('📥 Training POST request received');
  
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;
    const linkUrl = formData.get("linkUrl") as string | null;

    console.log('📝 Form data:', { title, description, type, fileName: file?.name, fileSize: file?.size, linkUrl });

    // Validate required fields
    if (!title || !description || !type || (!file && !linkUrl)) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required fields: title, description, type. Either a file or a link is required." 
      }, { status: 400 });
    }
    
    // Validate link URL if provided
    if (linkUrl && !linkUrl.startsWith('http')) {
      return NextResponse.json({
        success: false,
        error: "Invalid link URL. Must start with http(s)://",
      }, { status: 400 });
    }

    // Validate file type if a file is provided
    if (file) {
      let isValidType = false;
      
      // Check if file type is allowed
      if (type === 'document') {
        isValidType = ALLOWED_TYPES.document.includes(file.type);
      } else if (type === 'video') {
        isValidType = ALLOWED_TYPES.video.includes(file.type);
      } else if (type === 'audio') {
        isValidType = ALLOWED_TYPES.audio.includes(file.type);
      } else if (type === 'image') {
        isValidType = ALLOWED_TYPES.image.includes(file.type);
      }
      
      if (!isValidType) {
        console.log('❌ Invalid file type:', { type, fileType: file.type });
        return NextResponse.json({ 
          success: false,
          error: `Invalid file type for ${type}. File type: ${file.type}` 
        }, { status: 400 });
      }
      
      // Validate file size
      let maxSize = MAX_FILE_SIZES.document;
      if (type === 'video') maxSize = MAX_FILE_SIZES.video;
      if (type === 'audio') maxSize = MAX_FILE_SIZES.audio;
      if (type === 'image') maxSize = MAX_FILE_SIZES.image;
      
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        const fileSizeMB = file.size / (1024 * 1024);
        return NextResponse.json({ 
          success: false,
          error: `File too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Create training record
    const trainingDoc: any = { 
      title, 
      description, 
      type,
      uploadProgress: 0,
      uploadStatus: "uploading",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (linkUrl) {
      trainingDoc.fileUrl = linkUrl;
      trainingDoc.uploadStatus = "completed";
      trainingDoc.completedAt = new Date();
    }
    
    console.log('📦 Creating training document');
    
    const result = await db.collection("trainings").insertOne(trainingDoc);
    const trainingId = result.insertedId;

    // If link URL, return immediately
    if (linkUrl) {
      const training = await db.collection("trainings").findOne({ _id: trainingId });
      return NextResponse.json({ 
        success: true,
        message: "Training created successfully",
        training,
      }, { status: 201 });
    }

    // Update progress function
    const updateProgress = async (progress: number) => {
      try {
        await db.collection("trainings").updateOne(
          { _id: trainingId },
          { 
            $set: { 
              uploadProgress: progress, 
              updatedAt: new Date()
            } 
          }
        );
        console.log(`📊 Progress: ${progress}%`);
      } catch (progressError) {
        console.error('❌ Progress update error:', progressError);
      }
    };

    // Upload file to Cloudinary
    try {
      console.log('☁️ Starting upload to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary(file!, type, updateProgress);
      
      console.log('✅ Cloudinary upload successful');
      
      // Update training with Cloudinary data
      const updatedTraining = {
        fileUrl: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        format: cloudinaryResult.format,
        fileSize: cloudinaryResult.bytes,
        originalFileName: file!.name,
        mimeType: file!.type,
        uploadStatus: "completed",
        uploadProgress: 100,
        completedAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection("trainings").updateOne(
        { _id: trainingId },
        { $set: updatedTraining }
      );
      
      const training = await db.collection("trainings").findOne({ _id: trainingId });
      
      return NextResponse.json({ 
        success: true,
        message: "Training uploaded successfully",
        training,
      }, { status: 201 });
      
    } catch (uploadError: any) {
      console.error('❌ Upload error:', uploadError);
      
      // Update with error status
      await db.collection("trainings").updateOne(
        { _id: trainingId },
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
      
      throw uploadError;
    }
    
  } catch (error: any) {
    console.error("❌ Error creating training:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Failed to create training",
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('📥 Fetching trainings...');
    const client = await clientPromise;
    const db = client.db("gold");
    const trainings = await db.collection("trainings")
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`✅ Found ${trainings.length} trainings`);
    
    return NextResponse.json({ 
      success: true,
      data: trainings,
      count: trainings.length 
    }, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching trainings:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch trainings" 
    }, { status: 500 });
  }
}