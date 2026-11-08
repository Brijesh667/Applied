import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { jobSearchLimiter, jobTrackLimiter } from "../middleware/rateLimiters.js";
import { validateJobSearch, validateJobTrack } from "../validators/job.validators.js";
import { searchJobs, trackJob } from "../controllers/job.controller.js";

const router = express.Router();

router.post("/search", isAuthenticated, jobSearchLimiter, validateJobSearch, searchJobs);
router.post("/track", isAuthenticated, jobTrackLimiter, validateJobTrack, trackJob);

export default router;
