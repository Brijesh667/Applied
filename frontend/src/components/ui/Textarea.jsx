/**
 * Textarea component
 * Accessible, token-styled multi-line textarea.
 */
import React, { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const Textarea = forwardRef(function Textarea(
  { className = "", rows = 3, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full p-3 rounded-[8px] border border-rule bg-sunken text-ink placeholder:text-placeholder text-[16px] leading-[24px] transition-colors duration-120 focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed resize-y",
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
