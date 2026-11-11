import Resume from "../models/Resume.js";
import {
  RESUME_PARSE_STALE_MS,
  RESUME_MAX_BYTES,
} from "../config/constants.js";
import { getSignedDownloadUrl } from "./storage.js";
import { extractResumeText, ExtractError } from "./extractText.js";
import { parseResumeWithAi, AiError } from "./resumeAi.js";

export const runParse = async (
  resumeId,
  { isAlreadyClaimed = false } = {}
) => {
  let claimedDoc = null;
  try {
    // 1. Claim document
    if (isAlreadyClaimed) {
      claimedDoc = await Resume.findById(resumeId).select(
        "+extractedText +storagePublicId"
      );
    } else {
      const staleThreshold = new Date(Date.now() - RESUME_PARSE_STALE_MS);
      claimedDoc = await Resume.findOneAndUpdate(
        {
          _id: resumeId,
          $or: [
            { parseStatus: { $ne: "pending" } },
            { parseStatus: "pending", parseStartedAt: { $lt: staleThreshold } },
            { parseStatus: "pending", parseStartedAt: null },
          ],
        },
        {
          $set: {
            parseStatus: "pending",
            parseStartedAt: new Date(),
            parseError: null,
          },
        },
        { returnDocument: "after" }
      ).select("+extractedText +storagePublicId");
    }

    if (!claimedDoc) {
      return null;
    }

    // 2. Get text: use stored extractedText or download and extract
    let text = claimedDoc.extractedText;
    if (!text || text.trim().length === 0) {
      const downloadUrl = getSignedDownloadUrl(
        claimedDoc.storagePublicId,
        claimedDoc.fileName
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let fileBuffer;
      try {
        const response = await fetch(downloadUrl, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ExtractError(
            "EXTRACT_FAILED",
            `Download failed with HTTP ${response.status}`
          );
        }
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > RESUME_MAX_BYTES) {
          throw new ExtractError(
            "EXTRACT_FAILED",
            "Downloaded file exceeds maximum allowed size"
          );
        }
        fileBuffer = Buffer.from(arrayBuf);
      } finally {
        clearTimeout(timer);
      }

      text = await extractResumeText(fileBuffer, claimedDoc.fileType);
    }

    // 3. Call AI parse
    const aiData = await parseResumeWithAi(text);

    // 4. Save results
    const currentDoc = await Resume.findById(claimedDoc._id);
    if (!currentDoc) return null;

    currentDoc.extractedText = text;
    currentDoc.parseStatus = "done";
    currentDoc.parsedAt = new Date();
    currentDoc.parseError = null;

    if (!currentDoc.skillsEditedByUser) {
      currentDoc.skills = aiData.skills;
      currentDoc.roleTitles = aiData.roleTitles;
      currentDoc.experienceYears = aiData.experienceYears;
      currentDoc.locationPreference = aiData.locationPreference;
    }

    await currentDoc.save();
    return currentDoc;
  } catch (err) {
    let errorCode = "ai_failed";
    if (err instanceof ExtractError || err?.code === "NO_TEXT") {
      errorCode = err.code === "NO_TEXT" ? "no_text" : "extract_failed";
    } else if (err instanceof AiError) {
      if (err.code === "AI_UNAVAILABLE") errorCode = "ai_unavailable";
      else if (err.code === "INVALID_OUTPUT") errorCode = "invalid_output";
      else errorCode = "ai_failed";
    } else if (err.name === "AbortError") {
      errorCode = "extract_failed";
    }

    console.warn(`Resume parse finished with status failed: code=${errorCode}`);

    try {
      await Resume.findByIdAndUpdate(resumeId, {
        $set: {
          parseStatus: "failed",
          parseError: errorCode,
          parseStartedAt: null,
        },
      });
    } catch (saveErr) {
      console.error(
        "Failed to record resume parse failure:",
        saveErr?.message || saveErr
      );
    }
    return null;
  }
};

export default {
  runParse,
};
