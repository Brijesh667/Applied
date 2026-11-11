/**
 * LandingHero component
 * Public landing page hero:
 * - 2 columns on lg and up, vertically centered. Stacked below lg (text first, preview below).
 * - Typography: landing-h1 (56px desktop / 36px mobile), landing-body (18px desktop / 16px mobile, line-height 1.6).
 * - CTA: 48px height, px-6, 16px semibold, primary. Nothing beside or under it.
 * - Right: Composed dashboard preview (3 KPI mini cards stacked directly above Needs attention preview card).
 *   Fits within first viewport at 1440x900 and does not start above the headline.
 * - Decorative preview: aria-hidden, inert, pointer-events-none.
 * - Subtle ambient primary radial glow background.
 * - Animated fade-up on scroll reveal.
 */
import React, { useMemo } from "react";
import LightRays from "@/registry/react-bits/LightRays";
import { GradientButton } from "../ui/GradientButton.jsx";
import { ReplyTypeBadge } from "../ui/ReplyTypeBadge.jsx";
import { DueChip } from "../ui/DueChip.jsx";
import { useCardFx } from "../../hooks/useCardFx.js";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { heroContent } from "../../lib/landingContent.js";
import { heroKpis, getSampleHeroAttention } from "../../lib/landingSamples.js";
import { cn } from "../../lib/cn.js";

function HeroRightPreview() {
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: true });
  const sampleAttention = useMemo(() => {
    const raw = getSampleHeroAttention();
    // 1 item in This week and 1 item in Missed to fit viewport perfectly and align with headline
    return {
      thisWeek: raw.thisWeek.slice(0, 1),
      missed: raw.missed.slice(0, 1),
    };
  }, []);

  return (
    <div
      ref={cardRef}
      {...handlers}
      className="card-fx rounded-[12px] bg-surface border border-rule p-3.5 sm:p-4 select-none w-full max-w-[480px] mx-auto lg:mr-0 flex flex-col gap-2.5"
      role="img"
      aria-label="Preview of dashboard KPIs and Needs attention card"
    >
      <div className="relative z-10 flex flex-col gap-2.5" aria-hidden="true" inert="">
        {/* 3 KPI Mini Cards */}
        <div className="grid grid-cols-3 gap-2">
          {heroKpis.map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "rounded-[8px] bg-surface p-2 sm:p-2.5 border flex flex-col justify-between",
                kpi.variant === "danger"
                  ? "border-danger-tint"
                  : kpi.variant === "primary"
                  ? "border-primary-tint"
                  : "border-rule"
              )}
            >
              <span className="text-[11px] font-semibold text-ink-soft leading-tight truncate">
                {kpi.label}
              </span>
              <span
                className={cn(
                  "text-[20px] sm:text-[22px] font-bold tnum tracking-tight my-0.5",
                  kpi.variant === "danger"
                    ? "text-danger"
                    : kpi.variant === "primary"
                    ? "text-primary"
                    : "text-ink"
                )}
              >
                {kpi.value}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium truncate",
                  kpi.variant === "danger"
                    ? "text-danger"
                    : kpi.variant === "primary"
                    ? "text-primary"
                    : "text-ink-soft"
                )}
              >
                {kpi.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Needs attention card preview */}
        <div className="rounded-[10px] bg-sunken/30 border border-rule/70 p-2.5 sm:p-3 flex flex-col gap-2.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-rule/50">
            <span className="text-[13px] sm:text-[14px] font-bold text-ink">
              Needs attention
            </span>
            <span className="text-[11px] font-semibold text-ink-soft tnum">
              2 items
            </span>
          </div>

          {/* This week section (1 row) */}
          <div className="rounded-[8px] p-2 bg-surface border border-primary-tint/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-bold text-ink flex items-center gap-1">
                <span>This week</span>
                <span className="text-primary font-semibold text-[11px] tnum">
                  (1)
                </span>
              </span>
            </div>

            <ul className="space-y-1.5 list-none p-0 m-0 pointer-events-none">
              {sampleAttention.thisWeek.map((item) => (
                <li
                  key={item.id}
                  className="rounded-[6px] border border-rule/50 bg-paper/60 p-2 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[12px] text-ink truncate block">
                        {item.company}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate block">
                        {item.role}
                      </span>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center h-6 px-2 rounded-[4px] border border-rule bg-surface text-[11px] font-medium text-ink">
                      Done
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    <ReplyTypeBadge type={item.type} className="w-full min-w-0" />
                    <DueChip deadline={item.deadline} className="w-full min-w-0" />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Missed section (1 row) */}
          <div className="rounded-[8px] p-2 bg-surface border border-danger-tint/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-bold text-danger flex items-center gap-1">
                <span>Missed</span>
                <span className="text-danger font-semibold text-[11px] tnum">
                  (1)
                </span>
              </span>
            </div>

            <ul className="space-y-1.5 list-none p-0 m-0 pointer-events-none">
              {sampleAttention.missed.map((item) => (
                <li
                  key={item.id}
                  className="rounded-[6px] border border-rule/50 bg-paper/60 p-2 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[12px] text-ink truncate block">
                        {item.company}
                      </span>
                      <span className="text-[11px] text-ink-soft truncate block">
                        {item.role}
                      </span>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center h-6 px-2 rounded-[4px] border border-rule bg-surface text-[11px] font-medium text-ink">
                      Done
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    <ReplyTypeBadge type={item.type} className="w-full min-w-0" />
                    <DueChip
                      deadline={item.deadline}
                      inMissedGroup={true}
                      className="w-full min-w-0"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero({ onOpenRegister }) {
  const { ref: revealRef, isVisible } = useScrollReveal({ threshold: 0.05 });

  // Memoize LightRays background so it never re-renders or degrades performance on parent updates
  const memoizedLightRays = useMemo(
    () => (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1}
          lightSpread={1}
          rayLength={2}
          pulsating={false}
          followMouse={true}
          mouseInfluence={0.15}
        />
      </div>
    ),
    []
  );

  return (
    <section className="relative hero-radial-glow landing-section overflow-hidden">
      {memoizedLightRays}
      <div
        ref={revealRef}
        className={cn(
          "relative z-10 max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 transition-all duration-[250ms] ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-10 lg:gap-16">
          {/* Left Column: Headline, subtext, actions */}
          <div className="flex flex-col justify-center">
            <h1 className="landing-h1">
              {heroContent.headline}
            </h1>

            <p className="landing-body mt-5 max-w-[46ch]">
              {heroContent.subtext}
            </p>

            <div className="mt-9">
              <GradientButton
                onClick={onOpenRegister}
                className="motion-reduce:transform-none"
              >
                {heroContent.cta}
              </GradientButton>
            </div>
          </div>

          {/* Right Column: Composed dashboard preview */}
          <div className="w-full flex justify-center lg:justify-end">
            <HeroRightPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingHero;
