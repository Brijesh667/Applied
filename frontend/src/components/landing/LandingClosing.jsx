/**
 * LandingClosing component
 * Redesigned bottom CTA section:
 * - Centered rounded card container (max-w-4xl) with dark slate gradient
 * - Centered heading, subtext, and solid primary CTA button
 * - Mobile responsive padding and typography
 */
import React from "react";
import { GradientButton } from "../ui/GradientButton.jsx";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { cn } from "../../lib/cn.js";

export function LandingClosing({ onOpenRegister }) {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="py-20 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div
          ref={sectionRef}
          className={cn(
            "rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-800",
            "px-4 py-10 sm:px-8 sm:py-12",
            "flex flex-col items-center text-center gap-6",
            "shadow-xl shadow-slate-950/20",
            "transition-all duration-[250ms] ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Start tracking your applications
            </h2>
            <p className="text-slate-400 text-base max-w-md">
              Log applications, track replies and never miss a follow-up.
            </p>
          </div>

          <GradientButton
            onClick={onOpenRegister}
            className="motion-reduce:transform-none"
          >
            Start tracking
          </GradientButton>
        </div>
      </div>
    </section>
  );
}

export default LandingClosing;

