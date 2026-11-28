import "dotenv/config";
import connectDB from "../config/db.js";
import redisClient from "../config/redis.js";
import { emailWorker } from "../jobs/emailWorker.js";
import { resumeWorker } from "../jobs/resumeWorker.js";

async function startWorkers() {
  await connectDB();
  console.log("Standalone worker process connected to MongoDB & listening for BullMQ jobs");
}

startWorkers().catch((err) => {
  console.error("Failed to start worker process:", err);
  process.exit(1);
});

async function gracefulShutdown() {
  console.log("Shutting down workers gracefully...");
  await Promise.allSettled([
    emailWorker?.close(),
    resumeWorker?.close(),
    redisClient?.isOpen ? redisClient.quit() : Promise.resolve(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
