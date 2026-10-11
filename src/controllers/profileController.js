
import User from "../models/userModel.js";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";
import { createAppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

// GET /user/profile
export const profile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select("-password");

  if (!user) {
    return next(createAppError("User profile not found", 404));
  }

  res.status(200).json({
    message: "Profile fetched successfully",
    user
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

  res.status(200).json({
    message: "Profile photo uploaded successfully",
    photoUrl: cloudinaryResult.secure_url,
    user: updatedUser
  });
});

