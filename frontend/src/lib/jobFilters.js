import {
  JOB_ROLES_MAX,
  JOB_ROLE_MAX_LEN,
  JOB_LOCATION_MAX,
  JOB_MIN_PAY_MAX,
  JOB_POSTED_WITHIN_OPTIONS,
  JOB_QUERY_TEXT_MAX,
} from "./constants.js";
import { normalizeText } from "./normalize.js";

export const JOB_TYPE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "internship", label: "Internship" },
  { value: "fulltime", label: "Full-time" },
  { value: "parttime", label: "Part-time" },
];

export const EXPERIENCE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "fresher", label: "Fresher" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-level" },
];

export const REMOTE_OPTIONS = [
  { value: "include", label: "Include" },
  { value: "only", label: "Only" },
  { value: "exclude", label: "None" },
];

export const POSTED_WITHIN_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
];

export const RESULT_REMOTE_OPTIONS = [
  { value: "any", label: "All" },
  { value: "true", label: "Remote" },
  { value: "false", label: "On-site" },
];

export const emptyResultFilters = {
  q: "",
  remote: "any",
  payListed: false,
  sort: "best",
};

/**
 * Parses and validates result filters from URLSearchParams.
 * Drops unknown or invalid values silently.
 *
 * @param {URLSearchParams|Object} searchParams
 * @returns {Object} Validated result filters
 */
export function parseResultFilters(searchParams) {
  if (!searchParams) return { ...emptyResultFilters };

  const getParam = (k) => {
    if (typeof searchParams?.get === "function") {
      return searchParams.get(k);
    }
    return searchParams[k] ?? null;
  };

  // 1. q
  const rawQ = getParam("q");
  const q =
    typeof rawQ === "string" ? rawQ.trim().slice(0, JOB_QUERY_TEXT_MAX) : "";

  // 2. remote ("true" | "false" | "any")
  const rawRemote = getParam("remote");
  let remote = "any";
  if (rawRemote === "true" || rawRemote === "false") {
    remote = rawRemote;
  }

  // 3. payListed ("pay" in URL: "1" or "true")
  const rawPay = getParam("pay");
  const payListed = rawPay === "1" || rawPay === "true";

  // 4. sort ("best" | "newest")
  const rawSort = getParam("sort");
  const sort = rawSort === "newest" ? "newest" : "best";

  return {
    q,
    remote,
    payListed,
    sort,
  };
}

/**
 * Converts result filter state into API query parameters for GET /api/jobs/searches/:searchId/jobs.
 * Omits empty, default, or unselected params.
 *
 * @param {Object} filters
 * @returns {Object} API query parameters
 */
export function resultFiltersToParams(filters = {}) {
  const params = {
    sort: filters.sort === "newest" ? "newest" : "best",
  };

  if (filters.q && typeof filters.q === "string" && filters.q.trim()) {
    params.q = filters.q.trim().slice(0, JOB_QUERY_TEXT_MAX);
  }

  if (filters.remote === "true" || filters.remote === "false") {
    params.remote = filters.remote;
  }

  if (filters.payListed) {
    params.payListed = "true";
  }

  return params;
}

/**
 * Converts result filters to plain object of URL search params.
 * Uses short param names ('pay', 'sort') as required by spec.
 *
 * @param {Object} filters
 * @returns {Object} URL query params
 */
export function resultFiltersToUrlParams(filters = {}) {
  const params = {};

  if (filters.q && typeof filters.q === "string" && filters.q.trim()) {
    params.q = filters.q.trim().slice(0, JOB_QUERY_TEXT_MAX);
  }

  if (filters.remote === "true" || filters.remote === "false") {
    params.remote = filters.remote;
  }

  if (filters.payListed) {
    params.pay = "1";
  }

  if (filters.sort === "newest") {
    params.sort = "newest";
  }

  return params;
}

/**
 * Counts how many active result filters are engaged (the sort is not counted).
 *
 * @param {Object} filters
 * @returns {number} Active filter count
 */
export function countActiveResultFilters(filters) {
  if (!filters) return 0;
  let count = 0;
  if (filters.q && typeof filters.q === "string" && filters.q.trim()) count++;
  if (filters.remote === "true" || filters.remote === "false") count++;
  if (filters.payListed) count++;
  return count;
}

