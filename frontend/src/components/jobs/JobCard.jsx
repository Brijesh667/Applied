import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  CheckCircle2,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Check,
} from "lucide-react";
import { cn } from "../../lib/cn.js";
import {
  CURRENCY,
  PAY_LABELS,
  JOB_STRONG_MATCH_MIN,
  JOB_GOOD_MATCH_MIN,
  JOB_SNIPPET_COLLAPSED_LINES,
} from "../../lib/constants.js";
import { splitSkills } from "../../lib/format.js";
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
 * Extract or derive skills/tags for the skills row pill presentation.
 */
function getCardSkills(job, resumeSkills = []) {
  if (!job) return [];

  // 1. Explicit job.skills array or comma-separated string
  if (Array.isArray(job.skills) && job.skills.length > 0) {
    return job.skills.filter(Boolean);
  }
  if (typeof job.skills === "string" && job.skills.trim()) {
    return splitSkills(job.skills);
  }

  // 2. Cross-reference candidate's resume skills with job content
  if (Array.isArray(resumeSkills) && resumeSkills.length > 0) {
    const textToScan = `${job.title || ""} ${job.matchReason || ""} ${job.snippet || ""}`.toLowerCase();
    const matched = [];
    for (const rawSkill of resumeSkills) {
      if (!rawSkill || typeof rawSkill !== "string") continue;
      const clean = rawSkill.trim();
      if (!clean) continue;
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
      if (regex.test(textToScan)) {
        matched.push(clean);
      }
    }
    if (matched.length > 0) {
      return matched;
    }
  }

  // 3. Fallback: key descriptive tags
  const tags = [];
  if (job.platform) tags.push(job.platform);
  if (job.remote) tags.push("Remote");
  const emp = formatEmploymentType(job.employmentType);
  if (emp) tags.push(emp);
  return tags;
}

/**
 * Top MatchBadge component matching ApplicationCard's StatusBadge form factor (h-7, min-w-[92px]).
 */
function MatchBadge({ score }) {
  const clamped = Math.min(Math.max(Math.round(score || 0), 0), 100);

  if (clamped >= JOB_STRONG_MATCH_MIN) {
    return (
      <span
        role="status"
        aria-label={`${clamped}% match, Strong match`}
        className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] leading-[16px] font-medium select-none shrink-0 whitespace-nowrap text-center min-w-[92px] bg-[var(--color-status-offer-bg)] text-[var(--color-status-offer-fg)]"
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{clamped}% match</span>
      </span>
    );
  }

  if (clamped >= JOB_GOOD_MATCH_MIN) {
    return (
      <span
        role="status"
        aria-label={`${clamped}% match, Good match`}
        className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] leading-[16px] font-medium select-none shrink-0 whitespace-nowrap text-center min-w-[92px] bg-[var(--color-status-in-process-bg)] text-[var(--color-status-in-process-fg)]"
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{clamped}% match</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={`${clamped}% match, Weak match`}
      className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] leading-[16px] font-medium select-none shrink-0 whitespace-nowrap text-center min-w-[92px] bg-[var(--color-status-applied-bg)] text-[var(--color-status-applied-fg)]"
    >
      <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{clamped}% match</span>
    </span>
  );
}

/**
 * JobCard component
 * Crafted with the exact premium standards of ApplicationCard:
 * - 3D tilt & cursor glow spotlight physics (useCardFx)
 * - Structured header: Job title + Status-standard MatchBadge
 * - Subheader: Company name & MapPin location
 * - Meta row with middle dot separators: platform, pay, employment type, posted date
 * - Single-row skills pills (max 3 + "+N more")
 * - Integrated sleek match meter with AI reason insight
 * - Collapsible snippet preview
 * - Equal-height flex layout with mt-auto 1px bordered action footer
 */
