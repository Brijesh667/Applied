/**
 * PasswordInput component
 * Accessible password input with integrated show/hide text toggle.
 */
import React, { forwardRef, useState } from "react";
import { cn } from "../../lib/cn.js";

export const PasswordInput = forwardRef(function PasswordInput(
  { className = "", id, ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        id={id}
        type={showPassword ? "text" : "password"}
        className={cn(
          "w-full h-10 pl-3 pr-14 rounded-[8px] border border-rule bg-sunken text-ink placeholder:text-placeholder text-[16px] leading-[24px] transition-colors duration-120 focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-rule/40 rounded-[4px] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-ink select-none cursor-pointer"
        tabIndex={0}
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>
  );
});

export default PasswordInput;
