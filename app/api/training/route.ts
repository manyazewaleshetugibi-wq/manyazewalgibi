import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_VIDEO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET || 'goldgold';
const CLOUDINARY_PHOTO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_VIDEO_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'videos';
const CLOUDINARY_PHOTO_FOLDER = 'photoss';
const CLOUDINARY_RAW_FOLDER = 'raw_files'; // For PDFs, text files, etc.

// Maximum file sizes (adjust as needed)
const MAX_FILE_SIZES = {
  video: 100 * 1024 * 1024, // 100MB for videos
  audio: 50 * 1024 * 1024,  // 50MB for audio
  pdf: 20 * 1024 * 1024,    // 20MB for PDFs
  text: 5 * 1024 * 1024,    // 5MB for text
  image: 10 * 1024 * 1024,  // 10MB for images
};

// Allowed file types
const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
  pdf: ['application/pdf'],
  text: ['text/plain', 'text/markdown', 'text/html', 'application/json'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
};

// Upload file to Cloudinary
async function uploadToCloudinary(
  file: File,
  type: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; publicId: string; format: string; bytes: number }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', getUploadPreset(type));
    formData.append('folder', getFolder(type));
    
    // Add resource type based on file type
    let resourceType = 'auto';
    if (type === 'video' || type === 'audio') {
      resourceType = 'video'; // Cloudinary treats audio as video resource type
    } else if (type === 'image') {
      resourceType = 'image';
    } else {
      resourceType = 'raw'; // For PDFs, text files
    }
    
    // For unsigned uploads with presets, we can only use allowed parameters
    // Remove the eager parameter as it's not allowed with unsigned uploads
    
    // Add public_id for better organization
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const publicId = `${getFolder(type)}/${timestamp}_${randomString}_${file.name.replace(/\.[^/.]+$/, "")}`;
    formData.append('public_id', publicId);
    
    // Add tags for organization
    formData.append('tags', `${type},training`);
    
    // Add context/metadata if needed
    formData.append('context', `type=${type}|filename=${file.name}`);
    
    // Simulate progress for now (Cloudinary doesn't have native progress events)
    if (onProgress) {
      // Simulate upload progress
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          onProgress(Math.min(progress, 90)); // Max 90% until complete
          if (progress >= 90) clearInterval(interval);
        }, 100);
      };
      simulateProgress();
    }
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary response error:', errorText);
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (onProgress) {
      onProgress(100); // Complete
    }
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format || 'raw',
      bytes: data.bytes,
    };
    
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

// Helper functions
function getUploadPreset(type: string): string {
  switch (type) {
    case 'video':
    case 'audio':
      return CLOUDINARY_VIDEO_UPLOAD_PRESET;
    case 'image':
      return CLOUDINARY_PHOTO_UPLOAD_PRESET;
    default:
      return CLOUDINARY_VIDEO_UPLOAD_PRESET; // Default to video preset for raw files
  }
}

function getFolder(type: string): string {
  switch (type) {
    case 'video':
      return CLOUDINARY_VIDEO_FOLDER;
    case 'image':
      return CLOUDINARY_PHOTO_FOLDER;
    case 'audio':
      return 'audio_files';
    case 'pdf':
      return 'pdf_files';
    case 'text':
      return 'text_files';
    default:
      return CLOUDINARY_RAW_FOLDER;
  }
}

