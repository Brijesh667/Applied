/**
 * AuthDialog component
 * Accessible, URL-driven modal for login and registration.
 * Built on the HTML5 <dialog> element.
 * Features:
 * - See-through backdrop using --backdrop-auth (sharp landing page behind)
 * - Deep multi-layered shadow using --shadow-dialog-auth and 1px border using --border-dialog-auth
 * - Radius: 16px (rounded-[16px])
 * - Open animation: fade + scale from 0.98, 180ms ease-out (reduced-motion: opacity only)
 * - Body scroll lock with scrollbar width compensation (zero horizontal layout shift)
 * - Accessibility: focus trap, Esc closes, outside click closes, focus return, aria-modal, aria-labelledby
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../ui/Logo.jsx";
import { LoginForm } from "./LoginForm.jsx";
import { RegisterForm } from "./RegisterForm.jsx";
import { cn } from "../../lib/cn.js";

export function AuthDialog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const authMode = searchParams.get("auth");
  const isOpen = authMode === "login" || authMode === "register";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilledEmail, setPrefilledEmail] = useState(location.state?.email || "");

  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const inertSiblingsRef = useRef([]);

  useEffect(() => {
    if (location.state?.email) {
      setPrefilledEmail(location.state.email);
    }
  }, [location.state?.email]);

  const cleanupScrollLock = useCallback(() => {
    try {
      document.body.style.paddingRight = "";
      document.body.style.overflow = "";

      // Remove inert from all tracked elements
      if (inertSiblingsRef.current && inertSiblingsRef.current.length > 0) {
        inertSiblingsRef.current.forEach((el) => {
          try {
            el.removeAttribute("inert");
          } catch {}
        });
        inertSiblingsRef.current = [];
      }

      // Safety fallback: ensure dialog siblings and body elements are not inert
      const dialog = dialogRef.current;
      if (dialog?.parentElement) {
        Array.from(dialog.parentElement.children).forEach((el) => {
          if (el !== dialog) {
            try {
              el.removeAttribute("inert");
            } catch {}
          }
        });
      }
    } catch {}
  }, []);

  const applyScrollLock = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Compensate scrollbar width to prevent horizontal layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    // Mark background siblings inert so page behind is non-interactive
    if (dialog.parentElement) {
      const siblingsToInert = Array.from(dialog.parentElement.children).filter(
        (el) => el !== dialog && !el.hasAttribute("inert")
      );
      siblingsToInert.forEach((el) => {
        try {
          el.setAttribute("inert", "");
        } catch {}
      });
      inertSiblingsRef.current = siblingsToInert;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;

    const dialog = dialogRef.current;
    if (dialog?.open) {
      try {
        dialog.close();
      } catch {}
    }
    cleanupScrollLock();

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("auth");
        return next;
      },
      { replace: true, state: location.state }
    );

    if (openerRef.current && typeof openerRef.current.focus === "function") {
      try {
        openerRef.current.focus();
      } catch {}
    }
  }, [isSubmitting, setSearchParams, location.state, cleanupScrollLock]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        openerRef.current = document.activeElement;
        applyScrollLock();
        try {
          dialog.showModal();
        } catch (err) {
          console.error("Failed to open dialog:", err);
        }
      }
    } else {
      if (dialog.open) {
        try {
          dialog.close();
        } catch {}
      }
      cleanupScrollLock();
      if (openerRef.current && typeof openerRef.current.focus === "function") {
        try {
          openerRef.current.focus();
        } catch {}
      }
    }

    return () => {
      cleanupScrollLock();
    };
  }, [isOpen, applyScrollLock, cleanupScrollLock]);

  const handleCancel = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    handleClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableEls = dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableEls).filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || document.activeElement === dialog) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (isSubmitting || !dialogRef.current) return;
    // Clicks on child elements inside dialog must never close the dialog
    if (e.target !== dialogRef.current) return;

    const rect = dialogRef.current.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    // Must be an actual pointer click outside bounds, not keyboard activation (0, 0)
    if (isOutside && (e.clientX !== 0 || e.clientY !== 0)) {
      handleClose();
    }
  };

  const switchMode = (mode, email = "") => {
    if (email) {
      setPrefilledEmail(email);
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("auth", mode);
        return next;
      },
      {
        replace: true,
        state: { ...location.state, email: email || prefilledEmail },
      }
    );
  };

  const handleSuccess = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      try {
        dialog.close();
      } catch {}
    }
    cleanupScrollLock();

    const from = location.state?.from;
    const dest = from
      ? `${from.pathname || "/dashboard"}${from.search || ""}${from.hash || ""}`
      : "/dashboard";
    navigate(dest, { replace: true });
  }, [location.state, navigate, cleanupScrollLock]);

  return (
    <dialog
      ref={dialogRef}
      id="auth-dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      className={cn(
        "auth-dialog",
        "m-auto p-6 sm:p-8 rounded-[16px]",
        "w-[calc(100%-32px)] sm:max-w-[440px]",
        "overflow-visible select-none outline-none focus:outline-none"
      )}
    >
      {isOpen && (
        <div className="flex flex-col max-h-[calc(100dvh-64px)] overflow-y-auto">
          {/* Top Header Row: Logo & Close */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <Logo size="sm" />
            <button
              type="button"
              aria-label="Close dialog"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-[13px] font-medium text-ink-soft hover:text-ink px-2.5 py-1 rounded-[6px] hover:bg-sunken transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-primary cursor-pointer disabled:opacity-50"
            >
              Close
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="mb-6">
            <h2
              id="auth-dialog-title"
              className="text-[28px] leading-[34px] font-bold text-ink"
            >
              {authMode === "login" ? "Log in" : "Create your log"}
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft mt-1">
              {authMode === "login"
                ? "Pick up where your applications left off."
                : "Track every application and every deadline in one place."}
            </p>
          </div>

          {/* Form */}
          {authMode === "login" ? (
            <LoginForm
              initialEmail={prefilledEmail}
              onSuccess={handleSuccess}
              onSwitchToRegister={() => switchMode("register")}
              onSubmittingChange={setIsSubmitting}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={(email) => switchMode("login", email)}
              onSubmittingChange={setIsSubmitting}
            />
          )}
        </div>
      )}
    </dialog>
  );
}

export default AuthDialog;
