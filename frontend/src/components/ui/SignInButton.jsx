import React from "react";
import { cn } from "../../lib/cn.js";

/**
 * SignInButton component
 * Pure text button with a smooth sweep fill and vertical roll hover animation.
 * Strictly contains NO icons or images.
 */
export const SignInButton = React.forwardRef(function SignInButton(
  {
    children = "Sign in",
    className,
    onClick,
    type = "button",
    ...props
  },
  ref
) {
  const label = typeof children === "string" ? children : "Sign in";

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      className={cn(
        "group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full px-5 select-none cursor-pointer",
        "border border-rule bg-surface/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs",
        "transition-all duration-300 ease-out",
        "hover:border-ink hover:shadow-md hover:scale-[1.02] dark:hover:border-white",
        "active:scale-[0.98]",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        className
      )}
      {...props}
    >
      {/* Smooth background sweep overlay on hover */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-ink dark:bg-white rounded-full pointer-events-none",
          "-translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0",
          "motion-reduce:transition-none motion-reduce:group-hover:transform-none"
        )}
      />

      {/* Pure text container with vertical sliding roll effect */}
      <span className="relative z-10 block h-[18px] overflow-hidden leading-[18px] pointer-events-none">
        <span
          className={cn(
            "flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2",
            "motion-reduce:transition-none motion-reduce:group-hover:transform-none pointer-events-none"
          )}
        >
          {/* Default text */}
          <span className="flex h-[18px] items-center justify-center text-[14px] font-semibold text-ink dark:text-white transition-colors duration-200 group-hover:text-paper dark:group-hover:text-black pointer-events-none">
            {label}
          </span>
          {/* Hover revealed text */}
          <span className="flex h-[18px] items-center justify-center text-[14px] font-semibold text-paper dark:text-black pointer-events-none">
            {label}
          </span>
        </span>
      </span>
    </button>
  );
});

SignInButton.displayName = "SignInButton";
export default SignInButton;
