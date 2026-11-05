/**
 * StatusBadge component
 * Displays application status with token colors and text label (text only, no icon).
 * Status is shown by text label, never color alone.
 * Shared chip size: height 28px, fixed min-width 92px to fit longest label ("In process").
 */
import React from "react";
import { cn } from "../../lib/cn.js";
import { STATUS_LABELS } from "../../lib/constants.js";

const STATUS_CLASSES = {
  applied: "bg-[var(--color-status-applied-bg)] text-[var(--color-status-applied-fg)]",
  "in-process": "bg-[var(--color-status-in-process-bg)] text-[var(--color-status-in-process-fg)]",
  offer: "bg-[var(--color-status-offer-bg)] text-[var(--color-status-offer-fg)]",
  rejected: "bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected-fg)]",
};

export function StatusBadge({ status, className = "" }) {
  const label = STATUS_LABELS[status] || status;
  const colorClass = STATUS_CLASSES[status] || STATUS_CLASSES.applied;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[12px] leading-[16px] font-medium select-none shrink-0 whitespace-nowrap text-center min-w-[92px]",
        colorClass,
        className
      )}
    >
      <span>{label}</span>
    </span>
  );
}

export default StatusBadge;
