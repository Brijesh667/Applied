/**
 * useCardSpotlight hook
 * Delegated pointermove listener on cards grid container.
 * Calculates --mx and --my CSS variables on the hovered card via rAF.
 * Caches card getBoundingClientRect(), refreshed on scroll and resize.
 * Zero React state updates per pointermove (zero re-renders).
 */
import { useEffect } from "react";

export function useCardSpotlight(containerRef) {
  useEffect(() => {
    const container = containerRef?.current || document;
    if (!container) return;

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const isSupported = () => hoverQuery.matches && !motionQuery.matches;

    if (!isSupported()) return;

    // Cache of card bounding client rects
    const rectCache = new WeakMap();
    let activeCard = null;
    let lastClientX = -9999;
    let lastClientY = -9999;
    let rafId = null;

    function getCardRect(card) {
      let rect = rectCache.get(card);
      if (!rect) {
        rect = card.getBoundingClientRect();
        rectCache.set(card, rect);
      }
      return rect;
    }

    function refreshActiveSpotlight() {
      if (activeCard) {
        // Refresh rect from DOM on scroll/resize
        const rect = activeCard.getBoundingClientRect();
        rectCache.set(activeCard, rect);

        const mx = lastClientX - rect.left;
        const my = lastClientY - rect.top;
        activeCard.style.setProperty("--mx", `${mx}px`);
        activeCard.style.setProperty("--my", `${my}px`);
      }
    }

    function updateSpotlight() {
      rafId = null;
      if (!activeCard) return;

      const rect = getCardRect(activeCard);
      const mx = lastClientX - rect.left;
      const my = lastClientY - rect.top;

      activeCard.style.setProperty("--mx", `${mx}px`);
      activeCard.style.setProperty("--my", `${my}px`);
    }

    function onPointerMove(e) {
      if (!isSupported()) return;

      lastClientX = e.clientX;
      lastClientY = e.clientY;

      const card = e.target.closest("[data-spotlight]");
      if (card && container.contains(card)) {
        if (activeCard !== card) {
          activeCard = card;
        }

        if (!rafId) {
          rafId = requestAnimationFrame(updateSpotlight);
        }
      } else {
        activeCard = null;
      }
    }

    function onScrollOrResize() {
      refreshActiveSpotlight();
    }

    function handleMediaChange() {
      if (!isSupported()) {
        activeCard = null;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    }

    container.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    hoverQuery.addEventListener("change", handleMediaChange);
    motionQuery.addEventListener("change", handleMediaChange);

    return () => {
      container.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      hoverQuery.removeEventListener("change", handleMediaChange);
      motionQuery.removeEventListener("change", handleMediaChange);

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [containerRef]);
}

export default useCardSpotlight;
