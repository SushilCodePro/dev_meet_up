import { S3Client } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-2";

// Uses EC2 IAM Instance Profile automatically on AWS (no hardcoded keys needed).
// Locally, falls back to standard AWS SDK credential chain if env/profile is configured.
export const s3Client = new S3Client({
  region: AWS_REGION,
});

export const S3_BUCKET =
  process.env.AWS_S3_BUCKET || "devmeetup-uploads-prod-2026";
