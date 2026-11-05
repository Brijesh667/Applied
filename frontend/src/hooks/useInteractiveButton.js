/**
 * useInteractiveButton hook
 * Provides keyboard press feedback, pointer/keyboard click ripples, and ripple container ref
 * for buttons, icon buttons, menu items, segmented controls, and nav links.
 */
import { useRef, useCallback, useState } from "react";

export function triggerRipple(container, event, { isPrimary = false } = {}) {
  if (!container) return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const rect = container.getBoundingClientRect();
  let x, y;

  if (
    event &&
    typeof event.clientX === "number" &&
    (event.clientX !== 0 || event.clientY !== 0)
  ) {
    x = event.clientX - rect.left;
    y = event.clientY - rect.top;
  } else {
    // Keyboard activation (Enter/Space) or synthetic trigger -> center of control
    x = rect.width / 2;
    y = rect.height / 2;
  }

  const maxDistX = Math.max(x, rect.width - x);
  const maxDistY = Math.max(y, rect.height - y);
  const radius = Math.hypot(maxDistX, maxDistY);
  const diameter = radius * 2;

  // Cap at 3 live ripples per button
  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const ripple = document.createElement("span");
  ripple.className = `btn-ripple${isPrimary ? " btn-ripple-primary" : ""}`;
  ripple.style.left = `${x - radius}px`;
  ripple.style.top = `${y - radius}px`;
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;

  ripple.addEventListener(
    "animationend",
    () => {
      ripple.remove();
    },
    { once: true }
  );

  container.appendChild(ripple);
}

export function useInteractiveButton({
  disabled = false,
  loading = false,
  isPrimary = false,
  onPointerDown,
  onKeyDown,
  onKeyUp,
  onBlur,
} = {}) {
  const rippleRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = useCallback(
    (e) => {
      if (!disabled && !loading) {
        triggerRipple(rippleRef.current, e, { isPrimary });
      }
      onPointerDown?.(e);
    },
    [disabled, loading, isPrimary, onPointerDown]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.repeat && !disabled && !loading) {
        setIsPressed(true);
        triggerRipple(rippleRef.current, null, { isPrimary });
      }
      onKeyDown?.(e);
    },
    [disabled, loading, isPrimary, onKeyDown]
  );

  const handleKeyUp = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        setIsPressed(false);
      }
      onKeyUp?.(e);
    },
    [onKeyUp]
  );

  const handleBlur = useCallback(
    (e) => {
      setIsPressed(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  return {
    rippleRef,
    isPressed,
    handlers: {
      onPointerDown: handlePointerDown,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onBlur: handleBlur,
    },
  };
}

export default useInteractiveButton;
