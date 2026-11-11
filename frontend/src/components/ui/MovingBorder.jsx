import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import { cn } from "../../lib/cn.js";

export function Button({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration = 3000,
  className,
  ...otherProps
}) {
  return (
    <Component
      className={cn(
        "relative h-9 w-40 overflow-hidden bg-transparent p-[1px] text-sm select-none",
        otherProps.disabled && "opacity-50 pointer-events-none cursor-not-allowed",
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        {/* GPU-accelerated rotating gradient beam fallback */}
        <div
          className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] opacity-70 pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, #0ea5e9 360deg)",
          }}
        />

        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-[0.85]",
              borderClassName
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center border border-slate-800 bg-slate-900/[0.85] text-sm text-white antialiased backdrop-blur-xl",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export const MovingBorder = ({
  children,
  duration = 3000,
  rx = "30%",
  ry = "30%",
  ...otherProps
}) => {
  const pathRef = useRef(null);
  const progress = useMotionValue(0);
  const safeDuration = typeof duration === "number" && duration > 0 ? duration : 3000;

  useAnimationFrame((time) => {
    try {
      if (!pathRef.current || typeof pathRef.current.getTotalLength !== "function") return;
      const length = pathRef.current.getTotalLength();
      if (typeof length === "number" && isFinite(length) && length > 0) {
        const pxPerMillisecond = length / safeDuration;
        const currentPos = (time * pxPerMillisecond) % length;
        if (isFinite(currentPos) && currentPos >= 0) {
          progress.set(currentPos);
        }
      }
    } catch {
      // Safe fallback: never throw
    }
  });

  const x = useTransform(progress, (val) => {
    try {
      if (!pathRef.current || typeof pathRef.current.getPointAtLength !== "function") return 0;
      if (typeof val !== "number" || isNaN(val) || !isFinite(val) || val < 0) return 0;
      const pt = pathRef.current.getPointAtLength(val);
      return typeof pt?.x === "number" && isFinite(pt.x) ? pt.x : 0;
    } catch {
      return 0;
    }
  });

  const y = useTransform(progress, (val) => {
    try {
      if (!pathRef.current || typeof pathRef.current.getPointAtLength !== "function") return 0;
      if (typeof val !== "number" || isNaN(val) || !isFinite(val) || val < 0) return 0;
      const pt = pathRef.current.getPointAtLength(val);
      return typeof pt?.y === "number" && isFinite(pt.y) ? pt.y : 0;
    } catch {
      return 0;
    }
  });

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full pointer-events-none"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
        className="pointer-events-none"
      >
        {children}
      </motion.div>
    </>
  );
};

export default Button;
