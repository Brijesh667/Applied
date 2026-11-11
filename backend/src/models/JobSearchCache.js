import mongoose from "mongoose";
import crypto from "crypto";
import {
  JOB_SEARCH_CACHE_TTL_SECONDS,
  JOB_MAX_SEARCHES_PER_USER,
} from "../config/constants.js";

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

/**
 * Computes a deterministic SHA1 hash of a resume's profile hash combined with canonical filters.
 *
 * @param {Object} resume
 * @param {Object} canonicalFilters
 * @returns {string} SHA1 hex string
 */
export function computeSearchHash(resume, canonicalFilters = {}) {
  const profileHash = computeProfileHash(resume);
  const canonicalString = JSON.stringify(canonicalFilters);
  return crypto.createHash("sha1").update(`${profileHash}:${canonicalString}`).digest("hex");
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
    jobType: {
      type: String,
      enum: ["internship", "fulltime", "parttime", "contract", "unknown"],
      default: "unknown",
    },
    level: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior", "unknown"],
      default: "unknown",
    },
    rank: { type: Number, required: true },
    pay: {
      type: {
        type: String,
        enum: ["yearly", "monthly", "onetime"],
      },
      amount: { type: Number },
    },
    payMin: { type: Number, default: null },
    payMax: { type: Number, default: null },
    matchScore: { type: Number, required: true },
    matchReason: { type: String, required: true },
    scoredBy: {
      type: String,
      enum: ["ai", "local"],
      required: true,
      default: "local",
    },
    attribution: {
      type: {
        name: { type: String, required: true },
        url: { type: String, default: null },
      },
      default: null,
      _id: false,
    },
    salaryText: { type: String, default: null },
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
    searchHash: {
      type: String,
      required: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    jobs: [jobSchema],
    sources: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rankedBy: {
      type: String,
      enum: ["ai", "local"],
      default: "local",
    },
    rankStatus: {
      type: String,
      enum: [
        "ok",
        "unavailable",
        "quota",
        "timeout",
        "invalid_output",
        "failed",
        "skipped",
      ],
      default: "skipped",
    },
  },
  { timestamps: true }
);

// Unique compound index for upsert & lookup per user per profile + filters
jobSearchCacheSchema.index(
  { userId: 1, resumeId: 1, searchHash: 1 },
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

// Gracefully drop old profileHash index if it exists in the collection so the app never crashes
JobSearchCache.init()
  .then(() => {
    return JobSearchCache.collection.dropIndex(
      "userId_1_resumeId_1_profileHash_1"
    );
  })
  .catch(() => {
    // Silently ignore if old index does not exist
  });

/**
 * Trims a user's stored search cache documents, keeping at most maxSearches newest entries.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {number} [maxSearches]
 */
export async function trimUserSearches(
  userId,
  maxSearches = JOB_MAX_SEARCHES_PER_USER
) {
  const searches = await JobSearchCache.find({ userId })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

  if (searches.length > maxSearches) {
    const toDelete = searches.slice(maxSearches).map((s) => s._id);
    await JobSearchCache.deleteMany({ _id: { $in: toDelete } });
  }
}

export default JobSearchCache;
