/**
 * LandingProblemSolution component
 * Section 3 (id="solution") "Why a tracker":
 * - Three full-width alternating rows:
 *   1. Scattered applications -> Filter bar + 2 application cards
 *   2. Lost deadlines -> 2 reply rows with due chip and Done button
 *   3. Platform outcomes -> Status bar with 4 stats + 3 platform rows with thin bars
 * - Spacing: 96px desktop / 64px mobile section padding, 80px desktop / 48px mobile between rows
 * - Type scale: landing-h2 heading, landing-h3 problem statement, landing-body solution line (12px gap)
 * - Zero labels ("Problem", "With Applied" removed), zero danger tokens
 * - Equal-width (max 520px), equal min-height (300px), top-aligned mockups
 * - Alternating layout on desktop, text first on mobile with 24px gap
 */
import React, { useMemo } from "react";
import { problemSolutionContent } from "../../lib/landingContent.js";
import {
  getProblem1Cards,
  getProblem2Replies,
  problem3Data,
} from "../../lib/landingSamples.js";
import { ReplyTypeBadge } from "../ui/ReplyTypeBadge.jsx";
import { DueChip } from "../ui/DueChip.jsx";
import { useCardFx } from "../../hooks/useCardFx.js";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { cn } from "../../lib/cn.js";

