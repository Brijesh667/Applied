/**
 * SkillsField component
 * Textarea with automatic blur cleaning and live skill pill preview.
 */
import React from "react";
import { LIMITS } from "../../../lib/constants.js";
import { cleanSkills } from "../../../lib/applicationForm.js";
import { splitSkills } from "../../../lib/format.js";
import { Textarea } from "../../ui/Textarea.jsx";
import { Field } from "../../ui/Field.jsx";

export function SkillsField({
  value = "",
  onChange,
  onBlur,
  error,
  disabled = false,
}) {
  const handleBlur = (e) => {
    const cleaned = cleanSkills(value);
    onChange?.(cleaned);
    onBlur?.(e);
  };

  const previewSkills = splitSkills(cleanSkills(value) || value);

  return (
    <div className="flex flex-col gap-1 w-full">
      <Field
        id="app-skills"
        label="Skills (optional)"
        error={error}
        hint="Separate skills with commas. You can paste a list from the job post."
        counter={{ current: value.length, max: LIMITS.skills }}
      >
        <Textarea
          id="app-skills"
          rows={2}
          value={value}
          disabled={disabled}
          placeholder="React, Node.js, MongoDB"
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={handleBlur}
        />
      </Field>

      {previewSkills.length > 0 && (
        <div
          aria-hidden="true"
          className="flex flex-wrap items-center gap-1.5 mt-1 select-none"
        >
          {previewSkills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full text-[12px] leading-[16px] border border-rule text-ink-soft"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillsField;