/**
 * Derives default search filters from a resume, strictly mirroring the backend rules:
 * - experienceYears null or 0: fresher, 1: junior, 2..4: mid, 5+: any
 * - roles: from resume.roleTitles
 * - location: from resume.locationPreference
 * - jobType: any
 * - remote: include
 * - postedWithinDays: 60
 * - minPay: null
 *
 * @param {Object} [resume]
 * @returns {Object} Default filters
 */
export function deriveDefaultFilters(resume = {}) {
  const expYears =
    typeof resume?.experienceYears === "number" && !isNaN(resume.experienceYears)
      ? resume.experienceYears
      : null;

  let experience = "any";
  if (expYears === null || expYears === 0) {
    experience = "fresher";
  } else if (expYears === 1) {
    experience = "junior";
  } else if (expYears >= 2 && expYears <= 4) {
    experience = "mid";
  } else if (expYears >= 5) {
    experience = "any";
  }

  const roles = Array.isArray(resume?.roleTitles)
    ? resume.roleTitles
        .map((r) => normalizeText(r))
        .filter(Boolean)
        .slice(0, JOB_ROLES_MAX)
    : [];

  const location = normalizeText(resume?.locationPreference || "").slice(
    0,
    JOB_LOCATION_MAX
  );

  return {
    jobType: "any",
    experience,
    roles,
    location,
    remote: "include",
    postedWithinDays: 60,
    minPay: null,
  };
}

/**
 * Canonicalizes a filter object for deterministic comparison:
 * - trims and collapses whitespace
 * - deduplicates and sorts roles case-insensitively
 * - standardizes enums and numbers
 *
 * @param {Object} [filters]
 * @returns {Object} Canonical filter object
 */
export function canonicalizeFilters(filters = {}) {
  const jobType = filters?.jobType || "any";
  const experience = filters?.experience || "any";

  const rawRoles = Array.isArray(filters?.roles) ? filters.roles : [];
  const seenLower = new Set();
  const cleanedRoles = [];
  for (const r of rawRoles) {
    const trimmed = normalizeText(r).slice(0, JOB_ROLE_MAX_LEN);
    if (trimmed && !seenLower.has(trimmed.toLowerCase())) {
      seenLower.add(trimmed.toLowerCase());
      cleanedRoles.push(trimmed);
      if (cleanedRoles.length >= JOB_ROLES_MAX) break;
    }
  }
  cleanedRoles.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const location = normalizeText(filters?.location || "").slice(
    0,
    JOB_LOCATION_MAX
  );
  const remote = filters?.remote || "include";
  const postedWithinDays = Number(filters?.postedWithinDays) || 60;

  let minPay = null;
  if (
    filters?.minPay !== null &&
    filters?.minPay !== undefined &&
    !isNaN(Number(filters.minPay))
  ) {
    const n = Math.round(Number(filters.minPay));
    if (n > 0) {
      minPay = Math.min(JOB_MIN_PAY_MAX, n);
    }
  }

  return {
    jobType,
    experience,
    roles: cleanedRoles,
    location,
    remote,
    postedWithinDays,
    minPay,
  };
}

/**
 * Checks whether two filter objects are functionally identical.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean} True if canonical forms match
 */
export function filtersEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const ca = canonicalizeFilters(a);
  const cb = canonicalizeFilters(b);

  if (ca.jobType !== cb.jobType) return false;
  if (ca.experience !== cb.experience) return false;
  if (ca.location.toLowerCase() !== cb.location.toLowerCase()) return false;
  if (ca.remote !== cb.remote) return false;
  if (ca.postedWithinDays !== cb.postedWithinDays) return false;
  if (ca.minPay !== cb.minPay) return false;

  if (ca.roles.length !== cb.roles.length) return false;
  for (let i = 0; i < ca.roles.length; i++) {
    if (ca.roles[i].toLowerCase() !== cb.roles[i].toLowerCase()) return false;
  }

  return true;
}

/**
 * Formats a clean sentence case summary string for the collapsed search form header.
 * Skips default options like "Any", "Include remote", and "Last 60 days".
 *
 * @param {Object} filters
 * @returns {string} E.g. "Internship · Fresher · Full-Stack Developer · Bilaspur · Last 30 days"
 */
