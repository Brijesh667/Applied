/**
 * RepliesByType component
 * Displays volume breakdown of received replies:
 * - Small horizontal bars for repliesByType (assessment, assignment, interview, offer, rejection, other)
 * - Sorted descending by count
 * - Zero rows hidden
 * - Bars use neutral tokens (no rainbow)
 * - Shared chip size and equal row heights
 */
import React from "react";
import { useCardFx } from "../../hooks/useCardFx.js";
import { ReplyTypeBadge } from "../ui/ReplyTypeBadge.jsx";
import { REPLY_TYPES } from "../../lib/constants.js";
import { cn } from "../../lib/cn.js";

export function RepliesByType({ repliesByType = {}, className = "" }) {
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });

  // Sort descending by count, filter out 0 counts
  const items = REPLY_TYPES.map((type) => ({
    type,
    count: repliesByType[type] || 0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCount = items.length > 0 ? Math.max(...items.map((x) => x.count)) : 1;

  return (
    <div
      ref={cardRef}
      {...handlers}
      className={cn(
        "card-fx card-fx-tilt rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none",
        className
      )}
      role="region"
      aria-label="Replies"
    >
      <div className="relative z-10">
        <h2 className="text-[20px] sm:text-[22px] leading-[26px] sm:leading-[28px] font-bold text-ink mb-4">
          Replies
        </h2>

        {items.length === 0 ? (
          <p className="text-[14px] leading-[20px] text-ink-soft py-4">
            Appears after your first reply.
          </p>
        ) : (
          <ul className="space-y-1 list-none p-0 m-0">
            {items.map((item) => {
              const widthPercent = Math.max(8, (item.count / maxCount) * 100);

              return (
                <li
                  key={item.type}
                  className="flex items-center justify-between gap-3 h-10 text-[14px]"
                >
                  <ReplyTypeBadge type={item.type} />

                  {/* Primary progress bar with fixed track width */}
                  <div
                    className="flex-1 min-w-0 h-2 rounded-full bg-sunken overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      style={{ width: `${widthPercent}%` }}
                      className="h-full rounded-full bg-primary/70 transition-all duration-300"
                    />
                  </div>

                  {/* Tabular count */}
                  <span className="w-8 shrink-0 text-right font-semibold text-ink tnum text-[14px]">
                    {item.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RepliesByType;
