/**
 * IconButton component
 * Square 40px (44px on touch) accessible button with required aria-label.
 * Animated on hover (background shift to sunken, icon scale 1.08) and press (scale down, click ripple).
 */
import React, { forwardRef } from "react";
import { cn } from "../../lib/cn.js";
import { useInteractiveButton } from "../../hooks/useInteractiveButton.js";

export const IconButton = forwardRef(function IconButton(
  {
    "aria-label": ariaLabel,
    variant = "ghost",
    children,
    className = "",
    type = "button",
    disabled = false,
    onPointerDown,
    onKeyDown,
    onKeyUp,
    onBlur,
    ...props
  },
  ref
) {
  if (!ariaLabel) {
    console.warn("IconButton: 'aria-label' is required for accessibility.");
  }

  const { rippleRef, isPressed, handlers } = useInteractiveButton({
    disabled,
    isPrimary: false,
    onPointerDown,
    onKeyDown,
    onKeyUp,
    onBlur,
  });

  const baseStyles =
    "icon-btn btn-interactive relative inline-flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-[8px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--outline-focus)] focus-visible:outline-offset-2";

  const variants = {
    ghost: "btn-ghost bg-transparent text-ink",
    secondary: "btn-lift btn-secondary bg-surface text-ink border border-rule",
  };

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        baseStyles,
        variants[variant] || variants.ghost,
        isPressed && "is-pressed",
        className
      )}
      {...handlers}
      {...props}
    >
      <span ref={rippleRef} className="btn-ripple-container" aria-hidden="true" />
      <span className="relative z-[2] inline-flex items-center justify-center text-[13px] font-medium">
        {children}
      </span>
    </button>
  );
});

export default IconButton;
