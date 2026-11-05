import { CURRENCY, PAY_LABELS } from "./constants.js";
import { normalizeText } from "./normalize.js";

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatPay(pay) {
  if (!pay || typeof pay.amount !== "number") return "";
  const formatted = new Intl.NumberFormat("en-IN").format(pay.amount);
  const label = PAY_LABELS[pay.type] || pay.type || "";
  return `${CURRENCY}${formatted} ${label}`.trim();
}

export function daysUntil(iso) {
  if (!iso) return 0;
  const target = new Date(iso);
  if (isNaN(target.getTime())) return 0;
  const now = new Date();
  const targetMidnight = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const nowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffMs = targetMidnight.getTime() - nowMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Standard centralized deadline wording:
 * - "Missed yesterday" (1 day ago) or "yesterday" (when inMissedGroup: true)
 * - "Missed N days ago" (N days ago) or "N days ago" (when inMissedGroup: true)
 * - "Today" (0 days)
 * - "Tomorrow" (1 day)
 * - "In N days" (N days)
 */
export function dueText(iso, options = {}) {
  if (!iso) return "";
  const days = daysUntil(iso);
  if (days < 0) {
    const abs = Math.abs(days);
    const dayStr = abs === 1 ? "yesterday" : `${abs} days ago`;
    if (options?.inMissedGroup) {
      return dayStr;
    }
    return abs === 1 ? "Missed yesterday" : `Missed ${abs} days ago`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function dueLabel(iso, options = {}) {
  return dueText(iso, options);
}

/**
 * Formats merged deadline chip label: "{date} · {relative}"
 * e.g. "11 Nov 2026 · In 8 days", "11 Nov 2026 · Missed yesterday"
 */
export function formatMergedDueText(iso) {
  if (!iso) return "";
  const dateStr = formatDate(iso);
  const relative = dueText(iso);
  if (dateStr && relative) {
    return `${dateStr} · ${relative}`;
  }
  return dateStr || relative || "";
}

/**
 * Centralized deadline labels for headings, KPI strips, and aria descriptions
 */
export const DEADLINE_LABELS = {
  missed: "Missed",
  thisWeek: "This week",
  deadline: "Deadline",
};

export function splitSkills(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split(",")
    .map(normalizeText)
    .filter((skill) => skill.length > 0);
}
