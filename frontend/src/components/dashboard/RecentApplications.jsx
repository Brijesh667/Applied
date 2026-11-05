/**
 * RecentApplications component
 * Shows the latest 5 applications on the Dashboard:
 * - Header: "Recent applications" with "View all" link -> /applications
 * - Each row links to /applications/:id with hover state
 * - Left: Company name (bold, truncate) + role (muted, truncate) on two lines
 * - Right: StatusBadge (shared fixed width 92px)
 * - Empty state: "Start your first application." + "Add application" button
 */
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { applicationsApi } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queryKeys.js";
import { useCardFx } from "../../hooks/useCardFx.js";
import { StatusBadge } from "../ui/StatusBadge.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";

export function RecentApplications({ className = "" }) {
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.applications.list({ limit: 5, sort: "latest" }),
    queryFn: () => applicationsApi.list({ limit: 5, sort: "latest" }),
  });

  const applications = data?.applications || [];

  return (
    <div
      ref={cardRef}
      {...handlers}
      className={cn(
        "card-fx card-fx-tilt rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none flex flex-col",
        className
      )}
      role="region"
      aria-label="Recent applications"
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-rule/60">
        <h2 className="text-[20px] sm:text-[22px] leading-[26px] sm:leading-[28px] font-bold text-ink">
          Recent applications
        </h2>
        <Link
          to="/applications"
          className="text-[14px] leading-[20px] font-semibold text-ink hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-ink rounded-[4px]"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
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
      ) : isError ? (
        <div className="py-6 text-center text-ink-soft text-[14px]">
          <p>Couldn&apos;t load recent applications.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-ink underline font-medium hover:opacity-80 cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="py-8 sm:py-10 text-center flex flex-col items-center justify-center">
          <p className="text-[14px] leading-[20px] text-ink-soft mb-4">
            Start your first application.
          </p>
          <Link
            to="/applications/new"
            className="inline-flex items-center justify-center font-medium transition-colors duration-120 rounded-[8px] cursor-pointer bg-ink text-paper hover:opacity-90 h-9 px-4 text-[14px] leading-[20px]"
          >
            Add application
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-rule/60 list-none p-0 m-0">
          {applications.map((app) => (
            <li key={app._id}>
              <Link
                to={`/applications/${app._id}`}
                className="flex items-center justify-between gap-4 py-3 px-2 -mx-2 rounded-[8px] hover:bg-sunken/40 transition-colors group focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[14px] sm:text-[15px] leading-[18px] sm:leading-[20px] text-ink truncate block group-hover:underline">
                    {app.companyName}
                  </span>
                  <span className="text-[12px] sm:text-[13px] leading-[16px] sm:leading-[18px] text-ink-soft truncate block mt-0.5">
                    {app.role}
                  </span>
                </div>
                <StatusBadge status={app.status} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}

export default RecentApplications;
