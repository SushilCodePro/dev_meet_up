import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/user/auth", authRoutes);
app.use("/user/profile", profileRoutes);
app.use("/user/request", connectionRoutes);

connectDB();
// Server listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
