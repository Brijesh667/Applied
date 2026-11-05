import { z } from "zod";
import { LIMITS, PAY_TYPES, STATUSES } from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

const paySchema = z
  .object({
    type: z
      .string({ message: "Pay type is required" })
      .pipe(z.enum(PAY_TYPES, { message: "Invalid pay type" })),
    amount: z.coerce
      .number({
        message: "Pay amount is required",
      })
      .finite("Pay amount must be a finite number")
      .min(LIMITS.payMin, `Pay amount cannot be less than ${LIMITS.payMin}`)
      .max(LIMITS.payMax, `Pay amount cannot exceed ${LIMITS.payMax}`),
  })
  .strip();

export const createApplicationSchema = z
  .object({
    companyName: z
      .string({ message: "Company name is required" })
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Company name is required")
          .max(
            LIMITS.companyName,
            `Company name cannot exceed ${LIMITS.companyName} characters`
          )
      ),
    role: z
      .string({ message: "Role is required" })
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Role is required")
          .max(LIMITS.role, `Role cannot exceed ${LIMITS.role} characters`)
      ),
    appliedFrom: z
      .string({ message: "Applied from is required" })
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Applied from is required")
          .max(
            LIMITS.appliedFrom,
            `Applied from cannot exceed ${LIMITS.appliedFrom} characters`
          )
      ),
    pay: paySchema,
    duration: z
      .string({ message: "Duration is required" })
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Duration is required")
          .max(
            LIMITS.duration,
            `Duration cannot exceed ${LIMITS.duration} characters`
          )
      ),
    skills: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(LIMITS.skills, `Skills cannot exceed ${LIMITS.skills} characters`)
      )
      .optional()
      .default(""),
    description: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(
            LIMITS.description,
            `Description cannot exceed ${LIMITS.description} characters`
          )
      )
      .optional()
      .default(""),
    notes: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(LIMITS.notes, `Notes cannot exceed ${LIMITS.notes} characters`)
      )
      .optional()
      .default(""),
    jobLink: z
      .string()
      .trim()
      .max(500, "Job link cannot exceed 500 characters")
      .refine((val) => !val || /^https?:\/\//i.test(val), {
        message: "Job link must start with http:// or https://",
      })
      .optional()
      .default(""),
    appliedDate: z.coerce
      .date({ invalid_type_error: "Invalid applied date" })
      .refine(
        (date) => {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
          return date <= tomorrow;
        },
        { message: "Applied date cannot be in the future" }
      )
      .optional(),
  })
  .strip()
  .superRefine((data, ctx) => {
    // 1. due=missed cannot be combined with dueFrom or dueTo
    if (data.due && (data.dueFrom || data.dueTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot combine due=missed with dueFrom or dueTo",
        path: ["due"],
      });
    }

    // 2. dueFrom and dueTo must come together
    if ((data.dueFrom && !data.dueTo) || (!data.dueFrom && data.dueTo)) {
      const missingField = data.dueFrom ? "dueTo" : "dueFrom";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dueFrom and dueTo must be provided together",
        path: [missingField],
      });
    }

    // 3. dueFrom < dueTo, max range 400 days
    if (data.dueFrom && data.dueTo) {
      const fromMs = data.dueFrom.getTime();
      const toMs = data.dueTo.getTime();

      if (fromMs >= toMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "dueFrom must be earlier than dueTo",
          path: ["dueFrom"],
        });
      } else {
        const maxRangeMs = 400 * 24 * 60 * 60 * 1000;
        if (toMs - fromMs > maxRangeMs) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Date range between dueFrom and dueTo cannot exceed 400 days",
            path: ["dueTo"],
          });
        }
      }
    }
  });

