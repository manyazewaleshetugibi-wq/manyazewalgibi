// utils/uploadImages.ts - UPDATED VERSION
/**
 * Processes and validates a base64 image before uploading to Cloudinary.
 * @param base64Image - The base64 encoded image string.
 * @returns The base64 image string (for Cloudinary upload)
 * @throws An error if the image processing fails.
 */
export async function uploadImage(base64Image: string): Promise<string> {
  try {

    
    // Validate it's a proper base64 image
    if (!base64Image.startsWith('data:image/')) {
      console.error("Invalid image format:", base64Image.substring(0, 100));
      throw new Error("Invalid image format. Must be a base64 image string starting with 'data:image/'");
    }
    
    // Extract the mime type and data
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 format. Could not parse image data.");
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Validate size (max 2MB recommended)
    const buffer = Buffer.from(base64Data, "base64");
    const fileSizeInMB = buffer.length / (1024 * 1024);
    const maxSizeMB = 2; // 2MB
    
    if (fileSizeInMB > maxSizeMB) {
      console.warn(`⚠️ Image is large: ${fileSizeInMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
      // You could add compression here if needed
      // return compressImage(base64Image, maxSizeMB);
    }
    

    
    // Return the original base64 string for Cloudinary upload
    return base64Image;
    
  } catch (error: any) {
    console.error("❌ Error processing image:", error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Invalid image format')) {
      throw new Error(`Invalid image: ${error.message}. Make sure you're sending a valid base64 image.`);
    }
    
    if (error.message.includes('Unsupported image type')) {
      throw new Error(`Image type not supported. Please use JPEG, PNG, GIF, or WebP format.`);
    }
    
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

// Optional: Add image compression function if needed
export async function compressImage(base64Image: string, maxSizeMB: number = 2): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      const maxDimension = 1200; // Max width/height
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with reduced quality
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
      resolve(compressedBase64);
    };
    
    img.onerror = () => resolve(base64Image); // Return original if compression fails
  });
}