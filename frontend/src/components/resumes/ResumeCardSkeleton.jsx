/**
 * ResumeCardSkeleton component
 * Flat skeleton placeholder for loading resumes list.
 */
import React from "react";
import { Skeleton } from "../ui/Skeleton.jsx";

export function ResumeCardSkeleton() {
  return (
    <div className="rounded-[12px] bg-surface border border-rule p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48 rounded-[4px]" />
            <Skeleton className="h-4 w-64 rounded-[4px]" />
          </div>
          <Skeleton className="h-8 w-8 rounded-[8px]" />
        </div>

        <div className="mt-4 pt-3.5 border-t border-rule/60 space-y-2.5">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-52 rounded-[4px]" />
        </div>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between border-t border-rule/60">
        <Skeleton className="h-4 w-20 rounded-[4px]" />
        <Skeleton className="h-4 w-12 rounded-[4px]" />
      </div>
    </div>
  );
}

export default ResumeCardSkeleton;
