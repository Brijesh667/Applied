/**
 * Form helpers for Add / Edit Application
 */
import { LIMITS, PLATFORMS } from "./constants.js";
import { normalizeText } from "./normalize.js";

export function getLocalTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function dateToLocalNoonISO(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + "T12:00:00").toISOString();
}

export function deadlineToEndOfDayISO(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + "T23:59:00").toISOString();
}

export function isoToLocalDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function emptyValues() {
  return {
    companyName: "",
    role: "",
    platform: "",
    platformOther: "",
    payType: "monthly",
    payAmount: "",
    duration: "",
    skills: "",
    description: "",
    notes: "",
    jobLink: "",
    appliedDate: getLocalTodayString(),
  };
}

export function toFormValues(application) {
  if (!application) return emptyValues();

  // Platform matching: case-insensitive against PLATFORMS (except "Other")
  const standardPlatforms = PLATFORMS.filter((p) => p !== "Other");
  const matched = standardPlatforms.find(
    (p) => p.toLowerCase() === (application.appliedFrom || "").toLowerCase()
  );

  let platform = "";
  let platformOther = "";

  if (matched) {
    platform = matched;
  } else if (application.appliedFrom) {
    platform = "Other";
    platformOther = application.appliedFrom;
  }

  // Local yyyy-mm-dd for appliedDate
  let appliedDate = getLocalTodayString();
  if (application.appliedDate) {
    const d = new Date(application.appliedDate);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      appliedDate = `${yyyy}-${mm}-${dd}`;
    }
  }

  return {
    companyName: application.companyName || "",
    role: application.role || "",
    platform,
    platformOther,
    payType: application.pay?.type || "monthly",
    payAmount:
      application.pay?.amount !== undefined && application.pay?.amount !== null
        ? String(application.pay.amount)
        : "",
    duration: application.duration || "",
    skills: application.skills || "",
    description: application.description || "",
    notes: application.notes || "",
    jobLink: application.jobLink || "",
    appliedDate,
  };
}

export function cleanSkills(str) {
  if (!str || typeof str !== "string") return "";
  // Replace newlines, bullets (•), pipes (|), semicolons (;), and middle dots (·) with commas
  const unified = str.replace(/[\n\r•|;·]/g, ",");
  const parts = unified.split(",");
  const seen = new Set();
  const cleaned = [];

  for (const part of parts) {
    const norm = normalizeText(part);
    if (!norm) continue;
    const lower = norm.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      cleaned.push(norm);
    }
  }

  return cleaned.join(", ");
}

export function validate(values) {
  const errors = {};

  // Company Name
  const normCompany = normalizeText(values.companyName);
  if (!normCompany) {
    errors.companyName = "Company name is required.";
  } else if (normCompany.length > LIMITS.companyName) {
    errors.companyName = `Company name cannot exceed ${LIMITS.companyName} characters.`;
  }

  // Role
  const normRole = normalizeText(values.role);
  if (!normRole) {
    errors.role = "Role is required.";
  } else if (normRole.length > LIMITS.role) {
    errors.role = `Role cannot exceed ${LIMITS.role} characters.`;
  }

  // Platform
  if (!values.platform) {
    errors.platform = "Choose where you applied.";
  } else if (values.platform === "Other") {
    const normOther = normalizeText(values.platformOther);
    if (!normOther) {
      errors.platformOther = "Enter the platform name.";
    } else if (normOther.length > LIMITS.appliedFrom) {
      errors.platformOther = `Platform name cannot exceed ${LIMITS.appliedFrom} characters.`;
    }
  }

  // Pay Amount
  if (
    values.payAmount === "" ||
    values.payAmount === undefined ||
    values.payAmount === null
  ) {
    errors.payAmount = "Enter an amount. Use 0 if unpaid.";
  } else {
    const trimmedAmount = String(values.payAmount).trim();
    // Valid non-negative number with at most 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmount)) {
      errors.payAmount = "Enter a valid amount.";
    } else {
      const num = Number(trimmedAmount);
      if (isNaN(num) || num < LIMITS.payMin) {
        errors.payAmount = "Enter a valid amount.";
      } else if (num > LIMITS.payMax) {
        errors.payAmount = "Amount cannot exceed 1,00,00,000.";
      }
    }
  }

  // Duration
  const normDuration = normalizeText(values.duration);
  if (!normDuration) {
    errors.duration = "Duration is required.";
  } else if (normDuration.length > LIMITS.duration) {
    errors.duration = `Duration cannot exceed ${LIMITS.duration} characters.`;
  }

  // Skills
  const cleanedSkillsStr = cleanSkills(values.skills);
  if (cleanedSkillsStr.length > LIMITS.skills) {
    errors.skills = `Skills cannot exceed ${LIMITS.skills} characters.`;
  }

  // Description
  const normDesc = normalizeText(values.description);
  if (normDesc.length > LIMITS.description) {
    errors.description = `Description cannot exceed ${LIMITS.description} characters.`;
  }

  // Notes
  const normNotes = normalizeText(values.notes);
  if (normNotes.length > LIMITS.notes) {
    errors.notes = `Notes cannot exceed ${LIMITS.notes} characters.`;
  }

  // Job Link
  const trimmedLink = (values.jobLink || "").trim();
  if (trimmedLink.length > 0) {
    if (!/^https?:\/\//i.test(trimmedLink)) {
      errors.jobLink = "Enter a full link starting with http:// or https://.";
    } else if (trimmedLink.length > LIMITS.jobLink) {
      errors.jobLink = `Job link cannot exceed ${LIMITS.jobLink} characters.`;
    }
  }

  // Applied Date
  if (!values.appliedDate) {
    errors.appliedDate = "Pick the date you applied.";
  } else {
    const today = getLocalTodayString();
    if (values.appliedDate > today) {
      errors.appliedDate = "Applied date cannot be in the future.";
    }
  }

  return errors;
}

