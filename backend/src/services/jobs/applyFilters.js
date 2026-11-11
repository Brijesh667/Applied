import {
  JOB_STRONG_MATCH_MIN,
  JOB_GOOD_MATCH_MIN,
} from "../../config/constants.js";
import {
  ENTRY_LEVEL_WORDS,
  SENIOR_LEVEL_WORDS,
  SENIOR_EXP_PATTERN,
} from "./localScore.js";
import { normalizeApplyUrlKey } from "./dedupe.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Infers jobType for a job listing.
 * Returns: "internship" | "fulltime" | "parttime" | "contract" | "unknown"
 */
export function inferJobType(job) {
  if (!job) return "unknown";

  const empType = String(job.employmentType || "").toLowerCase();
  if (/\b(intern|internship|trainee|apprentice)\b/i.test(empType)) {
    return "internship";
  }
  if (/\b(part[-_\s]?time)\b/i.test(empType)) {
    return "parttime";
  }
  if (/\b(contract|contractor|freelance|temp|temporary)\b/i.test(empType)) {
    return "contract";
  }
  if (/\b(full[-_\s]?time|permanent)\b/i.test(empType)) {
    return "fulltime";
  }

  const title = String(job.title || "");
  if (/\b(intern|internship|trainee|apprentice)\b/i.test(title)) {
    return "internship";
  }
  if (/\b(part[- ]?time)\b/i.test(title)) {
    return "parttime";
  }
  if (/\b(contract|contractor|freelance|temporary|temp)\b/i.test(title)) {
    return "contract";
  }
  if (/\b(full[- ]?time|permanent)\b/i.test(title)) {
    return "fulltime";
  }

  const snippet = String(job.snippet || "");
  if (/\b(intern|internship|trainee|apprentice)\b/i.test(snippet)) {
    return "internship";
  }
  if (/\b(part[- ]?time)\b/i.test(snippet)) {
    return "parttime";
  }
  if (/\b(contract|contractor|freelance|temporary|temp)\b/i.test(snippet)) {
    return "contract";
  }
  if (/\b(full[- ]?time|permanent)\b/i.test(snippet)) {
    return "fulltime";
  }

  return "unknown";
}

/**
 * Infers career level for a job listing.
 * Returns: "fresher" | "junior" | "mid" | "senior" | "unknown"
 */
export function inferJobLevel(job) {
  if (!job) return "unknown";

  const title = String(job.title || "");
  const snippet = String(job.snippet || "");

  // Helper to check words with word boundaries
  function hasWord(words, text) {
    return words.some((w) => {
      const rx = new RegExp(`\\b${escapeRegex(w)}\\b`, "i");
      return rx.test(text);
    });
  }

  // 1. Check title first
  if (hasWord(SENIOR_LEVEL_WORDS, title) || SENIOR_EXP_PATTERN.test(title)) {
    return "senior";
  }
  if (/\bjunior\b/i.test(title)) {
    return "junior";
  }
  if (hasWord(ENTRY_LEVEL_WORDS, title)) {
    return "fresher";
  }
  if (/\b(mid|intermediate)\b/i.test(title) || /\b[2-4]\+?\s*years?\b/i.test(title)) {
    return "mid";
  }

  // 2. Check snippet if not determined by title
  if (hasWord(SENIOR_LEVEL_WORDS, snippet) || SENIOR_EXP_PATTERN.test(snippet)) {
    return "senior";
  }
  if (/\bjunior\b/i.test(snippet)) {
    return "junior";
  }
  if (hasWord(ENTRY_LEVEL_WORDS, snippet)) {
    return "fresher";
  }
  if (/\b(mid|intermediate)\b/i.test(snippet) || /\b[2-4]\+?\s*years?\b/i.test(snippet)) {
    return "mid";
  }

  return "unknown";
}

/**
 * Applies search criteria filters to a list of jobs locally.
 * Pure function: does not mutate input array.
 *
 * @param {Array<Object>} jobs
 * @param {Object} filters
 * @returns {Array<Object>}
 */
