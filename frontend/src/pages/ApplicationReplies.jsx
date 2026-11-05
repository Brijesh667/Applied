/**
 * ApplicationReplies page (/applications/:id/replies)
 * Displays all replies for an application in a comfortable single-column reading container.
 * Sort: pending (not completed) first, nearest deadline first, then completed (newest first).
 * Replies without a deadline go after pending ones with deadlines.
 * Back arrow explicitly navigates to /applications/:id.
 * Includes inline ReplyForm, brief pulse ring + scroll on newly added reply, and shared ReplyCard.
 */
import React, { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useApplication } from "../hooks/useApplication.js";
import { useReplyMutations } from "../hooks/useReplyMutations.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ReplyCard } from "../components/applications/ReplyCard.jsx";
import { ReplyForm } from "../components/applications/ReplyForm.jsx";
import { LIMITS } from "../lib/constants.js";
import { cn } from "../lib/cn.js";

/**
 * Sorts all replies:
 * 1. Pending (not completed) first, completed last
 * 2. Pending with deadline first (nearest deadline first), pending without deadline after (newest first)
 * 3. Completed replies (newest receivedDate first)
 */
function sortAllReplies(replies) {
  return [...replies].sort((a, b) => {
    const aCompleted = Boolean(a.completed);
    const bCompleted = Boolean(b.completed);

    // 1. Pending first, completed last
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }

    // 2. If both are pending
    if (!aCompleted) {
      const aHasDeadline = Boolean(a.deadline);
      const bHasDeadline = Boolean(b.deadline);

      // Pending with deadline before pending without deadline
      if (aHasDeadline !== bHasDeadline) {
        return aHasDeadline ? -1 : 1;
      }

      // If both have deadlines: nearest deadline first (ascending order)
      if (aHasDeadline && bHasDeadline) {
        const diffDeadline = new Date(a.deadline) - new Date(b.deadline);
        if (diffDeadline !== 0) return diffDeadline;
      }

      // If neither has deadline, or deadlines are identical: newest receivedDate first
      const diffReceived = new Date(b.receivedDate) - new Date(a.receivedDate);
      if (diffReceived !== 0) return diffReceived;

      return (b._id || "").localeCompare(a._id || "");
    }

    // 3. If both are completed: newest receivedDate first
    const diffReceived = new Date(b.receivedDate) - new Date(a.receivedDate);
    if (diffReceived !== 0) return diffReceived;

    return (b._id || "").localeCompare(a._id || "");
  });
}

