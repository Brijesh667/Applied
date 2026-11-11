import crypto from "crypto";
import {
  JOB_DESCRIPTION_SNIPPET_MAX,
  JOB_MAX_AGE_DAYS,
} from "../../config/constants.js";

/**
 * Tracks dropped jobs count per provider due to invalid or over-length applyUrl.
 */
let lastDroppedUrlCounts = {};

export function _resetDroppedUrlCounts() {
  lastDroppedUrlCounts = {};
}

export function _getLastDroppedUrlCounts() {
  return { ...lastDroppedUrlCounts };
}

/**
 * Cleans job text: converts non-breaking spaces to normal spaces,
 * repairs common UTF-8 mojibake (decoded as Latin-1), and removes stray markers.
 * Never throws.
 */
export function cleanJobText(text) {
  if (typeof text !== "string" || !text) return "";
  let clean = text;

  // Replace non-breaking spaces (U+00A0) with normal spaces
  clean = clean.replace(/\u00A0/g, " ");

  // Check for typical mojibake markers:
  // Â followed by space or non-breaking space, â, âœ, â", Ã
  if (/Â[ \u00A0]|â|âœ|â"|Ã/.test(clean)) {
    try {
      const buf = Buffer.from(clean, "latin1");
      const decoder = new TextDecoder("utf-8", { fatal: true });
      const decoded = decoder.decode(buf);
      if (decoded && decoded.length < clean.length) {
        clean = decoded;
      } else {
        clean = fallbackCleanMojibake(clean);
      }
    } catch {
      clean = fallbackCleanMojibake(clean);
    }
  }

  // Replace non-breaking spaces (U+00A0) again if decoded from mojibake
  clean = clean.replace(/\u00A0/g, " ");

  return clean;
}

function fallbackCleanMojibake(str) {
  return str
    .replace(/Â[ \u00A0]+/g, " ")
    .replace(/Â/g, "")
    .replace(/â€™|â€˜|â€²|â/g, "'")
    .replace(/â€œ|â€|âœ/g, '"')
    .replace(/â€”|â€“|â"/g, "-");
}

/**
 * Strips HTML tags, unescapes common HTML entities, repairs text, and collapses whitespace.
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
  clean = cleanJobText(clean);
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
 * Cleans and validates attribution object ({ name, url }).
 */
export function cleanAttribution(attr) {
  if (!attr || typeof attr !== "object") return null;
  const name = stripHtml(attr.name || "").slice(0, 40);
  if (!name) return null;
  const url = attr.url ? cleanUrl(attr.url) : null;
  return { name, url };
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

/**
 * Parses Jooble free-text salary string.
 * Tries to parse only clear INR yearly or monthly figures;
 * otherwise leaves pay: null and preserves raw text in salaryText (max 60 chars).
 */
export function parseJoobleSalary(salaryRaw) {
  if (!salaryRaw || typeof salaryRaw !== "string") {
    return { pay: null, payMin: null, payMax: null, salaryText: null };
  }
  const text = stripHtml(salaryRaw).slice(0, 60);
  if (!text) {
    return { pay: null, payMin: null, payMax: null, salaryText: null };
  }

  const isINR = /₹|inr|rs\.?|lakh|lac|lpa/i.test(text);
  if (isINR) {
    let period = null;
    if (/year|annum|\bp\.?a\.?\b/i.test(text)) {
      period = "yearly";
    } else if (/month|\bp\.?m\.?\b/i.test(text)) {
      period = "monthly";
    }

    // Try Lakhs range (e.g. "5 - 8 Lakhs", "5-8 LPA")
    const lpaRange = text.match(
      /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lac)/i
    );
    if (lpaRange) {
      const min = Math.round(parseFloat(lpaRange[1]) * 100000);
      const max = Math.round(parseFloat(lpaRange[2]) * 100000);
      const res = calculatePay(min, max, "yearly", true);
      if (res.pay) {
        return { ...res, salaryText: text };
      }
    }

    const singleLpa = text.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lac)/i);
    if (singleLpa) {
      const val = Math.round(parseFloat(singleLpa[1]) * 100000);
      const res = calculatePay(val, val, "yearly", true);
      if (res.pay) {
        return { ...res, salaryText: text };
      }
    }

    // Standard numeric match (e.g. ₹500,000 - ₹800,000 / year)
    if (period) {
      const numbers = text.replace(/,/g, "").match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const n1 = parseInt(numbers[0], 10);
        const n2 = parseInt(numbers[1], 10);
        if (n1 > 0 && n2 > 0 && n1 <= 10000000 && n2 <= 10000000) {
          const res = calculatePay(n1, n2, period, true);
          if (res.pay) {
            return { ...res, salaryText: text };
          }
        }
      } else if (numbers && numbers.length === 1) {
        const n1 = parseInt(numbers[0], 10);
        if (n1 > 0 && n1 <= 10000000) {
          const res = calculatePay(n1, n1, period, true);
          if (res.pay) {
            return { ...res, salaryText: text };
          }
        }
      }
    }
  }

  return { pay: null, payMin: null, payMax: null, salaryText: text };
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
    attribution: null,
    salaryText: null,
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
    attribution: null,
    salaryText: null,
  };
}

