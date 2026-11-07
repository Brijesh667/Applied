import { JOB_MAX_RESULTS_RETURNED } from "../../config/constants.js";

/**
 * Normalizes URL for deduplication:
 * Lowercases host, drops query string and hash fragment, strips trailing slashes.
 */
export function normalizeApplyUrlKey(applyUrl) {
  if (!applyUrl || typeof applyUrl !== "string") return "";
  try {
    const parsed = new URL(applyUrl);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${host}${pathname}`;
  } catch {
    return applyUrl
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

/**
 * Normalizes company + title + location for deduplication:
 * Lowercases and removes punctuation.
 */
export function normalizeTextKey(company, title, location) {
  const clean = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  return `${clean(company)}|${clean(title)}|${clean(location)}`;
}

/**
 * Compares two colliding jobs to determine if candidate is better.
 * Preference order: has pay, then longer snippet, then newer postedAt.
 */
export function isBetterJob(candidate, current) {
  const candidateHasPay = Boolean(candidate.pay && candidate.pay.amount);
  const currentHasPay = Boolean(current.pay && current.pay.amount);

  if (candidateHasPay !== currentHasPay) {
    return candidateHasPay;
  }

  const candidateSnippetLen = candidate.snippet ? candidate.snippet.length : 0;
  const currentSnippetLen = current.snippet ? current.snippet.length : 0;

  if (candidateSnippetLen !== currentSnippetLen) {
    return candidateSnippetLen > currentSnippetLen;
  }

  const candidateDate = candidate.postedAt
    ? new Date(candidate.postedAt).getTime()
    : -1;
  const currentDate = current.postedAt
    ? new Date(current.postedAt).getTime()
    : -1;

  return candidateDate > currentDate;
}

/**
 * Deduplicates and sorts an array of normalized jobs.
 *
 * @param {Array<Object>} jobs - List of normalized jobs
 * @returns {Array<Object>} Deduplicated, sorted, and capped list
 */
export function dedupeJobs(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const jobMap = new Map();
  const urlToId = new Map();
  const textToId = new Map();

  for (const job of jobs) {
    if (!job || typeof job !== "object") continue;

    const key1 = normalizeApplyUrlKey(job.applyUrl);
    const key2 = normalizeTextKey(job.company, job.title, job.location);

    const existingId = urlToId.get(key1) || textToId.get(key2);

    if (existingId && jobMap.has(existingId)) {
      const existingJob = jobMap.get(existingId);
      if (isBetterJob(job, existingJob)) {
        // Remove old job and clean up its keys
        jobMap.delete(existingId);
        const oldKey1 = normalizeApplyUrlKey(existingJob.applyUrl);
        const oldKey2 = normalizeTextKey(
          existingJob.company,
          existingJob.title,
          existingJob.location
        );
        if (urlToId.get(oldKey1) === existingId) urlToId.delete(oldKey1);
        if (textToId.get(oldKey2) === existingId) textToId.delete(oldKey2);

        // Store new job
        jobMap.set(job.id, job);
        if (key1) urlToId.set(key1, job.id);
        if (key2) textToId.set(key2, job.id);
      }
    } else {
      jobMap.set(job.id, job);
      if (key1) urlToId.set(key1, job.id);
      if (key2) textToId.set(key2, job.id);
    }
  }

  const dedupedList = Array.from(jobMap.values());

  // Sort by postedAt descending; jobs without a date go last
  dedupedList.sort((a, b) => {
    const timeA = a.postedAt ? new Date(a.postedAt).getTime() : -1;
    const timeB = b.postedAt ? new Date(b.postedAt).getTime() : -1;
    return timeB - timeA;
  });

  return dedupedList.slice(0, JOB_MAX_RESULTS_RETURNED);
}

export default {
  normalizeApplyUrlKey,
  normalizeTextKey,
  isBetterJob,
  dedupeJobs,
};
