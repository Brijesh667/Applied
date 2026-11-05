/**
 * ApplicationCard component
 * Flat card with stretched-link pattern, facts meta row,
 * single-row skills pills, and reply status / deadline chip in footer.
 * Equal-height flex layout with mt-auto footer.
 * Inline "Mark as done" action for cards with nextDeadline.
 * 3D tilt and cursor glow interactions.
 */
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCardFx } from "../../hooks/useCardFx.js";
import { formatDate, formatPay, splitSkills } from "../../lib/format.js";
import { applicationsApi } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queryKeys.js";
import { getLatestReply, getNextPendingReply } from "../../lib/applications.js";
import { StatusBadge } from "../ui/StatusBadge.jsx";
import { ReplyTypeBadge } from "../ui/ReplyTypeBadge.jsx";
import { DueChip } from "../ui/DueChip.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { cn } from "../../lib/cn.js";

export function ApplicationCard({ application }) {
  if (!application) return null;

  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });
  const [isFading, setIsFading] = useState(false);

  const {
    _id,
    companyName,
    role,
    status,
    appliedFrom,
    pay,
    duration,
    appliedDate,
    skills: rawSkills,
    replies = [],
    nextDeadline,
    nextDeadlineReplyId,
  } = application;

  const prefetchDetail = () => {
    if (_id) {
      import("../../pages/ApplicationDetail.jsx");
      queryClient.prefetchQuery({
        queryKey: queryKeys.applications.detail(_id),
        queryFn: () => applicationsApi.get(_id),
        staleTime: 30000,
      });
    }
  };

  const skills = splitSkills(rawSkills);
  const hasReplies = Array.isArray(replies) && replies.length > 0;
  const latestReply = hasReplies ? getLatestReply(replies) : null;
  const pendingReply = nextDeadline
    ? getNextPendingReply(replies, nextDeadline)
    : null;
  const formattedPay = formatPay(pay);
  const replyIdToMark = nextDeadlineReplyId || pendingReply?._id;

  const hasDeadlineFilter = Boolean(searchParams.get("deadline"));

  // Optimistic Mark as done mutation
  const markAsDoneMutation = useMutation({
    mutationFn: ({ applicationId, replyId }) =>
      applicationsApi.updateReply(applicationId, replyId, { completed: true }),

    onMutate: async ({ applicationId, replyId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.applications.lists(),
      });
      const previousQueries = queryClient.getQueriesData({
        queryKey: queryKeys.applications.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.applications.lists() },
        (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              applications: page.applications
                .map((app) => {
                  if (app._id !== applicationId) return app;
                  const newReplies = (app.replies || []).map((r) =>
                    r._id === replyId ? { ...r, completed: true } : r
                  );
                  const remainingPending = newReplies
                    .filter((r) => !r.completed && r.deadline)
                    .sort(
                      (a, b) => new Date(a.deadline) - new Date(b.deadline)
                    );
                  const nextPending = remainingPending[0];

                  // If a deadline filter is active and no matching deadline remains, leave the list
                  if (hasDeadlineFilter) {
                    return null;
                  }

                  return {
                    ...app,
                    replies: newReplies,
                    nextDeadline: nextPending?.deadline || null,
                    nextDeadlineReplyId: nextPending?._id || null,
                  };
                })
                .filter(Boolean),
            })),
          };
        }
      );

      return { previousQueries };
    },

    onError: (_err, _vars, context) => {
      setIsFading(false);
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Couldn't update the reply. Try again.");
    },

    onSuccess: (updatedApp, { applicationId }) => {
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
      setIsFading(false);
      toast.success("Marked as done");
    },
  });

  const handleMarkAsDone = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!replyIdToMark || markAsDoneMutation.isPending) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      markAsDoneMutation.mutate({
        applicationId: _id,
        replyId: replyIdToMark,
      });
    } else {
      setIsFading(true);
      setTimeout(() => {
        markAsDoneMutation.mutate({
          applicationId: _id,
          replyId: replyIdToMark,
        });
      }, 180);
    }
  };

  // Build meta items
  const metaItems = [];
  if (appliedFrom) {
    metaItems.push({
      key: "platform",
      text: appliedFrom,
    });
  }
  if (formattedPay) {
    metaItems.push({
      key: "pay",
      text: formattedPay,
      isPay: true,
    });
  }
  if (duration) {
    metaItems.push({
      key: "duration",
      text: duration,
    });
  }
  if (appliedDate) {
    metaItems.push({
      key: "appliedDate",
      text: `Applied ${formatDate(appliedDate)}`,
    });
  }

  return (
    <article
      ref={cardRef}
      {...handlers}
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      className={cn(
        "app-card card-fx card-fx-tilt relative rounded-[12px] bg-surface border border-rule p-4 select-none flex flex-col h-full justify-between transition-opacity duration-200 motion-reduce:transition-none",
        isFading && "opacity-0 pointer-events-none",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--outline-focus)] has-[:focus-visible]:outline-offset-2"
      )}
    >
      <div className="relative z-[1] min-w-0">
        {/* 1. Header: company name (left, 1 line truncate) + StatusBadge (right) */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h2 className="text-[18px] leading-[24px] font-bold text-ink truncate min-w-0 flex-1">
            <Link
              to={`/applications/${_id}`}
              className="card-company-link focus:outline-none after:absolute after:inset-0 after:content-[''] truncate block"
            >
              {companyName}
            </Link>
          </h2>
          <StatusBadge status={status} className="shrink-0" />
        </div>

        {/* 2. Role: muted, 1 line truncate (min-height reserved) */}
        <p className="text-[14px] leading-[20px] text-ink-soft truncate mt-1 min-h-[20px]">
          {role || <span className="invisible" aria-hidden="true">-</span>}
        </p>

        {/* 3. Meta: wrapping line with small icons and middle dot separators */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[18px] text-ink-soft mt-3 line-clamp-2 min-h-[20px]">
          {metaItems.map((item, idx) => {
            return (
              <React.Fragment key={item.key}>
                {idx > 0 && (
                  <span className="text-rule select-none" aria-hidden="true">
                    ·
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center shrink-0",
                    item.isPay && "tnum font-medium text-ink"
                  )}
                >
                  <span>{item.text}</span>
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* 4. Skills: single row, max 3 chips + "+N more", fixed row height */}
        <div
          className="h-[26px] mt-3 flex items-center gap-1.5 overflow-hidden flex-nowrap"
          aria-hidden={skills.length === 0 ? "true" : undefined}
        >
          {skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] border border-rule text-ink-soft truncate shrink-0 max-w-[120px]"
              title={skill}
            >
              {skill}
            </span>
          ))}
          {skills.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] border border-rule text-ink-soft shrink-0">
              +{skills.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* 5. Footer: 1px top rule, mt-auto, fixed min height 76px (fits 2-row pending-deadline state), z-10 for interactive action */}
      <div className="relative z-10 border-t border-rule mt-auto pt-3 min-h-[76px] flex flex-col justify-center min-w-0">
        {!hasReplies ? (
          <div className="flex items-center min-w-0">
            <span className="inline-flex items-center text-[12px] leading-[16px] text-ink-soft">
              No reply yet
            </span>
          </div>
        ) : nextDeadline ? (
          /* Pending deadline state: 2 rows */
          <div className="flex flex-col gap-2 w-full min-w-0">
            {/* Row 1: ReplyTypeBadge on left, DueChip on right (drops to next line if too narrow) */}
            <div className="flex flex-wrap items-center justify-between gap-2 w-full min-w-0">
              <ReplyTypeBadge
                type={(pendingReply || latestReply)?.type}
                className="shrink-0 min-w-[104px]"
              />
              <DueChip
                deadline={nextDeadline}
                className="shrink-0 min-w-[140px]"
              />
            </div>

            {/* Row 2: Mark as done button, right-aligned (full width on card widths under 260px) */}
            {replyIdToMark && (
              <div className="flex items-center justify-end w-full">
                <button
                  type="button"
                  onClick={handleMarkAsDone}
                  disabled={markAsDoneMutation.isPending}
                  aria-label={`Mark reply for ${companyName} as done`}
                  className={cn(
                    "inline-flex items-center justify-center h-7 px-2.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer border border-rule bg-surface hover:bg-sunken text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 app-card-mark-done-btn",
                    markAsDoneMutation.isPending && "opacity-60"
                  )}
                >
                  Mark as done
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Has reply but no pending deadline: ReplyTypeBadge + "Received {date}" in one row, no button */
          <div className="flex items-center gap-2 min-w-0">
            {latestReply && (
              <ReplyTypeBadge
                type={latestReply.type}
                className="shrink-0 min-w-[104px]"
              />
            )}
            {latestReply?.receivedDate && (
              <span className="text-[12px] leading-[16px] text-ink-soft tnum truncate">
                Received {formatDate(latestReply.receivedDate)}
              </span>
            )}
            {replies.length > 1 && (
              <span className="text-[11px] leading-[16px] text-ink-soft/70 shrink-0 tnum">
                {replies.length} replies
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ApplicationCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative rounded-[12px] bg-surface border border-rule p-4 select-none flex flex-col h-full justify-between overflow-hidden"
    >
      <div>
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-1/2 rounded-[4px]" />
          <Skeleton className="h-6 w-20 rounded-full shrink-0" />
        </div>

        {/* Role row */}
        <div className="mt-1 min-h-[20px]">
          <Skeleton className="h-4 w-1/3 rounded-[4px]" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-3 min-h-[20px]">
          <Skeleton className="h-4 w-20 rounded-[4px]" />
          <Skeleton className="h-4 w-24 rounded-[4px]" />
          <Skeleton className="h-4 w-28 rounded-[4px]" />
        </div>

        {/* Skills row */}
        <div className="h-[26px] mt-3 flex items-center gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-rule mt-auto pt-3 min-h-[76px] flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
    </div>
  );
}

export default ApplicationCard;
