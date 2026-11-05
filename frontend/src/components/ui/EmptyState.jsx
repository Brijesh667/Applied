/**
 * EmptyState component
 * Displays an inviting prompt when no records exist.
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function EmptyState({
  title = "No applications yet",
  description = "Add the first one to start your log.",
  action,
  className = "",
  headingTag: Heading = "h3",
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-[12px] bg-surface border border-rule",
        className
      )}
    >
      <Heading className="text-[18px] leading-[26px] font-bold text-ink mb-1">
        {title}
      </Heading>
      {description && (
        <p className="text-[14px] leading-[20px] text-ink-soft max-w-[420px] mb-4">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