export function toPayload(values) {
  const appliedFrom =
    values.platform === "Other"
      ? normalizeText(values.platformOther)
      : values.platform;

  return {
    companyName: normalizeText(values.companyName),
    role: normalizeText(values.role),
    appliedFrom,
    pay: {
      type: values.payType,
      amount: Number(values.payAmount),
    },
    duration: normalizeText(values.duration),
    skills: cleanSkills(values.skills),
    description: normalizeText(values.description),
    notes: normalizeText(values.notes),
    jobLink: (values.jobLink || "").trim(),
    appliedDate: new Date(values.appliedDate + "T12:00:00").toISOString(),
  };
}

export function toPatch(values, initialValues) {
  const patch = {};

  const curCompany = normalizeText(values.companyName);
  const initCompany = normalizeText(initialValues.companyName);
  if (curCompany !== initCompany) {
    patch.companyName = curCompany;
  }

  const curRole = normalizeText(values.role);
  const initRole = normalizeText(initialValues.role);
  if (curRole !== initRole) {
    patch.role = curRole;
  }

  const curPlatform =
    values.platform === "Other"
      ? normalizeText(values.platformOther)
      : values.platform;
  const initPlatform =
    initialValues.platform === "Other"
      ? normalizeText(initialValues.platformOther)
      : initialValues.platform;
  if (curPlatform !== initPlatform) {
    patch.appliedFrom = curPlatform;
  }

  const curPayType = values.payType;
  const initPayType = initialValues.payType;
  const curPayAmount = Number(values.payAmount);
  const initPayAmount = Number(initialValues.payAmount);
  if (curPayType !== initPayType || curPayAmount !== initPayAmount) {
    patch.pay = {
      type: curPayType,
      amount: curPayAmount,
    };
  }

  const curDuration = normalizeText(values.duration);
  const initDuration = normalizeText(initialValues.duration);
  if (curDuration !== initDuration) {
    patch.duration = curDuration;
  }

  const curSkills = cleanSkills(values.skills);
  const initSkills = cleanSkills(initialValues.skills);
  if (curSkills !== initSkills) {
    patch.skills = curSkills;
  }

  const curDesc = normalizeText(values.description);
  const initDesc = normalizeText(initialValues.description);
  if (curDesc !== initDesc) {
    patch.description = curDesc;
  }

  const curNotes = normalizeText(values.notes);
  const initNotes = normalizeText(initialValues.notes);
  if (curNotes !== initNotes) {
    patch.notes = curNotes;
  }

  const curLink = (values.jobLink || "").trim();
  const initLink = (initialValues.jobLink || "").trim();
  if (curLink !== initLink) {
    patch.jobLink = curLink;
  }

  if (values.appliedDate !== initialValues.appliedDate) {
    patch.appliedDate = new Date(values.appliedDate + "T12:00:00").toISOString();
  }

  return patch;
}

export function mapServerErrors(errors = {}, platform = "") {
  const mapped = {};
  for (const [key, msg] of Object.entries(errors)) {
    if (key === "appliedFrom") {
      if (platform === "Other") {
        mapped.platformOther = msg;
      } else {
        mapped.platform = msg;
      }
    } else if (key === "pay.amount" || key === "payAmount") {
      mapped.payAmount = msg;
    } else if (key === "pay.type" || key === "payType") {
      mapped.payType = msg;
    } else {
      mapped[key] = msg;
    }
  }
  return mapped;
}
