import rateLimit from "express-rate-limit";
import config from "../config/env.js";
import {
  RESUME_REPARSE_LIMIT_PER_HOUR,
  JOB_SEARCH_LIMIT_PER_HOUR,
  JOB_TRACK_LIMIT_PER_HOUR,
} from "../config/constants.js";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.authRateLimitMax || 10,
  message: { message: "Too many attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resumeUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.session?.userId || "anonymous"),
  message: { message: "Too many uploads, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resumeReparseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: RESUME_REPARSE_LIMIT_PER_HOUR,
  keyGenerator: (req) => String(req.session?.userId || "anonymous"),
  message: { message: "Too many reparse attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const jobSearchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: JOB_SEARCH_LIMIT_PER_HOUR,
  keyGenerator: (req) => String(req.session?.userId || "anonymous"),
  message: { message: "Too many job search requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const jobTrackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: JOB_TRACK_LIMIT_PER_HOUR,
  keyGenerator: (req) => String(req.session?.userId || "anonymous"),
  message: { message: "Too many job track requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    Boolean(
      req.originalUrl?.startsWith("/api/auth") ||
        req.baseUrl === "/api/auth" ||
        req.path?.startsWith("/auth")
    ),
});

export default {
  authLimiter,
  resumeUploadLimiter,
  resumeReparseLimiter,
  jobSearchLimiter,
  jobTrackLimiter,
  apiLimiter,
};
