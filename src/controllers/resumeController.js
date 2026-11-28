import crypto from "crypto";
import Resume from "../models/resumeModel.js";
import redisClient from "../config/redis.js";
// Disabled temporarily while testing S3 upload + download flow only
// import { enqueueResumeProcessing } from "../jobs/resumeQueue.js";
import { createAppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createUploadPresignedUrl,
  createDownloadPresignedUrl,
  getS3ObjectMetadata,
} from "../utils/s3Helper.js";

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB
const URL_EXPIRY_SECONDS = 300; // 5 minutes
const RESUME_CACHE_TTL_SECONDS = 3600; // 1 hour

const getResumeCacheKey = (userId) => `resume:latest:${userId}`;

async function invalidateResumeCache(userId) {
  if (!redisClient?.isReady) return;
  try {
    await redisClient.del(getResumeCacheKey(userId));
  } catch (err) {
    console.warn("Redis resume cache del warning:", err.message);
  }
}

// POST /user/resume/upload-url
export const requestResumeUploadUrl = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { fileName, contentType = "application/pdf", sha256 } = req.body;

  if (!fileName || typeof fileName !== "string") {
    return next(createAppError("fileName is required", 400));
  }

  if (contentType !== "application/pdf") {
    return next(createAppError("Only application/pdf resumes are allowed", 400));
  }

  const normalizedHash =
    typeof sha256 === "string" && sha256.trim() ? sha256.trim().toLowerCase() : undefined;

  // Idempotency check (mirrors patient document sha256 dedup)
  if (normalizedHash) {
    const existing = await Resume.findOne({
      userId,
      sha256: normalizedHash,
      status: { $ne: "FAILED" },
    });

    if (existing) {
      return res.status(200).json({
        message: "Identical resume already exists",
        duplicate: true,
        resume: existing,
      });
    }
  }

  const docId = crypto.randomUUID();
  const s3Key = `resumes/${userId}/${docId}.pdf`;

  const resume = await Resume.create({
    userId,
    s3Key,
    ...(normalizedHash ? { sha256: normalizedHash } : {}),
    fileName: fileName.trim(),
    contentType,
    status: "PENDING_UPLOAD",
  });

  const uploadUrl = await createUploadPresignedUrl({
    key: s3Key,
    contentType,
    expiresIn: URL_EXPIRY_SECONDS,
  });

  res.status(201).json({
    message: "Pre-signed upload URL generated",
    duplicate: false,
    resumeId: resume._id,
    s3Key,
    uploadUrl,
    expiresIn: URL_EXPIRY_SECONDS,
  });
});

// POST /user/resume/:id/confirm
export const confirmResumeUpload = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;

  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) {
    return next(createAppError("Resume record not found", 404));
  }

  let metadata;
  try {
    metadata = await getS3ObjectMetadata({ key: resume.s3Key });
  } catch (err) {
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      return next(createAppError("File has not been uploaded to S3 yet", 400));
    }
    throw err;
  }

  const size = metadata.ContentLength || 0;
  if (size <= 0 || size > MAX_RESUME_BYTES) {
    return next(createAppError("Uploaded PDF must be between 1 byte and 5 MB", 400));
  }

  resume.fileSizeBytes = size;
  resume.status = "QUEUED";
  await resume.save();

  await invalidateResumeCache(userId);
  // Disabled temporarily while testing S3 upload + download flow only
  // await enqueueResumeProcessing({
  //   resumeId: resume._id.toString(),
  //   userId,
  //   s3Key: resume.s3Key,
  // });

  res.status(200).json({
    message: "Resume upload confirmed and queued for processing",
    resume,
  });
});

// GET /user/resume/latest
export const getLatestResume = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const cacheKey = getResumeCacheKey(userId);

  let resumeData = null;
  let cacheHit = false;

  if (redisClient?.isReady) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        resumeData = JSON.parse(cached);
        cacheHit = true;
      }
    } catch (err) {
      console.warn("Redis resume cache get warning:", err.message);
    }
  }

  if (!resumeData) {
    const resumeDoc = await Resume.findOne({ userId }).sort({ createdAt: -1 }).lean();
    if (!resumeDoc) {
      return next(createAppError("No resume found for this user", 404));
    }
    resumeData = resumeDoc;

    if (redisClient?.isReady) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(resumeData), {
          EX: RESUME_CACHE_TTL_SECONDS,
        });
      } catch (err) {
        console.warn("Redis resume cache set warning:", err.message);
      }
    }
  }

  // Always sign a fresh 5-min downloadUrl so cached records never carry expired S3 URLs
  let downloadUrl = null;
  if (["QUEUED", "PROCESSING", "READY"].includes(resumeData.status)) {
    downloadUrl = await createDownloadPresignedUrl({
      key: resumeData.s3Key,
      expiresIn: URL_EXPIRY_SECONDS,
    });
  }

  res.status(200).json({
    message: "Latest resume fetched",
    cached: cacheHit,
    resume: resumeData,
    downloadUrl,
  });
});
