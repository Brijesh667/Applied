import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { validate } from "../middleware/validate.js";
import { uploadResume } from "../middleware/uploadResume.js";
import {
  resumeUploadLimiter,
  resumeReparseLimiter,
} from "../middleware/rateLimiters.js";
import {
  createResumeSchema,
  updateResumeSchema,
} from "../validators/resume.validators.js";
import {
  createResume,
  getResumes,
  getResumeById,
  getResumeDownloadUrl,
  updateResume,
  reparseResume,
  deleteResume,
} from "../controllers/resume.controller.js";

const router = Router();

router.use(isAuthenticated);

router.post(
  "/",
  resumeUploadLimiter,
  uploadResume,
  validate(createResumeSchema),
  createResume
);

router.get("/", getResumes);

router.get("/:id", validateObjectId("id", "resume id"), getResumeById);

router.get(
  "/:id/download",
  validateObjectId("id", "resume id"),
  getResumeDownloadUrl
);

router.post(
  "/:id/reparse",
  validateObjectId("id", "resume id"),
  resumeReparseLimiter,
  reparseResume
);

router.patch(
  "/:id",
  validateObjectId("id", "resume id"),
  validate(updateResumeSchema),
  updateResume
);

router.delete("/:id", validateObjectId("id", "resume id"), deleteResume);

export default router;