export function normalizeJoobleJob(raw) {
  if (!raw || typeof raw !== "object") return null;

  const externalId = String(raw.id || raw.link || "").trim();
  if (!externalId) return null;

  const title = stripHtml(raw.title || "").slice(0, 50);
  if (!title) return null;

  const company = stripHtml(raw.company || "").slice(0, 50);
  if (!company) return null;

  const applyUrl = cleanUrl(raw.link);
  if (!applyUrl) return null;

  const { date: postedAt, isExpired } = parseAndValidateDate(raw.updated);
  if (isExpired) return null;

  const location = stripHtml(raw.location || "").slice(0, 100);
  const snippet = stripHtml(raw.snippet || "").slice(
    0,
    JOB_DESCRIPTION_SNIPPET_MAX
  );

  const remote =
    /remote/i.test(title) ||
    /remote/i.test(location) ||
    /remote/i.test(snippet) ||
    /remote/i.test(raw.type || "");

  let employmentType = null;
  if (raw.type) {
    const et = String(raw.type).toLowerCase();
    if (et.includes("full")) employmentType = "full-time";
    else if (et.includes("part")) employmentType = "part-time";
    else if (et.includes("contract")) employmentType = "contract";
    else if (et.includes("intern")) employmentType = "internship";
    else employmentType = et.slice(0, 30);
  }

  const { pay, payMin, payMax, salaryText } = parseJoobleSalary(raw.salary);
  const platform = raw.source ? stripHtml(raw.source).slice(0, 30) : "Jooble";

  return {
    id: sha1(`jooble:${externalId}`),
    source: "jooble",
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
    attribution: cleanAttribution({ name: "Jooble", url: "https://jooble.org" }),
    salaryText,
  };
}

