import { z } from "zod";
import mongoose from "mongoose";

export const jobSearchSchema = z
  .object({
    resumeId: z
      .string()
      .trim()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid resume ID",
      }),
    refresh: z.boolean().optional().default(false),
  })
  .strict();

export function validateJobSearch(req, res, next) {
  const result = jobSearchSchema.safeParse(req.body);
  if (!result.success) {
    const formattedErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
      formattedErrors[field] = issue.message;
    }
    return res.status(400).json({
      message: "Validation failed",
      errors: formattedErrors,
    });
  }
  req.body = result.data;
  next();
}

export default {
  jobSearchSchema,
  validateJobSearch,
};
