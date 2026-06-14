import express from "express";
import { profile, updateProfile, uploadProfilePhoto } from "../controllers/profileController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { uploadMiddleware } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/view", verifyToken, profile);
router.post("/update", verifyToken, updateProfile);
router.post(
    "/upload-photo",
    verifyToken,                 // 1. Ensure user is logged in
    uploadMiddleware.single('photo'), // 2. Catch the file and put it in memory
    uploadProfilePhoto           // 3. Send to Cloudinary & update MongoDB
);

export default router;
