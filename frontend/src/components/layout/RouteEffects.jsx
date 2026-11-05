/**
 * RouteEffects component
 * Manages scroll restoration, focus management to #main (or hash target), and screen-reader announcements
 * on pathname transitions (excluding query-string changes).
 * On POP navigation (browser Back/Forward), scroll is NOT reset to 0 to preserve position.
 * When a location hash is present (e.g. #replies), scrolls that target into view and focuses it.
 */
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function RouteEffects() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const isFirstRender = useRef(true);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }

    if (hash) {
      const targetId = hash.replace(/^#/, "");
      let attempts = 0;
      const maxAttempts = 15; // 15 * 30ms = 450ms

      const tryScrollToHash = () => {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          if (!targetEl.hasAttribute("tabIndex")) {
            targetEl.setAttribute("tabIndex", "-1");
          }
          targetEl.focus({ preventScroll: true });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryScrollToHash, 30);
        }
      };

      tryScrollToHash();
    } else {
      // Scroll to top only on PUSH / REPLACE navigation (not on POP / Back button)
      if (navType !== "POP") {
        window.scrollTo(0, 0);
      }

      // Focus main landmark with preventScroll: true for all navigation types
      const mainEl = document.getElementById("main");
      if (mainEl) {
        mainEl.focus({ preventScroll: true });
      }
    }

    // Announce page title to screen readers
    const timer = setTimeout(() => {
      setAnnouncement(document.title);
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname, hash, navType]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

export default RouteEffects;