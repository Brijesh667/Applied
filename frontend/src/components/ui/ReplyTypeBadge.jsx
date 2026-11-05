/**
 * ReplyTypeBadge component
 * Neutral pill badge displaying the reply type (text only, no icon).
 * Shared chip size: height 28px, fixed min-width 104px to fit longest label ("Assessment").
 */
import React from "react";
import { cn } from "../../lib/cn.js";
import { REPLY_LABELS } from "../../lib/constants.js";

export function ReplyTypeBadge({ type, className = "" }) {
  const label = REPLY_LABELS[type] || type;
  const hasCustomMinW = className.includes("min-w-");

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[12px] leading-[16px] font-medium bg-sunken text-ink border border-rule/60 select-none shrink-0 whitespace-nowrap text-center",
        !hasCustomMinW && "min-w-[104px]",
        className
      )}
    >
      <span>{label}</span>
    </span>
  );
}

export default ReplyTypeBadge;
