import { z } from "zod";
import {
  RESUME_LABEL_MAX,
  RESUME_SKILLS_MAX,
  RESUME_SKILL_MAX_LEN,
  RESUME_ROLES_MAX,
  RESUME_ROLE_MAX_LEN,
  RESUME_EXPERIENCE_MAX_YEARS,
} from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

export const createResumeSchema = z
  .object({
    label: z.preprocess(
      (val) => {
        if (typeof val === "string" && val.trim() === "") return undefined;
        return val;
      },
      z
        .string()
        .transform(normalizeText)
        .pipe(
          z
            .string()
            .min(1, "Label must be at least 1 character")
            .max(
              RESUME_LABEL_MAX,
              `Label cannot exceed ${RESUME_LABEL_MAX} characters`
            )
        )
        .optional()
    ),
  })
  .strip();

export const updateResumeSchema = z
  .object({
    label: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Label must be at least 1 character")
          .max(
            RESUME_LABEL_MAX,
            `Label cannot exceed ${RESUME_LABEL_MAX} characters`
          )
      )
      .optional(),
    isDefault: z
      .boolean({ invalid_type_error: "isDefault must be a boolean" })
      .refine((val) => val === true, {
        message: "isDefault can only be set to true",
      })
      .optional(),
    skills: z
      .array(
        z
          .string()
          .transform(normalizeText)
          .pipe(
            z
              .string()
              .min(1, "Skill cannot be empty")
              .max(
                RESUME_SKILL_MAX_LEN,
                `Skill cannot exceed ${RESUME_SKILL_MAX_LEN} characters`
              )
          )
      )
      .max(RESUME_SKILLS_MAX, `Skills cannot exceed ${RESUME_SKILLS_MAX} items`)
      .optional(),
    roleTitles: z
      .array(
        z
          .string()
          .transform(normalizeText)
          .pipe(
            z
              .string()
              .min(1, "Role title cannot be empty")
              .max(
                RESUME_ROLE_MAX_LEN,
                `Role title cannot exceed ${RESUME_ROLE_MAX_LEN} characters`
              )
          )
      )
      .max(
        RESUME_ROLES_MAX,
        `Role titles cannot exceed ${RESUME_ROLES_MAX} items`
      )
      .optional(),
    experienceYears: z
      .number({ invalid_type_error: "experienceYears must be a number" })
      .min(0, "experienceYears cannot be negative")
      .max(
        RESUME_EXPERIENCE_MAX_YEARS,
        `experienceYears cannot exceed ${RESUME_EXPERIENCE_MAX_YEARS}`
      )
      .nullable()
      .optional(),
    locationPreference: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(100, "Location preference cannot exceed 100 characters")
      )
      .optional(),
  })
  .strip()
  .refine(
    (data) =>
      data.label !== undefined ||
      data.isDefault !== undefined ||
      data.skills !== undefined ||
      data.roleTitles !== undefined ||
      data.experienceYears !== undefined ||
      data.locationPreference !== undefined,
    {
      message: "At least one field is required",
    }
  );

export default {
  createResumeSchema,
  updateResumeSchema,
};
