/**
 * PageHeader component
 * Accessible, token-styled page header with title (rendered as h1),
 * optional description, optional meta slot (e.g. StatusBadge), and responsive actions slot.
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[28px] leading-[34px] font-bold text-ink tracking-[-0.015em]">
          {title}
        </h1>
        {description && (
          <p className="text-[16px] leading-[24px] text-ink-soft max-w-[65ch] mt-1">
            {description}
          </p>
        )}
        {meta && <div className="mt-2.5">{meta}</div>}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0 sm:self-auto self-start">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
