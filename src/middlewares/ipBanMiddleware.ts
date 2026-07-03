import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis.js";

export const ipBanMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientIp = req.ip;
    if (!clientIp) {
      next();
      return;
    }
    
    // Check if the IP is in the Redis blocklist
    const isBlocked = await redisClient.get(`blocked:${clientIp}`);
    
    if (isBlocked) {
      res.status(403).json({ message: "Access denied. IP is blocked due to suspicious activity." });
      return;
    }
    
    next();
  } catch (error) {
    // Fail-open strategy: If Redis fails, log it and let the request through to maintain availability
    console.error("Redis IP Ban Check Error:", error);
    next();
  }
};
