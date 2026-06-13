import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";

export const verifyToken = async (req, res, next) => {
  const token = req.cookies.token || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    // 1. Check if token is blocked in Redis
    const IsBlocked = await redisClient.exists(`token-${token}`);
    if (IsBlocked) {
      return res.status(401).json({ message: "Access denied. Token is blacklisted." });
    }

    // 2. Verify JWT signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('decoded user', decoded);
    
    req.user = decoded; // attach user info to request
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

