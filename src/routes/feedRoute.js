import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js"; 
import { feed } from "../controllers/feedController.js";


const router = express.Router();

router.get("/feed",verifyToken, feed)

export default router;