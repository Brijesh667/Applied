/**
 * Skeleton component
 * Placeholder loader styled in sunken tone with motion-respecting pulse.
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-sunken rounded-[8px] animate-pulse motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
