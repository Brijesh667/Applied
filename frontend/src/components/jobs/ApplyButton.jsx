import React from "react";
import { ExternalLink } from "lucide-react";
import { Button as MovingBorderButton } from "../../registry/aceternity-ui/moving-border.jsx";
import { cn } from "../../lib/cn.js";

/**
 * ApplyButton component
 * Opens the external job posting in a new tab with security attributes and animated moving border.
 * Strictly validates http:// or https:// prefix; if invalid, renders nothing.
 */
export function ApplyButton({
  job,
  applyUrl,
  resumeId,
  className = "",
  size = "sm",
}) {
  const url = (job?.applyUrl || applyUrl || "").trim();

  // Validate http/https prefix
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return null;
  }

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
    <MovingBorderButton
      as="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={accessibleLabel}
      duration={3000}
      borderRadius="0.5rem"
      containerClassName={cn(
        "h-8 w-24 select-none cursor-pointer inline-flex",
        size === "md" && "h-10 w-28",
        className
      )}
      className="bg-slate-900 text-white dark:bg-zinc-900 border-slate-700/80 text-[14px] font-medium gap-1.5 px-3 py-1 hover:text-white"
    >
      <span>Apply</span>
      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden="true" />
    </MovingBorderButton>
  );
}

export default ApplyButton;
