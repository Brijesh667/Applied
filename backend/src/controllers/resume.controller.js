import path from "path";
import Resume from "../models/Resume.js";
import Application from "../models/Application.js";
import {
  MAX_RESUMES_PER_USER,
  RESUME_LABEL_MAX,
  RESUME_FILENAME_MAX,
  RESUME_DOWNLOAD_URL_TTL_SECONDS,
  RESUME_PARSE_STALE_MS,
} from "../config/constants.js";
import {
  uploadResumeBuffer,
  getSignedDownloadUrl,
  deleteAsset,
} from "../services/storage.js";
import { extractResumeText, ExtractError } from "../services/extractText.js";
import { runParse } from "../services/resumeParser.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sanitizeFileName = (originalName) => {
  if (typeof originalName !== "string") return "resume.pdf";
  const baseName = path.basename(originalName).replace(/^.*[\\/]/, "");
  const cleaned = baseName.replace(/[\x00-\x1f\x7f]/g, "").trim();
  const finalName = cleaned || "resume";

  if (finalName.length > RESUME_FILENAME_MAX) {
    const ext = path.extname(finalName);
    const nameWithoutExt = finalName.slice(0, finalName.length - ext.length);
    const allowedBaseLen = Math.max(1, RESUME_FILENAME_MAX - ext.length);
    return nameWithoutExt.slice(0, allowedBaseLen) + ext;
  }
  return finalName;
};

const sanitizeResume = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.storagePublicId;
  delete obj.extractedText;
  return obj;
};

export const createResume = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  // 1. Count user's resumes before uploading to Cloudinary
  const currentCount = await Resume.countDocuments({ userId });
  if (currentCount >= MAX_RESUMES_PER_USER) {
    return res.status(400).json({
      message: "You can upload up to 5 resumes. Delete one to add another.",
    });
  }

  const sanitized = sanitizeFileName(req.file.originalname);
  const defaultLabel =
    path.parse(sanitized).name.trim().slice(0, RESUME_LABEL_MAX) || "Resume";
  const label = req.body.label || defaultLabel;

  // Extract text synchronously in the request before uploading to Cloudinary
  let extracted = "";
  let initialParseStatus = "pending";
  let initialParseError = null;

  try {
    extracted = await extractResumeText(req.file.buffer, req.validatedFileType);
  } catch (err) {
    if (err instanceof ExtractError || err?.code === "NO_TEXT") {
      initialParseStatus = "failed";
      initialParseError = err.code === "NO_TEXT" ? "no_text" : "extract_failed";
    } else {
      initialParseStatus = "failed";
      initialParseError = "extract_failed";
    }
  }

  // 2. Upload buffer to Cloudinary
  const { publicId } = await uploadResumeBuffer(req.file.buffer, {
    userId,
    fileType: req.validatedFileType,
    fileName: sanitized,
  });

  // 3. Create document (first resume is default)
  let resume;
  try {
    resume = await Resume.create({
      userId,
      label,
      fileName: sanitized,
      fileType: req.validatedFileType,
      fileSize: req.file.size,
      storagePublicId: publicId,
      isDefault: currentCount === 0,
      extractedText: extracted,
      parseStatus: initialParseStatus,
      parseError: initialParseError,
      parseStartedAt: initialParseStatus === "pending" ? new Date() : null,
    });
  } catch (err) {
    // 4. Delete Cloudinary asset if saving fails
    await deleteAsset(publicId);
    throw err;
  }

  // 5. Re-count after saving to catch parallel uploads
  const afterCount = await Resume.countDocuments({ userId });
  if (afterCount > MAX_RESUMES_PER_USER) {
    await Resume.findByIdAndDelete(resume._id);
    await deleteAsset(publicId);
    return res.status(400).json({
      message: "You can upload up to 5 resumes. Delete one to add another.",
    });
  }

  // Respond 201 immediately (do not await AI)
  res.status(201).json({ resume: sanitizeResume(resume) });

  // Fire and forget AI parsing if initial extraction succeeded
  if (initialParseStatus === "pending") {
    runParse(resume._id, { isAlreadyClaimed: true }).catch((parseErr) => {
      console.warn(
        "Background resume parse error:",
        parseErr?.message || parseErr
      );
    });
  }
});

