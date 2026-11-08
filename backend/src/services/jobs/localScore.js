import { JOB_RANK_REASON_MAX } from "../../config/constants.js";

// Scoring weights and bounds
export const WEIGHT_SKILLS = 50;
export const WEIGHT_ROLE = 30;
export const WEIGHT_LEVEL = 15;
export const WEIGHT_LEVEL_PENALTY = -20;
export const WEIGHT_LOCATION = 5;
export const MAX_SKILLS_CONSIDERED = 15;

// Stop words ignored during role title token matching
const STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "in",
  "of",
  "for",
  "with",
  "at",
  "a",
  "an",
  "to",
  "by",
  "on",
]);

// Generic role words that require at least one other word to match
const GENERIC_ROLE_WORDS = new Set([
  "developer",
  "engineer",
  "specialist",
  "consultant",
  "associate",
  "analyst",
]);

// Level fit keyword dictionaries
const ENTRY_LEVEL_WORDS = [
  "intern",
  "internship",
  "trainee",
  "fresher",
  "junior",
  "graduate",
  "entry",
  "apprentice",
];

const SENIOR_LEVEL_WORDS = [
  "senior",
  "sr",
  "sr.",
  "lead",
  "principal",
  "manager",
  "director",
  "head",
  "architect",
  "staff",
];

// Patterns indicating high years of experience requirements in text
const SENIOR_EXP_PATTERN = /\b([5-9]|\d{2,})\+?\s*years?\b/i;

/**
 * Escapes regex special characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tests whether a skill exists in the combined job text as a distinct whole term.
 * Handles boundary edge-cases for terms with punctuation like Node.js, C++, C#, .NET.
 */
export function matchSkillInText(skill, text) {
  if (!skill || !text) return false;
  const trimmed = skill.trim();
  if (!trimmed) return false;

  const escaped = escapeRegex(trimmed);
  // Word boundary using negative lookbehind and lookahead for alphanumeric, _, #, and +
  const regex = new RegExp(`(?<![a-zA-Z0-9_#+])${escaped}(?![a-zA-Z0-9_#+])`, "i");
  return regex.test(text);
}

/**
 * Extracts normalized tokens from a role title excluding punctuation and stop words.
 */
function tokenizeRole(title) {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Scores how well the job title overlaps with candidate role titles.
 * Generic words (e.g. "developer") only count if at least one specific word also matches.
 */
export function scoreRoleOverlap(roleTitles, jobTitle) {
  if (!roleTitles || !roleTitles.length || !jobTitle) return { score: 0, matchedRole: null };

  const jobTokens = new Set(tokenizeRole(jobTitle));
  if (jobTokens.size === 0) return { score: 0, matchedRole: null };

  let bestOverlap = 0;
  let bestRole = null;

  for (const role of roleTitles) {
    const roleTokens = tokenizeRole(role);
    if (roleTokens.length === 0) continue;

    const matchedTokens = roleTokens.filter((t) => jobTokens.has(t));
    if (matchedTokens.length === 0) continue;

    // "developer" / "engineer" only counts if another word matches too
    const nonGenericMatched = matchedTokens.filter((t) => !GENERIC_ROLE_WORDS.has(t));
    if (nonGenericMatched.length === 0 && matchedTokens.length > 0) {
      continue;
    }

    const overlap = matchedTokens.length / roleTokens.length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestRole = role;
    }
  }

  const score = Math.round(Math.min(1, bestOverlap) * WEIGHT_ROLE);
  return { score, matchedRole: bestRole };
}

/**
 * Evaluates level fit between candidate experience and job posting text.
 */
export function scoreLevelFit(experienceYears, combinedText) {
  const isEarlyCareer =
    experienceYears === 0 || experienceYears === 1 || experienceYears === null;
  const isExperienced = typeof experienceYears === "number" && experienceYears >= 3;

  const textLower = combinedText.toLowerCase();

  const hasEntryWord = ENTRY_LEVEL_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(textLower);
  });

  const hasSeniorWord =
    SENIOR_LEVEL_WORDS.some((word) => {
      const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
      return regex.test(textLower);
    }) || SENIOR_EXP_PATTERN.test(combinedText);

  if (isEarlyCareer) {
    if (hasSeniorWord) {
      return WEIGHT_LEVEL_PENALTY; // -20 points for senior fit
    }
    if (hasEntryWord) {
      return WEIGHT_LEVEL; // +15 points for intern / fresher / junior fit
    }
    return 0;
  }

  if (isExperienced) {
    if (hasEntryWord) {
      return WEIGHT_LEVEL_PENALTY; // -20 points for intern / trainee fit
    }
    if (hasSeniorWord) {
      return WEIGHT_LEVEL; // +15 points for senior alignment
    }
    return 0;
  }

  return 0;
}

