import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import config from "../../config/env.js";
import {
  RESUME_PARSE_TIMEOUT_MS,
  JOB_RANK_TIMEOUT_MS,
} from "../../config/constants.js";

let defaultAnthropicClient = null;
let defaultGoogleClient = null;

let rankAnthropicClient = null;
let rankGoogleClient = null;

/**
 * Custom AI Error class used across AI services.
 */
export class AiError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "AiError";
    this.code = code;
  }
}

/**
 * Returns whether the active AI provider has an API key configured.
 */
export function isAiConfigured() {
  const provider = (config.aiProvider || "anthropic").toLowerCase();
  if (provider === "google") {
    return Boolean(config.googleApiKey && config.googleApiKey.trim());
  }
  if (provider === "anthropic") {
    return Boolean(config.anthropicApiKey && config.anthropicApiKey.trim());
  }
  return false;
}

/**
 * Returns an Anthropic SDK client for resume parsing (standard retries).
 */
export function getAnthropicResumeClient() {
  if (!config.anthropicApiKey) {
    throw new AiError("AI_UNAVAILABLE", "Anthropic API key is not configured");
  }
  if (!defaultAnthropicClient) {
    defaultAnthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: RESUME_PARSE_TIMEOUT_MS,
      maxRetries: 2,
    });
  }
  return defaultAnthropicClient;
}

/**
 * Returns a Google GenAI client for resume parsing (standard retries).
 */
export function getGoogleResumeClient() {
  if (!config.googleApiKey) {
    throw new AiError("AI_UNAVAILABLE", "Google API key is not configured");
  }
  if (!defaultGoogleClient) {
    defaultGoogleClient = new GoogleGenAI({
      apiKey: config.googleApiKey,
      httpOptions: {
        apiVersion: "v1beta",
        timeout: RESUME_PARSE_TIMEOUT_MS,
        retryOptions: { attempts: 3 },
      },
    });
  }
  return defaultGoogleClient;
}

/**
 * Returns an Anthropic SDK client configured for job ranking (0 auto-retries).
 */
export function getAnthropicRankClient() {
  if (!config.anthropicApiKey) {
    throw new AiError("AI_UNAVAILABLE", "Anthropic API key is not configured");
  }
  if (!rankAnthropicClient) {
    rankAnthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: JOB_RANK_TIMEOUT_MS,
      maxRetries: 0,
    });
  }
  return rankAnthropicClient;
}

/**
 * Returns a Google GenAI client configured for job ranking (1 attempt / no auto-retries).
 */
export function getGoogleRankClient() {
  if (!config.googleApiKey) {
    throw new AiError("AI_UNAVAILABLE", "Google API key is not configured");
  }
  if (!rankGoogleClient) {
    rankGoogleClient = new GoogleGenAI({
      apiKey: config.googleApiKey,
      httpOptions: {
        apiVersion: "v1beta",
        timeout: JOB_RANK_TIMEOUT_MS,
        retryOptions: { attempts: 1 },
      },
    });
  }
  return rankGoogleClient;
}

/**
 * Categorizes an AI exception into a normalized status code.
 *
 * @param {Error|any} err
 * @returns {"unavailable" | "quota" | "timeout" | "invalid_output" | "failed"}
 */
export function classifyAiError(err) {
  if (!err) return "failed";

  if (err instanceof AiError && err.code) {
    const code = err.code.toLowerCase();
    if (code === "ai_unavailable" || code === "unavailable") return "unavailable";
    if (code === "quota" || code === "rate_limit") return "quota";
    if (code === "timeout") return "timeout";
    if (code === "invalid_output") return "invalid_output";
    return "failed";
  }

  const status = Number(err.status || err.statusCode || err.error?.code || 0);
  const msg = String(err.message || "").toLowerCase();
  const name = String(err.name || "").toLowerCase();

  if (
    status === 429 ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    return "quota";
  }

  if (
    name.includes("abort") ||
    name.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    err.code === "ETIMEDOUT" ||
    err.code === "ECONNABORTED"
  ) {
    return "timeout";
  }

  if (
    status === 401 ||
    status === 403 ||
    msg.includes("api key") ||
    msg.includes("unauthorized")
  ) {
    return "unavailable";
  }

  if (name.includes("zoderror") || msg.includes("json") || msg.includes("invalid output")) {
    return "invalid_output";
  }

  return "failed";
}

export default {
  AiError,
  isAiConfigured,
  getAnthropicResumeClient,
  getGoogleResumeClient,
  getAnthropicRankClient,
  getGoogleRankClient,
  classifyAiError,
};
