import crypto from "crypto";
import {
  JOB_DESCRIPTION_SNIPPET_MAX,
  JOB_MAX_AGE_DAYS,
} from "../../config/constants.js";

/**
 * Strips HTML tags, unescapes common HTML entities, and collapses whitespace.
 */
export function stripHtml(text) {
  if (typeof text !== "string") return "";
  let clean = text.replace(/<[^>]*>/g, " ");
  clean = clean
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * Validates apply URL format and length.
 */
export function cleanUrl(url) {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!/^https?:\/\/.+/i.test(trimmed)) return null;
  if (trimmed.length > 500) return null;
  return trimmed;
}

/**
 * Parses date string and checks whether it is older than JOB_MAX_AGE_DAYS.
 */
export function parseAndValidateDate(dateVal) {
  if (!dateVal) return { date: null, isExpired: false };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { date: null, isExpired: false };

  const maxAgeMs = JOB_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - d.getTime() > maxAgeMs) {
    return { date: d.toISOString(), isExpired: true };
  }
  return { date: d.toISOString(), isExpired: false };
}

/**
 * Calculate standard pay structure.
 */
export function calculatePay(min, max, periodType, currencyIsINR = true) {
  if (!currencyIsINR || !periodType) {
    return { pay: null, payMin: null, payMax: null };
  }

  const numMin =
    typeof min === "number" && !isNaN(min) && min > 0 ? Math.round(min) : null;
  const numMax =
    typeof max === "number" && !isNaN(max) && max > 0 ? Math.round(max) : null;

  let amount = null;
  if (numMin !== null && numMax !== null) {
    amount = Math.round((numMin + numMax) / 2);
  } else if (numMin !== null) {
    amount = numMin;
  } else if (numMax !== null) {
    amount = numMax;
  }

  let pay = null;
  if (amount !== null && amount > 0 && amount <= 10000000) {
    pay = {
      type: periodType,
      amount,
    };
  }

  return { pay, payMin: numMin, payMax: numMax };
}

function sha1(str) {
  return crypto.createHash("sha1").update(str).digest("hex");
}

export function normalizeAdzunaJob(raw) {
  if (!raw || typeof raw !== "object") return null;

  const externalId = String(raw.id || "").trim();
  if (!externalId) return null;

  const title = stripHtml(raw.title || "").slice(0, 50);
  if (!title) return null;

  const company = stripHtml(raw.company?.display_name || "").slice(0, 50);
  if (!company) return null;

  const applyUrl = cleanUrl(raw.redirect_url);
  if (!applyUrl) return null;

  const { date: postedAt, isExpired } = parseAndValidateDate(raw.created);
  if (isExpired) return null;

  const location = stripHtml(raw.location?.display_name || "").slice(0, 100);
  const snippet = stripHtml(raw.description || "").slice(
    0,
    JOB_DESCRIPTION_SNIPPET_MAX
  );

  const remote =
    /remote/i.test(title) ||
    /remote/i.test(location) ||
    /remote/i.test(snippet);

  let employmentType = null;
  if (raw.contract_time === "full_time") employmentType = "full-time";
  else if (raw.contract_time === "part_time") employmentType = "part-time";
  else if (typeof raw.contract_time === "string")
    employmentType = stripHtml(raw.contract_time).toLowerCase();

  const { pay, payMin, payMax } = calculatePay(
    raw.salary_min,
    raw.salary_max,
    "yearly",
    true
  );

  return {
    id: sha1(`adzuna:${externalId}`),
    source: "adzuna",
    platform: "Adzuna",
    title,
    company,
    location,
    remote,
    snippet,
    applyUrl,
    postedAt,
    employmentType,
    pay,
    payMin,
    payMax,
  };
}

export function normalizeJSearchJob(raw) {
  if (!raw || typeof raw !== "object") return null;

  const externalId = String(raw.job_id || "").trim();
  if (!externalId) return null;

  const title = stripHtml(raw.job_title || "").slice(0, 50);
  if (!title) return null;

  const company = stripHtml(raw.employer_name || "").slice(0, 50);
  if (!company) return null;

  const applyUrl = cleanUrl(raw.job_apply_link);
  if (!applyUrl) return null;

  const rawDate =
    raw.job_posted_at_datetime_utc ||
    (raw.job_posted_at_timestamp ? raw.job_posted_at_timestamp * 1000 : null);
  const { date: postedAt, isExpired } = parseAndValidateDate(rawDate);
  if (isExpired) return null;

  const locationParts = [raw.job_city, raw.job_state, raw.job_country]
    .filter(Boolean)
    .map(stripHtml)
    .filter(Boolean);
  const location = locationParts.join(", ").slice(0, 100);

  const snippet = stripHtml(raw.job_description || "").slice(
    0,
    JOB_DESCRIPTION_SNIPPET_MAX
  );
  const remote = Boolean(raw.job_is_remote);

  let employmentType = null;
  if (raw.job_employment_type) {
    const et = String(raw.job_employment_type).toLowerCase();
    if (et.includes("full")) employmentType = "full-time";
    else if (et.includes("part")) employmentType = "part-time";
    else if (et.includes("intern")) employmentType = "internship";
    else if (et.includes("contract")) employmentType = "contract";
    else employmentType = et.slice(0, 30);
  }

  // Pay mapping: only INR
  const currency = raw.job_salary_currency ? String(raw.job_salary_currency).toUpperCase() : "";
  const isINR = currency === "INR" || (!currency && (raw.job_country || "").toUpperCase() === "IN");

  let periodType = null;
  const rawPeriod = (raw.job_salary_period || "").toUpperCase();
  if (rawPeriod === "YEAR") periodType = "yearly";
  else if (rawPeriod === "MONTH") periodType = "monthly";

  const { pay, payMin, payMax } = calculatePay(
    raw.job_min_salary,
    raw.job_max_salary,
    periodType,
    isINR
  );

  const platform = raw.job_publisher
    ? stripHtml(raw.job_publisher).slice(0, 30)
    : "Other";

  return {
    id: sha1(`jsearch:${externalId}`),
    source: "jsearch",
    platform,
    title,
    company,
    location,
    remote,
    snippet,
    applyUrl,
    postedAt,
    employmentType,
    pay,
    payMin,
    payMax,
  };
}

/**
 * Normalizes an array of raw jobs from a given source.
 * Drops any jobs that fail validation.
 */
export function normalizeJobs(rawJobs = [], source = "adzuna") {
  if (!Array.isArray(rawJobs)) return [];
  const normalized = [];

  for (const raw of rawJobs) {
    const job =
      source === "jsearch" ? normalizeJSearchJob(raw) : normalizeAdzunaJob(raw);
    if (job) {
      normalized.push(job);
    }
  }

  return normalized;
}

export default {
  stripHtml,
  cleanUrl,
  calculatePay,
  normalizeAdzunaJob,
  normalizeJSearchJob,
  normalizeJobs,
};
