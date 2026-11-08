import { TRACK_DEFAULT_DURATION } from "../../config/constants.js";
import { matchSkillInText } from "./localScore.js";

/**
 * Formats matching skills into a comma-separated string,
 * strictly cutting at a comma boundary so total length <= maxLen (150 chars).
 *
 * @param {string[]} skillsList
 * @param {number} [maxLen=150]
 * @returns {string}
 */
export function formatSkillsUnderLimit(skillsList, maxLen = 150) {
  if (!Array.isArray(skillsList) || skillsList.length === 0) return "";
  let result = "";
  for (const skill of skillsList) {
    const trimmed = (skill || "").trim();
    if (!trimmed) continue;
    const candidate = result ? `${result}, ${trimmed}` : trimmed;
    if (candidate.length <= maxLen) {
      result = candidate;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Maps a job listing from cache and a user resume to Application document data.
 * Pure function: never mutates inputs, copies only mapped fields, and enforces limits.
 *
 * @param {Object} job - Standardized job object from cache
 * @param {Object} resume - User's Resume document
 * @returns {Object} Mapped application creation data
 */
export function jobToApplication(job, resume) {
  if (!job || typeof job !== "object") {
    throw new Error("Job is required for application mapping");
  }

  // 1. Company name cut to 50
  const companyName = (job.company || "").trim().slice(0, 50) || "Unknown";

  // 2. Role cut to 50
  const role = (job.title || "").trim().slice(0, 50) || "Unknown";

  // 3. Platform cut to 30, fallback "Other"
  const rawPlatform = (job.platform || job.source || "").trim();
  const appliedFrom = rawPlatform ? rawPlatform.slice(0, 30) : "Other";

  // 4. Pay: use job.pay if present with valid positive amount; otherwise { type: "yearly", amount: 0 }
  let pay;
  if (
    job.pay &&
    typeof job.pay === "object" &&
    typeof job.pay.amount === "number" &&
    job.pay.amount > 0 &&
    typeof job.pay.type === "string" &&
    job.pay.type
  ) {
    pay = {
      type: job.pay.type,
      amount: job.pay.amount,
    };
  } else {
    pay = {
      type: "yearly",
      amount: 0,
    };
  }

  // 5. Duration: TRACK_DEFAULT_DURATION ("Not set")
  const duration = TRACK_DEFAULT_DURATION;

  // 6. Skills: Resume skills appearing in job title or snippet as whole words
  const resumeSkills = Array.isArray(resume?.skills) ? resume.skills : [];
  const combinedJobText = `${job.title || ""} ${job.snippet || ""}`;
  const matchedSkills = [];

  for (const skill of resumeSkills) {
    if (typeof skill === "string" && matchSkillInText(skill, combinedJobText)) {
      matchedSkills.push(skill.trim());
    }
  }

  const skills = formatSkillsUnderLimit(matchedSkills, 150);

  // 7. Description: job snippet cut to 300
  const description = (job.snippet || "").trim().slice(0, 300);

  // 8. Notes: "Added from job search. Match <score>%: <matchReason>" cut to 200
  const score =
    typeof job.matchScore === "number" && !isNaN(job.matchScore)
      ? Math.round(job.matchScore)
      : 0;
  const reason = (job.matchReason || "").trim();
  const notesText = reason
    ? `Added from job search. Match ${score}%: ${reason}`
    : `Added from job search. Match ${score}%`;
  const notes = notesText.slice(0, 200);

  // 9. Job link: job applyUrl cut to 500
  const jobLink = (job.applyUrl || "").trim().slice(0, 500);

  // 10. Applied date & resume reference
  const appliedDate = new Date();
  const resumeId = resume?._id || resume?.id || null;

  return {
    companyName,
    role,
    appliedFrom,
    pay,
    duration,
    skills,
    description,
    notes,
    jobLink,
    appliedDate,
    resumeId,
    status: "applied",
  };
}

export default {
  jobToApplication,
  formatSkillsUnderLimit,
};
