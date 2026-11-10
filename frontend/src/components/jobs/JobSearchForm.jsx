import React, { useId, useState, useMemo } from "react";
import { Search, RotateCw } from "lucide-react";
import { cn } from "../../lib/cn.js";
import {
  JOB_ROLES_MAX,
  JOB_ROLE_MAX_LEN,
  JOB_LOCATION_MAX,
  JOB_MIN_PAY_MAX,
  CURRENCY,
} from "../../lib/constants.js";
import {
  JOB_TYPE_OPTIONS,
  EXPERIENCE_OPTIONS,
  REMOTE_OPTIONS,
  POSTED_WITHIN_OPTIONS,
  getFiltersSummaryChips,
} from "../../lib/jobFilters.js";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { ChipEditor } from "../ui/ChipEditor.jsx";

export function JobSearchForm({
  resumes = [],
  activeResumeId = "",
  hasSearch = false,
  onSelectResume,
  filters,
  onChangeFilter,
  onSubmit,
  onResetToDefaults,
  onSearchAgain,
  isSearching = false,
  isCollapsed = false,
  onToggleCollapse,
  disabled = false,
  serverError = null,
  className = "",
}) {
  const formId = useId();
  const [clientErrors, setClientErrors] = useState({});

  const summaryChips = useMemo(
    () => getFiltersSummaryChips(filters),
    [filters]
  );

  // Formatted pay preview for inline display
  const formattedPayPreview = useMemo(() => {
    if (!filters?.minPay) return null;
    const n = Number(filters.minPay);
    if (isNaN(n) || n <= 0) return null;
    return `₹${new Intl.NumberFormat("en-IN").format(n)}/yr`;
  }, [filters?.minPay]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled || isSearching) return;

    // Validate fields locally
    const errors = {};
    if (filters?.minPay !== null && filters?.minPay !== undefined && filters?.minPay !== "") {
      const n = Number(filters.minPay);
      if (isNaN(n) || !Number.isInteger(n) || n < 0) {
        errors.minPay = "Must be a positive whole number";
      } else if (n > JOB_MIN_PAY_MAX) {
        errors.minPay = `Max ${CURRENCY}${new Intl.NumberFormat("en-IN").format(JOB_MIN_PAY_MAX)}`;
      }
    }

    if (filters?.location && filters.location.length > JOB_LOCATION_MAX) {
      errors.location = `Location max ${JOB_LOCATION_MAX} characters`;
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors({});
    onSubmit?.();
  };

  const handleMinPayChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      onChangeFilter?.("minPay", null);
      setClientErrors((prev) => ({ ...prev, minPay: null }));
    } else {
      const n = parseInt(val, 10);
      onChangeFilter?.("minPay", isNaN(n) ? val : n);
      setClientErrors((prev) => ({ ...prev, minPay: null }));
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-surface border border-rule transition-all duration-200",
        isCollapsed ? "p-3 sm:p-3.5" : "p-4 sm:p-6",
        className
      )}
    >
      {/* Collapsed slim summary bar */}
      {isCollapsed ? (
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Small neutral chips, wrapping and truncating without overflow */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
            {summaryChips.map((chip, idx) => (
              <span
                key={`${chip}-${idx}`}
                className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] bg-sunken text-ink-soft border border-rule/50 max-w-[200px] truncate select-none"
                title={chip}
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Right side: Edit button & Search again icon button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleCollapse}
              aria-expanded={false}
              aria-controls={`${formId}-body`}
              className="h-8 px-2.5 text-[13px]"
            >
              <span>Edit</span>
            </Button>

            {typeof onSearchAgain === "function" && (
              <button
                type="button"
                onClick={onSearchAgain}
                disabled={isSearching}
                aria-label="Search again"
                title="Search again"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink-soft hover:text-ink hover:bg-sunken border border-rule/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
              >
                <RotateCw
                  className={cn("w-3.5 h-3.5", isSearching && "animate-spin")}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Expanded Form View */
        <form
          id={`${formId}-body`}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 sm:space-y-5"
        >
          {/* Resume select at top of card when no search exists yet */}
          {!hasSearch && resumes.length > 0 && (
            <div className="pb-4 border-b border-rule">
              <label
                htmlFor={`${formId}-resume`}
                className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5"
              >
                Resume
              </label>
              <Select
                id={`${formId}-resume`}
                value={activeResumeId}
                onChange={(e) => onSelectResume?.(e.target.value)}
                disabled={isSearching}
                aria-label="Select resume"
              >
                {resumes.map((resume) => {
                  const id = resume._id || resume.id;
                  const label =
                    resume.label || resume.fileName || "Untitled resume";
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

          {/* Row 1: Job type (Segmented) & Experience (Select) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5">
                Job type
              </label>
              <SegmentedControl
                name={`${formId}-jobType`}
                options={JOB_TYPE_OPTIONS}
                value={filters?.jobType || "any"}
                onChange={(val) => onChangeFilter?.("jobType", val)}
                disabled={isSearching}
                className="w-full flex"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-experience`}
                className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5"
              >
                Experience
              </label>
              <Select
                id={`${formId}-experience`}
                value={filters?.experience || "any"}
                onChange={(e) => onChangeFilter?.("experience", e.target.value)}
                disabled={isSearching}
              >
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Row 2: Roles (ChipEditor, full width, placeholder "Add a role") */}
          <div>
            <ChipEditor
              id={`${formId}-roles`}
              chips={filters?.roles || []}
              onChange={(newRoles) => onChangeFilter?.("roles", newRoles)}
              maxChips={JOB_ROLES_MAX}
              maxCharLen={JOB_ROLE_MAX_LEN}
              label="Roles"
              placeholder="Add a role"
              disabled={isSearching}
              hideCounterWhenEmpty={true}
            />
          </div>

          {/* Row 3: Location (Input) & Posted within (Select) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${formId}-location`}
                className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5"
              >
                Location
              </label>
              <Input
                id={`${formId}-location`}
                type="text"
                value={filters?.location || ""}
                onChange={(e) => onChangeFilter?.("location", e.target.value)}
                maxLength={JOB_LOCATION_MAX}
                placeholder="City, state, or remote"
                disabled={isSearching}
                aria-describedby={
                  clientErrors.location ? `${formId}-loc-error` : undefined
                }
              />
              {clientErrors.location && (
                <p
                  id={`${formId}-loc-error`}
                  className="mt-1 text-[12px] leading-[16px] text-danger"
                >
                  {clientErrors.location}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-posted`}
                className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5"
              >
                Posted within
              </label>
              <Select
                id={`${formId}-posted`}
                value={Number(filters?.postedWithinDays) || 60}
                onChange={(e) =>
                  onChangeFilter?.("postedWithinDays", Number(e.target.value))
                }
                disabled={isSearching}
              >
                {POSTED_WITHIN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Row 4: Remote (Segmented) & Minimum pay (Input with formatted preview inside) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5">
                Remote
              </label>
              <SegmentedControl
                name={`${formId}-remote`}
                options={REMOTE_OPTIONS}
                value={filters?.remote || "include"}
                onChange={(val) => onChangeFilter?.("remote", val)}
                disabled={isSearching}
                className="w-full flex"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-minPay`}
                className="block text-[13px] leading-[18px] font-medium text-ink-soft mb-1.5"
              >
                Minimum pay
              </label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-3 text-ink-soft select-none text-[14px]"
                  aria-hidden="true"
                >
                  {CURRENCY}
                </span>
                <Input
                  id={`${formId}-minPay`}
                  type="number"
                  min="0"
                  max={JOB_MIN_PAY_MAX}
                  step="50000"
                  value={
                    filters?.minPay === null || filters?.minPay === undefined
                      ? ""
                      : filters.minPay
                  }
                  onChange={handleMinPayChange}
                  placeholder="Annual pay in INR"
                  disabled={isSearching}
                  className="pl-7 pr-24"
                  aria-describedby={
                    clientErrors.minPay ? `${formId}-pay-error` : undefined
                  }
                />
                {formattedPayPreview && (
                  <span
                    className="absolute right-3 text-[12px] text-ink-soft tabular-nums pointer-events-none select-none"
                    aria-hidden="true"
                  >
                    {formattedPayPreview}
                  </span>
                )}
              </div>
              {clientErrors.minPay && (
                <p
                  id={`${formId}-pay-error`}
                  className="mt-1 text-[12px] leading-[16px] text-danger"
                >
                  {clientErrors.minPay}
                </p>
              )}
            </div>
          </div>

          {/* Server error inline */}
          {serverError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-[13px] leading-[18px]"
            >
              {serverError}
            </div>
          )}

          {/* Footer: Quiet "Reset" text button and primary "Find jobs" button */}
          <div className="pt-3 border-t border-rule flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onResetToDefaults}
              disabled={isSearching}
              className="text-[13px] text-ink-soft hover:text-ink font-medium p-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              Reset
            </button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSearching}
              showLabelOnLoading={true}
              disabled={disabled || isSearching}
              className="w-full sm:w-auto min-w-[130px]"
            >
              <Search className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />
              <span>{isSearching ? "Searching" : "Find jobs"}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default JobSearchForm;
