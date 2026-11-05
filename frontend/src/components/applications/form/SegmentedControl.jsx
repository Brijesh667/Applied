/**
 * SegmentedControl component
 * Accessible radio group styled as segmented pills with press and ripple animations.
 */
import React from "react";
import { cn } from "../../../lib/cn.js";
import { useInteractiveButton } from "../../../hooks/useInteractiveButton.js";

function SegmentItem({ name, opt, isSelected, disabled, onChange }) {
  const { rippleRef, isPressed, handlers } = useInteractiveButton({
    disabled,
    isPrimary: false,
  });

  return (
    <label
      className={cn(
        "btn-interactive relative px-3.5 py-1.5 rounded-[6px] text-[14px] leading-[20px] transition-all duration-[var(--dur-hover)] ease-[var(--ease-out)] cursor-pointer text-center flex-1 select-none",
        isSelected
          ? "bg-surface text-ink font-bold border border-rule"
          : "text-ink-soft hover:text-ink hover:bg-surface/50 font-medium border border-transparent",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        isPressed && "is-pressed"
      )}
      {...handlers}
    >
      <span ref={rippleRef} className="btn-ripple-container" aria-hidden="true" />
      <input
        type="radio"
        name={name}
        value={opt.value}
        checked={isSelected}
        disabled={disabled}
        onChange={() => onChange?.(opt.value)}
        className="sr-only"
      />
      <span className="relative z-[2]">{opt.label}</span>
    </label>
  );
}

export function SegmentedControl({
  name,
  options = [],
  value,
  onChange,
  className = "",
  disabled = false,
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-[8px] bg-sunken border border-rule/50 select-none",
        className
      )}
    >
      {options.map((opt) => (
        <SegmentItem
          key={opt.value}
          name={name}
          opt={opt}
          isSelected={opt.value === value}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

export default SegmentedControl;
