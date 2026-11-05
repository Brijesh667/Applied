/**
 * NeedsAttention component
 * Main action center card on the Dashboard:
 * - Outer card with title + total count.
 * - Two separate inner boxes with 12-16px gap: This week first (max 5 rows), Missed second (max 3 rows).
 * - This week box: subtle primary-tint border, normal text header.
 * - Missed box: subtle danger-tint border, danger count in header.
 * - Each inner box has radius 10, 1px border, padding, and "See more" / "See all" link in header.
 * - Cursor glow only (no tilt) on outer card and inner boxes.
 * - Real totals used for count badges and overflow links from deadlines.dueSoon and deadlines.overdue.
 * - Each row: Company name (bold) + role (muted), ReplyTypeBadge, DueChip, and "Mark as done" button.
 * - Optimistic "Mark as done" with 180ms fade (instant under reduced motion), rollback and toast on error.
 * - Footer link to /applications?sort=deadline with pending count ("View all {pending} pending deadlines").
 */
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { applicationsApi } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queryKeys.js";
import { useCardFx } from "../../hooks/useCardFx.js";
import { ReplyTypeBadge } from "../ui/ReplyTypeBadge.jsx";
import { DueChip } from "../ui/DueChip.jsx";
import { daysUntil, DEADLINE_LABELS } from "../../lib/format.js";
import { cn } from "../../lib/cn.js";

