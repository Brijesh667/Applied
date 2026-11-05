/**
 * DueChip component
 * Formats deadline proximity into strict state-based color chips:
 * - Missed (days < 0): danger-bg + danger text + 1px border-danger/25
 * - Today / This week (0 <= days <= 7): primary background + on-primary text (no border)
 * - Later (days > 7): neutral surface + ink-soft text + rule border
 *
 * Rules:
 * - Status is shown by text label, never color alone; chips have no icons.
 * - Shared chip size: height 28px, fixed min-width 140px on desktop/tablet (shrinks on mobile with min-w-0).
 */
import React from "react";
import { cn } from "../../lib/cn.js";
import { daysUntil, dueText } from "../../lib/format.js";

export function DueChip({
  deadline,
  children,
  inMissedGroup = false,
  className = "",
}) {
  if (!deadline && !children) return null;

  const days = deadline ? daysUntil(deadline) : 0;
  const text = children || dueText(deadline, { inMissedGroup });
  const hasCustomMinW = className.includes("min-w-");

  let stateClasses = "";

  if (days < 0) {
    // Missed
    stateClasses = "bg-danger-bg text-danger border border-danger/25 font-medium";
  } else if (days <= 7) {
    // Today or within 7 days (time emphasis primary)
    stateClasses = "bg-primary text-on-primary font-medium shadow-none";
  } else {
    // Later
    stateClasses = "bg-surface text-ink-soft border border-rule";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[12px] leading-[16px] tnum select-none shrink-0 whitespace-nowrap text-center",
        !hasCustomMinW && "min-w-[140px] max-sm:min-w-0",
        stateClasses,
        className
      )}
    >
      <span>{text}</span>
    </span>
  );
}

export default DueChip;
