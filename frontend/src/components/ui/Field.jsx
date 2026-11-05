/**
 * Field component
 * Accessible wrapper providing label, hint, error message, and optional character counter.
 */
import React from "react";
import { cn } from "../../lib/cn.js";

export function Field({
  id,
  label,
  hint,
  error,
  counter,
  required = false,
  className = "",
  children,
}) {
  const hintId = hint && id ? `${id}-hint` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const isOverLimit =
    counter && typeof counter.current === "number" && typeof counter.max === "number"
      ? counter.current > counter.max
      : false;

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <div className="flex items-center justify-between gap-2">
        {label && (
          <label
            htmlFor={id}
            className="text-[14px] leading-[20px] font-medium text-ink select-none"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        {counter && typeof counter.current === "number" && typeof counter.max === "number" && (
          <span
            className={cn(
              "text-[12px] leading-[16px] font-medium tnum select-none",
              isOverLimit ? "text-danger" : "text-ink-soft"
            )}
            aria-live="polite"
          >
            {counter.current}/{counter.max}
          </span>
        )}
      </div>

      {typeof children === "function"
        ? children({
            id,
            "aria-invalid": Boolean(error),
            "aria-describedby": describedBy,
          })
        : React.isValidElement(children)
        ? React.cloneElement(children, {
            id: children.props.id || id,
            "aria-invalid": Boolean(error),
            "aria-describedby": children.props["aria-describedby"] || describedBy,
          })
        : children}

      {hint && !error && (
        <p id={hintId} className="text-[12px] leading-[16px] text-ink-soft">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-[12px] leading-[16px] text-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
