import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).optional(),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
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
    JOOBLE_API_KEY: z.string().optional(),
    CAREERJET_API_KEY: z.string().optional(),
    CAREERJET_LOCALE: z.string().default("en_IN"),
    JOB_PROVIDERS: z.string().optional(),
    JOB_SEARCH_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
    JOB_SEARCH_DAILY_WINDOW_HOURS: z.coerce.number().positive().default(24),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (data.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SESSION_SECRET must be at least 32 characters in production",
          path: ["SESSION_SECRET"],
        });
      }
      if (!data.CLIENT_URL || data.CLIENT_URL.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLIENT_URL cannot be empty in production",
          path: ["CLIENT_URL"],
        });
      }
    }
    if (data.CLIENT_URL) {
      const urls = data.CLIENT_URL.split(",").map((u) => u.trim());
      if (urls.includes("*")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLIENT_URL cannot contain wildcards",
          path: ["CLIENT_URL"],
        });
      }
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

export const CAREERJET_SUPPORTED_LOCALES = new Set([
  "cs_CZ", "da_DK", "de_AT", "de_CH", "de_DE", "en_AE", "en_AU", "en_CA",
  "en_CN", "en_HK", "en_IE", "en_IN", "en_MY", "en_NZ", "en_OM", "en_PH",
  "en_PK", "en_QA", "en_SG", "en_GB", "en_US", "en_ZA", "es_AR", "es_BO",
  "es_CL", "es_CO", "es_CR", "es_DO", "es_EC", "es_ES", "es_GT", "es_MX",
  "es_PA", "es_PE", "es_PR", "es_PY", "es_UY", "es_VE", "fi_FI", "fr_BE",
  "fr_CA", "fr_CH", "fr_FR", "fr_LU", "fr_MA", "hu_HU", "it_IT", "ja_JP",
  "ko_KR", "nl_BE", "nl_NL", "no_NO", "pl_PL", "pt_BR", "pt_PT", "ro_RO",
  "ru_RU", "ru_UA", "sk_SK", "sv_SE", "tr_TR", "uk_UA", "vi_VN", "zh_CN",
  "zh_TW",
]);

/**
 * Resolves list of enabled job provider identifiers from environment variables.
 * Follows the Phase 3 provider selection rules:
 * - If JOB_PROVIDERS is "none", returns []
 * - If JOB_PROVIDERS is set, parses comma-separated names and keeps only keyed providers
 *   that have their keys, plus keyless providers.
 * - If JOB_PROVIDERS is omitted, defaults to every keyed provider that has its key + keyless providers.
 *
 * @param {Object} envData - parsed environment data
 * @returns {Array<string>} list of enabled provider IDs
 */
export function parseEnabledJobProviders(envData = {}) {
  const isAdzunaConfigured = Boolean(
    envData.ADZUNA_APP_ID && envData.ADZUNA_APP_KEY
  );
  const isJSearchConfigured = Boolean(envData.JSEARCH_API_KEY);
  const isJoobleConfigured = Boolean(envData.JOOBLE_API_KEY);
  const isCareerjetConfigured = Boolean(envData.CAREERJET_API_KEY);

  const providerKeyConfigured = {
    adzuna: isAdzunaConfigured,
    jsearch: isJSearchConfigured,
    jooble: isJoobleConfigured,
    careerjet: isCareerjetConfigured,
    himalayas: true,
    remoteok: true,
  };

  const raw =
    envData.JOB_PROVIDERS !== undefined && envData.JOB_PROVIDERS !== null
      ? String(envData.JOB_PROVIDERS).trim()
      : null;

  if (raw !== null) {
    if (raw.toLowerCase() === "none") {
      return [];
    }
    const requested = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return requested.filter((p) => {
      if (Object.prototype.hasOwnProperty.call(providerKeyConfigured, p)) {
        return providerKeyConfigured[p];
      }
      return false;
    });
  }

  // Default: every keyed provider that has its key + two keyless providers
  const defaultList = [];
  if (isAdzunaConfigured) defaultList.push("adzuna");
  if (isJSearchConfigured) defaultList.push("jsearch");
  if (isJoobleConfigured) defaultList.push("jooble");
  if (isCareerjetConfigured) defaultList.push("careerjet");
  defaultList.push("himalayas");
  defaultList.push("remoteok");

  return defaultList;
}

