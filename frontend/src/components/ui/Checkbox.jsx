/**
 * Checkbox component
 * Custom-styled, accessible checkbox with ink fill and an animated indicator.
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  className = "",
  ...props
}) {
  const inputId = id || (label ? `cb-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex items-center gap-2.5 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "w-5 h-5 rounded-[6px] border border-rule bg-surface transition-colors duration-120 flex items-center justify-center",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2",
            checked && "bg-primary border-primary text-on-primary"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-[2px] bg-on-primary transition-all duration-120 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
              checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}
            aria-hidden="true"
          />
        </div>
      </div>
      {label && (
        <span className="text-[14px] leading-[20px] text-ink font-medium">
          {label}
        </span>
      )}
    </label>
  );
}

export default Checkbox;
