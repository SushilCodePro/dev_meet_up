import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  requestResumeUploadUrl,
  confirmResumeUpload,
  getLatestResume,
} from "../controllers/resumeController.js";

const router = express.Router();

router.post("/upload-url", verifyToken, requestResumeUploadUrl);
router.post("/:id/confirm", verifyToken, confirmResumeUpload);
router.get("/latest", verifyToken, getLatestResume);

export default router;
