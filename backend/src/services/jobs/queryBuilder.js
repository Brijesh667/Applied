import {
  JOB_ROLES_MAX,
  JOB_ROLE_MAX_LEN,
  JOB_LOCATION_MAX,
  JOB_MIN_PAY_MAX,
  JOB_POSTED_WITHIN_OPTIONS,
} from "../../config/constants.js";

export class QueryBuilderError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "QueryBuilderError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Derives default search filters from a resume.
 *
 * @param {Object} resume
 * @returns {Object} Default filters
 */
export function deriveDefaultFilters(resume = {}) {
  const expYears =
    typeof resume.experienceYears === "number" && !isNaN(resume.experienceYears)
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

  const rawLocation = String(resume.locationPreference || "").trim();

  const roles = Array.isArray(resume.roleTitles)
    ? resume.roleTitles
        .map((r) => String(r || "").trim())
        .filter(Boolean)
        .slice(0, JOB_ROLES_MAX)
    : [];

  return {
    jobType: "any",
    experience,
    roles,
    location: rawLocation,
    remote: "include",
    postedWithinDays: 60,
    minPay: null,
  };
}

/**
 * Sanitizes and canonicalizes search filters against schema rules and resume defaults.
 *
 * @param {Object} [rawFilters]
 * @param {Object} [resume]
 * @returns {Object} Canonical filter object
 */
