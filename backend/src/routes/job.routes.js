import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { jobSearchLimiter } from "../middleware/rateLimiters.js";
import { validateJobSearch } from "../validators/job.validators.js";
import { searchJobs } from "../controllers/job.controller.js";

const router = express.Router();

router.post("/search", isAuthenticated, jobSearchLimiter, validateJobSearch, searchJobs);

export default router;
