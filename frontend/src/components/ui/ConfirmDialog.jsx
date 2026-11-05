/**
 * ConfirmDialog component
 * Built on the native <dialog> element for automatic focus trapping and Escape key handling.
 * Radius: 16px, Overlay shadow: 0 12px 32px rgb(0 0 0 / 0.18).
 */
import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";

export function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  className = "",
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleCancel = (e) => {
    e.preventDefault();
    if (!loading && onCancel) {
      onCancel();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      handleCancel(e);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={cn(
        "backdrop:bg-black/40",
        "m-auto p-6 rounded-[16px] bg-surface text-ink border border-rule",
        "shadow-[0_12px_32px_rgb(0_0_0_/_0.18)] max-w-[440px] w-[calc(100%-32px)]",
        "transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
        "open:animate-in open:fade-in open:zoom-in-95",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-[20px] leading-[26px] font-bold text-ink">
          {title}
        </h2>
        {description && (
          <p className="text-[14px] leading-[20px] text-ink-soft">
            {description}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 mt-3">
          <Button
            variant="secondary"
            size="md"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="md"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
