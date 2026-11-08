import React from "react";
import { cn } from "../../lib/cn.js";
import { Skeleton } from "../ui/Skeleton.jsx";

/**
 * JobCardSkeleton component
 * Displays a placeholder card matching the JobCard dimensions and token styling.
 */
export function JobCardSkeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-surface border border-rule rounded-[12px] p-5 flex flex-col justify-between min-h-[260px]",
        className
      )}
    >
      <div>
        {/* Top meta: Platform & Remote pills */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Title: 2 lines */}
        <Skeleton className="h-5 w-4/5 rounded mb-2" />
        <Skeleton className="h-4 w-1/2 rounded mb-3" />

        {/* Company & Location */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        {/* Match meter */}
        <div className="space-y-1.5 p-3 rounded-[8px] bg-sunken/40 border border-rule/50 mb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-3/4 rounded" />
        </div>

        {/* Snippet preview */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
        </div>
      </div>

      {/* Footer: Pay/Date & Apply button */}
      <div className="mt-5 pt-4 border-t border-rule/60 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-8 w-20 rounded-[8px]" />
      </div>
    </div>
  );
}

export default JobCardSkeleton;
