import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_ADZUNA_MAX_REQUESTS_PER_SEARCH,
  JOB_RESULTS_PER_REQUEST,
  JOB_MAX_AGE_DAYS,
} from "../../config/constants.js";

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/in/search/1";

/**
 * Fetch raw job listings from Adzuna India API.
 * Never logs full request URLs (app_key is in query string).
 *
 * @param {Array<{ what: string, where?: string }>} queries
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = []) {
  if (!config.isAdzunaConfigured) {
    return { jobs: [], status: "skipped" };
  }

  const activeQueries = queries.slice(0, JOB_ADZUNA_MAX_REQUESTS_PER_SEARCH);
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
      const url = new URL(ADZUNA_BASE_URL);
      url.searchParams.set("app_id", config.adzunaAppId);
      url.searchParams.set("app_key", config.adzunaAppKey);
      url.searchParams.set("results_per_page", String(JOB_RESULTS_PER_REQUEST));
      url.searchParams.set("max_days_old", String(JOB_MAX_AGE_DAYS));
      url.searchParams.set("content-type", "application/json");

      if (q.what) {
        url.searchParams.set("what", q.what);
      }
      if (q.where) {
        url.searchParams.set("where", q.where);
      }

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn(`Adzuna request failed: status=${res.status} category=auth`);
        overallStatus = "failed";
        continue;
      }
      if (res.status === 429) {
        console.warn(`Adzuna request failed: status=429 category=rate_limit`);
        hasQuota = true;
        continue;
      }
      if (res.status >= 500) {
        console.warn(`Adzuna request failed: status=${res.status} category=server_error`);
        overallStatus = "failed";
        continue;
      }
      if (!res.ok) {
        console.warn(`Adzuna request failed: status=${res.status} category=http_error`);
        overallStatus = "failed";
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data?.results)) {
        allJobs.push(...data.results);
      }
      hasSuccess = true;
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("Adzuna request failed: status=timeout category=timeout");
      } else {
        console.warn("Adzuna request failed: status=none category=network");
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