export function normalizeCareerjetJob(raw) {
  if (!raw || typeof raw !== "object") return null;

  const externalId = String(raw.url || raw.title + (raw.company || "")).trim();
  if (!externalId) return null;

  const title = stripHtml(raw.title || "").slice(0, 50);
  if (!title) return null;

  const company = stripHtml(raw.company || "").slice(0, 50);
  if (!company) return null;

  // Do not modify the returned url (it carries click tracking)
  const applyUrl = cleanUrl(raw.url);
  if (!applyUrl) return null;

  const { date: postedAt, isExpired } = parseAndValidateDate(raw.date);
  if (isExpired) return null;

  const location = stripHtml(raw.locations || "").slice(0, 100);
  const snippet = stripHtml(raw.description || "").slice(
    0,
    JOB_DESCRIPTION_SNIPPET_MAX
  );

  const remote =
    /remote/i.test(title) ||
    /remote/i.test(location) ||
    /remote/i.test(snippet);

  // Pay: only when currency is INR; period map Y to yearly, M to monthly, anything else null
  const currency = String(raw.salary_currency_code || "").toUpperCase();
  const isINR = currency === "INR";

  let periodType = null;
  const rawType = String(raw.salary_type || "").toUpperCase();
  if (rawType === "Y") periodType = "yearly";
  else if (rawType === "M") periodType = "monthly";

  const { pay, payMin, payMax } = calculatePay(
    raw.salary_min,
    raw.salary_max,
    periodType,
    isINR
  );

  const salaryText = raw.salary ? stripHtml(raw.salary).slice(0, 60) : null;
  const platform = raw.site ? stripHtml(raw.site).slice(0, 30) : "Careerjet";

  return {
    id: sha1(`careerjet:${externalId}`),
    source: "careerjet",
    platform,
    title,
    company,
    location,
    remote,
    snippet,
    applyUrl,
    postedAt,
    employmentType: null,
    pay,
    payMin,
    payMax,
    attribution: cleanAttribution({ name: "Careerjet", url: null }),
    salaryText,
  };
}

export function normalizeHimalayasJob(raw) {
  if (!raw || typeof raw !== "object") return null;

  const externalId = String(raw.guid || raw.applicationLink || raw.title).trim();
  if (!externalId) return null;

  const title = stripHtml(raw.title || "").slice(0, 50);
  if (!title) return null;

  const company = stripHtml(raw.companyName || "").slice(0, 50);
  if (!company) return null;

  const applyUrl = cleanUrl(raw.applicationLink || raw.guid);
  if (!applyUrl) return null;

  const { date: postedAt, isExpired } = parseAndValidateDate(raw.pubDate);
  if (isExpired) return null;

  const locationRaw = Array.isArray(raw.locationRestrictions)
    ? raw.locationRestrictions.join(", ")
    : raw.locationRestrictions || "Remote";
  const location = stripHtml(locationRaw).slice(0, 100);

  const snippet = stripHtml(raw.description || "").slice(
    0,
    JOB_DESCRIPTION_SNIPPET_MAX
  );

  let employmentType = null;
  if (raw.employmentType) {
    employmentType = stripHtml(raw.employmentType).toLowerCase().slice(0, 30);
  }

  // Every Himalayas job has remote: true; salary is USD: pay: null + salaryText
  let salaryText = null;
  const cur = raw.currency ? String(raw.currency).toUpperCase() : "USD";
  if (typeof raw.minSalary === "number" && typeof raw.maxSalary === "number") {
    salaryText = `${cur} ${raw.minSalary.toLocaleString("en-US")} to ${raw.maxSalary.toLocaleString("en-US")} per year`.slice(0, 60);
  } else if (typeof raw.minSalary === "number") {
    salaryText = `${cur} ${raw.minSalary.toLocaleString("en-US")} per year`.slice(0, 60);
  }

  return {
    id: sha1(`himalayas:${externalId}`),
    source: "himalayas",
    platform: "Himalayas",
    title,
    company,
    location,
    remote: true,
    snippet,
    applyUrl,
    postedAt,
    employmentType,
    pay: null,
    payMin: null,
    payMax: null,
    attribution: cleanAttribution({
      name: "Himalayas",
      url: "https://himalayas.app",
    }),
    salaryText,
  };
}