export function JobCard({
  job,
  resumeId,
  resumeSkills = [],
  className = "",
  onOpenTrackDialog,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocalDialogOpen, setIsLocalDialogOpen] = useState(false);
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });

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
    tierIconClass = "text-[var(--color-status-offer-fg)]";
  } else if (clampedScore >= JOB_GOOD_MATCH_MIN) {
    TierIcon = CheckCircle2;
    tierLabel = "Good match";
    tierIconClass = "text-[var(--color-status-in-process-fg)]";
  }

  const payText = formatJobPay(job);
  const postedText = formatPostedDays(job.postedAt);
  const employmentTypeText = formatEmploymentType(job.employmentType);
  const snippet = job.snippet || "";
  const isSnippetLong = snippet.length > 150;
  const skills = useMemo(() => getCardSkills(job, resumeSkills), [job, resumeSkills]);

  // Build meta items with middle-dot separators
  const metaItems = [];
  if (job.platform) {
    metaItems.push({
      key: "platform",
      text: job.platform,
    });
  }
  if (payText) {
    metaItems.push({
      key: "pay",
      text: payText,
      isPay: true,
    });
  }
  if (employmentTypeText) {
    metaItems.push({
      key: "employmentType",
      text: employmentTypeText,
    });
  }
  if (postedText) {
    metaItems.push({
      key: "postedAt",
      text: `Posted ${postedText}`,
    });
  }

  return (
    <article
      ref={cardRef}
      {...handlers}
      className={cn(
        "app-card card-fx card-fx-tilt relative rounded-[12px] bg-surface border border-rule p-4 sm:p-5 select-none flex flex-col h-full justify-between transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--outline-focus)] has-[:focus-visible]:outline-offset-2",
        className
      )}
    >
      <div className="relative z-[1] min-w-0">
        {/* 1. Header: Job title (left) + MatchBadge (right) */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <h3
            className="text-[17px] sm:text-[18px] leading-[23px] sm:leading-[24px] font-bold text-ink line-clamp-2 min-w-0 flex-1"
            title={job.title}
          >
            {job.title}
          </h3>
          <MatchBadge score={clampedScore} />
        </div>

        {/* 2. Subheader: Company name, location, and remote chip */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-[20px] text-ink-soft mt-1.5 min-h-[20px]">
          <span className="font-semibold text-ink truncate max-w-[220px]">
            {job.company || "Unknown Company"}
          </span>
          {job.location && (
            <>
              <span className="text-rule select-none" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-1 truncate text-ink-soft">
                <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span className="truncate max-w-[180px]">{job.location}</span>
              </span>
            </>
          )}
          {job.remote && (
            <>
              <span className="text-rule select-none" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] leading-[14px] font-medium bg-primary-soft text-primary shrink-0">
                Remote
              </span>
            </>
          )}
        </div>

        {/* 3. Meta facts row with middle-dot separators */}
        {metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[18px] text-ink-soft mt-2.5 min-h-[20px]">
            {metaItems.map((item, idx) => (
              <React.Fragment key={item.key}>
                {idx > 0 && (
                  <span className="text-rule select-none" aria-hidden="true">
                    ·
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center shrink-0",
                    item.isPay && "tnum font-semibold text-ink"
                  )}
                >
                  {item.text}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* 4. Skills: single row, max 3 chips + "+N more" (matches ApplicationCard) */}
        {skills.length > 0 && (
          <div
            className="h-[26px] mt-3 flex items-center gap-1.5 overflow-hidden flex-nowrap"
            aria-label="Matched skills and tags"
          >
            {skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] border border-rule text-ink-soft bg-surface truncate shrink-0 max-w-[130px]"
                title={skill}
              >
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] border border-rule text-ink-soft shrink-0">
                +{skills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* 5. Match meter box with progress bar & AI reason */}
        <div className="mt-3.5 p-3 rounded-[8px] bg-sunken/40 border border-rule/60">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-ink">
              <TierIcon className={cn("w-4 h-4 shrink-0", tierIconClass)} aria-hidden="true" />
              <span>{tierLabel}</span>
            </span>
            <span className="text-[13px] leading-[18px] font-semibold tabular-nums text-ink">
              {clampedScore}% match
            </span>
          </div>

          {/* Thin progress bar */}
          <div
            className="w-full h-1.5 bg-sunken rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={clampedScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${clampedScore}% match`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                clampedScore >= JOB_STRONG_MATCH_MIN
                  ? "bg-[var(--color-status-offer-fg)]"
                  : clampedScore >= JOB_GOOD_MATCH_MIN
                  ? "bg-primary"
                  : "bg-ink"
              )}
              style={{ width: `${clampedScore}%` }}
            />
          </div>

          {/* Match insight single line */}
          {job.matchReason && (
            <p
              className="text-[12px] leading-[16px] text-ink-soft truncate mt-1.5"
              title={job.matchReason}
            >
              <span className="font-medium text-ink">Match insight:</span> {job.matchReason}
            </p>
          )}
        </div>

        {/* 6. Snippet text with expand/collapse */}
        {snippet && (
          <div className="text-[13px] leading-[20px] text-ink-soft mt-3 mb-2">
            <p
              className={cn(
                "transition-all",
                isExpanded ? "line-clamp-none" : "line-clamp-2"
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
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
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

      {/* 7. Footer: 1px top rule, mt-auto, min-h-[56px], action buttons */}
      <div className="relative z-10 border-t border-rule mt-auto pt-3.5 min-h-[56px] flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {job.trackedApplicationId ? (
            <div className="flex items-center gap-2 text-[13px] leading-[18px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[var(--color-status-applied-bg)] text-[var(--color-status-applied-fg)] border border-rule/50 select-none shrink-0">
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
                View application &rarr;
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
              Track application
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
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