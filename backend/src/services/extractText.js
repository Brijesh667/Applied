import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import {
  RESUME_TEXT_MAX_CHARS,
  RESUME_MIN_TEXT_CHARS,
} from "../config/constants.js";

export class ExtractError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "ExtractError";
    this.code = code;
  }
}

export const cleanText = (raw) => {
  if (typeof raw !== "string") return "";
  const noControl = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ");
  const collapsedSpaces = noControl.replace(/[ \t]+/g, " ");
  const collapsedLines = collapsedSpaces.replace(/\n\s*\n\s*\n+/g, "\n\n");
  const trimmed = collapsedLines.trim();
  if (trimmed.length > RESUME_TEXT_MAX_CHARS) {
    return trimmed.slice(0, RESUME_TEXT_MAX_CHARS);
  }
  return trimmed;
};

const withTimeout = (promise, ms, errorCode) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new ExtractError(errorCode, `Extraction timed out after ${ms}ms`)
      );
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};

export const extractResumeText = async (buffer, fileType) => {
  if (!buffer || buffer.length === 0) {
    throw new ExtractError("NO_TEXT", "File buffer is empty");
  }

  let rawText = "";
  try {
    if (fileType === "pdf") {
      const uint8 = new Uint8Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      );
      const parsePromise = pdfParse(uint8).then((data) => data?.text || "");
      rawText = await withTimeout(parsePromise, 10000, "EXTRACT_FAILED");
    } else if (fileType === "docx") {
      const parsePromise = mammoth
        .extractRawText({ buffer })
        .then((res) => res?.value || "");
      rawText = await withTimeout(parsePromise, 10000, "EXTRACT_FAILED");
    } else {
      throw new ExtractError(
        "EXTRACT_FAILED",
        `Unsupported file type: ${fileType}`
      );
    }
  } catch (err) {
    if (err instanceof ExtractError) {
      throw err;
    }
    throw new ExtractError(
      "EXTRACT_FAILED",
      err.message || "Failed to extract text"
    );
  }

  const cleaned = cleanText(rawText);
  if (cleaned.length < RESUME_MIN_TEXT_CHARS) {
    throw new ExtractError(
      "NO_TEXT",
      "Extracted text is below minimum character threshold"
    );
  }

  return cleaned;
};

export default {
  extractResumeText,
  cleanText,
  ExtractError,
};
