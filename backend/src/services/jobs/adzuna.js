import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_ADZUNA_RESULTS_PER_REQUEST,
  JOB_MAX_AGE_DAYS,
} from "../../config/constants.js";

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/in/search/1";

/**
 * Fetch raw job listings from Adzuna India API.
 * Never logs full request URLs (app_key is in query string).
 *
 * @param {Array<{ what: string, where?: string, jobType?: string, postedWithinDays?: number, minPay?: number }>} queries
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = []) {
  if (!config.isAdzunaConfigured) {
    return { jobs: [], status: "skipped" };
  }

  // Exactly one request per search
  const activeQueries = queries.slice(0, 1);
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
      url.searchParams.set(
        "results_per_page",
        String(JOB_ADZUNA_RESULTS_PER_REQUEST)
      );
      url.searchParams.set(
        "max_days_old",
        String(q.postedWithinDays || JOB_MAX_AGE_DAYS)
      );
      url.searchParams.set("content-type", "application/json");

      let what = q.what || "";
      if (q.jobType === "internship" && !/\bintern/i.test(what)) {
        what = `${what} intern`.trim();
      }
      if (what) {
        url.searchParams.set("what", what);
      }
      if (q.where) {
        url.searchParams.set("where", q.where);
      }
      if (typeof q.minPay === "number" && q.minPay > 0) {
        url.searchParams.set("salary_min", String(Math.round(q.minPay)));
      }
      if (q.jobType === "fulltime") {
        url.searchParams.set("full_time", "1");
      } else if (q.jobType === "parttime") {
        url.searchParams.set("part_time", "1");
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
