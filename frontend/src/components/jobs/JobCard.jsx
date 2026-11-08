import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, CheckCircle2, MinusCircle, ChevronDown, ChevronUp, MapPin, Check } from "lucide-react";
import { cn } from "../../lib/cn.js";
import {
  CURRENCY,
  PAY_LABELS,
  JOB_STRONG_MATCH_MIN,
  JOB_GOOD_MATCH_MIN,
  JOB_SNIPPET_COLLAPSED_LINES,
} from "../../lib/constants.js";
import { Button } from "../ui/Button.jsx";
import { ApplyButton } from "./ApplyButton.jsx";
import { DidYouApplyDialog } from "./DidYouApplyDialog.jsx";

/**
 * Format job pay as single, range, or null.
 */
function formatJobPay(job) {
  if (!job) return null;
  const payType = job.pay?.type;
  const typeLabel = payType && PAY_LABELS[payType] ? ` ${PAY_LABELS[payType]}` : "";
  const formatter = new Intl.NumberFormat("en-IN");

  if (typeof job.payMin === "number" && typeof job.payMax === "number") {
    if (job.payMin === job.payMax) {
      return `${CURRENCY}${formatter.format(job.payMin)}${typeLabel}`;
    }
    return `${CURRENCY}${formatter.format(job.payMin)} – ${CURRENCY}${formatter.format(job.payMax)}${typeLabel}`;
  }
  if (typeof job.pay?.amount === "number") {
    return `${CURRENCY}${formatter.format(job.pay.amount)}${typeLabel}`;
  }
  if (typeof job.payMin === "number") {
    return `From ${CURRENCY}${formatter.format(job.payMin)}${typeLabel}`;
  }
  if (typeof job.payMax === "number") {
    return `Up to ${CURRENCY}${formatter.format(job.payMax)}${typeLabel}`;
  }
  return null;
}

/**
 * Format posted time in calendar days ("Today", "Yesterday", "N days ago").
 */
