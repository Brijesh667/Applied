/**
 * EditResumeDialog component
 * Accessible dialog for editing parsed or manual resume details:
 * - Label (max 50)
 * - Skills (chip editor, max 30, length 40)
 * - Role titles (chip editor, max 5, length 60)
 * - Experience years (0 to 50, empty means null)
 * - Location preference (max 100)
 * Sends only changed fields (partial PATCH).
 * Helper text: "Changes you make here are kept, even if the resume is read again."
 * Blocks Save when nothing changed or when a rule is broken.
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Field } from "../ui/Field.jsx";
import { ChipEditor } from "./ChipEditor.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import {
  RESUME_LABEL_MAX,
  RESUME_SKILLS_MAX,
  RESUME_SKILL_MAX_LEN,
  RESUME_ROLES_MAX,
  RESUME_ROLE_MAX_LEN,
  RESUME_EXPERIENCE_MAX_YEARS,
  RESUME_LOCATION_MAX,
} from "../../lib/constants.js";
import { normalizeText } from "../../lib/normalize.js";
import { useUpdateResume } from "../../hooks/useUpdateResume.js";
import { cn } from "../../lib/cn.js";

function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

export function EditResumeDialog({ resume, isOpen, onClose }) {
  const dialogRef = useRef(null);
  const { mutateAsync: updateResume, isPending: isUpdating } = useUpdateResume();

  const [label, setLabel] = useState("");
  const [skills, setSkills] = useState([]);
  const [roleTitles, setRoleTitles] = useState([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  // Track initial values for partial PATCH & dirty checking
  const initialValues = useMemo(() => {
    if (!resume) return null;
    return {
      label: resume.label || "",
      skills: Array.isArray(resume.skills) ? [...resume.skills] : [],
      roleTitles: Array.isArray(resume.roleTitles) ? [...resume.roleTitles] : [],
      experienceYears:
        resume.experienceYears !== null && resume.experienceYears !== undefined
          ? String(resume.experienceYears)
          : "",
      locationPreference: resume.locationPreference || "",
    };
  }, [resume]);

  useEffect(() => {
    if (isOpen && initialValues) {
      setLabel(initialValues.label);
      setSkills(initialValues.skills);
      setRoleTitles(initialValues.roleTitles);
      setExperienceYears(initialValues.experienceYears);
      setLocationPreference(initialValues.locationPreference);
      setErrors({});
      setServerError("");

      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
    } else {
      if (dialogRef.current && dialogRef.current.open) {
        dialogRef.current.close();
      }
    }
  }, [isOpen, initialValues]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!initialValues) return false;
    const curLabel = normalizeText(label);
    const initLabel = normalizeText(initialValues.label);
    if (curLabel !== initLabel) return true;

    if (!arraysEqual(skills, initialValues.skills)) return true;
    if (!arraysEqual(roleTitles, initialValues.roleTitles)) return true;

    const curExp = experienceYears.trim();
    const initExp = initialValues.experienceYears.trim();
    if (curExp !== initExp) return true;

    const curLoc = normalizeText(locationPreference);
    const initLoc = normalizeText(initialValues.locationPreference);
    if (curLoc !== initLoc) return true;

    return false;
  }, [label, skills, roleTitles, experienceYears, locationPreference, initialValues]);

  // Validation
  const validateForm = () => {
    const errs = {};
    const normLabel = normalizeText(label);
    if (!normLabel) {
      errs.label = "Label is required.";
    } else if (normLabel.length > RESUME_LABEL_MAX) {
      errs.label = `Label cannot exceed ${RESUME_LABEL_MAX} characters.`;
    }

    if (skills.length > RESUME_SKILLS_MAX) {
      errs.skills = `Maximum ${RESUME_SKILLS_MAX} skills allowed.`;
    }

    if (roleTitles.length > RESUME_ROLES_MAX) {
      errs.roleTitles = `Maximum ${RESUME_ROLES_MAX} role titles allowed.`;
    }

    if (experienceYears.trim() !== "") {
      const num = Number(experienceYears.trim());
      if (
        isNaN(num) ||
        !Number.isInteger(num) ||
        num < 0 ||
        num > RESUME_EXPERIENCE_MAX_YEARS
      ) {
        errs.experienceYears = `Enter an integer between 0 and ${RESUME_EXPERIENCE_MAX_YEARS}.`;
      }
    }

    const normLoc = normalizeText(locationPreference);
    if (normLoc.length > RESUME_LOCATION_MAX) {
      errs.locationPreference = `Location cannot exceed ${RESUME_LOCATION_MAX} characters.`;
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating || !isDirty || !resume) return;

    setServerError("");
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Build partial PATCH payload with only changed fields
    const patchBody = {};
    const curLabel = normalizeText(label);
    if (curLabel !== normalizeText(initialValues.label)) {
      patchBody.label = curLabel;
    }

    if (!arraysEqual(skills, initialValues.skills)) {
      patchBody.skills = skills;
    }

    if (!arraysEqual(roleTitles, initialValues.roleTitles)) {
      patchBody.roleTitles = roleTitles;
    }

    const curExpTrim = experienceYears.trim();
    const initExpTrim = initialValues.experienceYears.trim();
    if (curExpTrim !== initExpTrim) {
      patchBody.experienceYears = curExpTrim === "" ? null : Number(curExpTrim);
    }

    const curLoc = normalizeText(locationPreference);
    if (curLoc !== normalizeText(initialValues.locationPreference)) {
      patchBody.locationPreference = curLoc;
    }

    try {
      await updateResume({ id: resume._id || resume.id, body: patchBody });
      toast.success("Changes saved");
      onClose();
    } catch (err) {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        "Could not update resume details. Try again.";
      setServerError(msg);
    }
  };

  const handleCancel = (e) => {
    if (isUpdating) {
      e?.preventDefault();
      return;
    }
    onClose();
  };

  const validationErrors = validateForm();
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={(e) => {
        if (e.target === dialogRef.current && !isUpdating) {
          handleCancel();
        }
      }}
      className={cn(
        "backdrop:bg-black/40",
        "m-auto p-6 rounded-[16px] bg-surface text-ink border border-rule",
        "shadow-[0_12px_32px_rgb(0_0_0_/_0.18)] max-w-[540px] w-[calc(100%-32px)] max-h-[90vh] overflow-y-auto",
        "transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
        "open:animate-in open:fade-in open:zoom-in-95 select-none"
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] leading-[26px] font-bold text-ink">
            Edit details
          </h2>
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleCancel}
            aria-label="Close dialog"
            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-ink-soft hover:text-ink hover:bg-sunken transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-[13px] leading-[18px] text-ink-soft">
          Changes you make here are kept, even if the resume is read again.
        </p>

        {serverError && (
          <div
            role="alert"
            className="p-3 rounded-[8px] bg-danger-bg text-danger text-[13px] leading-[18px] border border-danger-tint select-text"
          >
            {serverError}
          </div>
        )}

        {/* Label */}
        <Field
          label="Label"
          htmlFor="edit-resume-label"
          error={errors.label}
        >
          <div className="relative">
            <Input
              id="edit-resume-label"
              type="text"
              disabled={isUpdating}
              maxLength={RESUME_LABEL_MAX}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (errors.label) setErrors((prev) => ({ ...prev, label: "" }));
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] leading-none text-ink-soft tabular-nums pointer-events-none select-none">
              {label.length} / {RESUME_LABEL_MAX}
            </span>
          </div>
        </Field>

        {/* Skills Chip Editor */}
        <ChipEditor
          id="edit-resume-skills"
          label="Skills"
          placeholder="Add a skill and press Enter"
          chips={skills}
          onChange={setSkills}
          maxChips={RESUME_SKILLS_MAX}
          maxCharLen={RESUME_SKILL_MAX_LEN}
          disabled={isUpdating}
          error={errors.skills}
        />

        {/* Role Titles Chip Editor */}
        <ChipEditor
          id="edit-resume-roles"
          label="Target roles"
          placeholder="e.g. Backend Engineer, Full Stack Engineer"
          chips={roleTitles}
          onChange={setRoleTitles}
          maxChips={RESUME_ROLES_MAX}
          maxCharLen={RESUME_ROLE_MAX_LEN}
          disabled={isUpdating}
          error={errors.roleTitles}
        />

        {/* Experience years & Location preference in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field
            label="Experience (years)"
            htmlFor="edit-resume-experience"
            error={errors.experienceYears}
            helper="0 to 50, or leave empty if unclear."
          >
            <Input
              id="edit-resume-experience"
              type="number"
              min="0"
              max={RESUME_EXPERIENCE_MAX_YEARS}
              step="1"
              disabled={isUpdating}
              placeholder="e.g. 3"
              value={experienceYears}
              onChange={(e) => {
                setExperienceYears(e.target.value);
                if (errors.experienceYears) {
                  setErrors((prev) => ({ ...prev, experienceYears: "" }));
                }
              }}
              className="tabular-nums"
            />
          </Field>

          <Field
            label="Location preference"
            htmlFor="edit-resume-location"
            error={errors.locationPreference}
            helper="e.g. San Francisco or Remote."
          >
            <Input
              id="edit-resume-location"
              type="text"
              disabled={isUpdating}
              maxLength={RESUME_LOCATION_MAX}
              placeholder="e.g. Remote"
              value={locationPreference}
              onChange={(e) => {
                setLocationPreference(e.target.value);
                if (errors.locationPreference) {
                  setErrors((prev) => ({ ...prev, locationPreference: "" }));
                }
              }}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-2 pt-3 border-t border-rule/60">
          <Button
            type="button"
            variant="secondary"
            disabled={isUpdating}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isUpdating || !isDirty || hasValidationErrors}
          >
            {isUpdating ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                <span>Saving</span>
              </span>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export default EditResumeDialog;
