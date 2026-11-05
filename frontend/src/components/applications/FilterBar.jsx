/**
 * FilterBar component
 * URL-synced search, deadline, status, platform, replies, and sort filters.
 * Sticks under the top bar with top: var(--topbar-h) and an opaque surface background.
 * Displays a subtle bottom border/shadow when stuck via IntersectionObserver sentinel.
 *
 * Desktop layout (md and up):
 * - Row 1: Search input (flex-1) + permanent "Clear filters" button on the right (same h-10 height).
 * - Row 2: 5 selects in an equal-width grid (Deadline, Status, Platform, Replies, Sort), gap-3, min-w-0, truncate.
 * - Row 3: Day row when Deadline is "This week".
 *
 * Mobile layout (below md):
 * - Row 1: Search input (flex-1) + "Filters" button with active count badge.
 * - Row 2: Active filters removable chips row (horizontally scrollable, text "×" remove buttons).
 * - Row 3: Day row when Deadline is "This week".
 * - Modal: FilterSheet bottom sheet dialog on native <dialog> element.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useStats } from "../../hooks/useStats.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { LIMITS, STATUSES, STATUS_LABELS, PLATFORMS } from "../../lib/constants.js";
import { Select } from "../ui/Select.jsx";
import { DayRow } from "./DayRow.jsx";
import { FilterSheet } from "./FilterSheet.jsx";
import { cn } from "../../lib/cn.js";

const DEADLINE_LABELS = {
  missed: "Missed",
  week: "This week",
  month: "This month",
  year: "This year",
};

export function FilterBar({
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  activeCount = 0,
  isStuck = false,
}) {
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const desktopSearchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const filtersButtonRef = useRef(null);

  const prevDebouncedRef = useRef(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const { data: stats } = useStats();

  // Sync debounced search to URL when debouncedSearch changes
  useEffect(() => {
    if (debouncedSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedSearch;
    setFilter("search", debouncedSearch);
  }, [debouncedSearch, setFilter]);

  // Sync local search when URL changes from outside (Back button / Clear filters)
  useEffect(() => {
    const currentUrlSearch = filters.search || "";
    if (currentUrlSearch !== prevDebouncedRef.current) {
      prevDebouncedRef.current = currentUrlSearch;
      setSearchInput(currentUrlSearch);
    }
  }, [filters.search]);

  // Immediate clear for search box
  const handleClearSearch = (inputRef) => {
    setSearchInput("");
    prevDebouncedRef.current = "";
    setFilter("search", "");
    inputRef?.current?.focus();
  };

  // Build platform options from stats (or fallback to constants)
  const platformOptions = useMemo(() => {
    const byPlatform = stats?.byPlatform;
    let list = [];

    if (Array.isArray(byPlatform) && byPlatform.length > 0) {
      list = byPlatform.map((p) => ({
        value: p.platform,
        label: `${p.platform} (${p.total})`,
      }));
    } else {
      list = PLATFORMS.filter((p) => p !== "Other").map((p) => ({
        value: p,
        label: p,
      }));
    }

    // Preserve URL value if not present in list
    if (
      filters.appliedFrom &&
      !list.some(
        (item) => item.value.toLowerCase() === filters.appliedFrom.toLowerCase()
      )
    ) {
      list.push({
        value: filters.appliedFrom,
        label: filters.appliedFrom,
      });
    }

    return list;
  }, [stats?.byPlatform, filters.appliedFrom]);

  const handleClearDesktop = () => {
    if (!hasActiveFilters) return;
    setSearchInput("");
    prevDebouncedRef.current = "";
    clearFilters();
    desktopSearchInputRef.current?.focus();
  };

  const handleClearMobile = () => {
    if (!hasActiveFilters) return;
    setSearchInput("");
    prevDebouncedRef.current = "";
    clearFilters();
  };

  // Helper for day label in mobile chips
  const formatDayChipLabel = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, date] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, date);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) return "Today";
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    return `${weekday} ${d.getDate()}`;
  };

  // Build active chips for mobile
  const activeChips = useMemo(() => {
    const chips = [];

    if (filters.search) {
      chips.push({
        id: "search",
        label: `Search: ${filters.search}`,
        onRemove: () => {
          handleClearSearch(mobileSearchInputRef);
        },
        removeLabel: "Remove search filter",
      });
    }

    if (filters.deadline) {
      const label = DEADLINE_LABELS[filters.deadline] || filters.deadline;
      chips.push({
        id: "deadline",
        label,
        onRemove: () => setFilter("deadline", ""),
        removeLabel: `Remove ${label} filter`,
      });
    }

    if (filters.day && filters.deadline === "week") {
      const dayLabel = formatDayChipLabel(filters.day);
      chips.push({
        id: "day",
        label: `Day: ${dayLabel}`,
        onRemove: () => setFilter("day", ""),
        removeLabel: `Remove Day ${dayLabel} filter`,
      });
    }

    if (filters.status) {
      const statusLabel = STATUS_LABELS[filters.status] || filters.status;
      chips.push({
        id: "status",
        label: `Status: ${statusLabel}`,
        onRemove: () => setFilter("status", ""),
        removeLabel: `Remove Status: ${statusLabel} filter`,
      });
    }

    if (filters.appliedFrom) {
      chips.push({
        id: "appliedFrom",
        label: `Platform: ${filters.appliedFrom}`,
        onRemove: () => setFilter("appliedFrom", ""),
        removeLabel: `Remove Platform: ${filters.appliedFrom} filter`,
      });
    }

    if (filters.replied) {
      const repliedLabel =
        filters.replied === "true" ? "Has replies" : "No replies yet";
      chips.push({
        id: "replied",
        label: `Replies: ${repliedLabel}`,
        onRemove: () => setFilter("replied", ""),
        removeLabel: `Remove Replies: ${repliedLabel} filter`,
      });
    }

    return chips;
  }, [filters, setFilter]);

  return (
    <>
      <div
        className={cn(
          "sticky top-[var(--topbar-h)] z-30 bg-surface p-3 sm:p-4 mb-4 select-none transition-[box-shadow,border-radius] duration-200",
          isStuck
            ? "rounded-b-[12px] rounded-t-none border-b border-rule border-t-0 shadow-[0_4px_12px_rgb(0_0_0_/_0.06)] dark:shadow-[0_4px_16px_rgb(0_0_0_/_0.35)]"
            : "rounded-[12px] border border-rule shadow-none"
        )}
      >
        {/* DESKTOP LAYOUT (md and up) */}
        <div className="hidden md:flex flex-col gap-3">
          {/* Row 1: Search input (flex-1) + Permanent Clear filters button */}
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1">
              <label htmlFor="desktop-search-input" className="sr-only">
                Search applications by company
              </label>
              <input
                id="desktop-search-input"
                ref={desktopSearchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by company"
                maxLength={LIMITS.companyName}
                aria-label="Search applications by company"
                className="w-full h-10 px-3 pr-14 rounded-[8px] border border-rule bg-sunken text-ink placeholder:text-placeholder text-[14px] leading-[20px] transition-colors focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              />
              {searchInput && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleClearSearch(desktopSearchInputRef)}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ink-soft hover:text-ink px-2 py-0.5 rounded-[4px] hover:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Clear filters button on the right */}
            <button
              type="button"
              disabled={!hasActiveFilters}
              aria-disabled={!hasActiveFilters}
              onClick={handleClearDesktop}
              className={cn(
                "h-10 min-w-[150px] px-3.5 rounded-[8px] text-[14px] font-medium inline-flex items-center justify-center shrink-0 tabular-nums select-none",
                "transition-all duration-180 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                hasActiveFilters
                  ? "border border-primary bg-surface text-ink hover:bg-sunken/70 hover:border-[var(--color-primary-hover)] hover:-translate-y-px active:scale-[0.98] motion-reduce:transform-none cursor-pointer"
                  : "border border-rule/50 bg-transparent text-ink-soft opacity-40 cursor-not-allowed pointer-events-none"
              )}
            >
              {hasActiveFilters ? `Clear filters (${activeCount})` : "Clear filters"}
            </button>
          </div>

          {/* Row 2: 5 selects in an equal-width grid */}
          <div className="grid grid-cols-5 gap-3 w-full">
            {/* 1. Deadline */}
            <div className="min-w-0">
              <label htmlFor="desktop-select-deadline" className="sr-only">
                Filter by deadline
              </label>
              <Select
                id="desktop-select-deadline"
                value={filters.deadline}
                onChange={(e) => setFilter("deadline", e.target.value)}
                aria-label="Filter by deadline"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] truncate"
              >
                <option value="">Any deadline</option>
                <option value="missed">Missed</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
              </Select>
            </div>

            {/* 2. Status */}
            <div className="min-w-0">
              <label htmlFor="desktop-select-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="desktop-select-status"
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
                aria-label="Filter by status"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] truncate"
              >
                <option value="">All statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st] || st}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Platform */}
            <div className="min-w-0">
              <label htmlFor="desktop-select-platform" className="sr-only">
                Filter by platform
              </label>
              <Select
                id="desktop-select-platform"
                value={filters.appliedFrom}
                onChange={(e) => setFilter("appliedFrom", e.target.value)}
                aria-label="Filter by platform"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] truncate"
              >
                <option value="">All platforms</option>
                {platformOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* 4. Replies */}
            <div className="min-w-0">
              <label htmlFor="desktop-select-replies" className="sr-only">
                Filter by replies
              </label>
              <Select
                id="desktop-select-replies"
                value={filters.replied}
                onChange={(e) => setFilter("replied", e.target.value)}
                aria-label="Filter by replies"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] truncate"
              >
                <option value="">Any replies</option>
                <option value="true">Has replies</option>
                <option value="false">No replies yet</option>
              </Select>
            </div>

            {/* 5. Sort */}
            <div className="min-w-0">
              <label htmlFor="desktop-select-sort" className="sr-only">
                Sort applications
              </label>
              <Select
                id="desktop-select-sort"
                value={filters.sort}
                onChange={(e) => setFilter("sort", e.target.value)}
                aria-label="Sort applications"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] truncate"
              >
                <option value="latest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="deadline">Nearest deadline</option>
              </Select>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT (below md) */}
        <div className="md:hidden flex flex-col gap-2.5">
          {/* Row 1: Search input + Filters button */}
          <div className="flex items-center gap-2.5 w-full">
            <div className="relative flex-1">
              <label htmlFor="mobile-search-input" className="sr-only">
                Search applications by company
              </label>
              <input
                id="mobile-search-input"
                ref={mobileSearchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by company"
                maxLength={LIMITS.companyName}
                aria-label="Search applications by company"
                className="w-full h-10 px-3 pr-14 rounded-[8px] border border-rule bg-sunken text-ink placeholder:text-placeholder text-[14px] leading-[20px] transition-colors focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              />
              {searchInput && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleClearSearch(mobileSearchInputRef)}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ink-soft hover:text-ink px-2 py-0.5 rounded-[4px] hover:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filters button with active count badge */}
            <button
              ref={filtersButtonRef}
              type="button"
              onClick={() => setIsSheetOpen(true)}
              aria-label={
                hasActiveFilters
                  ? `Filters, ${activeCount} active`
                  : "Open filters"
              }
              className={cn(
                "h-10 px-3.5 rounded-[8px] text-[14px] font-medium inline-flex items-center gap-1.5 shrink-0 select-none",
                "border border-rule bg-surface text-ink hover:bg-sunken hover:border-ink-soft transition-colors cursor-pointer",
                "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              )}
            >
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[11px] font-semibold tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Active chips row: only visible when there are active filters */}
          {activeChips.length > 0 && (
            <div
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -my-0.5"
              role="region"
              aria-label="Active filters"
            >
              {activeChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-medium border border-rule bg-surface text-ink shrink-0 whitespace-nowrap"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={chip.removeLabel}
                    className="inline-flex items-center justify-center w-4 h-4 text-ink-soft hover:text-ink text-[13px] leading-none rounded-full hover:bg-sunken focus:outline-none focus-visible:outline-1 focus-visible:outline-primary cursor-pointer ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Day row (only for This week) */}
        {filters.deadline === "week" && (
          <div className="pt-2 border-t border-rule/50 mt-2.5">
            <DayRow
              activeDay={filters.day}
              onSelectDay={(day) => setFilter("day", day)}
            />
          </div>
        )}
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {isSheetOpen && (
        <FilterSheet
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            filtersButtonRef.current?.focus();
          }}
          filters={filters}
          setFilter={setFilter}
          clearFilters={handleClearMobile}
          hasActiveFilters={hasActiveFilters}
          activeCount={activeCount}
          platformOptions={platformOptions}
        />
      )}
    </>
  );
}

export default FilterBar;
