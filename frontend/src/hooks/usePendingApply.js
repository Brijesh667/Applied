import { useEffect, useRef } from "react";

export const PENDING_APPLY_STORAGE_KEY = "applied_pending_apply";

/**
 * Hook to detect when a user returns to the tab after clicking Apply.
 * If at least 3 seconds have passed and the job is not already tracked,
 * clears storage and triggers the "Did you apply?" dialog.
 */
export function usePendingApply({ jobs = [], isDialogOpen = false, onTriggerDialog }) {
  const isDialogOpenRef = useRef(isDialogOpen);
  isDialogOpenRef.current = isDialogOpen;

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const onTriggerRef = useRef(onTriggerDialog);
  onTriggerRef.current = onTriggerDialog;

  useEffect(() => {
    let timeoutId = null;

    const checkPendingApply = () => {
      if (typeof window === "undefined" || !window.sessionStorage) return;
      if (document.visibilityState === "hidden") return;
      if (isDialogOpenRef.current) return;

      let raw = null;
      try {
        raw = window.sessionStorage.getItem(PENDING_APPLY_STORAGE_KEY);
      } catch {
        return;
      }
      if (!raw) return;

      let pending = null;
      try {
        pending = JSON.parse(raw);
      } catch {
        try {
          window.sessionStorage.removeItem(PENDING_APPLY_STORAGE_KEY);
        } catch {}
        return;
      }

      if (!pending || !pending.jobId || typeof pending.at !== "number") {
        try {
          window.sessionStorage.removeItem(PENDING_APPLY_STORAGE_KEY);
        } catch {}
        return;
      }

      const elapsed = Date.now() - pending.at;

      // Must be at least 3 seconds old
      if (elapsed < 3000) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          checkPendingApply();
        }, 3000 - elapsed);
        return;
      }

      // Check if job exists in current results and is not already tracked
      const currentJobs = jobsRef.current || [];
      const targetJob = currentJobs.find((j) => j.id === pending.jobId);

      // Always clear pending record so it never shows more than once per Apply click
      try {
        window.sessionStorage.removeItem(PENDING_APPLY_STORAGE_KEY);
      } catch {}

      if (targetJob && !targetJob.trackedApplicationId) {
        if (typeof onTriggerRef.current === "function") {
          onTriggerRef.current(targetJob, pending.resumeId);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkPendingApply();
      }
    };

    const handleFocus = () => {
      checkPendingApply();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Initial check on mount in case user returned before hook mounted
    checkPendingApply();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
}

export default usePendingApply;
