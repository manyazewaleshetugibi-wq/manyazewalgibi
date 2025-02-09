import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3config";

/**
 * Uploads a base64 image to the configured S3 bucket and returns the image URL.
 * @param base64Image - The base64 encoded image string.
 * @returns The URL of the uploaded image.
 * @throws An error if the upload fails.
 */
export async function uploadImage(base64Image: string): Promise<string> {
  const buffer = Buffer.from(base64Image.split(",")[1], "base64"); // Decode base64 image
  const fileName = `item-${Date.now()}.jpg`; // Unique filename based on timestamp

  const command = new PutObjectCommand({
    Bucket: "eresto", // Replace with your actual bucket name
    Key: fileName,
    Body: buffer,
    ContentType: "image/jpeg",
  });

  try {
    await s3Client.send(command); // Upload to S3
    return `https://fly.storage.tigris.dev/eresto/${fileName}`; // Replace with your S3 bucket URL format
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Failed to upload image");
  }
}
