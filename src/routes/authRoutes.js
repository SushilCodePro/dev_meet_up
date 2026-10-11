import express from "express";
import { signup, signin, logout } from "../controllers/authController.js";
import { authRateLimiter } from "../middlewares/rateLimitMiddleware.js";
import { ipBanMiddleware } from "../middlewares/ipBanMiddleware.js";

const router = express.Router();

router.post("/signup", ipBanMiddleware, authRateLimiter, signup);
router.post("/signin", ipBanMiddleware, authRateLimiter, signin);
router.get("/logout", logout);

export default router;
