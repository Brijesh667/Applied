/**
 * Select component
 * Accessible, token-styled dropdown select.
 */
import React, { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const Select = forwardRef(function Select(
  { className = "", children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full h-10 px-3 rounded-[8px] border border-rule bg-sunken text-ink text-[16px] leading-[24px] transition-colors duration-120 focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
