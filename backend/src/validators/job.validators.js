import { z } from "zod";
import mongoose from "mongoose";
import {
  JOB_ROLES_MAX,
  JOB_ROLE_MAX_LEN,
  JOB_LOCATION_MAX,
  JOB_MIN_PAY_MAX,
  JOB_POSTED_WITHIN_OPTIONS,
  JOB_PAGE_SIZE_DEFAULT,
  JOB_PAGE_SIZE_MAX,
  JOB_QUERY_TEXT_MAX,
} from "../config/constants.js";

const VALID_SOURCES = new Set([
  "adzuna",
  "jsearch",
  "jooble",
  "careerjet",
  "himalayas",
  "remoteok",
]);

const VALID_MATCH_TIERS = new Set(["strong", "good", "weak"]);

export const searchFiltersSchema = z
  .object({
    jobType: z
      .enum(["any", "internship", "fulltime", "parttime"], {
        message: "Invalid jobType filter",
      })
      .optional(),
    experience: z
      .enum(["any", "fresher", "junior", "mid"], {
        message: "Invalid experience filter",
      })
      .optional(),
    roles: z
      .array(
        z
          .string({ message: "Role must be a string" })
          .trim()
          .min(1, "Role title cannot be empty")
          .max(
            JOB_ROLE_MAX_LEN,
            `Role cannot exceed ${JOB_ROLE_MAX_LEN} characters`
          )
      )
      .max(JOB_ROLES_MAX, `Cannot specify more than ${JOB_ROLES_MAX} roles`)
      .optional(),
    location: z
      .string({ message: "Location must be a string" })
      .trim()
      .max(
        JOB_LOCATION_MAX,
        `Location cannot exceed ${JOB_LOCATION_MAX} characters`
      )
      .optional(),
    remote: z
      .enum(["include", "only", "exclude"], {
        message: "Invalid remote option",
      })
      .optional(),
    postedWithinDays: z
      .number({ message: "postedWithinDays must be a number" })
      .refine(
        (val) => JOB_POSTED_WITHIN_OPTIONS.includes(val),
        `postedWithinDays must be one of: ${JOB_POSTED_WITHIN_OPTIONS.join(", ")}`
      )
      .optional(),
    minPay: z
      .number({ message: "minPay must be a number" })
      .int("minPay must be an integer")
      .min(0, "minPay cannot be negative")
      .max(JOB_MIN_PAY_MAX, `minPay cannot exceed ${JOB_MIN_PAY_MAX}`)
      .nullable()
      .optional(),
  })
  .strip();

export const jobSearchSchema = z
  .object({
    resumeId: z
      .string()
      .trim()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid resume ID",
      }),
    filters: searchFiltersSchema.optional(),
    refresh: z.boolean().optional().default(false),
  })
  .strip();

export const jobTrackSchema = z
  .object({
    resumeId: z
      .string()
      .trim()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid resume ID",
      }),
    jobId: z.string().trim().min(1, "Job ID is required"),
  })
  .strip();

export function validateJobSearch(req, res, next) {
  const result = jobSearchSchema.safeParse(req.body);
  if (!result.success) {
    const formattedErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
      formattedErrors[field] = issue.message;
    }
    return res.status(400).json({
      message: "Validation failed",
      errors: formattedErrors,
    });
  }
  req.body = result.data;
  next();
}

export function validateJobTrack(req, res, next) {
  const result = jobTrackSchema.safeParse(req.body);
  if (!result.success) {
    const formattedErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
      formattedErrors[field] = issue.message;
    }
    return res.status(400).json({
      message: "Validation failed",
      errors: formattedErrors,
    });
  }
  req.body = result.data;
  next();
}

/**
 * Validates query params for GET /api/jobs/searches/:searchId/jobs
 */
