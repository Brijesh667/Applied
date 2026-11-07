import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

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
    CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
    CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
    CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
    AI_PROVIDER: z.enum(["anthropic", "google"]).default("anthropic"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-haiku-5-5"),
    GOOGLE_API_KEY: z.string().optional(),
    GOOGLE_MODEL: z.string().default("gemini-2.5-flash"),
    ADZUNA_APP_ID: z.string().optional(),
    ADZUNA_APP_KEY: z.string().optional(),
    JSEARCH_API_KEY: z.string().optional(),
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

const selectedProvider = parsed.data.AI_PROVIDER;
const isKeyMissing =
  (selectedProvider === "anthropic" && !parsed.data.ANTHROPIC_API_KEY) ||
  (selectedProvider === "google" && !parsed.data.GOOGLE_API_KEY);

if (isKeyMissing) {
  console.warn("AI parsing disabled");
}

const unconfiguredJobProviders = [];
if (!parsed.data.ADZUNA_APP_ID || !parsed.data.ADZUNA_APP_KEY) {
  unconfiguredJobProviders.push("Adzuna");
}
if (!parsed.data.JSEARCH_API_KEY) {
  unconfiguredJobProviders.push("JSearch");
}
if (unconfiguredJobProviders.length > 0) {
  console.warn(
    `Job search providers not configured: ${unconfiguredJobProviders.join(", ")}`
  );
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
  cloudinaryCloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: parsed.data.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: parsed.data.CLOUDINARY_API_SECRET,
  aiProvider: parsed.data.AI_PROVIDER,
  anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
  anthropicModel: parsed.data.ANTHROPIC_MODEL,
  googleApiKey: parsed.data.GOOGLE_API_KEY,
  googleModel: parsed.data.GOOGLE_MODEL,
  adzunaAppId: parsed.data.ADZUNA_APP_ID,
  adzunaAppKey: parsed.data.ADZUNA_APP_KEY,
  jsearchApiKey: parsed.data.JSEARCH_API_KEY,
  isAdzunaConfigured: Boolean(parsed.data.ADZUNA_APP_ID && parsed.data.ADZUNA_APP_KEY),
  isJSearchConfigured: Boolean(parsed.data.JSEARCH_API_KEY),
  CLOUDINARY_CLOUD_NAME: parsed.data.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: parsed.data.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: parsed.data.CLOUDINARY_API_SECRET,
  AI_PROVIDER: parsed.data.AI_PROVIDER,
  ANTHROPIC_API_KEY: parsed.data.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: parsed.data.ANTHROPIC_MODEL,
  GOOGLE_API_KEY: parsed.data.GOOGLE_API_KEY,
  GOOGLE_MODEL: parsed.data.GOOGLE_MODEL,
  ADZUNA_APP_ID: parsed.data.ADZUNA_APP_ID,
  ADZUNA_APP_KEY: parsed.data.ADZUNA_APP_KEY,
  JSEARCH_API_KEY: parsed.data.JSEARCH_API_KEY,
  PORT: parsed.data.PORT,
  MONGO_URI: parsed.data.MONGO_URI,
  SESSION_SECRET: parsed.data.SESSION_SECRET,
  CLIENT_URL: parsed.data.CLIENT_URL,
  NODE_ENV: parsed.data.NODE_ENV,
  COOKIE_SAMESITE: parsed.data.COOKIE_SAMESITE,
};

export default config;
