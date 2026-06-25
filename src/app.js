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
import refreshRoute from "./routes/refreshRoute.js"


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

// Routes
app.use("/user/auth", authRoutes);
app.use("/api/auth", refreshRoute);
app.use("/user/profile", profileRoutes);
app.use("/user/request", connectionRoutes);
app.use("/user", feedRoute);

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


InitializeConnection();
// Server listen
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
