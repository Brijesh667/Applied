import Resume from "../models/Resume.js";
import Application from "../models/Application.js";
import JobSearchUsage from "../models/JobSearchUsage.js";
import JobSearchCache, {
  computeSearchHash,
  trimUserSearches,
} from "../models/JobSearchCache.js";
import config from "../config/env.js";
import {
  JOB_SEARCH_REFRESH_MIN_AGE_SECONDS,
  JOB_SEARCH_CACHE_TTL_SECONDS,
  JOB_PAGE_SIZE_DEFAULT,
} from "../config/constants.js";
import {
  buildQueries,
  canonicalizeFilters,
  QueryBuilderError,
} from "../services/jobs/queryBuilder.js";
import {
  inferJobType,
  inferJobLevel,
  applyFilters,
  filterAndSortStoredJobs,
  computeFacets,
} from "../services/jobs/applyFilters.js";
import { searchJobs as searchAdzuna } from "../services/jobs/adzuna.js";
import { searchJobs as searchJSearch } from "../services/jobs/jsearch.js";
import { searchJobs as searchJooble } from "../services/jobs/jooble.js";
import { searchJobs as searchCareerjet } from "../services/jobs/careerjet.js";
import { searchJobs as searchHimalayas } from "../services/jobs/himalayas.js";
import { searchJobs as searchRemoteOk } from "../services/jobs/remoteok.js";
import { normalizeJobs } from "../services/jobs/normalize.js";
import { dedupeJobs, normalizeApplyUrlKey } from "../services/jobs/dedupe.js";
import { rankAndMergeJobs } from "../services/jobs/jobRankService.js";
import { jobToApplication } from "../services/jobs/jobToApplication.js";

/**
 * Helper to query user's applications and map trackedApplicationId and Set of keys.
 */
async function getTrackedAppsInfo(userId) {
  const userApps = await Application.find({
    userId,
    jobLink: { $exists: true, $ne: "" },
  }).select("_id jobLink");

  const map = new Map();
  const set = new Set();
  for (const app of userApps) {
    if (app.jobLink) {
      const key = normalizeApplyUrlKey(app.jobLink);
      if (key) {
        set.add(key);
        if (!map.has(key)) {
          map.set(key, String(app._id));
        }
      }
    }
  }
  return { map, set };
}

/**
 * Attaches trackedApplicationId to jobs.
 */
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

/**
 * Helper to compute remaining searches in current rolling 24-hour window.
 */
async function getSearchesRemaining(userId) {
  const windowMs = config.jobSearchDailyWindowMs || 24 * 60 * 60 * 1000;
  const windowStart = new Date(Date.now() - windowMs);
  const usedCount = await JobSearchUsage.countDocuments({
    userId,
    createdAt: { $gte: windowStart },
  });
  const limit = config.jobSearchDailyLimit || 5;
  const remaining = Math.max(0, limit - usedCount);
  return { remaining, limit, usedCount };
}

/**
 * Builds the standard search response object.
 */
function buildSearchResponse({
  searchDoc,
  canonicalFilters,
  jobsPage,
  total,
  page,
  limit,
  hasMore,
  facets,
  cached,
  sources,
  rankedBy,
  rankStatus,
  generatedAt,
  remaining,
  dailyLimit,
}) {
  const docCreatedAt = searchDoc?.createdAt
    ? new Date(searchDoc.createdAt)
    : new Date();
  const expiresAt = new Date(
    docCreatedAt.getTime() + JOB_SEARCH_CACHE_TTL_SECONDS * 1000
  ).toISOString();

  const search = {
    id: searchDoc ? String(searchDoc._id) : null,
    resumeId: searchDoc ? String(searchDoc.resumeId) : null,
    filters: searchDoc?.filters || canonicalFilters || {},
    generatedAt,
    expiresAt,
    cached,
    rankedBy,
    rankStatus,
    sources,
    remaining: typeof remaining === "number" ? remaining : undefined,
    dailyLimit: typeof dailyLimit === "number" ? dailyLimit : undefined,
  };

  return {
    search,
    jobs: jobsPage,
    total,
    page,
    limit,
    hasMore,
    facets,
    // Top-level fields preserved for backward compatibility
    cached,
    generatedAt,
    rankedBy,
    rankStatus,
    sources,
    remaining: typeof remaining === "number" ? remaining : undefined,
    dailyLimit: typeof dailyLimit === "number" ? dailyLimit : undefined,
  };
}

