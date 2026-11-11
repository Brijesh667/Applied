import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_JOOBLE_MAX_REQUESTS_PER_SEARCH,
  JOB_JOOBLE_MAX_PAGES,
} from "../../config/constants.js";

/**
 * Fetch raw job listings from Jooble API.
 * Never logs request URLs or API keys (the key is part of the URL path).
 *
 * @param {Array<{ what: string, where?: string, minPay?: number }>} queries
 * @param {Object} [ctx] - request context
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = [], ctx = {}) {
  if (!config.isJoobleConfigured) {
    return { jobs: [], status: "skipped" };
  }

  const activeQueries = queries.slice(0, JOB_JOOBLE_MAX_REQUESTS_PER_SEARCH);
  if (activeQueries.length === 0) {
    return { jobs: [], status: "ok" };
  }

  const q = activeQueries[0];
  const allJobs = [];

  for (let page = 1; page <= JOB_JOOBLE_MAX_PAGES; page++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), JOB_PROVIDER_TIMEOUT_MS);

    try {
      const payload = {
        keywords: q.what || "",
        location: q.where || "",
        page,
      };

      if (typeof q.minPay === "number" && q.minPay > 0) {
        payload.salary = Math.round(q.minPay);
      }

      // The key is part of the URL; construct strictly inside fetch and never pass to logger
      const res = await fetch(
        `https://jooble.org/api/${encodeURIComponent(config.joobleApiKey)}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.status === 401 || res.status === 403) {
        console.warn(`Jooble request failed: status=${res.status} category=auth`);
        if (allJobs.length > 0) break;
        return { jobs: [], status: "failed" };
      }
      if (res.status === 429) {
        console.warn("Jooble request failed: status=429 category=rate_limit");
        if (allJobs.length > 0) break;
        return { jobs: [], status: "quota" };
      }
      if (res.status >= 500) {
        console.warn(
          `Jooble request failed: status=${res.status} category=server_error`
        );
        if (allJobs.length > 0) break;
        return { jobs: [], status: "failed" };
      }
      if (!res.ok) {
        console.warn(
          `Jooble request failed: status=${res.status} category=http_error`
        );
        if (allJobs.length > 0) break;
        return { jobs: [], status: "failed" };
      }

      const data = await res.json();
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      allJobs.push(...jobs);

      // Stop paging if no jobs returned or if fewer than typical page size (20)
      if (jobs.length < 20) {
        break;
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("Jooble request failed: status=timeout category=timeout");
      } else {
        console.warn("Jooble request failed: status=none category=network");
      }
      if (allJobs.length > 0) break;
      return { jobs: [], status: "failed" };
    } finally {
      clearTimeout(timer);
    }
  }

  return { jobs: allJobs, status: "ok" };
}

export default {
  searchJobs,
};
