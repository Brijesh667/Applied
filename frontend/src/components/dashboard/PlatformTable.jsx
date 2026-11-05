/**
 * PlatformTable component
 * Full-width table displaying application distribution by platform:
 * - Columns: Platform, Applied (with a thin inline bar for the Applied share), Replied
 * - Shows ALL platforms (no toggle/truncation)
 * - Each row links to /applications?appliedFrom={platform}
 */
import React from "react";
import { Link } from "react-router-dom";
import { useCardFx } from "../../hooks/useCardFx.js";
import { cn } from "../../lib/cn.js";

export function PlatformTable({ platforms = [], totalApplications = 0, className = "" }) {
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });
  const hasPlatforms = Array.isArray(platforms) && platforms.length > 0;

  const grandTotal = totalApplications > 0
    ? totalApplications
    : hasPlatforms
    ? platforms.reduce((acc, p) => acc + (p.total || 0), 0)
    : 0;

  return (
    <div
      ref={cardRef}
      {...handlers}
      className={cn(
        "card-fx card-fx-tilt rounded-[12px] bg-surface border border-rule p-5 sm:p-6 select-none flex flex-col",
        className
      )}
      role="region"
      aria-label="Where you applied"
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-rule/60">
        <h2 className="text-[20px] sm:text-[22px] leading-[26px] sm:leading-[28px] font-bold text-ink">
          Where you applied
        </h2>
        {hasPlatforms && (
          <span className="text-[13px] leading-[18px] font-semibold text-ink-soft tnum">
            {platforms.length} {platforms.length === 1 ? "platform" : "platforms"}
          </span>
        )}
      </div>

      {!hasPlatforms ? (
        <div className="py-8 sm:py-10 text-center flex flex-col items-center justify-center my-auto">
          <p className="text-[14px] leading-[20px] text-ink-soft">
            Appears after your first application.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-rule text-[13px] leading-[18px] text-ink-soft font-semibold">
                <th scope="col" className="py-2.5 pr-3 font-semibold">
                  Platform
                </th>
                <th scope="col" className="py-2.5 px-2 text-right font-semibold">
                  Applied
                </th>
                <th scope="col" className="py-2.5 pl-2 text-right font-semibold">
                  Replied
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60 text-[14px] sm:text-[15px] leading-[20px] sm:leading-[22px]">
              {platforms.map((row) => {
                const sharePercent =
                  grandTotal > 0
                    ? Math.min(100, Math.round((row.total / grandTotal) * 100))
                    : 0;

                return (
                  <tr
                    key={row.platform}
                    className="hover:bg-sunken/40 transition-colors group"
                  >
                    <td className="py-2.5 pr-3 font-medium text-ink max-w-[130px] truncate">
                      <Link
                        to={`/applications?appliedFrom=${encodeURIComponent(
                          row.platform
                        )}`}
                        className="hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px] block truncate"
                        title={row.platform}
                      >
                        {row.platform}
                      </Link>
                    </td>

                    {/* Applied */}
                    <td className="py-2.5 px-2 text-right">
                      <div className="inline-flex items-center justify-end gap-2 w-full">
                        <div
                          className="hidden sm:block flex-1 max-w-[60px] h-1.5 rounded-full bg-sunken overflow-hidden"
                          aria-hidden="true"
                        >
                          <div
                            style={{ width: `${Math.max(6, sharePercent)}%` }}
                            className="h-full rounded-full bg-primary/70 transition-all duration-300"
                          />
                        </div>
                        <span className="font-semibold text-ink tnum shrink-0 min-w-[24px]">
                          {row.total}
                        </span>
                      </div>
                    </td>

                    {/* Replied */}
                    <td className="py-2.5 pl-2 text-right font-semibold text-ink-soft tnum shrink-0 min-w-[24px]">
                      {row.replied}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}

export default PlatformTable;