/**
 * Handle POST /api/jobs/search
 */
export async function searchJobs(req, res, next) {
  try {
    const { resumeId, filters: rawFilters, refresh } = req.body;
    const userId = req.session.userId;

    // 1. Load the user's resume (profile fields only, multi-tenant isolation)
    const resume = await Resume.findOne({
      _id: resumeId,
      userId,
    }).select("roleTitles skills experienceYears locationPreference");

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // 2. Canonicalize filters
    const canonicalFilters = canonicalizeFilters(rawFilters, resume);

    // 3. Build queries (checks for empty roleTitles & skills)
    let queries;
    try {
      queries = buildQueries(resume, canonicalFilters);
    } catch (err) {
      if (err instanceof QueryBuilderError) {
        return res.status(err.status).json({ message: err.message });
      }
      throw err;
    }

    // 4. Check if at least one job provider is configured and enabled
    if (!config.enabledJobProviders || config.enabledJobProviders.length === 0) {
      return res
        .status(503)
        .json({ message: "Job search is not configured yet" });
    }

    // Extract request context (never log or cache ctx)
    const ctx = {
      userIp: req.ip,
      userAgent: req.get("user-agent"),
    };

    // 5. Compute search hash & check cache
    const searchHash = computeSearchHash(resume, canonicalFilters);
    const existingCache = await JobSearchCache.findOne({
      userId,
      resumeId: resume._id,
      searchHash,
    });

    if (existingCache) {
      const cacheTimestamp = new Date(
        existingCache.updatedAt || existingCache.createdAt
      ).getTime();
      const ageSeconds = Math.floor((Date.now() - cacheTimestamp) / 1000);

      // Return cache if refresh not requested OR if younger than min refresh age
      if (!refresh || ageSeconds < JOB_SEARCH_REFRESH_MIN_AGE_SECONDS) {
        const { map: trackedMap, set: trackedSet } = await getTrackedAppsInfo(
          userId
        );
        const storedJobs = existingCache.jobs || [];
        const facets = computeFacets(storedJobs, trackedSet);
        const page1Jobs = storedJobs.slice(0, JOB_PAGE_SIZE_DEFAULT);
        const pagedWithTracked = attachTrackedApplicationIds(
          page1Jobs,
          trackedMap
        );

        const { remaining, limit } = await getSearchesRemaining(userId);
        res.set("X-Searches-Remaining", String(remaining));
        res.set("X-Searches-Limit", String(limit));

        return res.status(200).json(
          buildSearchResponse({
            searchDoc: existingCache,
            canonicalFilters: existingCache.filters || canonicalFilters,
            jobsPage: pagedWithTracked,
            total: storedJobs.length,
            page: 1,
            limit: JOB_PAGE_SIZE_DEFAULT,
            hasMore: storedJobs.length > JOB_PAGE_SIZE_DEFAULT,
            facets,
            cached: true,
            sources: existingCache.sources || {},
            rankedBy: existingCache.rankedBy || "local",
            rankStatus: existingCache.rankStatus || "skipped",
            generatedAt: new Date(cacheTimestamp).toISOString(),
            remaining,
            dailyLimit: limit,
          })
        );
      }
    }

    // 6. Query enabled providers concurrently
    const providerMap = {
      adzuna: () => searchAdzuna(queries, ctx),
      jsearch: () => searchJSearch(queries, ctx),
      jooble: () => searchJooble(queries, ctx),
      careerjet: () => searchCareerjet(queries, ctx),
      himalayas: () => searchHimalayas(queries, ctx),
      remoteok: () => searchRemoteOk(queries, ctx),
    };

    const providerTasks = [];
    const providerNames = [];

    for (const name of config.enabledJobProviders) {
      if (providerMap[name]) {
        providerTasks.push(providerMap[name]());
        providerNames.push(name);
      }
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

    // 7. Handle provider failures
    const allProvidersFailed =
      !anySuccess &&
      Object.values(sources).every((s) => s === "failed" || s === "quota");

    if (allProvidersFailed) {
      if (existingCache) {
        const { map: trackedMap, set: trackedSet } = await getTrackedAppsInfo(
          userId
        );
        const storedJobs = existingCache.jobs || [];
        const facets = computeFacets(storedJobs, trackedSet);
        const page1Jobs = storedJobs.slice(0, JOB_PAGE_SIZE_DEFAULT);
        const pagedWithTracked = attachTrackedApplicationIds(
          page1Jobs,
          trackedMap
        );

        return res.status(200).json(
          buildSearchResponse({
            searchDoc: existingCache,
            canonicalFilters: existingCache.filters || canonicalFilters,
            jobsPage: pagedWithTracked,
            total: storedJobs.length,
            page: 1,
            limit: JOB_PAGE_SIZE_DEFAULT,
            hasMore: storedJobs.length > JOB_PAGE_SIZE_DEFAULT,
            facets,
            cached: true,
            sources: { ...(existingCache.sources || {}), ...sources },
            rankedBy: existingCache.rankedBy || "local",
            rankStatus: existingCache.rankStatus || "skipped",
            generatedAt: new Date(
              existingCache.updatedAt || existingCache.createdAt
            ).toISOString(),
          })
        );
      }
      return res.status(502).json({
        message: "Job sources are unavailable right now. Try again later.",
      });
    }

    // 8. Normalize, infer attributes, dedupe, and apply local filters
    const allNormalized = [];
    for (const item of rawJobsToNormalize) {
      const normalized = normalizeJobs(item.jobs, item.name);
      allNormalized.push(...normalized);
    }

    for (const job of allNormalized) {
      job.jobType = inferJobType(job);
      job.level = inferJobLevel(job);
    }

    const dedupedJobs = dedupeJobs(allNormalized);
    const locallyFilteredJobs = applyFilters(dedupedJobs, canonicalFilters);

    // 9. Rank jobs (up to 150 stored, top 25 evaluated by AI if configured)
    const {
      jobs: rankedJobs,
      rankedBy,
      rankStatus,
    } = await rankAndMergeJobs(locallyFilteredJobs, resume);

    const now = new Date();

    // 10. Upsert cache (without trackedApplicationId so cache is never stale)
    const savedDoc = await JobSearchCache.findOneAndUpdate(
      {
        userId,
        resumeId: resume._id,
        searchHash,
      },
      {
        $set: {
          filters: canonicalFilters,
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

    // Bounded cache growth: keep at most 10 searches per user
    await trimUserSearches(userId);

    // Record fresh search usage in rolling 24h window
    await JobSearchUsage.create({
      userId,
      createdAt: now,
    });

    const { remaining, limit } = await getSearchesRemaining(userId);
    res.set("X-Searches-Remaining", String(remaining));
    res.set("X-Searches-Limit", String(limit));

    const { map: trackedMap, set: trackedSet } = await getTrackedAppsInfo(
      userId
    );
    const facets = computeFacets(rankedJobs, trackedSet);
    const page1Jobs = rankedJobs.slice(0, JOB_PAGE_SIZE_DEFAULT);
    const pagedWithTracked = attachTrackedApplicationIds(
      page1Jobs,
      trackedMap
    );

    return res.status(200).json(
      buildSearchResponse({
        searchDoc: savedDoc,
        canonicalFilters,
        jobsPage: pagedWithTracked,
        total: rankedJobs.length,
        page: 1,
        limit: JOB_PAGE_SIZE_DEFAULT,
        hasMore: rankedJobs.length > JOB_PAGE_SIZE_DEFAULT,
        facets,
        cached: false,
        sources,
        rankedBy,
        rankStatus,
        generatedAt: now.toISOString(),
        remaining,
        dailyLimit: limit,
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /api/jobs/searches/:searchId/jobs
 * Reads stored search results without any external provider or AI calls.
 */
export async function getSearchJobs(req, res, next) {
  try {
    const { searchId } = req.params;
    const userId = req.session.userId;
    const queryParams = req.validatedQuery;

    const searchDoc = await JobSearchCache.findOne({
      _id: searchId,
      userId,
    }).lean();

    if (!searchDoc) {
      return res.status(404).json({
        message: "This search has expired. Search again.",
      });
    }

    const { map: trackedMap, set: trackedSet } = await getTrackedAppsInfo(
      userId
    );
    const storedJobs = searchDoc.jobs || [];

    // Facets computed over the entire stored list (before result filters)
    const facets = computeFacets(storedJobs, trackedSet);

    // Apply result filters and sorting
    const filteredJobs = filterAndSortStoredJobs(
      storedJobs,
      queryParams,
      trackedSet
    );

    const total = filteredJobs.length;
    const page = queryParams.page;
    const limit = queryParams.limit;
    const startIndex = (page - 1) * limit;
    const pagedJobs = filteredJobs.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;
    const pagedWithTracked = attachTrackedApplicationIds(pagedJobs, trackedMap);

    const docCreatedAt = searchDoc.createdAt
      ? new Date(searchDoc.createdAt)
      : new Date();
    const expiresAt = new Date(
      docCreatedAt.getTime() + JOB_SEARCH_CACHE_TTL_SECONDS * 1000
    ).toISOString();

    const search = {
      id: String(searchDoc._id),
      resumeId: String(searchDoc.resumeId),
      filters: searchDoc.filters || {},
      generatedAt: new Date(
        searchDoc.updatedAt || searchDoc.createdAt
      ).toISOString(),
      expiresAt,
      cached: true,
      rankedBy: searchDoc.rankedBy || "local",
      rankStatus: searchDoc.rankStatus || "skipped",
      sources: searchDoc.sources || {},
    };

    return res.status(200).json({
      jobs: pagedWithTracked,
      total,
      page,
      limit,
      hasMore,
      facets,
      search,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /api/jobs/searches/latest
 * Restores user's latest unexpired search from the database.
 */
export async function getLatestSearch(req, res, next) {
  try {
    const userId = req.session.userId;
    const { resumeId } = req.query;

    const query = { userId };
    if (resumeId) {
      query.resumeId = resumeId;
    }

    const searchDoc = await JobSearchCache.findOne(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!searchDoc) {
      return res.status(404).json({ message: "No recent search" });
    }

    const { map: trackedMap, set: trackedSet } = await getTrackedAppsInfo(
      userId
    );
    const storedJobs = searchDoc.jobs || [];

    const facets = computeFacets(storedJobs, trackedSet);
    const page1Jobs = storedJobs.slice(0, JOB_PAGE_SIZE_DEFAULT);
    const pagedWithTracked = attachTrackedApplicationIds(
      page1Jobs,
      trackedMap
    );

    const { remaining, limit } = await getSearchesRemaining(userId);
    res.set("X-Searches-Remaining", String(remaining));
    res.set("X-Searches-Limit", String(limit));

    return res.status(200).json(
      buildSearchResponse({
        searchDoc,
        canonicalFilters: searchDoc.filters || {},
        jobsPage: pagedWithTracked,
        total: storedJobs.length,
        page: 1,
        limit: JOB_PAGE_SIZE_DEFAULT,
        hasMore: storedJobs.length > JOB_PAGE_SIZE_DEFAULT,
        facets,
        cached: true,
        sources: searchDoc.sources || {},
        rankedBy: searchDoc.rankedBy || "local",
        rankStatus: searchDoc.rankStatus || "skipped",
        generatedAt: new Date(
          searchDoc.updatedAt || searchDoc.createdAt
        ).toISOString(),
        remaining,
        dailyLimit: limit,
      })
    );
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

    // 2. Find the cached job across user's searches
    const cachedEntry = await JobSearchCache.findOne({
      userId,
      resumeId,
      "jobs.id": jobId,
    }).sort({ updatedAt: -1, createdAt: -1 });

    const matchedJob = cachedEntry?.jobs?.find((j) => j.id === jobId);
    if (!matchedJob) {
      return res.status(404).json({
        message: "This job is no longer in your results. Search again.",
      });
    }

    // 3. Duplicate check against existing applications with jobLink
    const targetUrlKey = normalizeApplyUrlKey(matchedJob.applyUrl);
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

    // 4. Map job to Application document
    const appPayload = jobToApplication(matchedJob, resume);

    // 5. Create Application document
    const application = await Application.create({
      ...appPayload,
      userId,
      resumeId: resume._id,
    });

    return res.status(201).json({
      application,
      trackedJobId: matchedJob.id,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  searchJobs,
  getSearchJobs,
  getLatestSearch,
  trackJob,
};