export function applyFilters(jobs, filters = {}) {
  if (!Array.isArray(jobs)) return [];

  const {
    jobType = "any",
    experience = "any",
    remote = "include",
    postedWithinDays = 60,
    minPay = null,
  } = filters;

  const now = Date.now();
  const maxAgeMs = (typeof postedWithinDays === "number" && postedWithinDays > 0 ? postedWithinDays : 60) * 24 * 60 * 60 * 1000;

  return jobs.filter((job) => {
    // 1. postedWithinDays filter (keep jobs with no date)
    if (job.postedAt) {
      const postedMs = new Date(job.postedAt).getTime();
      if (!isNaN(postedMs)) {
        if (now - postedMs > maxAgeMs) {
          return false;
        }
      }
    }

    // 2. minPay filter: compare yearly equivalent (monthly * 12).
    // Drop only jobs whose known pay is below minPay. Keep no pay and onetime pay.
    if (typeof minPay === "number" && minPay > 0) {
      if (job.pay && typeof job.pay.amount === "number") {
        let yearly = null;
        if (job.pay.type === "yearly") {
          yearly = job.pay.amount;
        } else if (job.pay.type === "monthly") {
          yearly = job.pay.amount * 12;
        }
        if (yearly !== null && yearly < minPay) {
          return false;
        }
      }
    }

    // 3. jobType filter
    const jt = job.jobType || inferJobType(job);
    const title = String(job.title || "");
    if (jobType === "internship") {
      const isIntern = jt === "internship" || /\bintern/i.test(title);
      if (!isIntern) return false;
    } else if (jobType === "fulltime") {
      if (jt !== "fulltime" && jt !== "unknown") return false;
    } else if (jobType === "parttime") {
      if (jt !== "parttime") return false;
    }

    // 4. experience filter
    // Jobs with level: unknown are always kept
    const lvl = job.level || inferJobLevel(job);
    if (experience === "fresher") {
      if (lvl === "senior" || lvl === "mid") return false;
    } else if (experience === "junior") {
      if (lvl === "senior") return false;
    } else if (experience === "mid") {
      if (lvl === "fresher" && (jt === "internship" || /\bintern/i.test(title))) {
        return false;
      }
    }

    // 5. remote filter
    if (remote === "only") {
      if (job.remote !== true) return false;
    } else if (remote === "exclude") {
      if (job.remote === true) return false;
    }

    return true;
  });
}

/**
 * Filters and sorts stored jobs for the GET /searches/:searchId/jobs endpoint.
 *
 * @param {Array<Object>} jobs - Full stored list of jobs
 * @param {Object} params - Query params (page, limit, sort, source, remote, match, payListed, hideTracked, q)
 * @param {Set<string>} [trackedUrlKeys] - Set of normalized URL keys for user's tracked applications
 * @returns {Array<Object>} Filtered and sorted jobs
 */
