/**
 * Avatar component
 * Displays user's initials in a circular badge.
 * Strictly decorative (aria-hidden="true").
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function getInitials(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function Avatar({ name = "", size = "md", className = "" }) {
  const initials = getInitials(name) || "U";

  const sizes = {
    sm: "w-8 h-8 text-[12px] leading-none",
    md: "w-10 h-10 text-[14px] leading-none",
  };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-sunken text-ink border border-rule font-bold tracking-normal select-none shrink-0",
        sizes[size] || sizes.md,
        className
      )}
    >
      {initials}
    </span>
  );
}

export default Avatar;
