/**
 * DayRow component
 * Radiogroup toolbar rendered under the filter bar when Deadline is set to "This week".
 * Displays "All days" + 7 days starting from today (e.g. "Today", "Thu 5", "Fri 6", ...).
 * Supports keyboard arrow navigation, aria-checked, and horizontal scroll on mobile.
 */
import React, { useMemo, useRef } from "react";
import { cn } from "../../lib/cn.js";

export function DayRow({ activeDay = "", onSelectDay, className = "" }) {
  const itemRefs = useRef([]);

  // Generate 7 days from today in local time
  const options = useMemo(() => {
    const list = [
      {
        value: "",
        label: "All days",
      },
    ];

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    for (let i = 0; i < 7; i++) {
      const d = new Date(
        startOfToday.getFullYear(),
        startOfToday.getMonth(),
        startOfToday.getDate() + i
      );
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dateNum = String(d.getDate()).padStart(2, "0");
      const value = `${year}-${month}-${dateNum}`;

      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = i === 0 ? "Today" : `${weekday} ${d.getDate()}`;

      list.push({
        value,
        label,
      });
    }

    return list;
  }, []);


  const handleKeyDown = (e, index) => {
    let targetIndex = -1;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        targetIndex = (index + 1) % options.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        targetIndex = (index - 1 + options.length) % options.length;
        break;
      case "Home":
        e.preventDefault();
        targetIndex = 0;
        break;
      case "End":
        e.preventDefault();
        targetIndex = options.length - 1;
        break;
      default:
        return;
    }

    if (targetIndex >= 0) {
      const targetOption = options[targetIndex];
      onSelectDay(targetOption.value);
      itemRefs.current[targetIndex]?.focus();
    }
  };

  const handleClick = (value) => {
    if (value === activeDay) {
      // Clicking the already-active day or All days clears the selection
      onSelectDay("");
    } else {
      onSelectDay(value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Filter this week by day"
      className={cn(
        "flex items-center gap-2 overflow-x-auto scrollbar-none max-w-full pt-2.5 mt-2.5 border-t border-rule/70",
        className
      )}
    >
      {options.map((opt, idx) => {
        const isChecked = opt.value === activeDay || (!activeDay && opt.value === "");

        return (
          <button
            key={opt.value || "all-days"}
            ref={(el) => (itemRefs.current[idx] = el)}
            type="button"
            role="radio"
            aria-checked={isChecked}
            tabIndex={isChecked ? 0 : -1}
            onClick={() => handleClick(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "h-7 px-3 rounded-full text-[12px] md:text-[13px] font-medium inline-flex items-center justify-center text-center whitespace-nowrap transition-colors cursor-pointer shrink-0 select-none",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              isChecked
                ? "bg-primary text-on-primary border border-primary font-semibold"
                : "bg-surface text-ink-soft border border-rule hover:text-ink hover:border-ink-soft"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default DayRow;