export default function ApplicationReplies() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: application, isLoading, isError, error, refetch } =
    useApplication(id);

  const { deleteReply, isDeleting, toggleComplete } = useReplyMutations(id);

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [newlyAddedReplyId, setNewlyAddedReplyId] = useState(null);

  const addBtnRef = useRef(null);
  const editBtnRefs = useRef({});

  const pageTitle = application
    ? `Replies — ${application.companyName}`
    : "Replies";
  usePageTitle(pageTitle);

  const announce = (msg) => {
    setAnnouncement(msg);
  };

  const replies = Array.isArray(application?.replies)
    ? application.replies
    : [];
  const isAtLimit = replies.length >= LIMITS.maxReplies;

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

  const handleReplyAdded = (updatedApp) => {
    setIsAddFormOpen(false);
    announce("Reply added");

    // Identify newly added reply to trigger scrollIntoView & brief ring animation
    let newId = null;
    if (
      updatedApp &&
      Array.isArray(updatedApp.replies) &&
      updatedApp.replies.length > 0
    ) {
      const existingIds = new Set(replies.map((r) => r._id));
      const added =
        updatedApp.replies.find((r) => !existingIds.has(r._id)) ||
        updatedApp.replies[updatedApp.replies.length - 1];
      newId = added?._id;
    }

    if (newId) {
      setNewlyAddedReplyId(newId);
      setTimeout(() => {
        const el = document.getElementById(`reply-${newId}`);
        if (el) {
          const prefersReducedMotion =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          el.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "nearest",
          });
        }
      }, 100);

      setTimeout(() => {
        setNewlyAddedReplyId(null);
      }, 1500);
    }
  };

  if (isLoading) {
    return (
      <PageContainer className="max-w-[768px]">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-[8px]" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-44 rounded-[6px]" />
              <Skeleton className="h-4 w-28 rounded-[4px]" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-[8px]" />
        </div>

        {/* Skeleton Replies List */}
        <div className="rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-[10px]" />
          <Skeleton className="h-24 w-full rounded-[10px]" />
          <Skeleton className="h-24 w-full rounded-[10px]" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !application) {
    const is404 =
      error?.status === 404 ||
      error?.message?.toLowerCase().includes("not found");

    return (
      <PageContainer className="max-w-[768px]">
        <div className="py-12">
          {is404 ? (
            <ErrorState
              title="Application not found"
              description="The application you're looking for doesn't exist or has been removed."
              action={
                <Link
                  to="/applications"
                  className="inline-flex items-center justify-center font-medium transition-colors duration-120 rounded-[8px] bg-ink text-paper hover:opacity-90 h-10 px-4 text-[16px]"
                >
                  Back to applications
                </Link>
              }
            />
          ) : (
            <ErrorState
              title="Couldn't load replies"
              message={error?.message || "An unexpected error occurred."}
              onRetry={refetch}
            />
          )}
        </div>
      </PageContainer>
    );
  }

  const sortedReplies = sortAllReplies(replies);
  const showTimeline = sortedReplies.length >= 2;

  return (
    <PageContainer className="max-w-[768px]">
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {/* Header: Back button, company name + role (muted), Add reply button */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/applications/${id}`)}
            className="shrink-0 mt-0.5 sm:mt-0"
            aria-label="Back to application"
          >
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[26px] leading-[30px] sm:leading-[34px] font-bold text-ink tracking-[-0.015em] truncate">
              {application.companyName}
            </h1>
            {application.role && (
              <p className="text-[14px] leading-[20px] text-ink-soft truncate">
                {application.role}
              </p>
            )}
          </div>
        </div>

        {/* Show Add button only if replies exist or form is open (avoid duplicate in empty state) */}
        {(replies.length > 0 || isAddFormOpen) && (
          <div className="flex items-center gap-2 shrink-0">
            {isAtLimit && (
              <span className="text-[12px] leading-[16px] text-ink-soft">
                Limit reached
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

      {/* Main Container */}
      <div className="rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none">
        {/* Inline Add Reply Form at top of list */}
        {isAddFormOpen && (
          <div className="mb-6">
            <ReplyForm
              applicationId={id}
              initialReply={null}
              onClose={() => setIsAddFormOpen(false)}
              onSuccess={handleReplyAdded}
              triggerRef={addBtnRef}
            />
          </div>
        )}

        {/* Empty State (0 replies) */}
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
            className="py-10"
          />
        )}

        {/* All Replies List */}
        {sortedReplies.length > 0 && (
          <ol
            className={cn("relative space-y-4", showTimeline ? "pl-7" : "pl-0")}
          >
            {/* Timeline line when >= 2 replies */}
            {showTimeline && (
              <div
                className="absolute left-[13px] top-3.5 bottom-3.5 w-[2px] bg-rule pointer-events-none"
                aria-hidden="true"
              />
            )}

            {sortedReplies.map((reply) => {
              const isEditing = editingReplyId === reply._id;
              const hasDeadline = Boolean(reply.deadline);
              const isCompleted = Boolean(reply.completed);
              const isNewlyAdded = newlyAddedReplyId === reply._id;

              if (isEditing) {
                return (
                  <li key={reply._id} className="relative">
                    <div className="relative z-10">
                      <ReplyForm
                        applicationId={id}
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
                  {/* Timeline Marker Circle when >= 2 replies */}
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
                      id={`reply-${reply._id}`}
                      reply={reply}
                      editBtnRef={(el) => (editBtnRefs.current[reply._id] = el)}
                      onEdit={() => setEditingReplyId(reply._id)}
                      onDelete={() => setDeleteTarget(reply)}
                      onToggleComplete={(checked) =>
                        handleToggleComplete(reply._id, checked)
                      }
                      className={cn(
                        "transition-all duration-300",
                        isNewlyAdded &&
                          "ring-2 ring-primary bg-primary-soft/40"
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

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
    </PageContainer>
  );
}
