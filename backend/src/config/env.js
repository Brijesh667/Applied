import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5000),
    MONGO_URI: z.string().min(1, "MONGO_URI is required"),
    SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
    CLIENT_URL: z.string().min(1, "CLIENT_URL is required"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && data.SESSION_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SESSION_SECRET must be at least 32 characters in production",
        path: ["SESSION_SECRET"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "config";
    console.error(`  - ${path}: ${issue.message}`);
  }
  process.exit(1);
}

const clientUrls = parsed.data.CLIENT_URL.split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const isProduction = parsed.data.NODE_ENV === "production";
const isCookieSameSiteNone = parsed.data.COOKIE_SAMESITE === "none";
const cookieSecure = isProduction || isCookieSameSiteNone;

export const config = {
  port: parsed.data.PORT,
  mongoUri: parsed.data.MONGO_URI,
  sessionSecret: parsed.data.SESSION_SECRET,
  clientUrl: parsed.data.CLIENT_URL,
  clientUrls,
  nodeEnv: parsed.data.NODE_ENV,
  cookieSameSite: parsed.data.COOKIE_SAMESITE,
  cookieSecure,
  isProduction,
  trustProxyHops: parsed.data.TRUST_PROXY_HOPS,
  PORT: parsed.data.PORT,
  MONGO_URI: parsed.data.MONGO_URI,
  SESSION_SECRET: parsed.data.SESSION_SECRET,
  CLIENT_URL: parsed.data.CLIENT_URL,
  NODE_ENV: parsed.data.NODE_ENV,
  COOKIE_SAMESITE: parsed.data.COOKIE_SAMESITE,
};

export default config;
