import express from "express";
import { profile} from "../controllers/profileController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"; 

const router = express.Router();

router.get("/view", verifyToken, profile);
// router.post("/update", signin);

export default router;