// Mockup 1: Filter bar + 2 application cards
function Problem1Mockup() {
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: true });
  const cards = useMemo(() => getProblem1Cards(), []);

  return (
    <div
      ref={cardRef}
      {...handlers}
      className="card-fx rounded-[12px] bg-surface border border-rule p-5 sm:p-6 w-full max-w-[520px] mx-auto select-none min-h-[400px] flex flex-col justify-start"
      role="img"
      aria-label="Preview of search, filters, and application cards"
    >
      <div className="relative z-10 flex flex-col gap-3 w-full" aria-hidden="true" inert="">
        {/* Mini Filter Bar */}
        <div className="rounded-[8px] bg-sunken/40 border border-rule/60 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="h-8 px-3 rounded-[6px] border border-rule bg-surface text-[12px] text-ink-soft flex items-center min-w-[130px] flex-1">
            Search company or role...
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-7 px-2.5 rounded-[5px] bg-primary text-on-primary text-[11px] font-semibold flex items-center">
              This week
            </span>
            <span className="h-7 px-2 rounded-[5px] border border-rule bg-surface text-[11px] text-ink font-medium flex items-center">
              All statuses
            </span>
          </div>
        </div>

        {/* 2 Application Cards */}
        <div className="space-y-2.5 w-full">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-[8px] bg-surface border border-rule p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-[13px] sm:text-[14px] font-bold text-ink truncate">
                    {card.company}
                  </h4>
                  <p className="text-[11px] text-ink-soft truncate">
                    {card.role}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded bg-sunken text-ink-soft">
                  {card.platform}
                </span>
              </div>

              {/* Card Footer: Row 1 Badge & DueChip, Row 2 Mark as done button */}
              <div className="pt-2 border-t border-rule/50 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <ReplyTypeBadge type={card.replyType} />
                  <DueChip deadline={card.deadline} />
                </div>
                <div className="flex justify-end">
                  <span className="h-6 px-2 rounded-[4px] border border-rule bg-surface text-[11px] font-medium text-ink flex items-center">
                    Mark as done
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mockup 2: 2 reply rows with due chip and Done button
function Problem2Mockup() {
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: true });
  const replies = useMemo(() => getProblem2Replies(), []);

  return (
    <div
      ref={cardRef}
      {...handlers}
      className="card-fx rounded-[12px] bg-surface border border-rule p-5 sm:p-6 w-full max-w-[520px] mx-auto select-none min-h-[400px] flex flex-col justify-start"
      role="img"
      aria-label="Preview of reply timeline rows with deadlines"
    >
      <div className="relative z-10 flex flex-col gap-3 w-full" aria-hidden="true" inert="">
        <div className="flex items-center justify-between pb-2 border-b border-rule/50">
          <span className="text-[13px] font-bold text-ink">Reply timeline</span>
          <span className="text-[11px] text-ink-soft font-semibold tnum">2 replies</span>
        </div>

        <div className="space-y-2.5 w-full">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="rounded-[8px] bg-surface border border-rule p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ReplyTypeBadge type={reply.type} />
                  <span className="text-[11px] text-ink-soft tnum">{reply.received}</span>
                </div>
                <span
                  className={cn(
                    "shrink-0 h-6 px-2.5 rounded-[4px] text-[11px] font-medium flex items-center",
                    reply.completed
                      ? "bg-sunken text-ink-soft border border-rule/50"
                      : "bg-primary text-on-primary font-semibold"
                  )}
                >
                  {reply.completed ? "Done" : "Mark done"}
                </span>
              </div>

              {reply.deadline ? (
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-rule/50">
                  <span className="text-[11px] font-medium text-ink-soft">Deadline</span>
                  <DueChip deadline={reply.deadline} />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-rule/50">
                  <span className="text-[11px] font-medium text-ink-soft">Status</span>
                  <span className="text-[11px] text-ink-soft font-medium">Logged</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mockup 3: Status bar with 4 rows + 3 platform rows with thin bars
function Problem3Mockup() {
  const { cardRef, handlers } = useCardFx({ tilt: false, glow: true });

  return (
    <div
      ref={cardRef}
      {...handlers}
      className="card-fx rounded-[12px] bg-surface border border-rule p-5 sm:p-6 w-full max-w-[520px] mx-auto select-none min-h-[400px] flex flex-col justify-start"
      role="img"
      aria-label="Preview of status bar totals and platform table"
    >
      <div className="relative z-10 flex flex-col gap-3.5 w-full" aria-hidden="true" inert="">
        {/* Status Totals Header & Multi-segment Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-ink">Application statuses</span>
            <span className="text-[11px] text-ink-soft tnum font-semibold">24 total</span>
          </div>

          <div className="h-2 w-full rounded-full overflow-hidden flex bg-rule/40">
            {problem3Data.statuses.map((st) => (
              <div
                key={st.label}
                style={{ width: `${st.percent}%` }}
                className={cn("h-full", st.color)}
              />
            ))}
          </div>

          {/* 4 Status Rows / Legend */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-1">
            {problem3Data.statuses.map((st) => (
              <div
                key={st.label}
                className="flex items-center justify-between px-2 py-1 rounded bg-sunken/30 border border-rule/50"
              >
                <span className="text-ink-soft">{st.label}</span>
                <span className="font-bold text-ink tnum">{st.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Platform Rows */}
        <div className="pt-2 border-t border-rule/60 flex flex-col gap-2">
          <span className="text-[12px] font-bold text-ink">Replies by platform</span>
          <div className="space-y-2">
            {problem3Data.platforms.map((pf) => (
              <div key={pf.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-ink">{pf.name}</span>
                  <span className="font-semibold text-ink-soft tnum">{pf.count} apps</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-rule/50 overflow-hidden">
                  <div
                    style={{ width: `${pf.percent}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingProblemSolution() {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.05 });
  const { heading, rows } = problemSolutionContent;

  return (
    <section
      id="solution"
      className="landing-section scroll-mt-14 md:scroll-mt-16"
    >
      <div
        ref={sectionRef}
        className={cn(
          "max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8",
          "transition-all duration-[250ms] ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
        )}
      >
        {/* Section Heading */}
        <h2 className="landing-h2">
          {heading}
        </h2>

        {/* 3 Alternating Rows with 80px desktop / 48px mobile spacing */}
        <div className="space-y-12 md:space-y-20">
          {/* Row 1: Text Left, Mockup Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            <div className="flex flex-col justify-center">
              <h3 className="landing-h3">
                {rows[0].problem}
              </h3>
              <p className="landing-body mt-3">
                {rows[0].solution}
              </p>
            </div>

            <div className="w-full flex justify-center lg:justify-end">
              <Problem1Mockup />
            </div>
          </div>

          {/* Row 2: Mockup Left, Text Right (Order on lg: text first on mobile with 24px gap) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            <div className="flex flex-col justify-center order-1 lg:order-2">
              <h3 className="landing-h3">
                {rows[1].problem}
              </h3>
              <p className="landing-body mt-3">
                {rows[1].solution}
              </p>
            </div>

            <div className="w-full flex justify-center lg:justify-start order-2 lg:order-1">
              <Problem2Mockup />
            </div>
          </div>

          {/* Row 3: Text Left, Mockup Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">
            <div className="flex flex-col justify-center">
              <h3 className="landing-h3">
                {rows[2].problem}
              </h3>
              <p className="landing-body mt-3">
                {rows[2].solution}
              </p>
            </div>

            <div className="w-full flex justify-center lg:justify-end">
              <Problem3Mockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingProblemSolution;
