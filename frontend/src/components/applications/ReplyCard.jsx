/**
 * ReplyCard component
 * Displays a single reply card with 3-tier hierarchy:
 * Row 1: ReplyTypeBadge + "Received {date}", edit & delete icon buttons
 * Row 2: ONE merged chip: "Due {date} · in {N} days" (or "Done" chip if completed) + "Mark as done" / "Mark as not done" Checkbox (only if deadline exists)
 * Row 3: Notes below 1px divider rule (no rule if no notes)
 * Completed state: visually muted contrast (WCAG AA compliant)
 */
import React from "react";
import { ReplyTypeBadge } from "../ui/ReplyTypeBadge.jsx";
import { DueChip } from "../ui/DueChip.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { formatDate, formatMergedDueText } from "../../lib/format.js";
import { cn } from "../../lib/cn.js";

export function ReplyCard({
  reply,
  onEdit,
  onDelete,
  onToggleComplete,
  editBtnRef,
  className = "",
  id,
}) {
  if (!reply) return null;

  const hasDeadline = Boolean(reply.deadline);
  const isCompleted = Boolean(reply.completed);

  return (
    <div
      id={id}
      className={cn(
        "rounded-[10px] border p-4 space-y-2.5 transition-colors",
        isCompleted
          ? "bg-sunken/40 border-rule/80 text-ink-soft"
          : "bg-surface border-rule hover:border-ink/20",
        className
      )}
    >
      {/* Row 1: ReplyTypeBadge + "Received {date}" on left; edit & delete on right */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <ReplyTypeBadge type={reply.type} className="shrink-0" />
          <span className="text-[13px] leading-[18px] font-medium text-ink-soft tnum truncate">
            Received {formatDate(reply.receivedDate)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            ref={editBtnRef}
            type="button"
            onClick={onEdit}
            className="px-2 py-0.5 rounded-[6px] text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-sunken focus:outline-none focus-visible:outline-2 focus-visible:outline-ink transition-colors cursor-pointer"
            title="Edit reply"
            aria-label={`Edit ${reply.type} reply`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-2 py-0.5 rounded-[6px] text-[12px] font-medium text-ink-soft hover:text-danger hover:bg-danger-bg focus:outline-none focus-visible:outline-2 focus-visible:outline-danger transition-colors cursor-pointer"
            title="Delete reply"
            aria-label={`Delete ${reply.type} reply`}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Row 2: ONE merged chip + "Mark as done" checkbox (only if deadline exists) */}
      {hasDeadline && (
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap min-w-0">
          {isCompleted ? (
            <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[12px] leading-[16px] font-medium bg-sunken border border-rule text-ink-soft select-none shrink-0 whitespace-nowrap text-center">
              <span>Done</span>
            </span>
          ) : (
            <DueChip deadline={reply.deadline}>
              {formatMergedDueText(reply.deadline)}
            </DueChip>
          )}

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Checkbox
              id={`complete-${reply._id}`}
              label={isCompleted ? "Mark as not done" : "Mark as done"}
              checked={isCompleted}
              onChange={onToggleComplete}
            />
          </div>
        </div>
      )}

      {/* Row 3: Notes below 1px rule. No rule if no notes. */}
      {reply.notes && (
        <div className="border-t border-rule/60 pt-2.5 mt-2.5">
          <p className="text-[14px] leading-[20px] text-ink-soft whitespace-pre-wrap break-words">
            {reply.notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default ReplyCard;
