/**
 * FilterSheet component
 * Mobile bottom sheet modal for application filters.
 * Built on native <dialog> element for automatic focus trapping and Escape key handling.
 * Filter changes apply live to the URL while the sheet is open.
 */
import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { STATUSES, STATUS_LABELS } from "../../lib/constants.js";
import { Select } from "../ui/Select.jsx";

export function FilterSheet({
  isOpen,
  onClose,
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  activeCount,
  platformOptions = [],
}) {
  const dialogRef = useRef(null);
  const showResultsRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  const handleCancel = (e) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleClearInSheet = () => {
    if (!hasActiveFilters) return;
    clearFilters();
    showResultsRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={cn(
        "backdrop:bg-black/50 backdrop:backdrop-blur-[1px]",
        "fixed inset-x-0 bottom-0 m-0 w-full max-w-lg mx-auto z-50 md:hidden",
        "rounded-t-[16px] rounded-b-none bg-surface text-ink border-t border-x border-rule",
        "p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgb(0_0_0_/_0.18)]",
        "flex flex-col max-h-[85vh] select-none",
        "transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
      )}
      aria-labelledby="filters-sheet-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-rule/60 shrink-0">
        <h2 id="filters-sheet-title" className="text-[18px] leading-[24px] font-bold text-ink">
          Filters
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters sheet"
          className="text-[13px] font-semibold text-ink-soft hover:text-ink px-2 py-1 rounded-[4px] hover:bg-sunken cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
        >
          Done
        </button>
      </div>

      {/* Body: 5 Stacked Selects */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3.5">
        {/* 1. Deadline */}
        <div>
          <label htmlFor="sheet-deadline" className="block text-[12px] font-semibold text-ink-soft mb-1">
            Deadline
          </label>
          <Select
            id="sheet-deadline"
            value={filters.deadline}
            onChange={(e) => setFilter("deadline", e.target.value)}
            aria-label="Filter by deadline"
            className="w-full h-10 px-3 text-[14px]"
          >
            <option value="">Any deadline</option>
            <option value="missed">Missed</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </Select>
        </div>

        {/* 2. Status */}
        <div>
          <label htmlFor="sheet-status" className="block text-[12px] font-semibold text-ink-soft mb-1">
            Status
          </label>
          <Select
            id="sheet-status"
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            aria-label="Filter by status"
            className="w-full h-10 px-3 text-[14px]"
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
        <div>
          <label htmlFor="sheet-platform" className="block text-[12px] font-semibold text-ink-soft mb-1">
            Platform
          </label>
          <Select
            id="sheet-platform"
            value={filters.appliedFrom}
            onChange={(e) => setFilter("appliedFrom", e.target.value)}
            aria-label="Filter by platform"
            className="w-full h-10 px-3 text-[14px]"
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
        <div>
          <label htmlFor="sheet-replies" className="block text-[12px] font-semibold text-ink-soft mb-1">
            Replies
          </label>
          <Select
            id="sheet-replies"
            value={filters.replied}
            onChange={(e) => setFilter("replied", e.target.value)}
            aria-label="Filter by replies"
            className="w-full h-10 px-3 text-[14px]"
          >
            <option value="">Any replies</option>
            <option value="true">Has replies</option>
            <option value="false">No replies yet</option>
          </Select>
        </div>

        {/* 5. Sort */}
        <div>
          <label htmlFor="sheet-sort" className="block text-[12px] font-semibold text-ink-soft mb-1">
            Sort
          </label>
          <Select
            id="sheet-sort"
            value={filters.sort}
            onChange={(e) => setFilter("sort", e.target.value)}
            aria-label="Sort applications"
            className="w-full h-10 px-3 text-[14px]"
          >
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="deadline">Nearest deadline</option>
          </Select>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-rule/60 flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          disabled={!hasActiveFilters}
          aria-disabled={!hasActiveFilters}
          onClick={handleClearInSheet}
          className={cn(
            "h-10 min-w-[140px] px-3.5 rounded-[8px] text-[13px] font-medium inline-flex items-center justify-center shrink-0 tabular-nums select-none",
            "transition-all duration-180 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
            hasActiveFilters
              ? "border border-primary bg-surface text-ink hover:bg-sunken hover:border-[var(--color-primary-hover)] cursor-pointer"
              : "border border-rule/50 bg-transparent text-ink-soft opacity-40 cursor-not-allowed pointer-events-none"
          )}
        >
          {hasActiveFilters ? `Clear filters (${activeCount})` : "Clear filters"}
        </button>
        <button
          ref={showResultsRef}
          type="button"
          onClick={onClose}
          className="flex-1 h-10 px-4 rounded-[8px] bg-primary text-on-primary font-medium text-[14px] inline-flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary-hover)] active:scale-[0.98] transition-all focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          Show results
        </button>
      </div>
    </dialog>
  );
}

export default FilterSheet;
