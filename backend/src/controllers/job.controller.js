import Resume from "../models/Resume.js";
import JobSearchCache, { computeProfileHash } from "../models/JobSearchCache.js";
import config from "../config/env.js";
import {
  JOB_SEARCH_REFRESH_MIN_AGE_SECONDS,
} from "../config/constants.js";
import { buildQueries, QueryBuilderError } from "../services/jobs/queryBuilder.js";
import { searchJobs as searchAdzuna } from "../services/jobs/adzuna.js";
import { searchJobs as searchJSearch } from "../services/jobs/jsearch.js";
import { normalizeJobs } from "../services/jobs/normalize.js";
import { dedupeJobs } from "../services/jobs/dedupe.js";

/**
 * Handle POST /api/jobs/search
 */
export async function searchJobs(req, res, next) {
  try {
    const { resumeId, refresh } = req.body;
    const userId = req.session.userId;

    // 1. Load the user's resume (profile fields only, multi-tenant isolation)
    const resume = await Resume.findOne({
      _id: resumeId,
      userId,
    }).select("roleTitles skills experienceYears locationPreference");

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // 2. Build queries (checks for empty roleTitles & skills)
    let queries;
    try {
      queries = buildQueries(resume);
    } catch (err) {
      if (err instanceof QueryBuilderError) {
        return res.status(err.status).json({ message: err.message });
      }
      throw err;
    }

    // 3. Check if at least one job provider is configured
    if (!config.isAdzunaConfigured && !config.isJSearchConfigured) {
      return res
        .status(503)
        .json({ message: "Job search is not configured yet" });
    }

    // 4. Compute profile hash & check cache
    const profileHash = computeProfileHash(resume);
    const existingCache = await JobSearchCache.findOne({
      userId,
      resumeId: resume._id,
      profileHash,
    });

    if (existingCache) {
      const cacheTimestamp = new Date(
        existingCache.updatedAt || existingCache.createdAt
      ).getTime();
      const ageSeconds = Math.floor((Date.now() - cacheTimestamp) / 1000);

      // Return cache if refresh not requested OR if younger than min refresh age
      if (!refresh || ageSeconds < JOB_SEARCH_REFRESH_MIN_AGE_SECONDS) {
        return res.status(200).json({
          jobs: existingCache.jobs || [],
          total: (existingCache.jobs || []).length,
          sources: existingCache.sources || {},
          cached: true,
          generatedAt: new Date(cacheTimestamp).toISOString(),
        });
      }
    }

    // 5. Query enabled providers concurrently
    const providerTasks = [];
    const providerNames = [];

    if (config.isAdzunaConfigured) {
      providerTasks.push(searchAdzuna(queries));
      providerNames.push("adzuna");
    }

    if (config.isJSearchConfigured) {
      providerTasks.push(searchJSearch(queries));
      providerNames.push("jsearch");
    }

    const settled = await Promise.allSettled(providerTasks);

    const sources = {};
    const rawJobsToNormalize = [];
    let anySuccess = false;

    settled.forEach((result, idx) => {
      const name = providerNames[idx];
      if (result.status === "fulfilled") {
        const { jobs, status } = result.value;
        sources[name] = status;
        if (status === "ok") {
          anySuccess = true;
        }
        if (Array.isArray(jobs) && jobs.length > 0) {
          rawJobsToNormalize.push({ name, jobs });
        }
      } else {
        sources[name] = "failed";
      }
    });

    // 6. Handle provider failures
    const allProvidersFailed =
      !anySuccess &&
      Object.values(sources).every((s) => s === "failed" || s === "quota");

    if (allProvidersFailed) {
      if (existingCache) {
        return res.status(200).json({
          jobs: existingCache.jobs || [],
          total: (existingCache.jobs || []).length,
          sources: { ...(existingCache.sources || {}), ...sources },
          cached: true,
          generatedAt: new Date(
            existingCache.updatedAt || existingCache.createdAt
          ).toISOString(),
        });
      }
      return res.status(502).json({
        message: "Job sources are unavailable right now. Try again later.",
      });
    }

    // 7. Normalize, dedupe, and sort
    const allNormalized = [];
    for (const item of rawJobsToNormalize) {
      const normalized = normalizeJobs(item.jobs, item.name);
      allNormalized.push(...normalized);
    }

    const finalJobs = dedupeJobs(allNormalized);
    const now = new Date();

    // 8. Upsert cache
    await JobSearchCache.findOneAndUpdate(
      {
        userId,
        resumeId: resume._id,
        profileHash,
      },
      {
        $set: {
          jobs: finalJobs,
          sources,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      jobs: finalJobs,
      total: finalJobs.length,
      sources,
      cached: false,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export default {
  searchJobs,
};
