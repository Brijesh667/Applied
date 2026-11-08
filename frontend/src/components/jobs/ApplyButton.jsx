import React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "../../lib/cn.js";

/**
 * ApplyButton component
 * Opens the external job posting in a new tab with security attributes.
 * Strictly validates http:// or https:// prefix; if invalid, renders nothing.
 */
export function ApplyButton({
  job,
  applyUrl,
  resumeId,
  className = "",
  variant = "primary",
  size = "sm",
}) {
  const url = (job?.applyUrl || applyUrl || "").trim();

  // Validate http/https prefix
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return null;
  }

  const isPrimary = variant === "primary";

  const sizeStyles = {
    sm: "h-8 px-3 text-[14px] leading-[20px] gap-1.5",
    md: "h-10 px-4 text-[16px] leading-[24px] gap-2",
  };

  const variantStyles = isPrimary
    ? "bg-primary text-on-primary hover:bg-primary-hover border border-transparent"
    : "bg-surface text-ink border border-rule hover:bg-sunken";

  const company = job?.company || "";
  const title = job?.title || "";
  const accessibleLabel =
    company && title
      ? `Apply for ${title} at ${company} (opens in new tab)`
      : "Apply for job (opens in new tab)";

  const handleClick = () => {
    if (job?.id && resumeId && typeof window !== "undefined" && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(
          "applied_pending_apply",
          JSON.stringify({
            jobId: job.id,
            resumeId,
            at: Date.now(),
          })
        );
      } catch {}
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={accessibleLabel}
      className={cn(
        "select-none relative inline-flex items-center justify-center font-medium rounded-[8px] cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        sizeStyles[size] || sizeStyles.sm,
        variantStyles,
        className
      )}
    >
      <span>Apply</span>
      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden="true" />
    </a>
  );
}

export default ApplyButton;
