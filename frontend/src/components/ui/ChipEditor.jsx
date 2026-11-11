/**
 * ChipEditor component
 * Accessible tag / chip editor for skills and role titles.
 * Supports:
 * - Enter or comma to add a chip
 * - Paste parsing (splits by comma, newline, pipe, semicolon, or bullet)
 * - Case-insensitive deduplication
 * - Max count and max length enforcement
 * - Keyboard accessible removal (Backspace when empty, or clicking remove button)
 * - Tabular-nums counter
 */
import React, { useState, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { normalizeText } from "../../lib/normalize.js";

export function ChipEditor({
  chips = [],
  onChange,
  maxChips = 30,
  maxCharLen = 40,
  label = "Items",
  placeholder = "Add an item and press Enter",
  disabled = false,
  error = "",
  helperText = "",
  hideCounterWhenEmpty = false,
  id,
  "aria-describedby": ariaDescribedby,
}) {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef(null);

  const addItems = (rawItems) => {
    if (disabled) return;
    setInputError("");

    const seen = new Set(chips.map((c) => c.toLowerCase()));
    const newItems = [...chips];
    let exceededLength = false;
    let exceededCount = false;

    for (const raw of rawItems) {
      const trimmed = normalizeText(raw);
      if (!trimmed) continue;

      if (trimmed.length > maxCharLen) {
        exceededLength = true;
        continue;
      }

      if (newItems.length >= maxChips) {
        exceededCount = true;
        break;
      }

      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        newItems.push(trimmed);
      }
    }

    if (exceededCount) {
      setInputError(`You can add up to ${maxChips} ${label.toLowerCase()}.`);
    } else if (exceededLength) {
      setInputError(
        `Each ${label.toLowerCase().slice(0, -1) || "item"} must be ${maxCharLen} characters or less.`
      );
    }

    if (newItems.length !== chips.length) {
      onChange(newItems);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addItems([inputValue]);
      }
    } else if (e.key === "Backspace" && !inputValue && chips.length > 0) {
      e.preventDefault();
      const updated = chips.slice(0, -1);
      onChange(updated);
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text");
    if (!paste) return;

    // Split on comma, newline, pipe, semicolon, or bullets
    const parts = paste.split(/[\n\r,;|•·]/);
    if (parts.length > 1) {
      e.preventDefault();
      addItems(parts);
    }
  };

  const removeChip = (indexToRemove) => {
    if (disabled) return;
    const updated = chips.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    inputRef.current?.focus();
  };

  const isAtMax = chips.length >= maxChips;
  const helperId = id ? `${id}-helper` : undefined;
  const errorId = id ? `${id}-error` : undefined;
  const describedBy = [
    ariaDescribedby,
    helperText ? helperId : null,
    error || inputError ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12px] leading-[16px]">
        <label
          htmlFor={id}
          className="text-ink-soft font-medium select-none"
        >
          {label}
        </label>
        {!(hideCounterWhenEmpty && chips.length === 0) && (
          <span
            className={cn(
              "text-ink-soft font-medium tabular-nums select-none",
              isAtMax && "text-ink font-semibold"
            )}
          >
            {chips.length} of {maxChips}
          </span>
        )}
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "min-h-[42px] w-full p-1.5 rounded-[8px] border bg-surface flex flex-wrap items-center gap-1.5 transition-colors cursor-text",
          error || inputError ? "border-danger" : "border-rule",
          "focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2",
          disabled && "opacity-50 cursor-not-allowed bg-sunken"
        )}
      >
        {chips.map((chip, idx) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] leading-[18px] bg-sunken text-ink border border-rule/60 select-none animate-in fade-in duration-100"
          >
            <span className="truncate max-w-[200px]">{chip}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(idx);
                }}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-ink-soft hover:text-ink hover:bg-rule/40 transition-colors cursor-pointer focus:outline-none focus-visible:outline-1 focus-visible:outline-primary"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}

        {!isAtMax && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            disabled={disabled}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputError("");
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              if (inputValue.trim()) {
                addItems([inputValue]);
              }
            }}
            placeholder={chips.length === 0 ? placeholder : "Add another"}
            aria-describedby={describedBy || undefined}
            className="flex-1 min-w-[120px] h-7 px-1.5 bg-transparent text-[14px] leading-[20px] text-ink placeholder:text-placeholder focus:outline-none disabled:cursor-not-allowed"
          />
        )}
      </div>

      {helperText && !error && !inputError && (
        <p id={helperId} className="text-[12px] leading-[16px] text-ink-soft">
          {helperText}
        </p>
      )}

      {(error || inputError) && (
        <p id={errorId} className="text-[12px] leading-[16px] text-danger">
          {error || inputError}
        </p>
      )}
    </div>
  );
}

export default ChipEditor;
