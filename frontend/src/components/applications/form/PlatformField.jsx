/**
 * PlatformField component
 * Platform selection dropdown with animated/conditional custom platform text input.
 */
import React, { useRef, useEffect } from "react";
import { PLATFORMS, LIMITS } from "../../../lib/constants.js";
import { Select } from "../../ui/Select.jsx";
import { Input } from "../../ui/Input.jsx";
import { Field } from "../../ui/Field.jsx";

export function PlatformField({
  platform,
  platformOther,
  onChangePlatform,
  onChangePlatformOther,
  onBlurPlatform,
  onBlurPlatformOther,
  platformError,
  platformOtherError,
  disabled = false,
}) {
  const otherInputRef = useRef(null);
  const prevPlatformRef = useRef(platform);

  useEffect(() => {
    if (platform === "Other" && prevPlatformRef.current !== "Other") {
      otherInputRef.current?.focus();
    }
    prevPlatformRef.current = platform;
  }, [platform]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Field
        id="app-platform"
        label="Platform"
        error={platformError}
      >
        <Select
          id="app-platform"
          value={platform}
          disabled={disabled}
          onChange={(e) => onChangePlatform?.(e.target.value)}
          onBlur={onBlurPlatform}
          aria-label="Platform"
        >
          <option value="">Choose a platform</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>

      {platform === "Other" && (
        <Field
          id="app-platform-other"
          label="Platform name"
          error={platformOtherError}
          counter={{
            current: (platformOther || "").length,
            max: LIMITS.appliedFrom,
          }}
        >
          <Input
            ref={otherInputRef}
            id="app-platform-other"
            value={platformOther}
            disabled={disabled}
            placeholder="e.g. Wellfound, Otta"
            onChange={(e) => onChangePlatformOther?.(e.target.value)}
            onBlur={onBlurPlatformOther}
          />
        </Field>
      )}
    </div>
  );
}

export default PlatformField;
