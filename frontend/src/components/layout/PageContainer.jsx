/**
 * PageContainer component
 * Standard content container enforcing max-width (1120px) and responsive paddings.
 * Supports ref forwarding for layout and effect hooks.
 */
import React, { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const PageContainer = forwardRef(function PageContainer(
  { children, className = "" },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8",
        className
      )}
    >
      {children}
    </div>
  );
});

export default PageContainer;
