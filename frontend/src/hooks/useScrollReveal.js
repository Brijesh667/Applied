/**
 * useScrollReveal hook
 * Lightweight IntersectionObserver hook for viewport entrance animations.
 * Defaults to immediately visible on SSR, unsupported browsers, or prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";

export function useScrollReveal(options = {}) {
  const { threshold = 0.1, rootMargin = "0px 0px -20px 0px" } = options;
  const ref = useRef(null);

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return true;
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isVisible) return;

    const el = ref.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, threshold, rootMargin]);

  return { ref, isVisible };
}

export default useScrollReveal;
