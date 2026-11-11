import {
  JOB_RANK_CANDIDATES,
  JOB_STORE_MAX,
} from "../../config/constants.js";
import { scoreJobLocally } from "./localScore.js";
import { rankJobsWithAi } from "./jobRankAi.js";
import { isAiConfigured, classifyAiError } from "../ai/clients.js";

/**
 * Safely compares two ISO date strings descending (newer first).
 */
function compareDatesDesc(aDate, bDate) {
  const timeA = aDate ? new Date(aDate).getTime() : 0;
  const timeB = bDate ? new Date(bDate).getTime() : 0;
  return timeB - timeA;
}

/**
 * Compares two jobs by matchScore desc, ties by postedAt desc.
 */
function compareJobs(a, b) {
  if (b.matchScore !== a.matchScore) {
    return b.matchScore - a.matchScore;
  }
  return compareDatesDesc(a.postedAt, b.postedAt);
}

/**
 * Evaluates candidate job postings using local heuristic scoring, selects top candidates,
 * attempts one batched AI evaluation if available, and gracefully falls back to local scoring.
 * Stores up to JOB_STORE_MAX jobs, evaluates top JOB_RANK_CANDIDATES with AI,
 * and assigns a stable 1-based rank integer to each job.
 *
 * @param {Array<Object>} rawJobs - Deduplicated normalized job listings
 * @param {Object} profile - Candidate profile ({ roleTitles, skills, experienceYears, locationPreference })
 * @param {Object} [options]
 * @param {Function} [options.aiRanker] - Injected AI ranker function for testing
 * @param {Function} [options.isConfigured] - Injected provider configuration checker
 * @returns {Promise<{ jobs: Array<Object>, rankedBy: "ai" | "local", rankStatus: string }>}
 */
export async function rankAndMergeJobs(rawJobs, profile, options = {}) {
  const ranker = options.aiRanker || rankJobsWithAi;
  const checkConfigured = options.isConfigured || isAiConfigured;

  // 1. Score all jobs locally (always runs, no cost)
  const locallyScored = (rawJobs || []).map((job) => {
    const { score, reason } = scoreJobLocally(job, profile);
    return {
      ...job,
      matchScore: score,
      matchReason: reason,
      scoredBy: "local",
    };
  });

  // Sort by local score desc, ties by postedAt desc
  locallyScored.sort(compareJobs);

  // Keep up to JOB_STORE_MAX (150)
  const storedJobs = locallyScored.slice(0, JOB_STORE_MAX);

  if (storedJobs.length === 0) {
    return {
      jobs: [],
      rankedBy: "local",
      rankStatus: "skipped",
    };
  }

  // Top 25 candidates for AI ranking
  const aiCandidates = storedJobs.slice(0, JOB_RANK_CANDIDATES);
  const remainingJobs = storedJobs.slice(JOB_RANK_CANDIDATES);

  // 2. Check if AI provider has credentials configured
  if (!checkConfigured()) {
    storedJobs.forEach((job, index) => {
      job.rank = index + 1;
    });
    return {
      jobs: storedJobs,
      rankedBy: "local",
      rankStatus: "unavailable",
    };
  }

  // 3. Attempt one batched AI evaluation on top candidates
  let rankedBy = "local";
  let rankStatus = "failed";

  try {
    const aiScores = await ranker(profile, aiCandidates);

    let aiMatchCount = 0;
    for (const job of aiCandidates) {
      const match = aiScores ? aiScores[job.id] : null;
      if (match && typeof match.score === "number") {
        job.matchScore = match.score;
        job.matchReason = match.reason || job.matchReason;
        job.scoredBy = "ai";
        aiMatchCount++;
      } else {
        // Missing or invalid entries keep local score and reason
        job.scoredBy = "local";
      }
    }

    if (aiMatchCount > 0) {
      rankedBy = "ai";
      rankStatus = "ok";
    } else {
      rankedBy = "local";
      rankStatus = "invalid_output";
    }
  } catch (err) {
    rankStatus = classifyAiError(err);
    rankedBy = "local";
    // All jobs retain their local score and reason; search never fails due to ranking
  }

  // 4. Final ordering: AI-scored jobs first (by AI score desc), then remaining jobs by local score desc.
  // If ranking was local only, all jobs by local score.
  let finalJobs;
  if (rankedBy === "ai") {
    aiCandidates.sort(compareJobs);
    finalJobs = [...aiCandidates, ...remainingJobs];
  } else {
    storedJobs.sort(compareJobs);
    finalJobs = storedJobs;
  }

  // 5. Assign stable 1-based rank integer to each stored job
  finalJobs.forEach((job, index) => {
    job.rank = index + 1;
  });

  return {
    jobs: finalJobs,
    rankedBy,
    rankStatus,
  };
}

export default {
  rankAndMergeJobs,
};
