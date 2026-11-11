/**
 * GradientButton component
 * A pill button with an animated gradient border and soft inner glow.
 * Adapted from stashui.vermarjun.xyz/r/gradient-button.json for this project's token system.
 * The gradient drifts continuously using the `gradient-x` keyframes (defined in index.css).
 */
import * as React from "react";
import { cn } from "../../lib/cn.js";

/**
 * @param {React.ComponentPropsWithoutRef<"button"> & { asChild?: boolean }} props
 */
export const GradientButton = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="group relative inline-flex rounded-full p-[1.5px] [background:linear-gradient(110deg,var(--color-primary-tint),var(--color-primary),var(--color-ink),var(--color-primary-tint))] [background-size:200%_auto] animate-gradient-x">
        <button
          ref={ref}
          className={cn(
            "relative inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-paper px-6 text-[16px] font-semibold text-ink",
            "transition-colors duration-300 group-hover:bg-paper/80",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }
);

GradientButton.displayName = "GradientButton";

export default GradientButton;
