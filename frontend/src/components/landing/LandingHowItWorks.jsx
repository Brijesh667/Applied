/**
 * LandingHowItWorks component
 * Section 4 (id="how") "How it works":
 * - Full-bleed surface tint band with border-y border-rule/50
 * - Centered H2 heading (36px desktop / 28px mobile, mb-8 md:mb-12)
 * - Semantic <ol> with <li> per step; circles are aria-hidden decorative markers
 * - Desktop (md+): One row, 3 equal cards (gap 24px). Above the cards, a 1px rule
 *   horizontal line connects circle 1 to circle 3 only (origin-left, scaleX 0 to 1, 400ms).
 *   Each 40px circle sits centered above its card.
 * - Mobile (< md): Vertical list, vertical line runs down the left side through the circles,
 *   cards on the right.
 * - Content: Title (20-22px bold), 1-line description (ink-soft), Result strip (mt-auto)
 * - Motion: Staggered scroll reveal (80ms delay between cards), card glow hover (useCardFx),
 *   circle hover scale 1.05 (150ms). Reduced motion: instant visibility, no scale, line fully drawn.
 * - WCAG AA compliant contrast in both light and dark themes. Zero overflow at 320px.
 */
import React from "react";
import { howItWorksContent } from "../../lib/landingContent.js";
import { useCardFx } from "../../hooks/useCardFx.js";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { cn } from "../../lib/cn.js";

function StepItem({ step, idx, totalSteps, isVisible, delayMs }) {
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: true });

  return (
    <li
      style={{
        transitionDelay: isVisible ? `${delayMs}ms` : "0ms",
      }}
      className={cn(
        "group relative flex flex-row gap-4 md:flex-col md:gap-0 items-stretch h-full select-none",
        "transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
    >
      {/* ========================================================= */}
      {/* Desktop Circle (centered above card)                      */}
      {/* ========================================================= */}
      <div className="hidden md:flex justify-center mb-6 relative z-10 shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary font-semibold text-[15px] flex items-center justify-center relative tnum select-none transition-transform duration-150 ease-out group-hover:scale-105 motion-reduce:transform-none">
          <span aria-hidden="true">{step.number}</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Mobile Left Column (circle + vertical connecting line)   */}
      {/* ========================================================= */}
      <div className="md:hidden relative flex flex-col items-center shrink-0 w-10">
        {/* Line coming from above into circle center (steps 2, 3) */}
        {idx > 0 && (
          <div
            aria-hidden="true"
            className="absolute top-[-24px] w-px bg-rule left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ height: "44px" }}
          />
        )}

        {/* Line going from circle center down to next step (steps 1, 2) */}
        {idx < totalSteps - 1 && (
          <div
            aria-hidden="true"
            className="absolute top-5 bottom-[-24px] w-px bg-rule left-1/2 -translate-x-1/2 pointer-events-none"
          />
        )}

        {/* 40px Circle on Mobile */}
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary font-semibold text-[15px] flex items-center justify-center shrink-0 relative z-10 tnum select-none transition-transform duration-150 ease-out group-hover:scale-105 motion-reduce:transform-none">
          <span aria-hidden="true">{step.number}</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Card Body (Equal height, padding 24px)                    */}
      {/* ========================================================= */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <div
          ref={cardRef}
          {...handlers}
          className="card-fx rounded-[12px] bg-paper border border-rule p-6 flex flex-col justify-start h-full relative overflow-hidden"
        >
          {/* Top content */}
          <div className="relative z-10 flex flex-col flex-1 h-full">
            {/* Title (H3 style, 20-22px bold) */}
            <h3 className="text-[20px] md:text-[22px] leading-[28px] font-bold text-ink mb-2">
              {step.title}
            </h3>

            {/* One-line description (body, ink-soft) */}
            <p className="text-[15px] md:text-[16px] leading-[24px] text-ink-soft mb-6">
              {step.description}
            </p>

            {/* Result strip at the bottom of the card (mt-auto) */}
            <div className="mt-auto pt-4 border-t border-rule flex flex-col">
              <span className="text-[12px] leading-[16px] font-medium text-ink-soft block mb-1">
                {howItWorksContent.resultLabel || "Result"}
              </span>
              <span className="text-[14px] leading-[20px] font-medium text-ink block">
                {step.result}
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function LandingHowItWorks() {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });
  const steps = howItWorksContent.steps;

  return (
    <section
      id="how"
      className="bg-surface landing-section scroll-mt-14 md:scroll-mt-16 border-y border-rule/50"
    >
      <div ref={sectionRef} className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Section Heading (36px desktop / 28px mobile, mb-8 md:mb-12) */}
        <h2 className="landing-h2">
          {howItWorksContent.heading}
        </h2>

        {/* Steps Wrapper with Desktop Connector Line */}
        <div className="relative">
          {/* Desktop Horizontal Line: connects circle 1 to circle 3 only */}
          <div
            id="how-desktop-line"
            aria-hidden="true"
            style={{
              left: "calc(100% / 6 - 8px)",
              right: "calc(100% / 6 - 8px)",
              transformOrigin: "left",
            }}
            className={cn(
              "hidden md:block absolute top-5 -translate-y-1/2 h-px bg-rule transition-transform duration-400 ease-out z-0 pointer-events-none",
              "motion-reduce:transition-none motion-reduce:scale-x-100",
              isVisible ? "scale-x-100" : "scale-x-0"
            )}
          />

          {/* Semantic Ordered List */}
          <ol className="relative z-10 flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-6 items-stretch list-none p-0 m-0">
            {steps.map((step, idx) => (
              <StepItem
                key={step.number}
                step={step}
                idx={idx}
                totalSteps={steps.length}
                isVisible={isVisible}
                delayMs={idx * 80}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default LandingHowItWorks;