export function validateGetSearchJobsQuery(req, res, next) {
  // Reject repeated/array or object params
  for (const key of Object.keys(req.query)) {
    const val = req.query[key];
    if (typeof val !== "string" && val !== undefined) {
      return res.status(400).json({
        message: `Invalid query parameter format for '${key}'`,
      });
    }
  }

  // Validate searchId route param
  const { searchId } = req.params;
  if (!searchId || !mongoose.Types.ObjectId.isValid(searchId)) {
    return res.status(400).json({ message: "Invalid search ID" });
  }

  const {
    page,
    limit,
    sort,
    source,
    remote,
    match,
    payListed,
    hideTracked,
    q,
  } = req.query;

  // page validation
  let parsedPage = 1;
  if (page !== undefined) {
    parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return res
        .status(400)
        .json({ message: "Page must be an integer greater than or equal to 1" });
    }
  }

  // limit validation
  let parsedLimit = JOB_PAGE_SIZE_DEFAULT;
  if (limit !== undefined) {
    parsedLimit = Number(limit);
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > JOB_PAGE_SIZE_MAX
    ) {
      return res.status(400).json({
        message: `Limit must be an integer between 1 and ${JOB_PAGE_SIZE_MAX}`,
      });
    }
  }

  // sort validation
  if (sort !== undefined && sort !== "best" && sort !== "newest") {
    return res.status(400).json({ message: "Sort must be 'best' or 'newest'" });
  }

  // source validation
  if (source !== undefined) {
    const sources = source
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (sources.length === 0) {
      return res.status(400).json({ message: "Invalid source parameter" });
    }
    for (const s of sources) {
      if (!VALID_SOURCES.has(s)) {
        return res
          .status(400)
          .json({ message: `Unknown job source: '${s}'` });
      }
    }
  }

  // remote validation
  if (remote !== undefined && remote !== "true" && remote !== "false") {
    return res
      .status(400)
      .json({ message: "Remote parameter must be 'true' or 'false'" });
  }

  // match validation
  if (match !== undefined) {
    const matches = match
      .split(",")
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);
    if (matches.length === 0) {
      return res.status(400).json({ message: "Invalid match parameter" });
    }
    for (const m of matches) {
      if (!VALID_MATCH_TIERS.has(m)) {
        return res
          .status(400)
          .json({ message: `Unknown match tier: '${m}'` });
      }
    }
  }

  // payListed validation
  if (payListed !== undefined && payListed !== "true") {
    return res
      .status(400)
      .json({ message: "payListed parameter must be 'true'" });
  }

  // hideTracked validation
  if (hideTracked !== undefined && hideTracked !== "true") {
    return res
      .status(400)
      .json({ message: "hideTracked parameter must be 'true'" });
  }

  // q validation
  if (q !== undefined) {
    if (q.length > JOB_QUERY_TEXT_MAX) {
      return res.status(400).json({
        message: `Query text cannot exceed ${JOB_QUERY_TEXT_MAX} characters`,
      });
    }
  }

  req.validatedQuery = {
    page: parsedPage,
    limit: parsedLimit,
    sort: sort || "best",
    source,
    remote,
    match,
    payListed,
    hideTracked,
    q,
  };

  next();
}

/**
 * Validates query params for GET /api/jobs/searches/latest
 */
export function validateGetLatestSearchQuery(req, res, next) {
  // Reject repeated/array or object params
  for (const key of Object.keys(req.query)) {
    const val = req.query[key];
    if (typeof val !== "string" && val !== undefined) {
      return res.status(400).json({
        message: `Invalid query parameter format for '${key}'`,
      });
    }
  }

  const { resumeId } = req.query;
  if (resumeId !== undefined) {
    if (!resumeId || !mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: "Invalid resume ID" });
    }
  }

  next();
}

export default {
  jobSearchSchema,
  jobTrackSchema,
  searchFiltersSchema,
  validateJobSearch,
  validateJobTrack,
  validateGetSearchJobsQuery,
  validateGetLatestSearchQuery,
};
