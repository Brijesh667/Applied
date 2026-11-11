import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { Button } from "../ui/Button.jsx";
import { useTrackJob } from "../../hooks/useTrackJob.js";

/**
 * DidYouApplyDialog component
 * Asks the user if they applied after returning from the external site or clicking "Track application".
 * Focus-trapped modal using native <dialog>.
 */
export function DidYouApplyDialog({
  isOpen,
  job,
  resumeId,
  onClose,
  onSuccess,
  className = "",
  initialError404 = false, // Dev/testing prop
}) {
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const trackJobMutation = useTrackJob();
  const [error404Message, setError404Message] = useState(
    initialError404 ? "This job is no longer in your results. Search again." : null
  );

  useEffect(() => {
    if (initialError404) {
      setError404Message("This job is no longer in your results. Search again.");
    }
  }, [initialError404]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setError404Message(
        initialError404
          ? "This job is no longer in your results. Search again."
          : null
      );
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, initialError404]);

  const handleClose = () => {
    if (trackJobMutation.isPending) return;
    setError404Message(null);
    if (onClose) onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const handleTrack = async () => {
    if (!job || !resumeId || trackJobMutation.isPending) return;
    setError404Message(null);

    try {
      const result = await trackJobMutation.mutateAsync({
        resumeId,
        jobId: job.id,
      });

      const appId = result.applicationId;

      // Close dialog
      handleClose();

      if (typeof onSuccess === "function") {
        onSuccess(appId, job);
      }

      // Check if job had no pay in listing
      const hasNoPay = !job.pay || !job.pay.amount;

      toast.success("Added to your applications", {
        description: hasNoPay ? (
          <span>
            Pay and duration weren't listed. You can{" "}
            <Link
              to={`/applications/${appId}/edit`}
              className="underline font-medium hover:text-ink focus:outline-none"
            >
              edit them
            </Link>
            .
          </span>
        ) : undefined,
        action: {
          label: "View",
          onClick: () => navigate(`/applications/${appId}`),
        },
      });
    } catch (err) {
      if (err.status === 404) {
        setError404Message(
          "This job is no longer in your results. Search again."
        );
      } else if (err.status === 429) {
        handleClose();
        toast.error("You've reached the search rate limit. Please try again later.");
      } else {
        handleClose();
        toast.error("Couldn't track this application right now. Check your connection and try again.");
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
      onClick={handleBackdropClick}
      aria-labelledby="did-you-apply-title"
      className={cn(
        "backdrop:bg-black/40",
        "m-auto p-6 rounded-[16px] bg-surface text-ink border border-rule",
        "shadow-[0_12px_32px_rgb(0_0_0_/_0.18)] max-w-[440px] w-[calc(100%-32px)]",
        "transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
        "open:animate-in open:fade-in open:zoom-in-95 select-none",
        className
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Title */}
        <h2
          id="did-you-apply-title"
          className="text-[20px] leading-[26px] font-bold text-ink"
        >
          Did you apply?
        </h2>

        {/* 404 Inline Notice */}
        {error404Message ? (
          <div className="space-y-4">
            <div className="p-3 rounded-[8px] bg-sunken/60 border border-rule flex items-start gap-2.5 text-[14px] leading-[20px] text-ink">
              <AlertCircle className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error404Message}</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleClose}
                className="min-h-[44px]"
              >
                Okay
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Context paragraph showing job title and company */}
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Track your application for{" "}
              <strong className="font-semibold text-ink">
                {job?.title || "this role"}
              </strong>{" "}
              at{" "}
              <strong className="font-semibold text-ink">
                {job?.company || "the company"}
              </strong>{" "}
              to log replies and deadlines.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-rule/60">
              <Button
                variant="secondary"
                size="md"
                disabled={trackJobMutation.isPending}
                onClick={handleClose}
                className="min-h-[44px]"
              >
                Not yet
              </Button>

              <Button
                variant="primary"
                size="md"
                loading={trackJobMutation.isPending}
                disabled={trackJobMutation.isPending}
                onClick={handleTrack}
                className="min-h-[44px]"
              >
                Yes, track it
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

export default DidYouApplyDialog;
