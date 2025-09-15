import express from "express";
import { sender,receiver} from "../controllers/connectionController.js";
import { verifyToken } from "../middlewares/authMiddleware.js"; 
import {myRequest, myConnection} from "../controllers/requestController.js";


const router = express.Router();

router.post("/send/:status/:toUserId", verifyToken, sender);
router.post("/receive/:status/:requestedId", verifyToken, receiver);
router.get("/recieved",verifyToken, myRequest);
router.get("/connection",verifyToken, myConnection);



export default router;

 