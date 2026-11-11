import React from "react";
import { cn } from "../../lib/cn.js";
import { Skeleton } from "../ui/Skeleton.jsx";

/**
 * JobCardSkeleton component
 * Displays a placeholder card matching JobCard dimensions and token styling.
 */
export function JobCardSkeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative rounded-[12px] bg-surface border border-rule p-4 sm:p-5 select-none flex flex-col h-full justify-between overflow-hidden min-h-[300px]",
        className
      )}
    >
      <div>
        {/* Header row: Title + MatchBadge skeleton */}
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-3/5 rounded-[4px]" />
          <Skeleton className="h-7 w-24 rounded-full shrink-0" />
        </div>

        {/* Company & Location row */}
        <div className="flex items-center gap-2 mt-1.5 min-h-[20px]">
          <Skeleton className="h-4 w-28 rounded-[4px]" />
          <Skeleton className="h-4 w-20 rounded-[4px]" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2.5 min-h-[20px]">
          <Skeleton className="h-4 w-16 rounded-[4px]" />
          <Skeleton className="h-4 w-24 rounded-[4px]" />
          <Skeleton className="h-4 w-20 rounded-[4px]" />
        </div>

        {/* Skills row */}
        <div className="h-[26px] mt-3 flex items-center gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        {/* Match meter box */}
        <div className="mt-3.5 space-y-2 p-3 rounded-[8px] bg-sunken/40 border border-rule/50">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-[4px]" />
            <Skeleton className="h-4 w-16 rounded-[4px]" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-3/4 rounded-[4px]" />
        </div>

        {/* Snippet preview */}
        <div className="mt-3 space-y-1.5 mb-2">
          <Skeleton className="h-3.5 w-full rounded-[4px]" />
          <Skeleton className="h-3.5 w-4/5 rounded-[4px]" />
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-rule mt-auto pt-3.5 min-h-[56px] flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-28 rounded-[8px]" />
        <Skeleton className="h-8 w-20 rounded-[8px]" />
      </div>
    </div>
  );
}

export default JobCardSkeleton;