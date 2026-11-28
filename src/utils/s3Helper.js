import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET } from "../config/s3.js";

const DEFAULT_EXPIRY_SECONDS = 300; // 5 minutes

/**
 * Generates a short-lived S3 pre-signed PUT URL so clients upload directly to S3.
 */
export const createUploadPresignedUrl = async ({
  key,
  contentType,
  expiresIn = DEFAULT_EXPIRY_SECONDS,
}) => {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Generates a short-lived S3 pre-signed GET URL for private objects.
 */
export const createDownloadPresignedUrl = async ({
  key,
  expiresIn = DEFAULT_EXPIRY_SECONDS,
}) => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Fetches object metadata from S3 (verifies existence, size, and MIME type).
 */
export const getS3ObjectMetadata = async ({ key }) => {
  const command = new HeadObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return s3Client.send(command);
};

/**
 * Downloads an object from S3 as a Buffer (for worker processing).
 */
export const getS3ObjectBuffer = async ({ key }) => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
};
