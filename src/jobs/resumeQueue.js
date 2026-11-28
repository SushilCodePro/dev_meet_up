import { Queue } from "bullmq";
import redisConnection from "../config/bullmqRedis.js";

export const resumeQueue = new Queue("resumeQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

console.log("resumeQueue initialized");

/**
 * Enqueues a resume PDF processing job idempotently using resumeId as jobId.
 */
export const enqueueResumeProcessing = async ({ resumeId, userId, s3Key }) => {
  return resumeQueue.add(
    "process-resume",
    { resumeId, userId, s3Key },
    { jobId: `resume-${resumeId}` }
  );
};
