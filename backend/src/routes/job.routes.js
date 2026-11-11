import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import {
  jobSearchLimiter,
  jobTrackLimiter,
} from "../middleware/rateLimiters.js";
import { dailySearchLimit } from "../middleware/dailySearchLimit.js";
import {
  validateJobSearch,
  validateJobTrack,
  validateGetSearchJobsQuery,
  validateGetLatestSearchQuery,
} from "../validators/job.validators.js";
import {
  searchJobs,
  getSearchJobs,
  getLatestSearch,
  trackJob,
} from "../controllers/job.controller.js";

const router = express.Router();

router.post(
  "/search",
  jobSearchLimiter,
  isAuthenticated,
  dailySearchLimit,
  validateJobSearch,
  searchJobs
);
router.get("/searches/latest", isAuthenticated, validateGetLatestSearchQuery, getLatestSearch);
router.get("/searches/:searchId/jobs", isAuthenticated, validateGetSearchJobsQuery, getSearchJobs);
router.post("/track", isAuthenticated, jobTrackLimiter, validateJobTrack, trackJob);

export default router;
