import mongoose from "mongoose";
import crypto from "crypto";
import { JOB_SEARCH_CACHE_TTL_SECONDS } from "../config/constants.js";

/**
 * Computes a deterministic SHA1 hash of a resume's profile fields.
 * If the user edits skills, roles, experience, or location, the hash changes,
 * automatically invalidating previous cache hits.
 *
 * @param {Object} resume
 * @returns {string} SHA1 hex string
 */
export function computeProfileHash(resume) {
  const sortedRoles = [...(resume.roleTitles || [])]
    .map((r) => String(r || "").trim().toLowerCase())
    .filter(Boolean)
    .sort();

  const sortedSkills = [...(resume.skills || [])]
    .map((s) => String(s || "").trim().toLowerCase())
    .filter(Boolean)
    .sort();

  const exp =
    typeof resume.experienceYears === "number" && !isNaN(resume.experienceYears)
      ? resume.experienceYears
      : null;

  const loc = String(resume.locationPreference || "").trim().toLowerCase();

  const data = JSON.stringify({
    roles: sortedRoles,
    skills: sortedSkills,
    exp,
    loc,
  });

  return crypto.createHash("sha1").update(data).digest("hex");
}

const jobSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    platform: { type: String, required: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: "" },
    remote: { type: Boolean, default: false },
    snippet: { type: String, default: "" },
    applyUrl: { type: String, required: true },
    postedAt: { type: String, default: null },
    employmentType: { type: String, default: null },
    pay: {
      type: {
        type: String,
        enum: ["yearly", "monthly", "onetime"],
      },
      amount: { type: Number },
    },
    payMin: { type: Number, default: null },
    payMax: { type: Number, default: null },
  },
  { _id: false }
);

const jobSearchCacheSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    profileHash: {
      type: String,
      required: true,
    },
    jobs: [jobSchema],
    sources: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Unique compound index for upsert & lookup per user per profile
jobSearchCacheSchema.index(
  { userId: 1, resumeId: 1, profileHash: 1 },
  { unique: true }
);

// TTL index on createdAt to automatically expire after JOB_SEARCH_CACHE_TTL_SECONDS
jobSearchCacheSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: JOB_SEARCH_CACHE_TTL_SECONDS }
);

export const JobSearchCache = mongoose.model(
  "JobSearchCache",
  jobSearchCacheSchema
);

export default JobSearchCache;
