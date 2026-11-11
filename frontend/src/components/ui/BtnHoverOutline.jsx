import React from "react";
import { ChevronsRight } from "lucide-react";
import { Spinner } from "./Spinner.jsx";
import { cn } from "../../lib/cn.js";

export const ButtonHoverOutline = React.forwardRef(function ButtonHoverOutline(
  {
    as: Component = "button",
    children,
    className,
    disabled = false,
    loading = false,
    onClick,
    type = "button",
    ...props
  },
  ref
) {
  const isButton = Component === "button";

  return (
    <Component
      ref={ref}
      type={isButton ? type : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={disabled || loading ? "true" : undefined}
      onClick={disabled || loading ? undefined : onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 cursor-pointer px-5 py-2.5 text-[14px] leading-none",
        "bg-black text-white border-2 border-black hover:bg-white hover:text-black",
        "dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white",
        "rounded-full font-semibold select-none transition-all duration-200",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        (disabled || loading) && "opacity-50 pointer-events-none cursor-not-allowed",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          <span>{children || "Loading"}</span>
        </>
      ) : children ? (
        <>
          {children}
          <ChevronsRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </>
      ) : (
        <>
          <span>Know More</span>
          <ChevronsRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </>
      )}
    </Component>
  );
});

export default ButtonHoverOutline;