function InnerAttentionBox({ borderClass, children, className = "" }) {
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: true });

  return (
    <div
      ref={cardRef}
      {...handlers}
      className={cn(
        "card-fx rounded-[10px] p-2.5 sm:p-4 bg-surface border transition-colors",
        borderClass,
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function NeedsAttention({
  attention = [],
  attentionTotal = 0,
  deadlines = {},
  className = "",
}) {
  const queryClient = useQueryClient();
  const { cardRef: outerRef, handlers: outerHandlers } = useCardFx({
    tilt: false,
    glow: true,
  });
  const [fadingIds, setFadingIds] = useState(() => new Set());
  const [pendingIds, setPendingIds] = useState(() => new Set());

  // Real totals from deadlines
  const dueSoonCount = deadlines?.dueSoon ?? 0;
  const overdueCount = deadlines?.overdue ?? 0;
  const pendingCount = deadlines?.pending ?? 0;

  // Optimistic Mark as done mutation
  const markAsDoneMutation = useMutation({
    mutationFn: ({ applicationId, replyId }) =>
      applicationsApi.updateReply(applicationId, replyId, { completed: true }),

    onMutate: async ({ replyId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.stats });
      const previousStats = queryClient.getQueryData(queryKeys.stats);

      if (previousStats) {
        const removedItem = (previousStats.attention || []).find(
          (item) => item.replyId === replyId
        );
        const newAttention = (previousStats.attention || []).filter(
          (item) => item.replyId !== replyId
        );
        const newAttentionTotal = Math.max(
          0,
          (previousStats.attentionTotal || 0) - 1
        );

        const newDeadlines = { ...previousStats.deadlines };
        newDeadlines.pending = Math.max(0, (newDeadlines.pending || 0) - 1);

        if (removedItem?.deadline) {
          const days = daysUntil(removedItem.deadline);
          if (days < 0) {
            newDeadlines.overdue = Math.max(0, (newDeadlines.overdue || 0) - 1);
          } else if (days <= 7) {
            newDeadlines.dueSoon = Math.max(0, (newDeadlines.dueSoon || 0) - 1);
          }
        }

        queryClient.setQueryData(queryKeys.stats, {
          ...previousStats,
          attention: newAttention,
          attentionTotal: newAttentionTotal,
          deadlines: newDeadlines,
        });
      }

      return { previousStats };
    },

    onError: (_err, { replyId }, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.stats, context.previousStats);
      }
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
      toast.error("Couldn't update the reply. Try again.");
    },

    onSuccess: (updatedApp, { applicationId, replyId }) => {
      if (updatedApp) {
        queryClient.setQueryData(
          queryKeys.applications.detail(applicationId),
          updatedApp
        );
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });

      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(replyId);
        return next;
      });
      toast.success("Marked as done");
    },
  });

  const handleMarkAsDone = (item) => {
    if (pendingIds.has(item.replyId)) return;

    setPendingIds((prev) => new Set(prev).add(item.replyId));

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      markAsDoneMutation.mutate({
        applicationId: item.applicationId,
        replyId: item.replyId,
      });
    } else {
      setFadingIds((prev) => new Set(prev).add(item.replyId));
      setTimeout(() => {
        markAsDoneMutation.mutate({
          applicationId: item.applicationId,
          replyId: item.replyId,
        });
      }, 180);
    }
  };

  // Group attention items by deadline vs now (local calendar days)
  const { missedItems, thisWeekItems } = useMemo(() => {
    const missed = [];
    const thisWeek = [];

    for (const item of attention) {
      const days = daysUntil(item.deadline);
      if (days < 0) {
        missed.push(item);
      } else {
        thisWeek.push(item);
      }
    }

    return { missedItems: missed, thisWeekItems: thisWeek };
  }, [attention]);

  // Limits: This week max 5 rows, Missed max 3 rows
  const visibleThisWeekItems = useMemo(
    () => thisWeekItems.slice(0, 5),
    [thisWeekItems]
  );
  const visibleMissedItems = useMemo(
    () => missedItems.slice(0, 3),
    [missedItems]
  );

  // Check against real totals from stats
  const hasMoreThisWeek = dueSoonCount > visibleThisWeekItems.length;
  const hasMoreMissed = overdueCount > visibleMissedItems.length;

  const isEmpty =
    (dueSoonCount === 0 && overdueCount === 0) || attention.length === 0;

  const renderItem = (item, inMissedGroup = false) => {
    const isFading = fadingIds.has(item.replyId);
    const isPending = pendingIds.has(item.replyId);

    return (
      <li
        key={item.replyId}
        className={cn(
          "relative group rounded-[8px] border border-rule/40 bg-surface hover:bg-sunken/50 hover:border-rule transition-all duration-180 p-2.5 sm:px-4 sm:py-3",
          isFading && "opacity-0 -translate-x-1 duration-180"
        )}
      >
        {/* Full-row link semantics */}
        <Link
          to={`/applications/${item.applicationId}/replies`}
          className="absolute inset-0 z-0 rounded-[8px] focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          aria-label={`${item.companyName}, ${item.role} - view replies`}
        />

        <div className="relative z-10 pointer-events-none">
          {/* MOBILE LAYOUT (below md): Line 1 (company/role + Done) & Line 2 (type chip + due chip in grid-cols-2) */}
          <div className="md:hidden flex flex-col gap-2.5">
            {/* Line 1: Company + role on left, Done button on right (fixed width, never shrinks) */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[14px] leading-[18px] text-ink truncate block">
                  {item.companyName}
                </span>
                <span className="text-[12px] leading-[16px] text-ink-soft truncate block mt-0.5">
                  {item.role}
                </span>
              </div>

              {/* Done button on the right (fixed width, never shrinks) */}
              <div className="pointer-events-auto shrink-0 w-[72px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsDone(item);
                  }}
                  disabled={isPending}
                  aria-label={`Mark reply for ${item.companyName} as done`}
                  className={cn(
                    "inline-flex items-center justify-center h-8 px-2.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer border border-rule bg-surface hover:bg-sunken hover:border-rule/80 text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full shrink-0",
                    isPending && "opacity-60"
                  )}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Line 2: grid grid-cols-2 gap-2 with type chip (left) and due chip (right) */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <ReplyTypeBadge
                type={item.type}
                className="w-full min-w-0"
              />
              <DueChip
                deadline={item.deadline}
                inMissedGroup={inMissedGroup}
                className="w-full min-w-0"
              />
            </div>
          </div>

          {/* DESKTOP LAYOUT (md and up): 4 columns in straight vertical line, equal-width chips (140px) */}
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_140px_140px_128px] items-center gap-4">
            {/* Column 1: Company name & role */}
            <div className="min-w-0 pr-1">
              <span className="font-bold text-[15px] leading-[20px] text-ink truncate block">
                {item.companyName}
              </span>
              <span className="text-[13px] leading-[18px] text-ink-soft truncate block">
                {item.role}
              </span>
            </div>

            {/* Column 2: ReplyTypeBadge (equal 140px width with DueChip) */}
            <div className="w-[140px] shrink-0">
              <ReplyTypeBadge type={item.type} className="w-full min-w-0" />
            </div>

            {/* Column 3: DueChip (equal 140px width with ReplyTypeBadge) */}
            <div className="w-[140px] shrink-0">
              <DueChip
                deadline={item.deadline}
                inMissedGroup={inMissedGroup}
                className="w-full min-w-0"
              />
            </div>

            {/* Column 4: Mark as done action */}
            <div className="justify-self-end pointer-events-auto shrink-0 w-[128px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsDone(item);
                }}
                disabled={isPending}
                aria-label={`Mark reply for ${item.companyName} as done`}
                className={cn(
                  "inline-flex items-center justify-center h-8 px-3 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer border border-rule bg-surface hover:bg-sunken hover:border-rule/80 text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full",
                  isPending && "opacity-60"
                )}
              >
                Mark as done
              </button>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div
      ref={outerRef}
      {...outerHandlers}
      className={cn(
        "card-fx rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none flex flex-col",
        className
      )}
      role="region"
      aria-label="Needs attention"
    >
      {/* Outer Card Header */}
      <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-rule/60 relative z-10">
        <h2 className="text-[20px] sm:text-[22px] leading-[26px] sm:leading-[28px] font-bold text-ink">
          Needs attention
        </h2>
        {attentionTotal > 0 && (
          <span className="text-[13px] leading-[18px] font-semibold text-ink-soft tnum">
            {attentionTotal} {attentionTotal === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="py-8 sm:py-10 text-center flex flex-col items-center justify-center relative z-10">
          <h3 className="text-[16px] leading-[24px] font-bold text-ink">
            Nothing needs attention
          </h3>
          <p className="text-[14px] leading-[20px] text-ink-soft mt-1 max-w-[40ch]">
            {pendingCount === 0
              ? "Add a reply with a deadline to see it here."
              : "No missed or upcoming deadlines this week."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4 relative z-10">
          {/* 1. This week inner box (First, max 5 rows) */}
          {dueSoonCount > 0 && (
            <InnerAttentionBox borderClass="border-primary-tint">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-[14px] leading-[20px] font-bold text-ink flex items-center gap-1.5">
                  <span>{DEADLINE_LABELS.thisWeek}</span>
                  <span className="tnum font-semibold text-primary text-[12px]">
                    ({dueSoonCount})
                  </span>
                </h3>
                {hasMoreThisWeek && (
                  <Link
                    to="/applications?deadline=week"
                    className="text-[12px] sm:text-[13px] leading-[16px] font-semibold text-ink hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px]"
                  >
                    See more ({dueSoonCount})
                  </Link>
                )}
              </div>
              <ul className="space-y-2 list-none p-0 m-0">
                {visibleThisWeekItems.map((item) => renderItem(item, false))}
              </ul>
            </InnerAttentionBox>
          )}

          {/* 2. Missed inner box (Second, max 3 rows) */}
          {overdueCount > 0 && (
            <InnerAttentionBox borderClass="border-danger-tint">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-[14px] leading-[20px] font-bold text-danger flex items-center gap-1.5">
                  <span>{DEADLINE_LABELS.missed}</span>
                  <span className="tnum font-semibold text-danger text-[12px]">
                    ({overdueCount})
                  </span>
                </h3>
                {hasMoreMissed && (
                  <Link
                    to="/applications?deadline=missed"
                    className="text-[12px] sm:text-[13px] leading-[16px] font-semibold text-danger hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px]"
                  >
                    See all ({overdueCount})
                  </Link>
                )}
              </div>
              <ul className="space-y-2 list-none p-0 m-0">
                {visibleMissedItems.map((item) => renderItem(item, true))}
              </ul>
            </InnerAttentionBox>
          )}
        </div>
      )}

      {/* Footer link under the list */}
      <div className="pt-4 mt-auto border-t border-rule/60 flex items-center justify-between flex-wrap gap-2 relative z-10">
        <Link
          to="/applications?sort=deadline"
          className="text-[14px] leading-[20px] font-semibold text-ink hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px] inline-flex items-center gap-1.5 group"
        >
          <span>
            {pendingCount > 0
              ? `View all ${pendingCount} pending deadlines`
              : "View all pending deadlines"}
          </span>
        </Link>
      </div>
    </div>
  );
}

export default NeedsAttention;
