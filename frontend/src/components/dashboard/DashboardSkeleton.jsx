/**
 * DashboardSkeleton component
 * Matches the redesigned Dashboard layout:
 * - 5-box KPI strip skeleton
 * - Two-column main area: Needs attention (2/3) + Status & Replies (1/3)
 * - Full-width Where you applied table skeleton
 */
import React from "react";
import { Skeleton } from "../ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";

export function DashboardSkeleton({ className = "" }) {
  return (
    <div className={cn("space-y-8", className)} aria-label="Loading dashboard">
      {/* 1. 5 separate KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "p-4 rounded-[12px] bg-surface border border-rule min-h-[104px] sm:min-h-[116px] flex flex-col justify-between",
              i === 4 && "col-span-2 md:col-span-1"
            )}
          >
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28 mt-1.5" />
            </div>
            <Skeleton className="h-8 w-14 mt-2 sm:mt-2.5" />
          </div>
        ))}
      </div>

      {/* 2. Main area, 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Needs attention skeleton (2/3) */}
        <div className="lg:col-span-2 rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-rule/60">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Box 1: This week */}
            <div className="p-3 sm:p-4 rounded-[10px] border border-rule space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-14 w-full rounded-[8px]" />
              <Skeleton className="h-14 w-full rounded-[8px]" />
            </div>

            {/* Box 2: Missed */}
            <div className="p-3 sm:p-4 rounded-[10px] border border-rule space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-14 w-full rounded-[8px]" />
            </div>
          </div>

          <div className="pt-3 border-t border-rule/60">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Right column: Status & Replies (1/3) */}
        <div className="space-y-8">
          {/* Status skeleton */}
          <div className="rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="space-y-2.5 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <Skeleton className="h-7 w-[92px] rounded-full" />
                  <Skeleton className="h-5 w-8" />
                </div>
              ))}
            </div>
          </div>

          {/* Replies skeleton */}
          <div className="rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
            <Skeleton className="h-7 w-36" />
            <div className="space-y-3 pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-7 w-[104px] rounded-full" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-5 w-6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom area: Where you applied (1/3) + Recent applications (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Where you applied skeleton (1/3) */}
        <div className="lg:col-span-1 min-w-0 rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rule/60">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-rule/40 last:border-b-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent applications skeleton (2/3) */}
        <div className="lg:col-span-2 min-w-0 rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rule/60">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-2.5 border-b border-rule/40 last:border-b-0"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <Skeleton className="h-7 w-[92px] rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