export function filterAndSortStoredJobs(jobs, params = {}, trackedUrlKeys = new Set()) {
  if (!Array.isArray(jobs)) return [];

  const {
    sort = "best",
    source,
    remote,
    match,
    payListed,
    hideTracked,
    q,
  } = params;

  const sourceSet = source
    ? new Set(
        String(source)
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    : null;

  const matchSet = match
    ? new Set(
        String(match)
          .split(",")
          .map((m) => m.trim().toLowerCase())
          .filter(Boolean)
      )
    : null;

  const queryText = q ? String(q).trim().toLowerCase() : null;

  // Filter jobs
  const filtered = jobs.filter((job) => {
    // source
    if (sourceSet && sourceSet.size > 0) {
      const src = String(job.source || "").toLowerCase();
      if (!sourceSet.has(src)) return false;
    }

    // remote
    if (remote === "true" && job.remote !== true) return false;
    if (remote === "false" && job.remote === true) return false;

    // match
    if (matchSet && matchSet.size > 0) {
      const score = typeof job.matchScore === "number" ? job.matchScore : 0;
      let tier = "weak";
      if (score >= JOB_STRONG_MATCH_MIN) {
        tier = "strong";
      } else if (score >= JOB_GOOD_MATCH_MIN) {
        tier = "good";
      }
      if (!matchSet.has(tier)) return false;
    }

    // payListed
    if (payListed === "true") {
      const hasPay = (job.pay && typeof job.pay.amount === "number") || !!job.salaryText;
      if (!hasPay) return false;
    }

    // hideTracked
    if (hideTracked === "true") {
      const key = normalizeApplyUrlKey(job.applyUrl);
      if (key && trackedUrlKeys.has(key)) return false;
    }

    // q: substring contains on title or company
    if (queryText) {
      const titleLower = String(job.title || "").toLowerCase();
      const compLower = String(job.company || "").toLowerCase();
      if (!titleLower.includes(queryText) && !compLower.includes(queryText)) {
        return false;
      }
    }

    return true;
  });

  // Sort jobs
  if (sort === "newest") {
    filtered.sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      const validA = !isNaN(dateA) && dateA > 0;
      const validB = !isNaN(dateB) && dateB > 0;

      // Jobs without a date last
      if (validA && !validB) return -1;
      if (!validA && validB) return 1;
      if (validA && validB && dateB !== dateA) {
        return dateB - dateA;
      }
      // Ties by rank ascending
      const rankA = typeof a.rank === "number" ? a.rank : 999999;
      const rankB = typeof b.rank === "number" ? b.rank : 999999;
      return rankA - rankB;
    });
  } else {
    // Default: 'best' (by stored rank ascending)
    filtered.sort((a, b) => {
      const rankA = typeof a.rank === "number" ? a.rank : 999999;
      const rankB = typeof b.rank === "number" ? b.rank : 999999;
      return rankA - rankB;
    });
  }

  return filtered;
}

/**
 * Computes facets over the entire stored list of jobs (before result filters).
 *
 * @param {Array<Object>} jobs - Full stored list of jobs
 * @param {Set<string>} [trackedUrlKeys] - Set of normalized URL keys for user's tracked applications
 * @returns {Object} Facets object
 */
export function computeFacets(jobs, trackedUrlKeys = new Set()) {
  const facets = {
    total: 0,
    bySource: {
      adzuna: 0,
      jsearch: 0,
      jooble: 0,
      careerjet: 0,
      himalayas: 0,
      remoteok: 0,
    },
    remote: {
      yes: 0,
      no: 0,
    },
    byMatch: {
      strong: 0,
      good: 0,
      weak: 0,
    },
    withPay: 0,
    tracked: 0,
  };

  if (!Array.isArray(jobs)) return facets;

  facets.total = jobs.length;

  for (const job of jobs) {
    // bySource
    const src = String(job.source || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(facets.bySource, src)) {
      facets.bySource[src]++;
    }

    // remote
    if (job.remote === true) {
      facets.remote.yes++;
    } else {
      facets.remote.no++;
    }

    // byMatch
    const score = typeof job.matchScore === "number" ? job.matchScore : 0;
    if (score >= JOB_STRONG_MATCH_MIN) {
      facets.byMatch.strong++;
    } else if (score >= JOB_GOOD_MATCH_MIN) {
      facets.byMatch.good++;
    } else {
      facets.byMatch.weak++;
    }

    // withPay
    const hasPay = (job.pay && typeof job.pay.amount === "number") || !!job.salaryText;
    if (hasPay) {
      facets.withPay++;
    }

    // tracked
    const key = normalizeApplyUrlKey(job.applyUrl);
    if (key && trackedUrlKeys.has(key)) {
      facets.tracked++;
    }
  }

  return facets;
}

export default {
  inferJobType,
  inferJobLevel,
  applyFilters,
  filterAndSortStoredJobs,
  computeFacets,
};
