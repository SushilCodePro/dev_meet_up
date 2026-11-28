import { Worker } from "bullmq";
import { extractText } from "unpdf";
import redisConnection from "../config/bullmqRedis.js";
import redisClient from "../config/redis.js";
import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import { getS3ObjectBuffer } from "../utils/s3Helper.js";
import { extractResumeInsights } from "../utils/resumeParser.js";

async function invalidateUserCaches(userId) {
  if (!redisClient?.isReady) return;
  try {
    await redisClient.del([`resume:latest:${userId}`, `profile:view:${userId}`]);
  } catch (err) {
    console.warn("Redis cache invalidation warning:", err.message);
  }
}

export const resumeWorker = new Worker(
  "resumeQueue",
  async (job) => {
    const { resumeId, userId, s3Key } = job.data;
    console.log(`[resumeWorker] Processing job ${job.id} for resume ${resumeId}`);

    // 1. Mark PROCESSING in MongoDB
    await Resume.findByIdAndUpdate(resumeId, {
      status: "PROCESSING",
      errorMessage: "",
    });
    await invalidateUserCaches(userId);

    // 2. Download PDF from S3 (uses S3 VPC Gateway Endpoint on AWS)
    const pdfBuffer = await getS3ObjectBuffer({ key: s3Key });

    // 3. Extract text from PDF
    const { text } = await extractText(new Uint8Array(pdfBuffer), {
      mergePages: true,
    });

    // 4. Extract skills & summary (Gemini if configured, else deterministic)
    const { skills, summary, engine } = await extractResumeInsights(text);

    // 5. Mark Resume READY in MongoDB
    await Resume.findByIdAndUpdate(resumeId, {
      status: "READY",
      extractedSkills: skills,
      summary,
      errorMessage: "",
    });

    // 6. Enrich User profile skills & default about without overwriting custom bio
    const user = await User.findById(userId);
    if (user) {
      const mergedSkills = Array.from(
        new Set([...(user.skills || []), ...skills])
      ).slice(0, 30);
      user.skills = mergedSkills;

      if (!user.about || user.about === "This default about") {
        user.about = summary;
      }
      await user.save();
    }

    // 7. Invalidate stale Redis caches so next GET reflects fresh data
    await invalidateUserCaches(userId);

    console.log(
      `[resumeWorker] Resume ${resumeId} READY (${skills.length} skills via ${engine})`
    );
    return { resumeId, skillCount: skills.length, engine };
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

resumeWorker.on("failed", async (job, err) => {
  console.error(`[resumeWorker] Job ${job?.id} failed:`, err.message);

  // Only mark FAILED in MongoDB after all BullMQ retries are exhausted
  const maxAttempts = job?.opts?.attempts ?? 1;
  if (job?.data?.resumeId && job.attemptsMade >= maxAttempts) {
    await Resume.findByIdAndUpdate(job.data.resumeId, {
      status: "FAILED",
      errorMessage: err.message,
    });
    if (job.data.userId) {
      await invalidateUserCaches(job.data.userId);
    }
  }
});