const enabledJobProviders = parseEnabledJobProviders(parsed.data);

const ALL_PROVIDER_META = [
  { id: "adzuna", name: "Adzuna" },
  { id: "jsearch", name: "JSearch" },
  { id: "jooble", name: "Jooble" },
  { id: "careerjet", name: "Careerjet" },
  { id: "himalayas", name: "Himalayas" },
  { id: "remoteok", name: "RemoteOK" },
];

const activeNames = ALL_PROVIDER_META
  .filter((p) => enabledJobProviders.includes(p.id))
  .map((p) => p.name);

console.log(
  `Active job providers (${activeNames.length}): ${activeNames.join(", ")}`
);

const notEnabledProviders = ALL_PROVIDER_META.filter(
  (p) => !enabledJobProviders.includes(p.id)
).map((p) => p.name);

if (notEnabledProviders.length > 0) {
  console.log(
    `Optional job providers without API keys: ${notEnabledProviders.join(", ")}`
  );
}

const baseClientUrls = parsed.data.CLIENT_URL.split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const isProduction = parsed.data.NODE_ENV === "production";

const clientUrls = isProduction
  ? baseClientUrls
  : [
      ...new Set([
        ...baseClientUrls,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
      ]),
    ];
const isCookieSameSiteNone = parsed.data.COOKIE_SAMESITE === "none";
const cookieSecure = isProduction || isCookieSameSiteNone;

const defaultTrustProxy = isProduction ? 1 : 0;
const trustProxy =
  parsed.data.TRUST_PROXY !== undefined
    ? parsed.data.TRUST_PROXY
    : parsed.data.TRUST_PROXY_HOPS !== undefined
    ? parsed.data.TRUST_PROXY_HOPS
    : defaultTrustProxy;

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
  trustProxy,
  trustProxyHops: trustProxy,
  authRateLimitMax: isProduction
    ? parsed.data.AUTH_RATE_LIMIT_MAX
    : Math.max(parsed.data.AUTH_RATE_LIMIT_MAX, 100),
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
  joobleApiKey: parsed.data.JOOBLE_API_KEY,
  careerjetApiKey: parsed.data.CAREERJET_API_KEY,
  careerjetLocale: parsed.data.CAREERJET_LOCALE,
  jobProvidersRaw: parsed.data.JOB_PROVIDERS,
  jobSearchDailyLimit: parsed.data.JOB_SEARCH_DAILY_LIMIT,
  jobSearchDailyWindowMs: parsed.data.JOB_SEARCH_DAILY_WINDOW_HOURS * 60 * 60 * 1000,
  enabledJobProviders,
  isAdzunaConfigured: enabledJobProviders.includes("adzuna"),
  isJSearchConfigured: enabledJobProviders.includes("jsearch"),
  isJoobleConfigured: enabledJobProviders.includes("jooble"),
  isCareerjetConfigured: enabledJobProviders.includes("careerjet"),
  isHimalayasConfigured: enabledJobProviders.includes("himalayas"),
  isRemoteOkConfigured: enabledJobProviders.includes("remoteok"),
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
  JOOBLE_API_KEY: parsed.data.JOOBLE_API_KEY,
  CAREERJET_API_KEY: parsed.data.CAREERJET_API_KEY,
  CAREERJET_LOCALE: parsed.data.CAREERJET_LOCALE,
  JOB_PROVIDERS: parsed.data.JOB_PROVIDERS,
  PORT: parsed.data.PORT,
  MONGO_URI: parsed.data.MONGO_URI,
  SESSION_SECRET: parsed.data.SESSION_SECRET,
  CLIENT_URL: parsed.data.CLIENT_URL,
  NODE_ENV: parsed.data.NODE_ENV,
  COOKIE_SAMESITE: parsed.data.COOKIE_SAMESITE,
};

export default config;
