
import crypto from "crypto";
import User from "../models/userModel.js";
import redisClient from "../config/redis.js";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";
import { createAppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createUploadPresignedUrl,
  createDownloadPresignedUrl,
  getS3ObjectMetadata,
} from "../utils/s3Helper.js";

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const PROFILE_CACHE_TTL_SECONDS = 300; // 5 minutes

const getProfileCacheKey = (userId) => `profile:view:${userId}`;

async function invalidateProfileCache(userId) {
  if (!redisClient?.isReady) return;
  try {
    await redisClient.del(getProfileCacheKey(userId));
  } catch (err) {
    console.warn("Redis profile cache del warning:", err.message);
  }
}

// GET /user/profile
export const profile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const cacheKey = getProfileCacheKey(userId);

  let user = null;
  let cacheHit = false;

  if (redisClient?.isReady) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        user = JSON.parse(cached);
        cacheHit = true;
      }
    } catch (err) {
      console.warn("Redis profile cache get warning:", err.message);
    }
  }

  if (!user) {
    user = await User.findById(userId).select("-password").lean();
    if (!user) {
      return next(createAppError("User profile not found", 404));
    }

    if (redisClient?.isReady) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(user), {
          EX: PROFILE_CACHE_TTL_SECONDS,
        });
      } catch (err) {
        console.warn("Redis profile cache set warning:", err.message);
      }
    }
  }

  let photoViewUrl = user.photoUrl || null;
  if (user.photoUrl && user.photoUrl.startsWith("photos/")) {
    photoViewUrl = await createDownloadPresignedUrl({ key: user.photoUrl });
  }

  res.status(200).json({
    message: "Profile fetched successfully",
    cached: cacheHit,
    user,
    photoViewUrl,
  });
});

// PATCH /user/profile/update
export const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { firstName, lastName, age, gender, skills, location, about } = req.body;

  const ALLOWED_UPDATE = ['firstName', 'lastName', 'age', 'gender', 'skills', 'about', 'location'];
  const isAllowedUpdate = Object.keys(req.body).every(k => ALLOWED_UPDATE.includes(k));

  if (!isAllowedUpdate) {
    return next(createAppError("Update is not allowed with these fields", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { firstName, lastName, age, gender, skills, location, about },
    { new: true, runValidators: true, select: "-password -refreshToken" }
  );

  if (!updatedUser) {
    return next(createAppError("User profile not found", 404));
  }

  await invalidateProfileCache(userId);

  res.status(200).json({
    message: "Profile updated successfully",
    user: updatedUser,
  });
});

// POST /user/profile/upload-photo
export const uploadProfilePhoto = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  if (!req.file) {
    return next(createAppError("No image file provided", 400));
  }

  const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { photoUrl: cloudinaryResult.secure_url },
    { new: true, select: "-password" }
  );

  if (!updatedUser) {
    return next(createAppError("User profile not found", 404));
  }

  await invalidateProfileCache(userId);

  res.status(200).json({
    message: "Profile photo uploaded successfully",
    photoUrl: cloudinaryResult.secure_url,
    user: updatedUser
  });
});

// POST /user/profile/photo-upload-url (Direct S3 Pre-signed URL)
export const requestPhotoUploadUrl = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { contentType } = req.body;

  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) {
    return next(
      createAppError("Unsupported image type. Allowed: image/jpeg, image/png, image/webp", 400)
    );
  }

  const s3Key = `photos/${userId}/${crypto.randomUUID()}.${ext}`;
  const uploadUrl = await createUploadPresignedUrl({
    key: s3Key,
    contentType,
    expiresIn: 300,
  });

  res.status(200).json({
    message: "Pre-signed photo upload URL generated",
    s3Key,
    uploadUrl,
    expiresIn: 300,
  });
});

// POST /user/profile/photo-confirm
export const confirmPhotoUpload = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { s3Key } = req.body;

  if (!s3Key || typeof s3Key !== "string" || !s3Key.startsWith(`photos/${userId}/`)) {
    return next(createAppError("Invalid s3Key for this user", 400));
  }

  let metadata;
  try {
    metadata = await getS3ObjectMetadata({ key: s3Key });
  } catch (err) {
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      return next(createAppError("Photo has not been uploaded to S3 yet", 400));
    }
    throw err;
  }

  const size = metadata.ContentLength || 0;
  if (size <= 0 || size > MAX_PHOTO_BYTES) {
    return next(createAppError("Uploaded photo must be between 1 byte and 5 MB", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { photoUrl: s3Key },
    { new: true, select: "-password" }
  );

  if (!updatedUser) {
    return next(createAppError("User profile not found", 404));
  }

  await invalidateProfileCache(userId);
  const photoViewUrl = await createDownloadPresignedUrl({ key: s3Key });

  res.status(200).json({
    message: "Profile photo updated via S3",
    s3Key,
    photoViewUrl,
    user: updatedUser,
  });
});

