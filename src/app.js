import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import connectDB from "./config/db.js";
import cors from "cors";
import feedRoute from "./routes/feedRoute.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
// Middlewares
app.use(cors({
  origin: ["https://developersadda.netlify.app","http://localhost:5173"],
  // origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/user/auth", authRoutes);
app.use("/user/profile", profileRoutes);
app.use("/user/request", connectionRoutes);
app.use("/user", feedRoute);


connectDB();
// Server listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