export function normalizeRemoteOkJob(raw) {
  if (!raw || typeof raw !== "object") return null;

  const externalId = String(raw.id || raw.url || raw.position).trim();
  if (!externalId) return null;

  const title = stripHtml(raw.position || "").slice(0, 50);
  if (!title) return null;

  const company = stripHtml(raw.company || "").slice(0, 50);
  if (!company) return null;

  // Use the job url (the RemoteOK page) as applyUrl unless explicit apply_url is present
  const applyUrl = cleanUrl(raw.apply_url || raw.url);
  if (!applyUrl) return null;

  const { date: postedAt, isExpired } = parseAndValidateDate(raw.date);
  if (isExpired) return null;

  const location = stripHtml(raw.location || "Remote").slice(0, 100);
  const snippet = stripHtml(raw.description || "").slice(
    0,
    JOB_DESCRIPTION_SNIPPET_MAX
  );

  // RemoteOK is always remote: true; salary is USD: pay: null + salaryText
  let salaryText = null;
  if (
    typeof raw.salary_min === "number" &&
    typeof raw.salary_max === "number" &&
    raw.salary_min > 0
  ) {
    salaryText = `USD ${raw.salary_min.toLocaleString("en-US")} to ${raw.salary_max.toLocaleString("en-US")} per year`.slice(0, 60);
  } else if (typeof raw.salary_min === "number" && raw.salary_min > 0) {
    salaryText = `USD ${raw.salary_min.toLocaleString("en-US")} per year`.slice(0, 60);
  }

  const attributionUrl = cleanUrl(raw.url) || "https://remoteok.com";

  return {
    id: sha1(`remoteok:${externalId}`),
    source: "remoteok",
    platform: "RemoteOK",
    title,
    company,
    location,
    remote: true,
    snippet,
    applyUrl,
    postedAt,
    employmentType: null,
    pay: null,
    payMin: null,
    payMax: null,
    attribution: cleanAttribution({
      name: "RemoteOK",
      url: attributionUrl,
    }),
    salaryText,
  };
}

/**
 * Normalizes an array of raw jobs from a given source.
 * Drops any jobs that fail validation.
 * Counts dropped jobs per provider due to invalid or over-length applyUrl and logs only the counts.
 *
 * @param {Array<Object>} rawJobs
 * @param {"adzuna" | "jsearch" | "jooble" | "careerjet" | "himalayas" | "remoteok"} source
 * @returns {Array<Object>}
 */
export function normalizeJobs(rawJobs = [], source = "adzuna") {
  if (!Array.isArray(rawJobs)) return [];
  const normalized = [];
  let droppedUrlCount = 0;

  for (const raw of rawJobs) {
    if (!raw || typeof raw !== "object") continue;

    // Check whether this item has a candidate URL that is invalid or exceeds 500 chars
    const candidateUrl =
      raw.redirect_url ||
      raw.job_apply_link ||
      raw.link ||
      raw.url ||
      raw.applicationLink ||
      raw.apply_url;

    if (candidateUrl && !cleanUrl(candidateUrl)) {
      droppedUrlCount++;
    }

    let job = null;
    switch (source) {
      case "jsearch":
        job = normalizeJSearchJob(raw);
        break;
      case "jooble":
        job = normalizeJoobleJob(raw);
        break;
      case "careerjet":
        job = normalizeCareerjetJob(raw);
        break;
      case "himalayas":
        job = normalizeHimalayasJob(raw);
        break;
      case "remoteok":
        job = normalizeRemoteOkJob(raw);
        break;
      case "adzuna":
      default:
        job = normalizeAdzunaJob(raw);
        break;
    }

    if (job) {
      normalized.push(job);
    }
  }

  lastDroppedUrlCounts[source] = droppedUrlCount;

  if (droppedUrlCount > 0) {
    console.warn(
      `Dropped ${droppedUrlCount} jobs from ${source} due to invalid or over-length applyUrl`
    );
  }

  return normalized;
}

export default {
  stripHtml,
  cleanUrl,
  cleanAttribution,
  calculatePay,
  parseJoobleSalary,
  normalizeAdzunaJob,
  normalizeJSearchJob,
  normalizeJoobleJob,
  normalizeCareerjetJob,
  normalizeHimalayasJob,
  normalizeRemoteOkJob,
  normalizeJobs,
  _resetDroppedUrlCounts,
  _getLastDroppedUrlCounts,
};