export const updateApplicationSchema = z
  .object({
    companyName: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Company name is required")
          .max(
            LIMITS.companyName,
            `Company name cannot exceed ${LIMITS.companyName} characters`
          )
      )
      .optional(),
    role: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Role is required")
          .max(LIMITS.role, `Role cannot exceed ${LIMITS.role} characters`)
      )
      .optional(),
    appliedFrom: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Applied from is required")
          .max(
            LIMITS.appliedFrom,
            `Applied from cannot exceed ${LIMITS.appliedFrom} characters`
          )
      )
      .optional(),
    pay: paySchema.optional(),
    duration: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Duration is required")
          .max(
            LIMITS.duration,
            `Duration cannot exceed ${LIMITS.duration} characters`
          )
      )
      .optional(),
    skills: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(LIMITS.skills, `Skills cannot exceed ${LIMITS.skills} characters`)
      )
      .optional(),
    description: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(
            LIMITS.description,
            `Description cannot exceed ${LIMITS.description} characters`
          )
      )
      .optional(),
    notes: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(LIMITS.notes, `Notes cannot exceed ${LIMITS.notes} characters`)
      )
      .optional(),
    jobLink: z
      .string()
      .trim()
      .max(500, "Job link cannot exceed 500 characters")
      .refine((val) => !val || /^https?:\/\//i.test(val), {
        message: "Job link must start with http:// or https://",
      })
      .optional(),
    appliedDate: z.coerce
      .date({ invalid_type_error: "Invalid applied date" })
      .refine(
        (date) => {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
          return date <= tomorrow;
        },
        { message: "Applied date cannot be in the future" }
      )
      .optional(),
  })
  .strip()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export const listQuerySchema = z
  .object({
    search: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid search parameter" })
        .transform(normalizeText)
        .pipe(
          z
            .string()
            .max(
              LIMITS.companyName,
              `Search cannot exceed ${LIMITS.companyName} characters`
            )
        )
        .transform((val) => (val === "" ? undefined : val))
        .optional()
    ),
    status: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid status" })
        .pipe(z.enum(STATUSES, { message: "Invalid status" }))
        .optional()
    ),
    appliedFrom: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid appliedFrom parameter" })
        .transform(normalizeText)
        .pipe(
          z
            .string()
            .max(
              LIMITS.appliedFrom,
              `Applied from cannot exceed ${LIMITS.appliedFrom} characters`
            )
        )
        .transform((val) => (val === "" ? undefined : val))
        .optional()
    ),
    replied: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid replied parameter" })
        .pipe(
          z.enum(["true", "false"], {
            message: "Invalid replied option",
          })
        )
        .transform((val) => val === "true")
        .optional()
    ),
    sort: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid sort option" })
        .pipe(
          z.enum(["latest", "oldest", "deadline"], {
            message: "Invalid sort option",
          })
        )
        .optional()
    ),
    due: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid due parameter" })
        .pipe(z.enum(["missed"], { message: "Invalid due parameter" }))
        .optional()
    ),
    dueFrom: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid dueFrom parameter" })
        .refine(
          (val) =>
            typeof val === "string" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?$/i.test(val) &&
            !isNaN(new Date(val).getTime()),
          { message: "Invalid dueFrom parameter" }
        )
        .transform((val) => new Date(val))
        .optional()
    ),
    dueTo: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string({ message: "Invalid dueTo parameter" })
        .refine(
          (val) =>
            typeof val === "string" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?$/i.test(val) &&
            !isNaN(new Date(val).getTime()),
          { message: "Invalid dueTo parameter" }
        )
        .transform((val) => new Date(val))
        .optional()
    ),
    page: z.preprocess(
      (val) => {
        if (val === "" || val === undefined) return 1;
        return val;
      },
      z
        .custom(
          (val) => {
            if (typeof val === "number" && val === 1) return true;
            if (typeof val !== "string" || !/^\d+$/.test(val.trim())) {
              return false;
            }
            const num = parseInt(val.trim(), 10);
            return num >= 1 && num <= 10000;
          },
          { message: "Invalid page number" }
        )
        .transform((val) =>
          typeof val === "number" ? val : parseInt(val.trim(), 10)
        )
    ),
    limit: z.preprocess(
      (val) => {
        if (val === "" || val === undefined) return LIMITS.pageSize;
        return val;
      },
      z
        .custom(
          (val) => {
            if (typeof val === "number" && val === LIMITS.pageSize) return true;
            if (typeof val !== "string" || !/^\d+$/.test(val.trim())) {
              return false;
            }
            const num = parseInt(val.trim(), 10);
            return num >= 1;
          },
          { message: "Invalid limit" }
        )
        .refine(
          (val) => {
            const num =
              typeof val === "number" ? val : parseInt(val.trim(), 10);
            return num <= LIMITS.maxPageSize;
          },
          { message: `Limit cannot exceed ${LIMITS.maxPageSize}` }
        )
        .transform((val) =>
          typeof val === "number" ? val : parseInt(val.trim(), 10)
        )
    ),
  })
  .strip()
  .superRefine((data, ctx) => {
    // 1. due=missed cannot be combined with dueFrom or dueTo
    if (data.due && (data.dueFrom || data.dueTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot combine due=missed with dueFrom or dueTo",
        path: ["due"],
      });
    }

    // 2. dueFrom and dueTo must come together
    if ((data.dueFrom && !data.dueTo) || (!data.dueFrom && data.dueTo)) {
      const missingField = data.dueFrom ? "dueTo" : "dueFrom";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dueFrom and dueTo must be provided together",
        path: [missingField],
      });
    }

    // 3. dueFrom < dueTo, max range 400 days
    if (data.dueFrom && data.dueTo) {
      const fromMs = data.dueFrom.getTime();
      const toMs = data.dueTo.getTime();

      if (fromMs >= toMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "dueFrom must be earlier than dueTo",
          path: ["dueFrom"],
        });
      } else {
        const maxRangeMs = 400 * 24 * 60 * 60 * 1000;
        if (toMs - fromMs > maxRangeMs) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Date range between dueFrom and dueTo cannot exceed 400 days",
            path: ["dueTo"],
          });
        }
      }
    }
  });
