import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_HIMALAYAS_MAX_REQUESTS_PER_SEARCH,
  JOB_HIMALAYAS_CACHE_SECONDS,
} from "../../config/constants.js";

const HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search";
const HIMALAYAS_LIST_URL = "https://himalayas.app/jobs/api";

// In-memory TTL cache per query keyword
const himalayasCache = new Map();

/**
 * Resets in-memory cache (for testing only).
 */
export function _resetHimalayasCache() {
  himalayasCache.clear();
}

/**
 * Gets cache size (for testing only).
 */
export function _getHimalayasCacheSize() {
  return himalayasCache.size;
}

/**
 * Sets an entry in the Himalayas cache (for testing only).
 */
export function _setHimalayasCache(key, jobs, timestamp = Date.now()) {
  himalayasCache.set(key, { jobs, timestamp });
}

/**
 * Fetch raw job listings from Himalayas public API.
 * Uses in-memory TTL caching per query to respect rate limits.
 *
 * @param {Array<{ what: string, where?: string }>} queries
 * @param {Object} [ctx] - request context
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = [], ctx = {}) {
  if (!config.isHimalayasConfigured) {
    return { jobs: [], status: "skipped" };
  }

  // When remote: exclude, skip remote-only providers completely
  if (queries[0]?.remote === "exclude") {
    return { jobs: [], status: "skipped" };
  }

  const activeQueries = queries.slice(0, JOB_HIMALAYAS_MAX_REQUESTS_PER_SEARCH);
  if (activeQueries.length === 0) {
    return { jobs: [], status: "ok" };
  }

  const q = activeQueries[0];
  const queryTerm = (q.what || "").trim().toLowerCase();
  const cacheKey = queryTerm || "__all__";

  // Check in-memory cache
  const cached = himalayasCache.get(cacheKey);
  if (cached) {
    const ageSeconds = (Date.now() - cached.timestamp) / 1000;
    if (ageSeconds < JOB_HIMALAYAS_CACHE_SECONDS) {
      return { jobs: cached.jobs, status: "ok" };
    }
    himalayasCache.delete(cacheKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JOB_PROVIDER_TIMEOUT_MS);

  try {
    let url = new URL(HIMALAYAS_SEARCH_URL);
    if (queryTerm) {
      url.searchParams.set("q", queryTerm);
    }

    let res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Applied/1.0 (job tracker; contact@applied.app)",
      },
    });

    // Fall back to plain list endpoint if search endpoint returns 404 or fails
    if (res.status === 404) {
      url = new URL(HIMALAYAS_LIST_URL);
      if (queryTerm) {
        url.searchParams.set("q", queryTerm);
      }
      res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Applied/1.0 (job tracker; contact@applied.app)",
        },
      });
    }

    if (res.status === 401 || res.status === 403) {
      console.warn(`Himalayas request failed: status=${res.status} category=auth`);
      return { jobs: [], status: "failed" };
    }
    if (res.status === 429) {
      console.warn("Himalayas request failed: status=429 category=rate_limit");
      return { jobs: [], status: "quota" };
    }
    if (res.status >= 500) {
      console.warn(
        `Himalayas request failed: status=${res.status} category=server_error`
      );
      return { jobs: [], status: "failed" };
    }
    if (!res.ok) {
      console.warn(
        `Himalayas request failed: status=${res.status} category=http_error`
      );
      return { jobs: [], status: "failed" };
    }

    const data = await res.json();
    let jobs = Array.isArray(data?.jobs)
      ? data.jobs
      : Array.isArray(data)
      ? data
      : [];

    // Cache the successful results in memory
    himalayasCache.set(cacheKey, { jobs, timestamp: Date.now() });

    return { jobs, status: "ok" };
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("Himalayas request failed: status=timeout category=timeout");
    } else {
      console.warn("Himalayas request failed: status=none category=network");
    }
    return { jobs: [], status: "failed" };
  } finally {
    clearTimeout(timer);
  }
}

export default {
  searchJobs,
  _resetHimalayasCache,
  _getHimalayasCacheSize,
  _setHimalayasCache,
};
