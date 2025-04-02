import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFileToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const key = `trainings/${Date.now()}-${fileName}`;
  const bucketName = process.env.S3_BUCKET_NAME || "eresto";

  // Step 1: Initiate multipart upload
  const createResponse = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })
  );

  const uploadId = createResponse.UploadId;

  try {
    const partSize = 5 * 1024 * 1024; // 5MB per part
    const parts = [];
    let uploadedBytes = 0;

    // Step 2: Upload parts
    for (let i = 0; i < Math.ceil(buffer.length / partSize); i++) {
      const start = i * partSize;
      const end = Math.min(start + partSize, buffer.length);
      const partBuffer = buffer.slice(start, end);

      const uploadResponse = await s3Client.send(
        new UploadPartCommand({
          Bucket: bucketName,
          Key: key,
          PartNumber: i + 1,
          UploadId: uploadId,
          Body: partBuffer,
        })
      );

      parts.push({ PartNumber: i + 1, ETag: uploadResponse.ETag });
      uploadedBytes += partBuffer.length;

      // Update progress
      if (onProgress) {
        const progress = (uploadedBytes / buffer.length) * 100;
        onProgress(progress);
      }
    }

    // Step 3: Complete multipart upload
    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );

    const baseUrl = process.env.S3_BASE_URL || "https://fly.storage.tigris.dev";
    return `${baseUrl}/${bucketName}/${key}`;
  } catch (error) {
    // Abort upload on error
    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
      })
    );
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file");
  }
}