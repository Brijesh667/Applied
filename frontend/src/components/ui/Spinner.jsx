/**
 * Spinner component
 * Accessible, token-styled loading indicator.
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function Spinner({ size = "md", className = "", ...props }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-5 h-5 border-2",
    lg: "w-6 h-6 border-[2.5px]",
  };

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full border-current border-t-transparent animate-spin",
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </span>
  );
}

export default Spinner;
