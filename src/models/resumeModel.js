import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
    },
    sha256: {
      type: String,
      trim: true,
      lowercase: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ["application/pdf"],
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PENDING_UPLOAD", "QUEUED", "PROCESSING", "READY", "FAILED"],
      default: "PENDING_UPLOAD",
      index: true,
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
    summary: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Idempotency: prevent duplicate processing of the exact same PDF for a user
resumeSchema.index(
  { userId: 1, sha256: 1 },
  {
    unique: true,
    partialFilterExpression: { sha256: { $type: "string" } },
  }
);

resumeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Resume", resumeSchema);
