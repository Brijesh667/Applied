/**
 * MoneyInput component
 * Decimal input with currency prefix and live format preview.
 */
import React, { forwardRef } from "react";
import { CURRENCY } from "../../../lib/constants.js";
import { formatPay } from "../../../lib/format.js";
import { cn } from "../../../lib/cn.js";

export const MoneyInput = forwardRef(function MoneyInput(
  {
    value = "",
    onChange,
    payType = "monthly",
    className = "",
    id,
    disabled = false,
    ...props
  },
  ref
) {
  const handleKeyDown = (e) => {
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Home",
        "End",
      ].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    if (e.key === "." && String(value).includes(".")) {
      e.preventDefault();
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      onChange?.(val);
    }
  };

  // Live preview formatting
  const isValidNumber =
    value !== "" &&
    !isNaN(Number(value)) &&
    Number(value) >= 0 &&
    /^\d+(\.\d{1,2})?$/.test(String(value));

  const preview = isValidNumber
    ? formatPay({ amount: Number(value), type: payType })
    : "";

  return (
    <div className="w-full">
      <div className="relative w-full">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] leading-[24px] text-ink-soft pointer-events-none select-none font-medium"
          aria-hidden="true"
        >
          {CURRENCY}
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="0"
          className={cn(
            "w-full h-10 pl-8 pr-3 rounded-[8px] border border-rule bg-sunken text-ink placeholder:text-placeholder text-[16px] leading-[24px] tnum transition-colors duration-120 focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            className
          )}
          {...props}
        />
      </div>

      {preview ? (
        <p className="text-[12px] leading-[16px] text-ink font-medium tnum mt-1">
          Preview: {preview}
        </p>
      ) : (
        <p className="text-[12px] leading-[16px] text-ink-soft mt-1">
          Enter 0 if unpaid.
        </p>
      )}
    </div>
  );
});

export default MoneyInput;
