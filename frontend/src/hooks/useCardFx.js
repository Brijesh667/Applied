/**
 * useCardFx hook
 * Shared 3D tilt and cursor glow spotlight effect for cards.
 * Updates CSS variables (--rx, --ry, --mx, --my) via requestAnimationFrame.
 * Strictly checks (hover: hover) and (pointer: fine) and prefers-reduced-motion.
 *
 * Options:
 * - tilt (boolean): enables 3D tilt rotation (default: true).
 * - glow (boolean): enables radial cursor glow spotlight (default: true).
 * - ref (React.Ref): optional external ref.
 */
import { useRef, useEffect, useCallback } from "react";

export function useCardFx({ tilt = true, glow = true, ref: externalRef } = {}) {
  const internalRef = useRef(null);
  const cardRef = externalRef || internalRef;
  const rafRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (
        typeof window === "undefined" ||
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const card = cardRef.current;
      if (!card) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const rect = card.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;

          if (glow) {
            card.style.setProperty("--mx", `${x.toFixed(1)}px`);
            card.style.setProperty("--my", `${y.toFixed(1)}px`);
          }

          if (tilt) {
            const normX = Math.max(
              -1,
              Math.min(1, (x - rect.width / 2) / (rect.width / 2))
            );
            const normY = Math.max(
              -1,
              Math.min(1, (y - rect.height / 2) / (rect.height / 2))
            );

            const rx = -normY * 4;
            const ry = normX * 4;

            card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
            card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
          }
        });
      }
    },
    [cardRef, tilt, glow]
  );

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const card = cardRef.current;
    if (card) {
      if (tilt) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
      if (glow) {
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      }
    }
  }, [cardRef, tilt, glow]);

  return {
    cardRef,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    },
  };
}

export default useCardFx;
