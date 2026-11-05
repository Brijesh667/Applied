/**
 * DateField component
 * Native date input styled to design tokens with max date restriction to local today.
 */
import React, { forwardRef } from "react";
import { getLocalTodayString } from "../../../lib/applicationForm.js";
import { cn } from "../../../lib/cn.js";

export const DateField = forwardRef(function DateField(
  { value = "", onChange, onBlur, className = "", id, disabled = false, ...props },
  ref
) {
  const today = getLocalTodayString();

  return (
    <input
      ref={ref}
      id={id}
      type="date"
      max={today}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      className={cn(
        "w-full h-10 px-3 rounded-[8px] border border-rule bg-sunken text-ink text-[16px] leading-[24px] tnum transition-colors duration-120 focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
});

export default DateField;
