import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_REMOTEOK_FEED_CACHE_SECONDS,
} from "../../config/constants.js";

const REMOTEOK_API_URL = "https://remoteok.com/api";

// In-memory feed cache for all users
let feedCache = {
  data: null,
  fetchedAt: 0,
};

/**
 * Resets the in-memory feed cache (for testing only).
 */
export function _resetRemoteOkCache() {
  feedCache = {
    data: null,
    fetchedAt: 0,
  };
}

/**
 * Injects feed data into cache (for testing only).
 */
export function _setRemoteOkFeedCache(data, fetchedAt = Date.now()) {
  feedCache = {
    data,
    fetchedAt,
  };
}

/**
 * Gets current feed cache snapshot (for testing only).
 */
export function _getRemoteOkFeedCache() {
  return { ...feedCache };
}

/**
 * Checks whether a job matches any keyword as a whole word in position, tags, or description.
 *
 * @param {Object} job
 * @param {Array<string>} keywords
 * @returns {boolean}
 */
export function matchesKeywords(job, keywords = []) {
  if (!keywords || keywords.length === 0) return true;

  const rawTags = Array.isArray(job.tags)
    ? job.tags.join(" ")
    : typeof job.tags === "string"
    ? job.tags
    : "";

  const textToSearch = `${job.position || ""} ${rawTags} ${job.description || ""}`;

  return keywords.some((kw) => {
    if (!kw || typeof kw !== "string") return false;
    const cleanKw = kw.trim();
    if (!cleanKw) return false;
    const escaped = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:[^a-zA-Z0-9]|$)`, "i");
    return regex.test(textToSearch);
  });
}

/**
 * Fetch raw job listings from RemoteOK API.
 * Uses shared in-memory feed caching (1 hour) and local keyword filtering (capped at 20).
 *
 * @param {Array<{ what: string, where?: string }>} queries
 * @param {Object} [ctx] - request context
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = [], ctx = {}) {
  if (!config.isRemoteOkConfigured) {
    return { jobs: [], status: "skipped" };
  }

  // When remote: exclude, skip remote-only providers completely
  if (queries[0]?.remote === "exclude") {
    return { jobs: [], status: "skipped" };
  }

  // 1. Ensure feed cache is populated
  const now = Date.now();
  const cacheAgeSeconds = (now - feedCache.fetchedAt) / 1000;
  const isCacheValid =
    Array.isArray(feedCache.data) &&
    cacheAgeSeconds < JOB_REMOTEOK_FEED_CACHE_SECONDS;

  if (!isCacheValid) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), JOB_PROVIDER_TIMEOUT_MS);

    try {
      const res = await fetch(REMOTEOK_API_URL, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Applied/1.0 (job tracker; contact@applied.app)",
        },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn(`RemoteOK request failed: status=${res.status} category=auth`);
        return { jobs: [], status: "failed" };
      }
      if (res.status === 429) {
        console.warn("RemoteOK request failed: status=429 category=rate_limit");
        return { jobs: [], status: "quota" };
      }
      if (res.status >= 500) {
        console.warn(
          `RemoteOK request failed: status=${res.status} category=server_error`
        );
        return { jobs: [], status: "failed" };
      }
      if (!res.ok) {
        console.warn(
          `RemoteOK request failed: status=${res.status} category=http_error`
        );
        return { jobs: [], status: "failed" };
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        return { jobs: [], status: "failed" };
      }

      // First array element is legal notice, skip it
      const actualJobs = data.slice(1);
      feedCache = {
        data: actualJobs,
        fetchedAt: Date.now(),
      };
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("RemoteOK request failed: status=timeout category=timeout");
      } else {
        console.warn("RemoteOK request failed: status=none category=network");
      }
      return { jobs: [], status: "failed" };
    } finally {
      clearTimeout(timer);
    }
  }

  // 2. Local keyword filtering
  const allFeedJobs = feedCache.data || [];
  if (allFeedJobs.length === 0) {
    return { jobs: [], status: "ok" };
  }

  // Collect words from all queries
  const keywordsSet = new Set();
  for (const q of queries) {
    if (q.what) {
      const words = q.what
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length >= 2);
      words.forEach((w) => keywordsSet.add(w));
    }
  }
  const keywords = Array.from(keywordsSet);

  const matchedJobs = allFeedJobs
    .filter((j) => matchesKeywords(j, keywords))
    .slice(0, 20);

  return { jobs: matchedJobs, status: "ok" };
}

export default {
  matchesKeywords,
  searchJobs,
  _resetRemoteOkCache,
  _setRemoteOkFeedCache,
  _getRemoteOkFeedCache,
};
