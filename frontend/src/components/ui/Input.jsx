/**
 * Input component
 * Accessible, token-styled single-line input.
 */
import React, { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const Input = forwardRef(function Input(
  { className = "", type = "text", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full h-10 px-3 rounded-[8px] border border-rule bg-sunken text-ink placeholder:text-placeholder text-[16px] leading-[24px] transition-colors duration-120 focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
});

export default Input;
