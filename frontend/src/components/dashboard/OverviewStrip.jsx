/**
 * OverviewStrip component
 * 5 separate compact KPI cards for the Dashboard:
 * 1. Applied (total) -> /applications (line: "{noReply} no reply yet")
 * 2. Got a reply (replied) -> /applications?replied=true (line: "of {total} applications")
 * 3. Missed (deadlines.overdue) -> /applications?deadline=missed (line: "past deadline", danger text when > 0)
 * 4. This week (deadlines.dueSoon) -> /applications?deadline=week (line: "deadlines in next 7 days", primary number, subtle primary-tint border when > 0)
 * 5. Offers (byStatus.offer) -> /applications?status=offer (line: "{rejected} rejected")
 *
 * Rules:
 * - 5 separate cards with 16px gap (desktop), 12px gap (mobile).
 * - Compact auto height (100-120px), padding 16px.
 * - Content order: 1. Label (15-16px semibold), 2. Detail line (12-13px muted), 3. Number (32-36px bold tnum).
 * - 2 columns on mobile, 5th card full width.
 * - 3D tilt + cursor glow on each card via useCardFx.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useCardFx } from "../../hooks/useCardFx.js";
import { cn } from "../../lib/cn.js";
import { DEADLINE_LABELS } from "../../lib/format.js";

function KpiCard({ item }) {
  const { cardRef, handlers } = useCardFx({ tilt: true, glow: true });

  return (
    <Link
      ref={cardRef}
      {...handlers}
      to={item.to}
      className={cn(
        "card-fx card-fx-tilt rounded-[12px] bg-surface p-4 flex flex-col justify-between min-h-[104px] sm:min-h-[116px] cursor-pointer select-none transition-colors border",
        item.borderClass || "border-rule",
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        item.gridClass
      )}
    >
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <span className="text-[15px] sm:text-[16px] leading-[20px] sm:leading-[22px] font-semibold text-ink truncate block">
            {item.label}
          </span>
          <span className="text-[12px] sm:text-[13px] leading-[16px] sm:leading-[18px] text-ink-soft truncate block mt-0.5">
            {item.subLine}
          </span>
        </div>
        <div>
          <span
            className={cn(
              "text-[32px] sm:text-[36px] leading-[36px] sm:leading-[40px] font-bold tnum tracking-tight mt-2 sm:mt-2.5 block",
              item.numColor || "text-ink"
            )}
          >
            {item.value}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function OverviewStrip({ stats, className = "" }) {
  const total = stats?.total ?? 0;
  const replied = stats?.replied ?? 0;
  const noReply = stats?.noReply ?? 0;
  const overdue = stats?.deadlines?.overdue ?? 0;
  const dueSoon = stats?.deadlines?.dueSoon ?? 0;
  const offers = stats?.byStatus?.offer ?? 0;
  const rejected = stats?.byStatus?.rejected ?? 0;

  const items = [
    {
      id: "applied",
      label: "Applied",
      value: total,
      to: "/applications",
      subLine:
        total === 0 ? "none yet" : `${noReply} no reply yet`,
      borderClass: "border-rule",
      numColor: "text-ink",
    },
    {
      id: "replied",
      label: "Got a reply",
      value: replied,
      to: "/applications?replied=true",
      subLine:
        replied === 0 ? "none yet" : `of ${total} applications`,
      borderClass: "border-rule",
      numColor: "text-ink",
    },
    {
      id: "missed",
      label: DEADLINE_LABELS.missed,
      value: overdue,
      to: "/applications?deadline=missed",
      subLine:
        overdue === 0 ? "none yet" : "past deadline",
      borderClass: "border-rule",
      numColor: overdue > 0 ? "text-danger" : "text-ink",
    },
    {
      id: "thisWeek",
      label: DEADLINE_LABELS.thisWeek,
      value: dueSoon,
      to: "/applications?deadline=week",
      subLine:
        dueSoon === 0 ? "none yet" : "deadlines in next 7 days",
      borderClass: dueSoon > 0 ? "border-primary-tint" : "border-rule",
      numColor: dueSoon > 0 ? "text-primary" : "text-ink",
    },
    {
      id: "offers",
      label: "Offers",
      value: offers,
      to: "/applications?status=offer",
      gridClass: "col-span-2 md:col-span-1",
      subLine:
        offers === 0 ? "none yet" : `${rejected} rejected`,
      borderClass: "border-rule",
      numColor: "text-ink",
    },
  ];

  return (
    <div
      className={cn("grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 select-none", className)}
      role="region"
      aria-label="Key performance indicators"
    >
      {items.map((item) => (
        <KpiCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default OverviewStrip;
