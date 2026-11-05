import { z } from "zod";
import { LIMITS } from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .transform(normalizeText)
      .pipe(
        z
          .string()
          .min(1, "Name is required")
          .max(LIMITS.name, `Name cannot exceed ${LIMITS.name} characters`)
      ),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address")
      .max(LIMITS.email, `Email cannot exceed ${LIMITS.email} characters`),
    password: z
      .string({ required_error: "Password is required" })
      .min(
        LIMITS.passwordMin,
        `Password must be at least ${LIMITS.passwordMin} characters`
      )
      .max(
        LIMITS.passwordMax,
        `Password cannot exceed ${LIMITS.passwordMax} characters`
      ),
  })
  .strip();

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
  })
  .strip();
