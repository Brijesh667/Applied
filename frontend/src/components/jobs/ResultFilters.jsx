import React, { useState, useEffect, useRef, useId } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { JOB_QUERY_TEXT_MAX } from "../../lib/constants.js";
import {
  RESULT_REMOTE_OPTIONS,
  countActiveResultFilters,
} from "../../lib/jobFilters.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { Button } from "../ui/Button.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";

/**
 * ResultFilters component
 * Desktop: Single tidy toolbar row: text search (grows), Remote segmented, Pay listed chip,
 * sort select, and a quiet Clear text button when filters are active.
 * Mobile (< md): Search input + "Filters" button opening a bottom-sheet dialog, plus Clear.
 */
export function ResultFilters({
  filters,
  onChangeFilter,
  onClearFilters,
  className = "",
}) {
  const containerId = useId();
  const [searchInput, setSearchInput] = useState(filters.q || "");
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const mobileDialogRef = useRef(null);

  // Sync debounced search to URL/state
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const prevDebouncedRef = useRef(filters.q || "");

  useEffect(() => {
    const trimmed = debouncedSearch.trim().slice(0, JOB_QUERY_TEXT_MAX);
    if (trimmed === prevDebouncedRef.current) return;
    prevDebouncedRef.current = trimmed;
    onChangeFilter("q", trimmed);
  }, [debouncedSearch, onChangeFilter]);

  // Sync local search when URL changes from outside (Back button / Reset)
  useEffect(() => {
    const currentUrlQ = (filters.q || "").slice(0, JOB_QUERY_TEXT_MAX);
    if (currentUrlQ !== prevDebouncedRef.current) {
      prevDebouncedRef.current = currentUrlQ;
      setSearchInput(currentUrlQ);
    }
  }, [filters.q]);

  const handleClearSearch = () => {
    setSearchInput("");
    prevDebouncedRef.current = "";
    onChangeFilter("q", "");
  };

  const activeCount = countActiveResultFilters(filters);
  const hasActiveFilters = activeCount > 0;

  // Handle mobile dialog focus trap and Escape key
  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;

    if (isMobileSheetOpen) {
      if (!dialog.open) {
        dialog.showModal?.();
      }
    } else {
      if (dialog.open) {
        dialog.close?.();
      }
    }
  }, [isMobileSheetOpen]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Desktop Toolbar (md and above) */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* Search input (grows to fill available space) */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none select-none"
            aria-hidden="true"
          />
          <input
            id={`${containerId}-search-desktop`}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={JOB_QUERY_TEXT_MAX}
            placeholder="Search title or company"
            aria-label="Search jobs by title or company"
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-surface border border-rule text-[14px] leading-[20px] text-ink placeholder:text-placeholder focus:outline-none focus:border-ink/30 focus-visible:outline-2 focus-visible:outline-primary transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search text"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Remote 3-way Segmented Control */}
        <div className="shrink-0">
          <SegmentedControl
            name={`${containerId}-remote-desktop`}
            options={RESULT_REMOTE_OPTIONS}
            value={filters.remote || "any"}
            onChange={(val) => onChangeFilter("remote", val)}
            className="h-9"
          />
        </div>

        {/* Pay listed Toggle Chip */}
        <button
          type="button"
          onClick={() => onChangeFilter("payListed", !filters.payListed)}
          aria-pressed={Boolean(filters.payListed)}
          className={cn(
            "h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors select-none shrink-0 cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary",
            filters.payListed
              ? "bg-ink text-surface border-ink"
              : "bg-surface text-ink-soft border-rule hover:border-ink/20 hover:text-ink"
          )}
        >
          Pay listed
        </button>

        {/* Sort Select */}
        <div className="shrink-0">
          <select
            value={filters.sort || "best"}
            onChange={(e) => onChangeFilter("sort", e.target.value)}
            aria-label="Sort jobs"
            className="h-9 px-2.5 rounded-lg bg-surface border border-rule text-[13px] font-medium text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
          >
            <option value="best">Best match</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {/* Clear Filters (shown only when a filter is active) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 px-2 text-[13px] text-ink-soft hover:text-ink font-medium shrink-0 cursor-pointer transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile Toolbar (< md) */}
      <div className="flex md:hidden items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none select-none"
            aria-hidden="true"
          />
          <input
            id={`${containerId}-search-mobile`}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={JOB_QUERY_TEXT_MAX}
            placeholder="Search jobs"
            aria-label="Search jobs"
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-surface border border-rule text-[14px] leading-[20px] text-ink placeholder:text-placeholder focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort Select on mobile */}
        <select
          value={filters.sort || "best"}
          onChange={(e) => onChangeFilter("sort", e.target.value)}
          aria-label="Sort jobs"
          className="h-9 px-2 rounded-lg bg-surface border border-rule text-[12px] font-medium text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-primary cursor-pointer shrink-0"
        >
          <option value="best">Best</option>
          <option value="newest">New</option>
        </select>

        {/* Mobile Filters trigger button */}
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          aria-expanded={isMobileSheetOpen}
          aria-haspopup="dialog"
          className={cn(
            "h-9 px-2.5 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-primary",
            (filters.remote !== "any" || filters.payListed)
              ? "bg-ink text-surface border-ink"
              : "bg-surface text-ink border border-rule hover:bg-sunken"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Filters</span>
        </button>

        {/* Clear text button on mobile when active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 px-1.5 text-[13px] text-ink-soft hover:text-ink font-medium shrink-0 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile Bottom-sheet Dialog (< md) */}
      <dialog
        ref={mobileDialogRef}
        onClose={() => setIsMobileSheetOpen(false)}
        className="w-full max-w-md m-0 mt-auto md:hidden rounded-t-2xl p-0 bg-surface border-t border-rule text-ink shadow-2xl backdrop:bg-ink/40 open:animate-in open:slide-in-from-bottom-6 duration-200"
      >
        <div className="p-5 space-y-5">
          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-3 border-b border-rule">
            <h3 className="text-[16px] leading-[22px] font-semibold text-ink">
              Filters
            </h3>
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen(false)}
              aria-label="Close filters"
              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-ink-soft hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Remote preference */}
          <div>
            <label className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-2">
              Work location
            </label>
            <SegmentedControl
              name={`${containerId}-remote-mobile`}
              options={RESULT_REMOTE_OPTIONS}
              value={filters.remote || "any"}
              onChange={(val) => onChangeFilter("remote", val)}
              className="w-full flex"
            />
          </div>

          {/* Pay listed toggle */}
          <div>
            <label className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-2">
              Pay
            </label>
            <button
              type="button"
              onClick={() => onChangeFilter("payListed", !filters.payListed)}
              aria-pressed={Boolean(filters.payListed)}
              className={cn(
                "w-full h-10 px-3 rounded-lg text-[14px] font-medium border transition-colors select-none cursor-pointer flex items-center justify-center",
                filters.payListed
                  ? "bg-ink text-surface border-ink"
                  : "bg-surface text-ink-soft border-rule hover:border-ink/20 hover:text-ink"
              )}
            >
              Pay listed
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-rule">
            <button
              type="button"
              onClick={() => {
                onClearFilters();
                setIsMobileSheetOpen(false);
              }}
              className="text-[13px] text-ink-soft hover:text-ink font-medium p-2"
            >
              Clear
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsMobileSheetOpen(false)}
              className="px-6"
            >
              Done
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default ResultFilters;
