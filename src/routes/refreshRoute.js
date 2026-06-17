import express from "express";

import {refresh} from "../controllers/refreshController.js";

const router = express.Router();

router.post("/refresh", refresh);

export default router;