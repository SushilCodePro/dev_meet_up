import "./instrument.js";
import * as Sentry from "@sentry/node";
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import connectDB from "./config/db.js";
import redisClient from "./config/redis.js";
import cors from "cors";
import helmet from "helmet";
import feedRoute from "./routes/feedRoute.js";
import refreshRoute from "./routes/refreshRoute.js";

// Initialize Background Workers
import { emailWorker } from './jobs/emailWorker.js';


const app = express();
app.set("trust proxy", 1);
// Middlewares
app.use(helmet());
app.use(cors({
  origin: ["https://developersadda.netlify.app", "http://localhost:5173"],
  // origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Debug route to test Sentry
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Sentry Test Error from dev-meet-up!");
});

// Routes
app.use("/user/auth", authRoutes);
app.use("/user/auth/refresh", refreshRoute);
app.use("/user/profile", profileRoutes);
app.use("/user/request", connectionRoutes);
app.use("/user", feedRoute);

// Sentry error handler must be registered AFTER all controllers and BEFORE any other error middleware
Sentry.setupExpressErrorHandler(app);

async function InitializeConnection() {
  try {

    await connectDB();
    console.log("DB and Redis Connected");

    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  }
  catch (err) {
    console.log("Error: " + err);
  }
}


const server = InitializeConnection();

// Graceful Shutdown for BullMQ Worker (Crucial for Render restarts)
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  if (emailWorker) {
    await emailWorker.close();
    console.log('BullMQ Worker closed');
  }
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Server listen
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
