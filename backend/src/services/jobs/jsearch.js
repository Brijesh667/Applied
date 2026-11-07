import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_JSEARCH_MAX_REQUESTS_PER_SEARCH,
} from "../../config/constants.js";

const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com/search";

/**
 * Fetch raw job listings from JSearch RapidAPI.
 * Never logs API keys or full query URLs.
 *
 * @param {Array<{ what: string, where?: string, isRemote?: boolean }>} queries
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = []) {
  if (!config.isJSearchConfigured) {
    return { jobs: [], status: "skipped" };
  }

  const activeQueries = queries.slice(0, JOB_JSEARCH_MAX_REQUESTS_PER_SEARCH);
  if (activeQueries.length === 0) {
    return { jobs: [], status: "ok" };
  }

  const allJobs = [];
  let overallStatus = "ok";
  let hasSuccess = false;
  let hasQuota = false;

  for (const q of activeQueries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), JOB_PROVIDER_TIMEOUT_MS);

    try {
      const url = new URL(JSEARCH_BASE_URL);
      let queryStr = q.what || "";
      if (q.where) {
        queryStr = `${queryStr} in ${q.where}`;
      } else if (q.isRemote) {
        queryStr = `${queryStr} remote`;
      }

      url.searchParams.set("query", queryStr);
      url.searchParams.set("page", "1");
      url.searchParams.set("num_pages", "1");
      url.searchParams.set("country", "in");
      url.searchParams.set("date_posted", "month");

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "X-RapidAPI-Key": config.jsearchApiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn(`JSearch request failed: status=${res.status} category=auth`);
        overallStatus = "failed";
        continue;
      }
      if (res.status === 429) {
        console.warn(`JSearch request failed: status=429 category=rate_limit`);
        hasQuota = true;
        continue;
      }
      if (res.status >= 500) {
        console.warn(`JSearch request failed: status=${res.status} category=server_error`);
        overallStatus = "failed";
        continue;
      }
      if (!res.ok) {
        console.warn(`JSearch request failed: status=${res.status} category=http_error`);
        overallStatus = "failed";
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data?.data)) {
        allJobs.push(...data.data);
      }
      hasSuccess = true;
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("JSearch request failed: status=timeout category=timeout");
      } else {
        console.warn("JSearch request failed: status=none category=network");
      }
      overallStatus = "failed";
    } finally {
      clearTimeout(timer);
    }
  }

  if (hasSuccess) {
    return { jobs: allJobs, status: "ok" };
  }
  if (hasQuota) {
    return { jobs: [], status: "quota" };
  }
  return { jobs: allJobs, status: overallStatus };
}

export default {
  searchJobs,
};
