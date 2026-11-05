/**
 * StatusBreakdown component
 * Displays application count distribution across statuses:
 * - Single horizontal stacked bar where every segment links to /applications?status=...
 * - Legend rows linking to /applications?status=... with StatusBadge and tabular counts
 */
import React from "react";
import { Link } from "react-router-dom";
import { useCardFx } from "../../hooks/useCardFx.js";
import { StatusBadge } from "../ui/StatusBadge.jsx";
import { STATUSES } from "../../lib/constants.js";
import { getStatusColorVar } from "../../lib/applications.js";
import { cn } from "../../lib/cn.js";

export function StatusBreakdown({
  byStatus = {},
  total = 0,
  className = "",
  showHeading = true,
}) {
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });

  const statusItems = STATUSES.map((status) => ({
    status,
    count: byStatus[status] || 0,
    color: getStatusColorVar(status),
  }));

  const activeSegments = statusItems.filter((item) => item.count > 0);

  return (
    <div
      ref={cardRef}
      {...handlers}
      className={cn(
        "card-fx card-fx-tilt rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none flex flex-col",
        className
      )}
      role="region"
      aria-label="Status"
    >
      <div className="relative z-10 flex flex-col h-full">
        {showHeading && (
          <h2 className="text-[20px] sm:text-[22px] leading-[26px] sm:leading-[28px] font-bold text-ink mb-4">
            Status
          </h2>
        )}

        {total === 0 ? (
          <p className="text-[14px] leading-[20px] text-ink-soft py-4">
            Appears after your first application.
          </p>
        ) : (
          <>
          {/* Stacked Status Bar: each segment links to /applications?status=... */}
          <div
            className="w-full h-3 rounded-full overflow-hidden flex bg-sunken gap-[2px] p-[1px] border border-rule/60"
            role="group"
            aria-label="Application status distribution bar"
          >
            {activeSegments.map((seg) => {
              const percent = total > 0 ? (seg.count / total) * 100 : 0;
              return (
                <Link
                  key={seg.status}
                  to={`/applications?status=${seg.status}`}
                  style={{
                    width: `${percent}%`,
                    backgroundColor: seg.color,
                    minWidth: "6px",
                  }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-opacity hover:opacity-85 focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
                  title={`${seg.status}: ${seg.count}`}
                  aria-label={`${seg.status}: ${seg.count}`}
                />
              );
            })}
          </div>

          {/* Legend list */}
          <ul className="mt-4 divide-y divide-rule/60 list-none p-0 m-0">
            {statusItems.map(({ status, count }) => (
              <li key={status}>
                <Link
                  to={`/applications?status=${status}`}
                  className="flex items-center justify-between h-10 px-2 -mx-2 rounded-[6px] hover:bg-sunken/60 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-ink group"
                >
                  <StatusBadge status={status} />
                  <span className="w-8 shrink-0 text-right text-[15px] leading-[22px] font-semibold text-ink tnum group-hover:text-ink">
                    {count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
    </div>
  );
}

export default StatusBreakdown;
