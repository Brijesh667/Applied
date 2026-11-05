/**
 * BackLink component
 * Accessible back navigation link.
 */
import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn.js";

export function BackLink({ to, children, className = "" }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center text-[14px] leading-[20px] font-medium text-ink-soft hover:text-ink transition-colors mb-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 rounded-[6px] select-none",
        className
      )}
    >
      <span>{children}</span>
    </Link>
  );
}

export default BackLink;