function formatPostedDays(iso) {
  if (!iso) return null;
  const posted = new Date(iso);
  if (isNaN(posted.getTime())) return null;

  const now = new Date();
  const postedMidnight = new Date(posted.getFullYear(), posted.getMonth(), posted.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = nowMidnight.getTime() - postedMidnight.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

/**
 * Format employment type enum into clean sentence case label.
 */
function formatEmploymentType(type) {
  if (!type) return null;
  const map = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
  };
  return map[type] || type.replace(/_/g, " ");
}

/**
 * JobCard component
 * Renders a job opportunity with match score meter, meta pills, pay, date, snippet toggle, and apply button.
 */
export function JobCard({
  job,
  resumeId,
  className = "",
  onOpenTrackDialog,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocalDialogOpen, setIsLocalDialogOpen] = useState(false);

  if (!job) return null;

  const score = typeof job.matchScore === "number" ? Math.round(job.matchScore) : 0;
  const clampedScore = Math.min(Math.max(score, 0), 100);

  // Match tier calculation using design constants
  let TierIcon = MinusCircle;
  let tierLabel = "Weak match";
  let tierIconClass = "text-ink-soft opacity-70";

  if (clampedScore >= JOB_STRONG_MATCH_MIN) {
    TierIcon = Sparkles;
    tierLabel = "Strong match";
    tierIconClass = "text-primary";
  } else if (clampedScore >= JOB_GOOD_MATCH_MIN) {
    TierIcon = CheckCircle2;
    tierLabel = "Good match";
    tierIconClass = "text-ink-soft";
  }

  const payText = formatJobPay(job);
  const postedText = formatPostedDays(job.postedAt);
  const employmentTypeText = formatEmploymentType(job.employmentType);
  const snippet = job.snippet || "";
  const isSnippetLong = snippet.length > 160;

  return (
    <article
      className={cn(
        "bg-surface border border-rule rounded-[12px] p-5 flex flex-col justify-between transition-colors",
        className
      )}
    >
      <div>
        {/* Top header row: Platform badge, Remote chip, Employment type */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {job.platform && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] leading-[14px] font-medium bg-sunken text-ink-soft border border-rule/50">
              {job.platform}
            </span>
          )}

          {job.remote && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] leading-[14px] font-medium bg-primary-soft text-primary">
              Remote
            </span>
          )}

          {employmentTypeText && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] leading-[14px] font-medium bg-sunken/60 text-ink-soft">
              {employmentTypeText}
            </span>
          )}
        </div>

        {/* Job Title (clamped to max 2 lines, safe text) */}
        <h3
          className="text-[17px] leading-[22px] font-semibold text-ink line-clamp-2 mb-1.5"
          title={job.title}
        >
          {job.title}
        </h3>

        {/* Company and Location */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-[20px] mb-4">
          <span className="font-medium text-ink">{job.company || "Unknown company"}</span>
          {job.location && (
            <>
              <span className="text-ink-soft" aria-hidden="true">·</span>
              <span className="text-ink-soft inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span className="truncate max-w-[200px]">{job.location}</span>
              </span>
            </>
          )}
        </div>

        {/* Match Meter box */}
        <div className="p-3 rounded-[8px] bg-sunken/40 border border-rule/60 mb-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-ink">
              <TierIcon className={cn("w-4 h-4 shrink-0", tierIconClass)} aria-hidden="true" />
              <span>{tierLabel}</span>
            </span>
            <span className="text-[13px] leading-[18px] font-semibold tabular-nums text-ink">
              {clampedScore}% match
            </span>
          </div>

          {/* Thin ink bar */}
          <div
            className="w-full h-1.5 bg-sunken rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={clampedScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${clampedScore}% match`}
          >
            <div
              className="h-full bg-ink rounded-full transition-all duration-300"
              style={{ width: `${clampedScore}%` }}
            />
          </div>

          {/* Single line matchReason */}
          {job.matchReason && (
            <p
              className="text-[12px] leading-[16px] text-ink-soft truncate mt-1.5"
              title={job.matchReason}
            >
              {job.matchReason}
            </p>
          )}
        </div>

        {/* Snippet text */}
        {snippet && (
          <div className="text-[13px] leading-[20px] text-ink-soft mb-4">
            <p
              className={cn(
                "transition-all",
                isExpanded ? "line-clamp-none" : "line-clamp-3"
              )}
              style={
                !isExpanded
                  ? {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: JOB_SNIPPET_COLLAPSED_LINES,
                      overflow: "hidden",
                    }
                  : undefined
              }
            >
              {snippet}
            </p>
            {isSnippetLong && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="mt-1 text-[12px] font-medium text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5 focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px]"
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? "Show less" : "Show more"}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer row: Pay & Posted time on left, Actions on right */}
      <div className="pt-3.5 border-t border-rule/60 flex flex-wrap items-center justify-between gap-3 mt-auto">
        <div className="flex flex-col min-w-0">
          {payText && (
            <span className="text-[13px] leading-[18px] font-medium tabular-nums text-ink truncate">
              {payText}
            </span>
          )}
          {postedText && (
            <span className="text-[12px] leading-[16px] tabular-nums text-ink-soft truncate">
              Posted {postedText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {job.trackedApplicationId ? (
            <div className="flex items-center gap-2 text-[13px] leading-[18px]">
              <span className="inline-flex items-center gap-1 font-medium text-ink-soft select-none">
                <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Tracked</span>
              </span>
              <span className="text-ink-soft/60" aria-hidden="true">·</span>
              <Link
                to={`/applications/${job.trackedApplicationId}`}
                className="font-medium text-primary hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px]"
              >
                View application
              </Link>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (typeof onOpenTrackDialog === "function") {
                  onOpenTrackDialog(job, resumeId);
                } else {
                  setIsLocalDialogOpen(true);
                }
              }}
              className="text-[13px]"
            >
              Track application
            </Button>
          )}

          <ApplyButton job={job} resumeId={resumeId} size="sm" />
        </div>
      </div>

      {/* Local fallback dialog if rendered standalone without parent dialog manager */}
      {isLocalDialogOpen && (
        <DidYouApplyDialog
          isOpen={isLocalDialogOpen}
          job={job}
          resumeId={resumeId}
          onClose={() => setIsLocalDialogOpen(false)}
        />
      )}
    </article>
  );
}

export default JobCard;
