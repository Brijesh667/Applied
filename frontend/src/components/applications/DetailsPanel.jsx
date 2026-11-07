/**
 * DetailsPanel component
 * Displays application facts in a compact 2-column grid:
 * Platform | Applied on, Pay | Duration.
 * Followed by full-width rows for Job link, Skills, Description, and Notes.
 * Automatically hides any field without a value.
 */
import React from "react";
import { Link } from "react-router-dom";
import { formatDate, formatPay, splitSkills } from "../../lib/format.js";
import { useResumes } from "../../hooks/useResumes.js";
import { Skeleton } from "../ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";

function getHostname(urlStr) {
  try {
    const parsed = new URL(
      urlStr.startsWith("http") ? urlStr : `https://${urlStr}`
    );
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

export function DetailsPanel({ application, className = "" }) {
  if (!application) return null;

  const { data: resumesData, isLoading: isLoadingResumes } = useResumes();
  const resumesList = resumesData?.resumes || [];
  const linkedResume = application.resumeId
    ? resumesList.find((r) => (r._id || r.id) === application.resumeId)
    : null;

  const skills = splitSkills(application.skills);
  const formattedPay = formatPay(application.pay);

  // Collect active 2-column grid fields
  const gridFields = [];
  if (application.appliedFrom) {
    gridFields.push({
      key: "platform",
      label: "Platform",
      value: application.appliedFrom,
      isTnum: false,
    });
  }
  if (application.appliedDate) {
    gridFields.push({
      key: "appliedDate",
      label: "Applied on",
      value: formatDate(application.appliedDate),
      isTnum: true,
    });
  }
  if (formattedPay) {
    gridFields.push({
      key: "pay",
      label: "Pay",
      value: formattedPay,
      isTnum: true,
    });
  }
  if (application.duration) {
    gridFields.push({
      key: "duration",
      label: "Duration",
      value: application.duration,
      isTnum: false,
    });
  }

  const hasGridFields = gridFields.length > 0;

  return (
    <div
      className={cn(
        "rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none",
        className
      )}
    >
      <h2 className="text-[20px] leading-[26px] font-bold text-ink mb-4">
        Details
      </h2>

      {/* 2-column grid: Platform | Applied on, Pay | Duration */}
      {hasGridFields && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {gridFields.map((field) => (
            <div key={field.key} className="min-w-0">
              <dt className="text-[12px] leading-[16px] text-ink-soft font-medium">
                {field.label}
              </dt>
              <dd
                className={cn(
                  "text-[14px] leading-[20px] text-ink font-medium mt-0.5 truncate",
                  field.isTnum && "tnum"
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Full width rows: Job link, Skills, Description, Notes */}
      <dl className="space-y-3.5">
        {/* Job link: Clickable row showing host + external-link icon */}
        {application.jobLink && (
          <div className={cn(hasGridFields && "pt-3.5 border-t border-rule/60")}>
            <dt className="text-[12px] leading-[16px] text-ink-soft font-medium mb-1">
              Job link
            </dt>
            <dd className="text-[14px] leading-[20px]">
              <a
                href={
                  application.jobLink.startsWith("http")
                    ? application.jobLink
                    : `https://${application.jobLink}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 rounded-[4px] break-all"
              >
                <span>{getHostname(application.jobLink)}</span>
              </a>
            </dd>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div
            className={cn(
              (hasGridFields || application.jobLink) &&
                "pt-3.5 border-t border-rule/60"
            )}
          >
            <dt className="text-[12px] leading-[16px] text-ink-soft font-medium mb-1.5">
              Skills
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-0.5 rounded-full text-[12px] leading-[16px] border border-rule text-ink-soft select-none"
                >
                  {skill}
                </span>
              ))}
            </dd>
          </div>
        )}

        {/* Description */}
        {application.description && (
          <div
            className={cn(
              (hasGridFields || application.jobLink || skills.length > 0) &&
                "pt-3.5 border-t border-rule/60"
            )}
          >
            <dt className="text-[12px] leading-[16px] text-ink-soft font-medium mb-1">
              Description
            </dt>
            <dd className="text-[14px] leading-[20px] text-ink whitespace-pre-wrap break-words max-w-[65ch]">
              {application.description}
            </dd>
          </div>
        )}

        {/* Notes */}
        {application.notes && (
          <div
            className={cn(
              (hasGridFields ||
                application.jobLink ||
                skills.length > 0 ||
                application.description) &&
                "pt-3.5 border-t border-rule/60"
            )}
          >
            <dt className="text-[12px] leading-[16px] text-ink-soft font-medium mb-1">
              Notes
            </dt>
            <dd className="text-[14px] leading-[20px] text-ink-soft whitespace-pre-wrap break-words max-w-[65ch]">
              {application.notes}
            </dd>
          </div>
        )}

        {/* Resume used */}
        {application.resumeId && (
          <div
            className={cn(
              (hasGridFields ||
                application.jobLink ||
                skills.length > 0 ||
                application.description ||
                application.notes) &&
                "pt-3.5 border-t border-rule/60"
            )}
          >
            <dt className="text-[12px] leading-[16px] text-ink-soft font-medium mb-1">
              Resume used
            </dt>
            <dd className="text-[14px] leading-[20px]">
              {isLoadingResumes ? (
                <Skeleton className="h-5 w-32 rounded-[4px]" />
              ) : linkedResume ? (
                <Link
                  to="/resumes"
                  className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 rounded-[4px]"
                >
                  {linkedResume.label || linkedResume.fileName}
                </Link>
              ) : null}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default DetailsPanel;
