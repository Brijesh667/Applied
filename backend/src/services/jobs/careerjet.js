import config from "../../config/env.js";
import {
  JOB_PROVIDER_TIMEOUT_MS,
  JOB_CAREERJET_MAX_REQUESTS_PER_SEARCH,
  JOB_CAREERJET_PAGE_SIZE,
} from "../../config/constants.js";

const CAREERJET_BASE_URL = "https://search.api.careerjet.net/v4/query";

/**
 * Builds the HTTP Basic Authorization header for Careerjet.
 * The API key is the username, password is empty.
 *
 * @param {string} apiKey
 * @returns {string} Basic auth header value
 */
export function buildCareerjetAuthHeader(apiKey) {
  if (!apiKey) return "";
  const token = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Fetch raw job listings from Careerjet API.
 * Requires end user's IP and User Agent in ctx; skips if either is missing.
 * Never logs user IP, User Agent, API key or URLs.
 *
 * @param {Array<{ what: string, where?: string, level?: string, jobType?: string }>} queries
 * @param {{ userIp?: string, userAgent?: string }} [ctx] - request context
 * @returns {Promise<{ jobs: Array<Object>, status: "ok" | "failed" | "quota" | "skipped" }>}
 */
export async function searchJobs(queries = [], ctx = {}) {
  if (!config.isCareerjetConfigured) {
    return { jobs: [], status: "skipped" };
  }

  // End user IP and User-Agent are strictly required by Careerjet
  if (!ctx || !ctx.userIp || !ctx.userAgent) {
    return { jobs: [], status: "skipped" };
  }

  const activeQueries = queries.slice(0, JOB_CAREERJET_MAX_REQUESTS_PER_SEARCH);
  if (activeQueries.length === 0) {
    return { jobs: [], status: "ok" };
  }

  const q = activeQueries[0];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JOB_PROVIDER_TIMEOUT_MS);

  try {
    const url = new URL(CAREERJET_BASE_URL);
    url.searchParams.set("locale_code", config.careerjetLocale || "en_IN");
    url.searchParams.set("keywords", q.what || "");
    if (q.where) {
      url.searchParams.set("location", q.where);
    }
    url.searchParams.set("sort", "date");
    url.searchParams.set("page_size", String(JOB_CAREERJET_PAGE_SIZE));
    url.searchParams.set("page", "1");
    url.searchParams.set("fragment_size", "300");
    url.searchParams.set("user_ip", ctx.userIp);
    url.searchParams.set("user_agent", ctx.userAgent);

    const isInternship = Boolean(
      q.jobType === "internship" ||
        q.isIntern ||
        q.level === "fresher" ||
        /\b(intern|internship)\b/i.test(q.what || "")
    );
    if (isInternship) {
      url.searchParams.set("contract_type", "i");
    }

    if (q.jobType === "fulltime") {
      url.searchParams.set("work_hours", "f");
    } else if (q.jobType === "parttime") {
      url.searchParams.set("work_hours", "p");
    }

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: buildCareerjetAuthHeader(config.careerjetApiKey),
      },
    });

    if (res.status === 401 || res.status === 403) {
      console.warn(`Careerjet request failed: status=${res.status} category=auth`);
      return { jobs: [], status: "failed" };
    }
    if (res.status === 429) {
      console.warn("Careerjet request failed: status=429 category=rate_limit");
      return { jobs: [], status: "quota" };
    }
    if (res.status >= 500) {
      console.warn(
        `Careerjet request failed: status=${res.status} category=server_error`
      );
      return { jobs: [], status: "failed" };
    }
    if (!res.ok) {
      console.warn(
        `Careerjet request failed: status=${res.status} category=http_error`
      );
      return { jobs: [], status: "failed" };
    }

    const data = await res.json();
    // A response whose type is not JOBS (e.g. location ambiguity) is treated as ok with zero jobs
    if (data?.type !== "JOBS") {
      return { jobs: [], status: "ok" };
    }

    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
    return { jobs, status: "ok" };
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("Careerjet request failed: status=timeout category=timeout");
    } else {
      console.warn("Careerjet request failed: status=none category=network");
    }
    return { jobs: [], status: "failed" };
  } finally {
    clearTimeout(timer);
  }
}

export default {
  buildCareerjetAuthHeader,
  searchJobs,
};
