import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Cloudinary Configuration - Updated based on your data
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '972889222288323';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'LuJ8tJeTt8phDWxo_bODm6wyyO0';

// Upload presets
const CLOUDINARY_VIDEO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET || 'goldgold';
const CLOUDINARY_IMAGE_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_DOCUMENT_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_DOCUMENT_UPLOAD_PRESET || 'documentupload';

// Folders
const CLOUDINARY_VIDEO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'videos';
const CLOUDINARY_PHOTO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_PHOTO_FOLDER || 'photoss';
const CLOUDINARY_DOCUMENT_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_RAW_FOLDER || 'pdffiles';

const MAX_FILE_SIZES = {
  video: 100 * 1024 * 1024,  // 100MB
  audio: 50 * 1024 * 1024,   // 50MB
  document: 20 * 1024 * 1024, // 20MB
  image: 10 * 1024 * 1024,   // 10MB
};

const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'],
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

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return baseName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]/g, '')
    .substring(0, 100);
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

async function uploadToCloudinary(
  file: File,
  type: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    let uploadPreset = '';
    let folder = '';
    let uploadUrl = '';
    let resourceType = '';
    
    // Configure based on file type with CORRECT presets
    switch (type) {
      case 'video':
        folder = CLOUDINARY_VIDEO_FOLDER;
        resourceType = 'video';
        uploadPreset = CLOUDINARY_VIDEO_UPLOAD_PRESET; // 'goldgold'
        uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
        break;
      case 'audio':
        folder = CLOUDINARY_VIDEO_FOLDER;
        resourceType = 'video';
        uploadPreset = CLOUDINARY_VIDEO_UPLOAD_PRESET; // 'goldgold'
        uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
        break;
      case 'image':
        folder = CLOUDINARY_PHOTO_FOLDER;
        resourceType = 'image';
        uploadPreset = CLOUDINARY_IMAGE_UPLOAD_PRESET; // 'photoupload'
        uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        break;
      case 'document':
        // FIXED: Use document-specific preset
        folder = CLOUDINARY_DOCUMENT_FOLDER; // 'pdffiles'
        resourceType = 'raw';
        uploadPreset = CLOUDINARY_DOCUMENT_UPLOAD_PRESET; // 'documentupload'
        uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
        break;
      default:
        folder = CLOUDINARY_DOCUMENT_FOLDER;
        resourceType = 'raw';
        uploadPreset = CLOUDINARY_DOCUMENT_UPLOAD_PRESET;
        uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
    }
    
    console.log('📁 Cloudinary Config:', {
      type,
      folder,
      resourceType,
      uploadUrl,
      uploadPreset,
      cloudName: CLOUDINARY_CLOUD_NAME
    });
    
    // Create unique public ID
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileExtension = getFileExtension(file.name);
    const publicId = `${timestamp}_${randomString}_${sanitizedFileName}`;
    
    // Append to form data
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('tags', `${type},training`);
    
    console.log('📤 Upload Details:', {
      originalName: file.name,
      publicId,
      folder,
      fileSize: file.size,
      mimeType: file.type,
      fileExtension
    });
    
    // Simulate progress
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(Math.min(progress, 90));
        if (progress >= 90) clearInterval(interval);
      }, 100);
    }
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloudinary Error:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (onProgress) {
      onProgress(100);
    }
    
    console.log('✅ Upload Success:', {
      public_id: data.public_id,
      resource_type: data.resource_type,
      secure_url: data.secure_url,
      format: data.format,
      bytes: data.bytes
    });
    
    let viewableUrl = data.secure_url;
    
    // For documents, ensure correct URL
    if (type === 'document' && (!viewableUrl || viewableUrl.includes('undefined'))) {
      viewableUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload/v${data.version}/${data.public_id}.${fileExtension}`;
    }
    
    return {
      url: viewableUrl,
      publicId: data.public_id,
      format: fileExtension,
      bytes: data.bytes,
    };
    
  } catch (error: any) {
    console.error('❌ Upload Error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

export async function POST(request: Request) {
  console.log('📥 Training POST received');
  
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const file = formData.get("file") as File | null;
    const linkUrl = formData.get("linkUrl") as string | null;

    console.log('📝 Form Data:', { title, description, type, fileName: file?.name, fileSize: file?.size, linkUrl });

    if (!title || !description || !type || (!file && !linkUrl)) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required fields" 
      }, { status: 400 });
    }
    
    if (linkUrl && !linkUrl.startsWith('http')) {
      return NextResponse.json({
        success: false,
        error: "Invalid link URL",
      }, { status: 400 });
    }

    if (file) {
      let isValidType = false;
      
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
        return NextResponse.json({ 
          success: false,
          error: `Invalid file type: ${file.type}` 
        }, { status: 400 });
      }
      
      let maxSize = MAX_FILE_SIZES.document;
      if (type === 'video') maxSize = MAX_FILE_SIZES.video;
      if (type === 'audio') maxSize = MAX_FILE_SIZES.audio;
      if (type === 'image') maxSize = MAX_FILE_SIZES.image;
      
      if (file.size > maxSize) {
        return NextResponse.json({ 
          success: false,
          error: `File too large. Max: ${maxSize / (1024 * 1024)}MB` 
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("gold");

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
    
    const result = await db.collection("trainings").insertOne(trainingDoc);
    const trainingId = result.insertedId;

    if (linkUrl) {
      const training = await db.collection("trainings").findOne({ _id: trainingId });
      return NextResponse.json({ 
        success: true,
        message: "Training created",
        training,
      }, { status: 201 });
    }

    const updateProgress = async (progress: number) => {
      await db.collection("trainings").updateOne(
        { _id: trainingId },
        { $set: { uploadProgress: progress, updatedAt: new Date() } }
      );
    };

    try {
      const cloudinaryResult = await uploadToCloudinary(file!, type, updateProgress);
      
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
        message: "Upload successful",
        training,
      }, { status: 201 });
      
    } catch (uploadError: any) {
      await db.collection("trainings").updateOne(
        { _id: trainingId },
        { 
          $set: { 
            uploadStatus: "failed", 
            uploadProgress: 0,
            error: uploadError.message,
            failedAt: new Date(),
          } 
        }
      );
      throw uploadError;
    }
    
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Upload failed",
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const trainings = await db.collection("trainings")
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json({ 
      success: true,
      data: trainings,
      count: trainings.length 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch trainings" 
    }, { status: 500 });
  }
}