import express from "express";
import { sender,receiver} from "../controllers/connectionController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"; 

const router = express.Router();

router.post("/send/:status/:toUserId", verifyToken, sender);
router.post("/receive/:status/:requestedId", verifyToken, receiver);


export default router;

