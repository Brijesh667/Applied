import { z } from "zod";
import { LIMITS, REPLY_TYPES } from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

export const createReplySchema = z
  .object({
    type: z
      .string({ message: "Reply type is required" })
      .pipe(z.enum(REPLY_TYPES, { message: "Invalid reply type" })),
    receivedDate: z.coerce
      .date({ invalid_type_error: "Invalid received date" })
      .refine(
        (date) => {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
          return date <= tomorrow;
        },
        { message: "Received date cannot be in the future" }
      )
      .optional(),
    deadline: z.coerce
      .date({ invalid_type_error: "Invalid deadline date" })
      .optional(),
    completed: z.boolean().optional().default(false),
    notes: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(
            LIMITS.replyNotes,
            `Reply notes cannot exceed ${LIMITS.replyNotes} characters`
          )
      )
      .optional()
      .default(""),
  })
  .strip()
  .refine(
    (data) => {
      if (data.receivedDate && data.deadline) {
        return new Date(data.deadline) >= new Date(data.receivedDate);
      }
      return true;
    },
    {
      message: "Deadline cannot be before received date",
      path: ["deadline"],
    }
  );

export const updateReplySchema = z
  .object({
    type: z.enum(REPLY_TYPES, { message: "Invalid reply type" }).optional(),
    receivedDate: z.coerce
      .date({ invalid_type_error: "Invalid received date" })
      .refine(
        (date) => {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
          return date <= tomorrow;
        },
        { message: "Received date cannot be in the future" }
      )
      .optional(),
    deadline: z.coerce
      .date({ invalid_type_error: "Invalid deadline date" })
      .nullable()
      .optional(),
    completed: z.boolean().optional(),
    notes: z
      .string()
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .max(
            LIMITS.replyNotes,
            `Reply notes cannot exceed ${LIMITS.replyNotes} characters`
          )
      )
      .optional(),
  })
  .strip()
  .refine(
    (data) => {
      if (data.receivedDate && data.deadline) {
        return new Date(data.deadline) >= new Date(data.receivedDate);
      }
      return true;
    },
    {
      message: "Deadline cannot be before received date",
      path: ["deadline"],
    }
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });
