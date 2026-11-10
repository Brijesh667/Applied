import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn.js";
import {
  CURRENCY,
  PAY_LABELS,
} from "../../lib/constants.js";
import { useCardFx } from "../../hooks/useCardFx.js";
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
  if (typeof job.pay?.amount === "number" && job.pay.amount > 0) {
    return `${CURRENCY}${formatter.format(job.pay.amount)}${typeLabel}`;
  }
  if (typeof job.payMin === "number") {
    return `From ${CURRENCY}${formatter.format(job.payMin)}${typeLabel}`;
  }
  if (typeof job.payMax === "number") {
    return `Up to ${CURRENCY}${formatter.format(job.payMax)}${typeLabel}`;
  }
  if (job.salaryText && typeof job.salaryText === "string") {
    return job.salaryText;
  }
  return null;
}

/**
 * Format posted time in short form ("Today", "Yesterday", "3d ago").
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
  return `${diffDays}d ago`;
}

/**
 * Format employment type enum into sentence case label.
 */
function formatEmploymentType(type) {
  if (!type || type === "unknown") return null;
  const map = {
    full_time: "Full-time",
    fulltime: "Full-time",
    part_time: "Part-time",
    parttime: "Part-time",
    contract: "Contract",
    internship: "Internship",
  };
  return map[type] || type.replace(/_/g, " ");
}

/**
 * Compact circular SVG progress ring in ink color with percentage inside.
 * Accessible name: "<n> percent match".
 */
export function MatchRing({ score = 0, className = "" }) {
  const clamped = Math.min(Math.max(Math.round(score || 0), 0), 100);
  // Radius 15.9155 gives circumference exactly 100
  const radius = 15.9155;
  const circumference = 100;
  const offset = circumference - (clamped * circumference) / 100;

  return (
    <div
      role="img"
      aria-label={`${clamped} percent match`}
      className={cn("relative inline-flex items-center justify-center shrink-0 w-10 h-10 select-none", className)}
    >
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 38 38" aria-hidden="true">
        {/* Background track circle */}
        <circle
          cx="19"
          cy="19"
          r={radius}
          className="stroke-rule text-rule"
          strokeWidth="2.5"
          fill="none"
        />
        {/* Progress indicator circle */}
        <circle
          cx="19"
          cy="19"
          r={radius}
          className="stroke-ink transition-[stroke-dashoffset] duration-500 ease-out"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] leading-none font-semibold tabular-nums text-ink">
        {clamped}%
      </span>
    </div>
  );
}

/**
 * JobCard component
 * Clear hierarchy, premium paper-and-ink styling, no duplicated info:
 * 1. Header: title (max 2 lines, semibold) + MatchRing on the right
 * 2. Company line: company and location on one line (truncate), plus "Remote" chip when remote === true
 * 3. Meta row (muted, small, wraps): pay/salaryText, job type, posted time, source attribution
 * 4. One-line match reason (muted, single line truncated, no label)
 * 5. Snippet: plain text, clamped to 3 lines, no toggle
 * 6. Footer: primary "Apply" button and secondary "Track" button (or "Tracked" + "View")
 */
