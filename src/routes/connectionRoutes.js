import express from "express";
import { request} from "../controllers/connectionController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"; 

const router = express.Router();

router.post("/send/:status/:toUserId", verifyToken, request);


export default router;

