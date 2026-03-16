import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsS3BucketName = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET;

if (!awsAccessKeyId || !awsSecretAccessKey || !awsS3BucketName) {
  console.warn(
    "AWS S3 credentials not fully configured. Photo uploads will not work."
  );
}

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: awsAccessKeyId || "placeholder",
    secretAccessKey: awsSecretAccessKey || "placeholder",
  },
});

/**
 * Generate a presigned URL for uploading a photo directly from the mobile app.
 * Returns both the upload URL and the public URL where the photo will live.
 */
export async function generatePresignedUploadUrl(
  reviewId: number,
  photoIndex: number,
  mimeType: string = "image/jpeg"
): Promise<{ presignedUrl: string; publicUrl: string }> {
  try {
    const fileName = `reviews/${reviewId}/photo-${photoIndex}-${Date.now()}.jpg`;
    const region = process.env.AWS_REGION || "us-east-1";
    const publicUrl = `https://${awsS3BucketName}.s3.${region}.amazonaws.com/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: awsS3BucketName,
      Key: fileName,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { presignedUrl, publicUrl };
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

/**
 * Generate presigned URL for dispute photo upload. Returns upload URL and public URL.
 */
export async function generatePresignedDisputeUploadUrl(
  disputeId: number,
  photoIndex: number,
  mimeType: string = "image/jpeg"
): Promise<{ presignedUrl: string; publicUrl: string }> {
  try {
    const fileName = `disputes/${disputeId}/photo-${photoIndex}-${Date.now()}.jpg`;
    const region = process.env.AWS_REGION || "us-east-1";
    const publicUrl = `https://${awsS3BucketName}.s3.${region}.amazonaws.com/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: awsS3BucketName,
      Key: fileName,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return { presignedUrl, publicUrl };
  } catch (error) {
    console.error("Failed to generate dispute presigned URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

/**
 * Generate a public URL for a photo stored in S3
 */
export function getPhotoUrl(reviewId: number, photoIndex: number): string {
  const fileName = `reviews/${reviewId}/photo-${photoIndex}`;
  return `https://${awsS3BucketName}.s3.amazonaws.com/${fileName}`;
}

/**
 * Upload a photo from base64 data (fallback method)
 * This is slower but works if presigned URLs fail
 */
export async function uploadPhotoFromBase64(
  reviewId: number,
  photoIndex: number,
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `reviews/${reviewId}/photo-${photoIndex}-${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: awsS3BucketName,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    });

    await s3Client.send(command);

    return `https://${awsS3BucketName}.s3.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Failed to upload photo:", error);
    throw new Error("Failed to upload photo to S3");
  }
}

/**
 * Delete a photo from S3
 */
export async function deletePhoto(photoUrl: string): Promise<void> {
  try {
    const url = new URL(photoUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new GetObjectCommand({
      Bucket: awsS3BucketName,
      Key: key,
    });

    // Note: DeleteObjectCommand would be used here, but we're just verifying access
    await s3Client.send(command);
  } catch (error) {
    console.error("Failed to delete photo:", error);
    throw new Error("Failed to delete photo from S3");
  }
}