export function JobCard({
  job,
  resumeId,
  className = "",
  onOpenTrackDialog,
}) {
  const [isLocalDialogOpen, setIsLocalDialogOpen] = React.useState(false);
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: false });

  if (!job) return null;

  const score = typeof job.matchScore === "number" ? job.matchScore : 0;
  const payText = formatJobPay(job);
  const postedText = formatPostedDays(job.postedAt);
  const jobTypeText = formatEmploymentType(job.jobType || job.employmentType);
  const snippet = job.snippet || "";

  // Build meta row facts (separated by middle-dot)
  const metaItems = [];
  if (payText) {
    metaItems.push({ key: "pay", text: payText });
  }
  if (jobTypeText) {
    metaItems.push({ key: "type", text: jobTypeText });
  }
  if (postedText) {
    metaItems.push({ key: "posted", text: postedText });
  }

  // Attribution or platform
  const hasAttribution = Boolean(job.attribution?.name);

  return (
    <article
      id={`job-card-${job.id}`}
      data-job-card-id={job.id}
      tabIndex={-1}
      ref={cardRef}
      {...handlers}
      className={cn(
        "relative rounded-xl bg-surface border border-rule p-4 sm:p-5 select-none flex flex-col h-full justify-between transition-colors",
        "hover:border-ink/20 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {/* 1. Header: Title (max 2 lines, semibold) + MatchRing */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <h3
            className="text-[16px] sm:text-[17px] leading-[22px] sm:leading-[24px] font-semibold text-ink line-clamp-2 min-w-0 flex-1 break-words"
            title={job.title}
          >
            {job.title}
          </h3>
          <MatchRing score={score} />
        </div>

        {/* 2. Company line: company and location on one line, plus Remote chip */}
        <div className="flex items-center gap-1.5 text-[14px] leading-[20px] text-ink-soft min-w-0 mt-1">
          <span className="truncate min-w-0 text-ink-soft" title={`${job.company || "Unknown Company"}${job.location ? ` · ${job.location}` : ""}`}>
            <span className="text-ink font-medium">{job.company || "Unknown Company"}</span>
            {job.location && (
              <span className="text-ink-soft"> · {job.location}</span>
            )}
          </span>
          {job.remote === true && (
            <span className="px-1.5 py-0.5 rounded text-[11px] leading-[14px] font-medium bg-sunken text-ink-soft border border-rule/50 shrink-0">
              Remote
            </span>
          )}
        </div>

        {/* 3. Meta row (muted, small, wraps cleanly) */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-[18px] text-ink-soft mt-2.5">
          {metaItems.map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && (
                <span className="text-rule select-none" aria-hidden="true">
                  ·
                </span>
              )}
              <span className={cn(item.key === "pay" && "tabular-nums font-medium text-ink")}>
                {item.text}
              </span>
            </React.Fragment>
          ))}

          {/* Middle dot before source if metaItems exist */}
          {metaItems.length > 0 && (
            <span className="text-rule select-none" aria-hidden="true">
              ·
            </span>
          )}

          {/* Source: attribution as "via <name>" link when present, otherwise platform */}
          {hasAttribution ? (
            job.attribution.url && /^https?:\/\//i.test(job.attribution.url) ? (
              <a
                href={job.attribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft hover:text-ink underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[2px]"
                onClick={(e) => e.stopPropagation()}
              >
                via {job.attribution.name}
              </a>
            ) : (
              <span>via {job.attribution.name}</span>
            )
          ) : (
            <span>{job.platform || "Adzuna"}</span>
          )}
        </div>

        {/* 4. One-line match reason (muted, single line, truncated, no label) */}
        {job.matchReason && (
          <p
            className="text-[12px] leading-[16px] text-ink-soft truncate mt-2.5"
            title={job.matchReason}
          >
            {job.matchReason}
          </p>
        )}

        {/* 5. Snippet: plain text, clamped to 3 lines, no toggle */}
        {snippet && (
          <p className="text-[13px] leading-[20px] text-ink-soft line-clamp-3 mt-2 break-words">
            {snippet}
          </p>
        )}
      </div>

      {/* 6. Footer: Track button (or Tracked + View) and Apply button */}
      <div className="border-t border-rule mt-4 pt-3 flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {job.trackedApplicationId ? (
            <div className="flex items-center gap-1.5 text-[13px] leading-[18px]">
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink select-none shrink-0">
                <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Tracked</span>
              </span>
              <span className="text-rule select-none" aria-hidden="true">
                ·
              </span>
              <Link
                to={`/applications/${job.trackedApplicationId}`}
                className="font-medium text-primary hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px] text-[13px] truncate"
              >
                View
              </Link>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpenTrackDialog === "function") {
                  onOpenTrackDialog(job, resumeId);
                } else {
                  setIsLocalDialogOpen(true);
                }
              }}
              className="text-[13px] h-8 px-3"
            >
              Track
            </Button>
          )}
        </div>

        <div className="shrink-0">
          <ApplyButton job={job} resumeId={resumeId} size="sm" />
        </div>
      </div>

      {/* Fallback dialog if rendered standalone */}
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
