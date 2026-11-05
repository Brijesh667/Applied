/**
 * RepliesPanel component
 * Displays the 3 latest replies on the ApplicationDetail page (newest first by receivedDate).
 * If total replies > 3, shows a "Show all (N)" link navigating to /applications/:id/replies.
 * Reuses the shared ReplyCard component.
 */
import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button.jsx";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { ReplyCard } from "./ReplyCard.jsx";
import { ReplyForm } from "./ReplyForm.jsx";
import { LIMITS } from "../../lib/constants.js";
import { useReplyMutations } from "../../hooks/useReplyMutations.js";
import { cn } from "../../lib/cn.js";

export function RepliesPanel({ application, className = "" }) {
  if (!application) return null;

  const replies = Array.isArray(application.replies) ? application.replies : [];
  const isAtLimit = replies.length >= LIMITS.maxReplies;

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  const addBtnRef = useRef(null);
  const editBtnRefs = useRef({});

  const { deleteReply, isDeleting, toggleComplete } =
    useReplyMutations(application._id);

  const announce = (msg) => {
    setAnnouncement(msg);
  };

  const handleToggleComplete = async (replyId, checked) => {
    try {
      announce(
        checked
          ? "Reply marked as completed"
          : "Reply marked as not done"
      );
      await toggleComplete({ replyId, completed: checked });
    } catch {
      announce("Failed to update reply status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReply(deleteTarget._id);
      announce("Reply deleted");
      setDeleteTarget(null);
    } catch {
      announce("Failed to delete reply");
    }
  };

  // Sort replies newest receivedDate first, tie-break by _id
  const sortedReplies = [...replies].sort((a, b) => {
    const diff = new Date(b.receivedDate) - new Date(a.receivedDate);
    if (diff !== 0) return diff;
    return (b._id || "").localeCompare(a._id || "");
  });

  // Latest 3 replies only on Detail page
  const visibleReplies = sortedReplies.slice(0, 3);
  const hasMore = replies.length > 3;
  const showTimeline = visibleReplies.length >= 2;

  return (
    <section
      className={cn(
        "rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none",
        className
      )}
      aria-label="Replies timeline"
    >
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-rule/60">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[20px] leading-[26px] font-bold text-ink">
            Replies
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] font-medium bg-sunken border border-rule text-ink-soft tnum">
            {replies.length}
          </span>
        </div>

        {/* Show Add button in header only if replies exist or form is currently open */}
        {(replies.length > 0 || isAddFormOpen) && (
          <div className="flex items-center gap-2">
            {isAtLimit && (
              <span className="text-[12px] leading-[16px] text-ink-soft">
                Limit reached ({LIMITS.maxReplies})
              </span>
            )}
            <Button
              ref={addBtnRef}
              variant={isAddFormOpen ? "secondary" : "primary"}
              size="sm"
              disabled={isAtLimit && !isAddFormOpen}
              onClick={() => setIsAddFormOpen((prev) => !prev)}
              aria-expanded={isAddFormOpen}
            >
              {isAddFormOpen ? "Cancel" : "Add reply"}
            </Button>
          </div>
        )}
      </div>

      {/* Add Reply Form */}
      {isAddFormOpen && (
        <div className="mb-6">
          <ReplyForm
            applicationId={application._id}
            initialReply={null}
            onClose={() => setIsAddFormOpen(false)}
            onSuccess={() => {
              setIsAddFormOpen(false);
              announce("Reply added");
            }}
            triggerRef={addBtnRef}
          />
        </div>
      )}

      {/* Empty State (0 replies): single Add reply button */}
      {replies.length === 0 && !isAddFormOpen && (
        <EmptyState
          title="No replies yet"
          description="Add one when you hear back."
          action={
            <Button
              size="sm"
              onClick={() => setIsAddFormOpen(true)}
            >
              Add reply
            </Button>
          }
          className="py-8"
        />
      )}

      {/* Replies List (latest 3 only) */}
      {visibleReplies.length > 0 && (
        <>
          <ol className={cn("relative space-y-4", showTimeline ? "pl-7" : "pl-0")}>
            {/* Continuous vertical timeline line: only when >= 2 replies visible */}
            {showTimeline && (
              <div
                className="absolute left-[13px] top-3.5 bottom-3.5 w-[2px] bg-rule pointer-events-none"
                aria-hidden="true"
              />
            )}

            {visibleReplies.map((reply) => {
              const isEditing = editingReplyId === reply._id;
              const hasDeadline = Boolean(reply.deadline);
              const isCompleted = Boolean(reply.completed);

              if (isEditing) {
                return (
                  <li key={reply._id} className="relative">
                    <div className="relative z-10">
                      <ReplyForm
                        applicationId={application._id}
                        initialReply={reply}
                        onClose={() => setEditingReplyId(null)}
                        onSuccess={() => {
                          setEditingReplyId(null);
                          announce("Reply updated");
                        }}
                        triggerRef={{
                          current: editBtnRefs.current[reply._id],
                        }}
                      />
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={reply._id}
                  className={cn(
                    "relative",
                    showTimeline ? "flex items-start gap-3.5" : "w-full"
                  )}
                >
                  {/* Timeline Marker Circle: only when >= 2 replies visible */}
                  {showTimeline && (
                    <div
                      className={cn(
                        "absolute -left-7 top-2 w-7 h-7 rounded-full flex items-center justify-center text-[12px] z-10 transition-colors shrink-0",
                        isCompleted
                          ? "bg-sunken text-ink-soft border border-rule"
                          : hasDeadline
                          ? "bg-surface border-2 border-ink text-ink font-semibold"
                          : "bg-sunken border border-rule text-ink-soft"
                      )}
                      aria-hidden="true"
                    >
                      <span className={cn("w-2 h-2 rounded-full", isCompleted ? "bg-ink-soft/50" : "bg-ink")} />
                    </div>
                  )}

                  {/* Shared ReplyCard */}
                  <div className="flex-1 min-w-0">
                    <ReplyCard
                      reply={reply}
                      editBtnRef={(el) => (editBtnRefs.current[reply._id] = el)}
                      onEdit={() => setEditingReplyId(reply._id)}
                      onDelete={() => setDeleteTarget(reply)}
                      onToggleComplete={(checked) =>
                        handleToggleComplete(reply._id, checked)
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Show all (N) button when total replies > 3 */}
          {hasMore && (
            <div className="mt-4 pt-3 border-t border-rule/60">
              <Link
                to={`/applications/${application._id}/replies`}
                className="block"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-[14px]"
                >
                  Show all ({replies.length})
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Delete Reply Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete reply?"
        description="Are you sure you want to delete this reply? This cannot be undone."
        confirmLabel="Delete reply"
        cancelLabel="Cancel"
        danger={true}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

export default RepliesPanel;
