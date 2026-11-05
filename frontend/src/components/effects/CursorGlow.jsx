/**
 * CursorGlow component
 * Soft ambient cursor glow (360px circle) positioned fixed below page content.
 * Follows the pointer with LERP smoothing (0.18) via a single rAF loop that terminates
 * when idle (< 0.1px distance) for zero CPU cost when still.
 * Strictly disabled on touch devices and under prefers-reduced-motion.
 */
import React, { useEffect, useRef } from "react";

export function CursorGlow({ className = "" }) {
  const glowRef = useRef(null);

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const isSupported = () => hoverQuery.matches && !motionQuery.matches;

    const el = glowRef.current;
    if (!el || !isSupported()) return;

    let rafId = null;
    let targetX = -9999;
    let targetY = -9999;
    let currentX = -9999;
    let currentY = -9999;
    let isVisible = false;
    let hasMoved = false;

    const LERP_FACTOR = 0.18;
    const EPSILON = 0.1;

    function renderGlow() {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const dist = Math.hypot(dx, dy);

      if (dist < EPSILON) {
        currentX = targetX;
        currentY = targetY;
        el.style.transform = `translate3d(${currentX - 180}px, ${currentY - 180}px, 0)`;
        rafId = null; // Idle: stop rAF completely
        return;
      }

      currentX += dx * LERP_FACTOR;
      currentY += dy * LERP_FACTOR;
      el.style.transform = `translate3d(${currentX - 180}px, ${currentY - 180}px, 0)`;

      rafId = requestAnimationFrame(renderGlow);
    }

    function onPointerMove(e) {
      if (!isSupported()) return;

      targetX = e.clientX;
      targetY = e.clientY;

      if (!hasMoved) {
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        el.style.transform = `translate3d(${currentX - 180}px, ${currentY - 180}px, 0)`;
      }

      if (!isVisible) {
        isVisible = true;
        el.style.opacity = "1";
      }

      if (!rafId) {
        rafId = requestAnimationFrame(renderGlow);
      }
    }

    function onPointerLeave() {
      isVisible = false;
      el.style.opacity = "0";
    }

    function onVisibilityChange() {
      if (document.hidden) {
        isVisible = false;
        el.style.opacity = "0";
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    }

    function handleMediaChange() {
      if (!isSupported()) {
        el.style.opacity = "0";
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave, {
      passive: true,
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    hoverQuery.addEventListener("change", handleMediaChange);
    motionQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);

      hoverQuery.removeEventListener("change", handleMediaChange);
      motionQuery.removeEventListener("change", handleMediaChange);

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className={`page-cursor-glow fixed top-0 left-0 w-[360px] h-[360px] rounded-full pointer-events-none opacity-0 transition-opacity duration-200 z-0 will-change-transform ${className}`}
      style={{
        background:
          "radial-gradient(circle, rgb(var(--glow-rgb) / var(--glow-alpha-page)) 0%, transparent 68%)",
        transform: "translate3d(-9999px, -9999px, 0)",
      }}
    />
  );
}

export default CursorGlow;
