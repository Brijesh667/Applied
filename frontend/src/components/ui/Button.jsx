/**
 * Button component
 * Accessible, token-styled button supporting primary, secondary, ghost, and danger variants.
 * Animated on hover (lift, shadow underlay, background shift, icon motion) and press (scale down, click ripple).
 */
import React from "react";
import { cn } from "../../lib/cn.js";
import { Spinner } from "./Spinner.jsx";
import { useInteractiveButton } from "../../hooks/useInteractiveButton.js";

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  onPointerDown,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}) {
  const isPrimary = variant === "primary";

  const { rippleRef, isPressed, handlers } = useInteractiveButton({
    disabled,
    loading,
    isPrimary,
    onPointerDown,
    onKeyDown,
    onKeyUp,
    onBlur,
  });

  const baseStyles =
    "btn-interactive select-none relative inline-flex items-center justify-center font-medium rounded-[8px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--outline-focus)] focus-visible:outline-offset-2";

  const variants = {
    primary: "btn-lift btn-primary bg-primary text-on-primary",
    secondary: "btn-lift btn-secondary bg-surface text-ink border border-rule",
    ghost: "btn-ghost bg-transparent text-ink",
    danger: "btn-lift btn-danger bg-danger text-paper",
  };

  const sizes = {
    sm: "h-8 px-3 text-[14px] leading-[20px] gap-1.5",
    md: "h-10 px-4 text-[16px] leading-[24px] gap-2",
    lg: "h-12 px-6 text-[16px] leading-[24px] gap-2.5 font-bold",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-loading={loading ? "true" : undefined}
      className={cn(
        baseStyles,
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        isPressed && "is-pressed",
        className
      )}
      {...handlers}
      {...props}
    >
      {/* Click ripple layer */}
      <span ref={rippleRef} className="btn-ripple-container" aria-hidden="true" />

      {loading ? (
        <>
          <span className="invisible">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center z-[2]">
            <Spinner size={size === "sm" ? "sm" : "md"} />
          </span>
        </>
      ) : (
        <span className="relative z-[2] inline-flex items-center">{children}</span>
      )}
    </button>
  );
}

export default Button;
