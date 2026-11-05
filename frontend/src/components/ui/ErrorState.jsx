/**
 * ErrorState component
 * Displays an error notice with an actionable retry button.
 */
import React from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "./Button.jsx";

export function ErrorState({
  title = "Something went wrong",
  message = "Can't reach the server. Check your connection and try again.",
  description,
  onRetry,
  action,
  className = "",
  headingTag: Heading = "h3",
}) {
  const displayText = description || message;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-[12px] bg-surface border border-rule",
        className
      )}
    >
      <Heading className="text-[18px] leading-[26px] font-bold text-ink mb-1">
        {title}
      </Heading>
      <p className="text-[14px] leading-[20px] text-ink-soft max-w-[420px] mb-4">
        {displayText}
      </p>
      {action
        ? action
        : onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
    </div>
  );
}

export default ErrorState;