/**
 * Scores location and remote preference alignment.
 */
export function scoreLocation(profileLocation, jobLocation, isRemote) {
  if (!profileLocation) return 0;
  const pref = profileLocation.trim().toLowerCase();
  if (!pref) return 0;

  const jobLoc = (jobLocation || "").toLowerCase();
  const mentionsRemote = pref.includes("remote");

  if (isRemote || jobLoc.includes("remote")) {
    if (mentionsRemote) return WEIGHT_LOCATION;
  }

  if (jobLoc && (jobLoc.includes(pref) || pref.includes(jobLoc))) {
    return WEIGHT_LOCATION;
  }

  return 0;
}

/**
 * Scores a job locally against candidate profile criteria without AI calls.
 *
 * @param {Object} job - Normalized job object ({ title, company, location, remote, snippet })
 * @param {Object} profile - Candidate profile ({ roleTitles, skills, experienceYears, locationPreference })
 * @returns {{ score: number, reason: string }}
 */
export function scoreJobLocally(job, profile) {
  const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
  const profileRoles = Array.isArray(profile?.roleTitles) ? profile.roleTitles : [];
  const experienceYears =
    typeof profile?.experienceYears === "number" ? profile.experienceYears : null;
  const locationPref = profile?.locationPreference || "";

  const title = job?.title || "";
  const snippet = job?.snippet || "";
  const location = job?.location || "";
  const isRemote = Boolean(job?.remote);
  const combinedText = `${title} ${snippet}`;

  // 1. Skills score (up to 50 points)
  const skillsToConsider = profileSkills.slice(0, MAX_SKILLS_CONSIDERED);
  const matchingSkills = [];

  for (const skill of skillsToConsider) {
    if (matchSkillInText(skill, combinedText)) {
      matchingSkills.push(skill);
    }
  }

  const skillScore =
    skillsToConsider.length > 0
      ? (matchingSkills.length / skillsToConsider.length) * WEIGHT_SKILLS
      : 0;

  // 2. Role score (up to 30 points)
  const { score: roleScore, matchedRole } = scoreRoleOverlap(profileRoles, title);

  // 3. Level fit score (+15 to -20 points)
  const levelScore = scoreLevelFit(experienceYears, combinedText);

  // 4. Location score (up to 5 points)
  const locationScore = scoreLocation(locationPref, location, isRemote);

  // Total clamped to 0..100 integer
  const rawScore = skillScore + roleScore + levelScore + locationScore;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Generate plain-text reason (<= 120 chars)
  let reason = "";
  if (matchingSkills.length > 0) {
    const list = matchingSkills.join(", ");
    const candidateReason = `Matches ${matchingSkills.length} skill${
      matchingSkills.length > 1 ? "s" : ""
    }: ${list}`;
    if (candidateReason.length <= JOB_RANK_REASON_MAX) {
      reason = candidateReason;
    } else {
      // Truncate cleanly
      reason = candidateReason.slice(0, JOB_RANK_REASON_MAX - 3) + "...";
    }
  } else if (matchedRole) {
    reason = `Matches role: ${matchedRole}`.slice(0, JOB_RANK_REASON_MAX);
  } else if (levelScore > 0) {
    reason = "Good level and seniority fit".slice(0, JOB_RANK_REASON_MAX);
  } else {
    reason = "Few skills match this job";
  }

  if (reason.length > JOB_RANK_REASON_MAX) {
    reason = reason.slice(0, JOB_RANK_REASON_MAX);
  }

  return { score, reason };
}

export default {
  scoreJobLocally,
  matchSkillInText,
  scoreRoleOverlap,
  scoreLevelFit,
  scoreLocation,
};