export function canonicalizeFilters(rawFilters = {}, resume = {}) {
  const defaults = deriveDefaultFilters(resume);
  const input = rawFilters || {};

  // 1. jobType
  let jobType = input.jobType !== undefined ? input.jobType : defaults.jobType;
  if (!["any", "internship", "fulltime", "parttime"].includes(jobType)) {
    jobType = "any";
  }

  // 2. experience
  let experience = input.experience !== undefined ? input.experience : defaults.experience;
  if (!["any", "fresher", "junior", "mid"].includes(experience)) {
    experience = defaults.experience;
  }

  // 3. roles: array of strings, max 5, each 1 to 60 chars. Deduped case-insensitively, sorted.
  const rawRoles = input.roles !== undefined ? input.roles : defaults.roles;
  const cleanedRoles = [];
  const seenLower = new Set();
  if (Array.isArray(rawRoles)) {
    for (const r of rawRoles) {
      const trimmed = String(r || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, JOB_ROLE_MAX_LEN);
      if (trimmed && !seenLower.has(trimmed.toLowerCase())) {
        seenLower.add(trimmed.toLowerCase());
        cleanedRoles.push(trimmed);
        if (cleanedRoles.length >= JOB_ROLES_MAX) break;
      }
    }
  }
  // Sort roles canonically
  cleanedRoles.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  // 4. location: string up to 100
  const rawLoc = input.location !== undefined ? input.location : defaults.location;
  const location = String(rawLoc || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, JOB_LOCATION_MAX);

  // 5. remote: include | only | exclude
  let remote = input.remote !== undefined ? input.remote : defaults.remote;
  if (!["include", "only", "exclude"].includes(remote)) {
    remote = "include";
  }

  // 6. postedWithinDays: one of [7, 30, 60]
  let postedWithinDays =
    input.postedWithinDays !== undefined
      ? Number(input.postedWithinDays)
      : defaults.postedWithinDays;
  if (!JOB_POSTED_WITHIN_OPTIONS.includes(postedWithinDays)) {
    postedWithinDays = 60;
  }

  // 7. minPay: integer 0 to 10,000,000 or null
  let minPay = input.minPay !== undefined ? input.minPay : defaults.minPay;
  if (minPay !== null && minPay !== undefined && !isNaN(Number(minPay))) {
    const num = Math.round(Number(minPay));
    if (num > 0) {
      minPay = Math.min(JOB_MIN_PAY_MAX, num);
    } else {
      minPay = null;
    }
  } else {
    minPay = null;
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
 * Builds search queries from a resume's profile fields and filters.
 * Never sends resume text, name, email or phone to any provider.
 *
 * @param {Object} resume - Resume document or profile projection
 * @param {Object} [filters] - Optional filter overrides
 * @returns {Array<{ what: string, where: string, level: string, isRemote: boolean, jobType: string, remote: string, postedWithinDays: number, minPay: number|null }>}
 */
export function buildQueries(resume, filters) {
  if (!resume) {
    throw new QueryBuilderError("NOT_FOUND", "Resume not found", 404);
  }

  const canonicalFilters = canonicalizeFilters(filters, resume);

  const skills = Array.isArray(resume.skills)
    ? resume.skills.map((s) => String(s || "").trim()).filter(Boolean)
    : [];

  // When filters is not provided, preserve resume.roleTitles original order for backward compatibility
  const roles = filters
    ? canonicalFilters.roles
    : Array.isArray(resume.roleTitles)
    ? resume.roleTitles.map((r) => String(r || "").trim()).filter(Boolean).slice(0, JOB_ROLES_MAX)
    : [];

  if (roles.length === 0 && skills.length === 0) {
    throw new QueryBuilderError(
      "NO_CRITERIA",
      "Add skills or role titles to this resume first",
      400
    );
  }

  const rawLocation = canonicalFilters.location;
  const isLocationRemote = /remote/i.test(rawLocation);
  const isRemoteOnly = canonicalFilters.remote === "only";
  const where = isRemoteOnly || isLocationRemote ? "" : rawLocation;
  const isRemote = isRemoteOnly || isLocationRemote;

  const { experience, jobType, remote, postedWithinDays, minPay } = canonicalFilters;

  const queries = [];

  // If filters were not passed explicitly and user has experienceYears >= 2,
  // level default was historically "experienced" (checked in existing unit tests)
  const isExplicitFilter = !!filters;
  const levelLabel = isExplicitFilter
    ? experience
    : experience === "fresher"
    ? "fresher"
    : experience === "junior"
    ? "junior"
    : "experienced";

  if (roles.length > 0) {
    const firstRole = roles[0];
    const secondRole = roles[1] || null;

    if (experience === "fresher") {
      const alreadyHasEntryWord = /\b(intern|internship|fresher|junior|trainee|graduate)\b/i.test(firstRole);
      const entryVariant = alreadyHasEntryWord ? firstRole : `${firstRole} intern`;

      queries.push({
        what: entryVariant,
        where,
        level: "fresher",
        isRemote,
        jobType,
        remote,
        postedWithinDays,
        minPay,
      });

      if (secondRole) {
        queries.push({
          what: secondRole,
          where,
          level: isExplicitFilter ? "any" : "all",
          isRemote,
          jobType,
          remote,
          postedWithinDays,
          minPay,
        });
      } else if (!alreadyHasEntryWord) {
        queries.push({
          what: `${firstRole} fresher`,
          where,
          level: "fresher",
          isRemote,
          jobType,
          remote,
          postedWithinDays,
          minPay,
        });
      }
    } else if (experience === "junior") {
      const alreadyJunior = /\bjunior\b/i.test(firstRole);
      queries.push({
        what: alreadyJunior ? firstRole : `${firstRole} junior`,
        where,
        level: "junior",
        isRemote,
        jobType,
        remote,
        postedWithinDays,
        minPay,
      });

      if (secondRole) {
        const secondAlreadyJunior = /\bjunior\b/i.test(secondRole);
        queries.push({
          what: secondAlreadyJunior ? secondRole : `${secondRole} junior`,
          where,
          level: "junior",
          isRemote,
          jobType,
          remote,
          postedWithinDays,
          minPay,
        });
      }
    } else {
      // mid or any: no level word added
      queries.push({
        what: firstRole,
        where,
        level: levelLabel,
        isRemote,
        jobType,
        remote,
        postedWithinDays,
        minPay,
      });

      if (secondRole) {
        queries.push({
          what: secondRole,
          where,
          level: levelLabel,
          isRemote,
          jobType,
          remote,
          postedWithinDays,
          minPay,
        });
      }
    }
  } else {
    // Fallback: up to 3 top skills
    const fallbackQuery = skills.slice(0, 3).join(" ");
    queries.push({
      what: fallbackQuery,
      where,
      level: levelLabel,
      isRemote,
      jobType,
      remote,
      postedWithinDays,
      minPay,
    });
  }

  return queries.slice(0, 2);
}

export default {
  buildQueries,
  deriveDefaultFilters,
  canonicalizeFilters,
  QueryBuilderError,
};