export const getResumes = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const resumes = await Resume.find({ userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  return res.status(200).json({
    resumes: resumes.map(sanitizeResume),
    limit: MAX_RESUMES_PER_USER,
  });
});

export const getResumeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  return res.status(200).json({ resume: sanitizeResume(resume) });
});

export const getResumeDownloadUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const resume = await Resume.findOne({ _id: id, userId }).select(
    "+storagePublicId"
  );
  if (!resume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  const url = getSignedDownloadUrl(resume.storagePublicId, resume.fileName);
  return res.status(200).json({
    url,
    expiresInSeconds: RESUME_DOWNLOAD_URL_TTL_SECONDS,
  });
});

export const updateResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  if (req.body.label !== undefined) {
    resume.label = req.body.label;
  }

  const hasProfileEdits =
    req.body.skills !== undefined ||
    req.body.roleTitles !== undefined ||
    req.body.experienceYears !== undefined ||
    req.body.locationPreference !== undefined;

  if (hasProfileEdits) {
    resume.skillsEditedByUser = true;
    if (req.body.skills !== undefined) resume.skills = req.body.skills;
    if (req.body.roleTitles !== undefined)
      resume.roleTitles = req.body.roleTitles;
    if (req.body.experienceYears !== undefined)
      resume.experienceYears = req.body.experienceYears;
    if (req.body.locationPreference !== undefined)
      resume.locationPreference = req.body.locationPreference;
  }

  if (req.body.isDefault === true && !resume.isDefault) {
    const previousDefault = await Resume.findOne({ userId, isDefault: true });
    if (previousDefault && String(previousDefault._id) !== String(resume._id)) {
      await Resume.updateOne(
        { _id: previousDefault._id },
        { $set: { isDefault: false } }
      );
    }

    try {
      resume.isDefault = true;
      await resume.save();
    } catch (err) {
      if (previousDefault) {
        await Resume.updateOne(
          { _id: previousDefault._id },
          { $set: { isDefault: true } }
        );
      }
      throw err;
    }
  } else {
    await resume.save();
  }

  return res.status(200).json({ resume: sanitizeResume(resume) });
});

export const reparseResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const staleThreshold = new Date(Date.now() - RESUME_PARSE_STALE_MS);
  const updated = await Resume.findOneAndUpdate(
    {
      _id: id,
      userId,
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
  );

  if (!updated) {
    const exists = await Resume.findOne({ _id: id, userId });
    if (!exists) {
      return res.status(404).json({ message: "Resume not found" });
    }
    return res.status(409).json({ message: "Parsing is already in progress" });
  }

  res.status(202).json({ resume: sanitizeResume(updated) });

  runParse(updated._id, { isAlreadyClaimed: true }).catch((err) => {
    console.warn("Background reparse error:", err?.message || err);
  });
});

export const deleteResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const resume = await Resume.findOne({ _id: id, userId }).select(
    "+storagePublicId"
  );
  if (!resume) {
    return res.status(404).json({ message: "Resume not found" });
  }

  // Delete DB document first
  await Resume.deleteOne({ _id: id, userId });

  // Promote newest remaining resume if the deleted one was default
  if (resume.isDefault) {
    const newestRemaining = await Resume.findOne({ userId }).sort({
      createdAt: -1,
    });
    if (newestRemaining) {
      newestRemaining.isDefault = true;
      await newestRemaining.save();
    }
  }

  // Clear resumeId reference in user's applications
  await Application.updateMany(
    { userId, resumeId: resume._id },
    { $set: { resumeId: null } }
  );

  // Delete Cloudinary asset (logged on error, doesn't throw)
  if (resume.storagePublicId) {
    await deleteAsset(resume.storagePublicId);
  }

  return res.status(200).json({ message: "Resume deleted" });
});

export default {
  createResume,
  getResumes,
  getResumeById,
  getResumeDownloadUrl,
  updateResume,
  reparseResume,
  deleteResume,
};
