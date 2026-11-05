/**
 * LandingFAQ component
 * Section 5 (id="faq") "FAQ":
 * - Spacing: 96px desktop / 64px mobile section padding, no divider line
 * - Max-width 720px centered container
 * - Heading uses landing-h2 (36px desktop / 28px mobile, mb-8 md:mb-12)
 * - Accessible accordion (button + aria-expanded, aria-controls, region)
 * - Item padding 20px (p-5), gap 12px (gap-3)
 * - Question text 18px semibold, answers 16px line-height 1.6
 * - Exactly 4 items from faqContent in src/lib/landingContent.js
 * - Scroll reveal animation & anchor scroll margin
 */
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqContent } from "../../lib/landingContent.js";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { cn } from "../../lib/cn.js";

export function LandingFAQ() {
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.1 });
  // Start with first item open; having first open provides immediate context
  const [openId, setOpenId] = useState(faqContent.items[0]?.id || null);

  const toggleItem = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="faq"
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
        <div className="max-w-[720px] mx-auto w-full">
          {/* Section Heading */}
          <h2 className="landing-h2">
            {faqContent.heading}
          </h2>

          {/* Accordion List (gap 12px) */}
          <div className="flex flex-col gap-3">
            {faqContent.items.map((item) => {
              const isOpen = openId === item.id;
              const buttonId = `faq-btn-${item.id}`;
              const panelId = `faq-panel-${item.id}`;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-[10px] border transition-colors select-none",
                    isOpen
                      ? "bg-surface border-rule shadow-xs"
                      : "bg-surface/60 hover:bg-surface border-rule/70"
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleItem(item.id)}
                      className="w-full p-5 flex items-center justify-between gap-4 text-left font-semibold text-[18px] text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[10px] cursor-pointer"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 shrink-0 text-ink-soft transition-transform duration-200 motion-reduce:transition-none",
                          isOpen && "rotate-180 text-primary"
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className={cn(
                      "overflow-hidden transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none",
                      isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <p className="px-5 pb-5 text-[16px] text-ink-soft leading-[1.6]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingFAQ;
