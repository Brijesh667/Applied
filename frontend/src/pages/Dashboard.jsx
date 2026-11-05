/**
 * Dashboard page
 * Main command center for Applied:
 * - H1 "Dashboard" (no subtitle)
 * - 5-metric KPI strip (Applied, Got a reply, Missed, This week, Offers)
 * - Row 2 (about 2/3 and 1/3 desktop):
 *   - Left: Needs attention (grouped into Missed and This week)
 *   - Right: Status (stacked bar + legend) and Replies (neutral bars)
 * - Row 3 (about 1/3 and 2/3 desktop):
 *   - Left: Where you applied (PlatformTable)
 *   - Right: Recent applications (latest 5 applications)
 * - Invariant: ALWAYS render the full layout skeleton, even when total === 0.
 */
import React from "react";
import { useStats } from "../hooks/useStats.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton.jsx";
import { OverviewStrip } from "../components/dashboard/OverviewStrip.jsx";
import { NeedsAttention } from "../components/dashboard/NeedsAttention.jsx";
import { StatusBreakdown } from "../components/dashboard/StatusBreakdown.jsx";
import { RepliesByType } from "../components/dashboard/RepliesByType.jsx";
import { PlatformTable } from "../components/dashboard/PlatformTable.jsx";
import { RecentApplications } from "../components/dashboard/RecentApplications.jsx";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { data: stats, isLoading, isError, error, refetch } = useStats();

  return (
    <PageContainer>
      {/* PageHeader with h1 only (subtitle removed) */}
      <PageHeader title="Dashboard" />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <div className="py-12">
          <ErrorState
            title="Couldn't load dashboard"
            message={error?.message || "An unexpected error occurred."}
            onRetry={refetch}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Row 1: KPI strip, 5 boxes */}
          <OverviewStrip stats={stats} />

          {/* Row 2: 2/3 Left (Needs attention) + 1/3 Right (Status & Replies) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: Needs attention (2/3) */}
            <div className="lg:col-span-2 min-w-0">
              <NeedsAttention
                attention={stats?.attention}
                attentionTotal={stats?.attentionTotal}
                deadlines={stats?.deadlines}
              />
            </div>

            {/* Right: Status & Replies (1/3) */}
            <div className="space-y-8 min-w-0">
              <StatusBreakdown
                byStatus={stats?.byStatus}
                total={stats?.total ?? 0}
              />
              <RepliesByType repliesByType={stats?.repliesByType} />
            </div>
          </div>

          {/* Row 3: 1/3 Left (Where you applied) + 2/3 Right (Recent applications) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: Where you applied (1/3) */}
            <div className="lg:col-span-1 min-w-0">
              <PlatformTable
                platforms={stats?.byPlatform}
                totalApplications={stats?.total ?? 0}
              />
            </div>

            {/* Right: Recent applications (2/3) */}
            <div className="lg:col-span-2 min-w-0">
              <RecentApplications />
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
