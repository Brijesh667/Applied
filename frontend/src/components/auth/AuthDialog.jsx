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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const authMode = searchParams.get("auth");
  const isOpen = authMode === "login" || authMode === "register";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilledEmail, setPrefilledEmail] = useState(location.state?.email || "");

  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (location.state?.email) {
      setPrefilledEmail(location.state.email);
    }
  }, [location.state?.email]);

  const cleanupScrollLock = useCallback(() => {
    document.body.style.paddingRight = "";
    document.body.style.overflow = "";
    const dialog = dialogRef.current;
    if (dialog?.parentElement) {
      Array.from(dialog.parentElement.children).forEach((el) => {
        if (el !== dialog) {
          el.removeAttribute("inert");
        }
      });
    }
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
      Array.from(dialog.parentElement.children).forEach((el) => {
        if (el !== dialog) {
          el.setAttribute("inert", "");
        }
      });
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        openerRef.current = document.activeElement;
        applyScrollLock();
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      cleanupScrollLock();
      if (openerRef.current && typeof openerRef.current.focus === "function") {
        openerRef.current.focus();
      }
    }

    return () => {
      cleanupScrollLock();
    };
  }, [isOpen, applyScrollLock, cleanupScrollLock]);

  const handleClose = () => {
    if (isSubmitting) return;

    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    cleanupScrollLock();

    // Always use URL-based navigation to remove the ?auth= param.
    // Previously used navigate(-1) for authOpenedInApp, but that can close
    // the browser tab if there is no previous history entry (e.g. fresh tab).
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("auth");
    const search = newParams.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, {
      replace: true,
      state: location.state,
    });

    if (openerRef.current && typeof openerRef.current.focus === "function") {
      openerRef.current.focus();
    }
  };

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
    const rect = dialogRef.current.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!isInDialog) {
      handleClose();
    }
  };

  const switchMode = (mode, email = "") => {
    if (email) {
      setPrefilledEmail(email);
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set("auth", mode);
    navigate(`?${newParams.toString()}`, {
      replace: true,
      state: { ...location.state, email: email || prefilledEmail },
    });
  };

  const handleSuccess = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    cleanupScrollLock();

    const dest = location.state?.from?.pathname || "/dashboard";
    navigate(dest, { replace: true });
  };

  if (!isOpen) return null;

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
    </dialog>
  );
}

export default AuthDialog;
