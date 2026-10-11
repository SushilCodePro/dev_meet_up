import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../config/redis.js";
import { Request, Response } from "express";

// We extract config from environment variables
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10); // Default 15 min
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "5", 10); // Default 5 attempts

export const authRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  },
  // Skip successful requests so legitimate users don't burn their quota
  skipSuccessfulRequests: true,

  // Use Redis as the distributed store
  store: new RedisStore({ //runs asynchronously immediately after keyGenerator
    sendCommand: (...args: string[]) => redisClient.sendCommand(args), //
    prefix: "rl:auth:", // Add prefix to differentiate from other Redis keys

    //...arg
    // [
    //   "INCR",
    //   "rl:auth:49.36.11.20"
    // ]
  }),

  // Custom key generator hook: combine IP and Email to protect shared corporate IPs
  keyGenerator: (req: Request, res: Response) => {
    // Use express-rate-limit's built-in ipKeyGenerator to safely handle IPv6 addresses
    const ip = ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
    const email = req.body?.emailId ? `:${req.body.emailId}` : '';
    return `${ip}${email}`;
  }
});
