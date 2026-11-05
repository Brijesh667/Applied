import { Router } from "express";
import { getStats } from "../controllers/stats.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router();

router.use(isAuthenticated);

router.get("/", getStats);

export default router;