export function formatFiltersSummary(filters) {
  if (!filters) return "";
  const parts = [];

  if (filters.jobType && filters.jobType !== "any") {
    const opt = JOB_TYPE_OPTIONS.find((o) => o.value === filters.jobType);
    if (opt) parts.push(opt.label);
  }

  if (filters.experience && filters.experience !== "any") {
    const opt = EXPERIENCE_OPTIONS.find((o) => o.value === filters.experience);
    if (opt) parts.push(opt.label);
  }

  if (Array.isArray(filters.roles) && filters.roles.length > 0) {
    parts.push(filters.roles.join(", "));
  }

  if (filters.location && filters.location.trim()) {
    parts.push(filters.location.trim());
  }

  if (filters.remote === "only") {
    parts.push("Remote only");
  } else if (filters.remote === "exclude") {
    parts.push("No remote");
  }

  if (
    filters.postedWithinDays &&
    Number(filters.postedWithinDays) !== 60 &&
    JOB_POSTED_WITHIN_OPTIONS.includes(Number(filters.postedWithinDays))
  ) {
    const opt = POSTED_WITHIN_OPTIONS.find(
      (o) => o.value === Number(filters.postedWithinDays)
    );
    if (opt) parts.push(opt.label);
  }

  if (filters.minPay && Number(filters.minPay) > 0) {
    const formatted = new Intl.NumberFormat("en-IN").format(filters.minPay);
    parts.push(`Min ₹${formatted}/yr`);
  }

  return parts.length > 0 ? parts.join(" · ") : "All matching jobs";
}

/**
 * Returns an array of clean neutral summary chip labels for the slim summary bar.
 * Skips default options like "Any", "Include", and "Last 60 days".
 *
 * @param {Object} filters
 * @returns {string[]} E.g. ["Internship", "Fresher", "Full-Stack Developer", "Bilaspur", "Last 30 days"]
 */
export function getFiltersSummaryChips(filters) {
  if (!filters) return ["All matching jobs"];
  const chips = [];

  if (filters.jobType && filters.jobType !== "any") {
    const opt = JOB_TYPE_OPTIONS.find((o) => o.value === filters.jobType);
    if (opt) chips.push(opt.label);
  }

  if (filters.experience && filters.experience !== "any") {
    const opt = EXPERIENCE_OPTIONS.find((o) => o.value === filters.experience);
    if (opt) chips.push(opt.label);
  }

  if (Array.isArray(filters.roles) && filters.roles.length > 0) {
    for (const r of filters.roles) {
      if (r && r.trim()) chips.push(r.trim());
    }
  }

  if (filters.location && filters.location.trim()) {
    chips.push(filters.location.trim());
  }

  if (filters.remote === "only") {
    chips.push("Remote only");
  } else if (filters.remote === "exclude") {
    chips.push("No remote");
  }

  if (
    filters.postedWithinDays &&
    Number(filters.postedWithinDays) !== 60 &&
    JOB_POSTED_WITHIN_OPTIONS.includes(Number(filters.postedWithinDays))
  ) {
    const opt = POSTED_WITHIN_OPTIONS.find(
      (o) => o.value === Number(filters.postedWithinDays)
    );
    if (opt) chips.push(opt.label);
  }

  if (filters.minPay && Number(filters.minPay) > 0) {
    const formatted = new Intl.NumberFormat("en-IN").format(filters.minPay);
    chips.push(`Min ₹${formatted}/yr`);
  }

  return chips.length > 0 ? chips : ["All matching jobs"];
}

export default {
  JOB_TYPE_OPTIONS,
  EXPERIENCE_OPTIONS,
  REMOTE_OPTIONS,
  POSTED_WITHIN_OPTIONS,
  RESULT_REMOTE_OPTIONS,
  emptyResultFilters,
  deriveDefaultFilters,
  canonicalizeFilters,
  filtersEqual,
  formatFiltersSummary,
  getFiltersSummaryChips,
  parseResultFilters,
  resultFiltersToParams,
  resultFiltersToUrlParams,
  countActiveResultFilters,
};
