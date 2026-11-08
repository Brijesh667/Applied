import Resume from "../models/Resume.js";
import Application from "../models/Application.js";
import JobSearchCache, { computeProfileHash } from "../models/JobSearchCache.js";
import config from "../config/env.js";
import {
  JOB_SEARCH_REFRESH_MIN_AGE_SECONDS,
} from "../config/constants.js";
import { buildQueries, QueryBuilderError } from "../services/jobs/queryBuilder.js";
import { searchJobs as searchAdzuna } from "../services/jobs/adzuna.js";
import { searchJobs as searchJSearch } from "../services/jobs/jsearch.js";
import { normalizeJobs } from "../services/jobs/normalize.js";
import { dedupeJobs, normalizeApplyUrlKey } from "../services/jobs/dedupe.js";
import { rankAndMergeJobs } from "../services/jobs/jobRankService.js";
import { jobToApplication } from "../services/jobs/jobToApplication.js";

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

    // Helper to query user's applications and map trackedApplicationId
    async function getTrackedAppsMap() {
      const userApps = await Application.find({
        userId,
        jobLink: { $exists: true, $ne: "" },
      }).select("_id jobLink");

      const map = new Map();
      for (const app of userApps) {
        if (app.jobLink) {
          const key = normalizeApplyUrlKey(app.jobLink);
          if (key && !map.has(key)) {
            map.set(key, String(app._id));
          }
        }
      }
      return map;
    }

    function attachTrackedApplicationIds(jobs, map) {
      if (!Array.isArray(jobs)) return [];
      return jobs.map((job) => {
        const jobObj =
          typeof job.toObject === "function" ? job.toObject() : { ...job };
        const key = normalizeApplyUrlKey(jobObj.applyUrl);
        const trackedApplicationId =
          key && map.has(key) ? map.get(key) : null;
        return {
          ...jobObj,
          trackedApplicationId,
        };
      });
    }

    if (existingCache) {
      const cacheTimestamp = new Date(
        existingCache.updatedAt || existingCache.createdAt
      ).getTime();
      const ageSeconds = Math.floor((Date.now() - cacheTimestamp) / 1000);

      // Return cache if refresh not requested OR if younger than min refresh age
      if (!refresh || ageSeconds < JOB_SEARCH_REFRESH_MIN_AGE_SECONDS) {
        const trackedMap = await getTrackedAppsMap();
        return res.status(200).json({
          jobs: attachTrackedApplicationIds(existingCache.jobs || [], trackedMap),
          total: (existingCache.jobs || []).length,
          sources: existingCache.sources || {},
          rankedBy: existingCache.rankedBy || "local",
          rankStatus: existingCache.rankStatus || "skipped",
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
        const trackedMap = await getTrackedAppsMap();
        return res.status(200).json({
          jobs: attachTrackedApplicationIds(existingCache.jobs || [], trackedMap),
          total: (existingCache.jobs || []).length,
          sources: { ...(existingCache.sources || {}), ...sources },
          rankedBy: existingCache.rankedBy || "local",
          rankStatus: existingCache.rankStatus || "skipped",
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

    // 7. Normalize, dedupe, and rank
    const allNormalized = [];
    for (const item of rawJobsToNormalize) {
      const normalized = normalizeJobs(item.jobs, item.name);
      allNormalized.push(...normalized);
    }

    const dedupedJobs = dedupeJobs(allNormalized);
    const {
      jobs: rankedJobs,
      rankedBy,
      rankStatus,
    } = await rankAndMergeJobs(dedupedJobs, resume);

    const now = new Date();

    // 8. Upsert cache (without trackedApplicationId so cache is never stale)
    await JobSearchCache.findOneAndUpdate(
      {
        userId,
        resumeId: resume._id,
        profileHash,
      },
      {
        $set: {
          jobs: rankedJobs,
          sources,
          rankedBy,
          rankStatus,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const trackedMap = await getTrackedAppsMap();
    return res.status(200).json({
      jobs: attachTrackedApplicationIds(rankedJobs, trackedMap),
      total: rankedJobs.length,
      sources,
      rankedBy,
      rankStatus,
      cached: false,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle POST /api/jobs/track
 */
export async function trackJob(req, res, next) {
  try {
    const { resumeId, jobId } = req.body;
    const userId = req.session.userId;

    // 1. Load user's resume (ownership validation)
    const resume = await Resume.findOne({
      _id: resumeId,
      userId,
    });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // 2. Find the job from server cache
    const cache = await JobSearchCache.findOne({
      userId,
      resumeId,
      "jobs.id": jobId,
    }).sort({ updatedAt: -1, createdAt: -1 });

    const job = cache?.jobs?.find((j) => j.id === jobId);

    if (!job) {
      return res.status(404).json({
        message: "This job is no longer in your results. Search again.",
      });
    }

    // 3. Duplicate check against existing applications with jobLink
    const targetUrlKey = normalizeApplyUrlKey(job.applyUrl);
    const existingApps = await Application.find({
      userId,
      jobLink: { $exists: true, $ne: "" },
    }).select("_id jobLink");

    const duplicateApp = existingApps.find(
      (app) => normalizeApplyUrlKey(app.jobLink) === targetUrlKey
    );

    if (duplicateApp) {
      return res.status(409).json({
        message: "You already track this job",
        applicationId: duplicateApp._id,
      });
    }

    // 4. Map job to application and save
    const appData = jobToApplication(job, resume);
    const application = new Application({
      ...appData,
      userId,
    });

    await application.save();

    return res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

export default {
  searchJobs,
  trackJob,
};
