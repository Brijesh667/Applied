/**
 * LandingClosing component
 * Compact bottom action strip:
 * - Simple layout: "Start tracking your applications" + Start button
 * - Uses the exact same GradientButton component as the hero
 * - Responsive flex-row on desktop, centered on mobile
 */
import React from "react";
import { GradientButton } from "../ui/GradientButton.jsx";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { cn } from "../../lib/cn.js";

export function LandingClosing({ onOpenRegister }) {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="border-t border-rule py-8 md:py-10 bg-surface/40 select-none">
      <div
        ref={sectionRef}
        className={cn(
          "max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-5",
          "transition-all duration-[250ms] ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
        )}
      >
        <span className="text-[20px] sm:text-[22px] md:text-[24px] font-bold tracking-tight text-ink text-center sm:text-left">
          Start tracking your applications
        </span>

        <GradientButton
          onClick={onOpenRegister}
          className="motion-reduce:transform-none shrink-0"
        >
          Start tracking
        </GradientButton>
      </div>
    </section>
  );
}

export default LandingClosing;
