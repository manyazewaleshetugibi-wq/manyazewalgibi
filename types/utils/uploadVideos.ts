// utils/uploadVideos.ts
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_VIDEO_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_UPLOAD_PRESET || 'goldgold';

// For cloud storage (Cloudinary example)
export async function uploadVideoToCloudinary(base64String: string, folder: string): Promise<string> {
  try {
    const formData = new FormData();
    
    // Convert base64 string to Blob
    const response = await fetch(base64String);
    const blob = await response.blob();
    
    formData.append('file', blob);
    formData.append('upload_preset', CLOUDINARY_VIDEO_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    // Add public_id
    const uniqueId = uuidv4();
    formData.append('public_id', `video_${uniqueId}`);

    // Upload to Cloudinary
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const data = await uploadResponse.json();
    return data.secure_url;
  } catch (error: any) {
    console.error('Error uploading video to Cloudinary:', error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }
}

// For local storage
export async function uploadVideoToLocal(base64String: string, folder: string): Promise<string> {
  try {
    // Extract the base64 data and mime type
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Get file extension from mime type
    const extension = mimeType.split('/')[1];
    const filename = `video_${uuidv4()}.${extension}`;
    const filepath = `public/uploads/${folder}/${filename}`;
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filepath, buffer);
    
    // Return the public URL
    return `/uploads/${folder}/${filename}`;
  } catch (error) {
    console.error('Error uploading video locally:', error);
    throw new Error('Failed to upload video');
  }
}

// Main upload function
export async function uploadVideo(base64String: string, folder: string): Promise<string> {
  // Choose storage method based on environment
  if (CLOUDINARY_CLOUD_NAME) {
    return await uploadVideoToCloudinary(base64String, folder);
  } else {
    return await uploadVideoToLocal(base64String, folder);
  }
}