/**
 * Logo component
 * Clean brand wordmark in ink. No dot, mark, swipe, or underline.
 */
import React from "react";
import { APP_NAME } from "../../lib/brand.js";
import { cn } from "../../lib/cn.js";

export function Logo({ size = "md", className = "" }) {
  const sizes = {
    sm: "text-[20px] leading-[24px]",
    md: "text-[24px] leading-[28px]",
    lg: "text-[32px] leading-[38px]",
  };

  return (
    <span
      className={cn(
        "font-bold tracking-tight text-ink select-none inline-block",
        sizes[size] || sizes.md,
        className
      )}
    >
      {APP_NAME}
    </span>
  );
}

export default Logo;