// Generate video thumbnail URL from Cloudinary public_id
function generateVideoThumbnailUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/w_300,h_200,c_fill/${publicId}.jpg`;
}

export async function POST(request: Request) {
  console.log('Training POST request received');
  
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as "audio" | "pdf" | "video" | "text" | "image";
    const file = formData.get("file") as File | null; // Can be null if linkUrl is provided
    const linkUrl = formData.get("linkUrl") as string | null; // New field

    console.log('Form data:', { title, description, type, fileName: file?.name, fileSize: file?.size, linkUrl });

    // Validate required fields
    if (!title || !description || !type || (!file && !linkUrl)) {
      console.log('Missing required fields:', { title: !!title, description: !!description, type: !!type, file: !!file, linkUrl: !!linkUrl });
      return NextResponse.json({ 
        success: false,
        error: "Missing required fields: title, description, type. Either a file or a link is required." 
      }, { status: 400 });
    }
    
    // If a linkUrl is provided, ensure it's a valid URL
    if (linkUrl && !linkUrl.startsWith('http')) {
      return NextResponse.json({
        success: false,
        error: "Invalid link URL. Must start with http(s)://",
      }, { status: 400 });
    }

    // Validate file type if a file is provided
    if (file) {
      const allowedTypes = ALLOWED_TYPES[type as keyof typeof ALLOWED_TYPES];
      if (!allowedTypes || !allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', { type, fileType: file.type, allowedTypes });
      return NextResponse.json({ 
        success: false,
        error: `Invalid file type for ${type}. Allowed types: ${allowedTypes?.join(', ') || 'None specified'}` 
      }, { status: 400 });
    }
    }

    // Validate file size
    if (file) { // Only validate size if a file is actually uploaded
      const maxSize = MAX_FILE_SIZES[type as keyof typeof MAX_FILE_SIZES] || 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        const fileSizeMB = file.size / (1024 * 1024);
        console.log('File too large:', { type, maxSizeMB, fileSizeMB });
        return NextResponse.json({ 
          success: false,
          error: `File too large for ${type}. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Step 1: Create a pending training record
    let trainingDoc: any = { 
      title, 
      description, 
      type,
      uploadProgress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (linkUrl) { 
      // If a link is provided, create the complete document right away
      trainingDoc = {
        ...trainingDoc,
        fileUrl: linkUrl,
        uploadStatus: "completed",
        completedAt: new Date(),
      };
    } else {
      // If a file is to be uploaded, set the status to uploading
      trainingDoc.uploadStatus = "uploading";
    }

    console.log('Creating training document:', trainingDoc);
    
    const result = await db.collection("trainings").insertOne(trainingDoc);
    const trainingId = result.insertedId;

    console.log('Training created with ID:', trainingId);

    // Update progress in database callback
    const updateProgress = async (progress: number) => {
      try {
        await db.collection("trainings").updateOne(
          { _id: trainingId },
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

    // If a file is provided, handle the upload process
    if (file) {
      try {
        // Step 2: Upload to Cloudinary with progress tracking
        console.log('Starting Cloudinary upload...');
        const cloudinaryResult = await uploadToCloudinary(file, type, updateProgress);
        
        console.log('Cloudinary upload successful:', cloudinaryResult);
        
        // Step 3: Update training record with Cloudinary URL
        const updatedTraining: any = {
          fileUrl: cloudinaryResult.url,
          publicId: cloudinaryResult.publicId,
          format: cloudinaryResult.format,
          fileSize: cloudinaryResult.bytes,
          originalFileName: file.name,
          mimeType: file.type,
          uploadStatus: "completed",
          uploadProgress: 100,
          completedAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Generate thumbnail URL for videos
        if (type === 'video') {
          updatedTraining.thumbnailUrl = generateVideoThumbnailUrl(cloudinaryResult.publicId);
        }
        
        await db.collection("trainings").updateOne(
          { _id: trainingId },
          { $set: updatedTraining }
        );
  
        console.log('Training updated with Cloudinary data');
  
      } catch (uploadError: any) {
        console.error('Upload error:', uploadError);
        
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
        
        // Re-throw to be caught by the outer catch block
        throw uploadError;
      }
    }

    // Get the complete training record to return
    const training = await db.collection("trainings").findOne({ _id: trainingId });

    return NextResponse.json({ 
      success: true,
      message: "Training created successfully",
      training,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating training:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Failed to create training",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('Fetching trainings...');
    const client = await clientPromise;
    const db = client.db("gold");
    const trainings = await db.collection("trainings")
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Found ${trainings.length} trainings`);
    
    return NextResponse.json({ 
      success: true,
      data: trainings,
      count: trainings.length 
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching trainings:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch trainings" 
    }, { status: 500 });
  }
}

// DELETE training (dynamic route handler)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const trainingId = params.id;
    console.log('Deleting training:', trainingId);

    if (!ObjectId.isValid(trainingId)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid training ID" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Get training first
    const training = await db.collection("trainings").findOne({ 
      _id: new ObjectId(trainingId) 
    });

    if (!training) {
      return NextResponse.json({ 
        success: false,
        error: "Training not found" 
      }, { status: 404 });
    }

    // Delete from MongoDB
    const result = await db.collection("trainings").deleteOne({ 
      _id: new ObjectId(trainingId) 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Failed to delete training" 
      }, { status: 500 });
    }

    console.log('Training deleted successfully:', trainingId);
    
    return NextResponse.json({ 
      success: true,
      message: "Training deleted successfully",
      deletedId: trainingId
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting training:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Failed to delete training" 
    }, { status: 500 });
  }
}