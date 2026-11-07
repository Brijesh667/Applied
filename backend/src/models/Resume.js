import mongoose from "mongoose";
import {
  RESUME_LABEL_MAX,
  RESUME_FILENAME_MAX,
  RESUME_SKILLS_MAX,
  RESUME_SKILL_MAX_LEN,
  RESUME_ROLES_MAX,
  RESUME_ROLE_MAX_LEN,
  RESUME_EXPERIENCE_MAX_YEARS,
} from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    label: {
      type: String,
      required: [true, "Resume label is required"],
      maxlength: [
        RESUME_LABEL_MAX,
        `Resume label cannot exceed ${RESUME_LABEL_MAX} characters`,
      ],
      set: normalizeText,
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      maxlength: [
        RESUME_FILENAME_MAX,
        `File name cannot exceed ${RESUME_FILENAME_MAX} characters`,
      ],
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: {
        values: ["pdf", "docx"],
        message: "Invalid file type: {VALUE}",
      },
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
    },
    storagePublicId: {
      type: String,
      required: [true, "Storage public ID is required"],
      select: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    parseStatus: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "pending",
    },
    parseError: {
      type: String,
      enum: {
        values: [
          null,
          "no_text",
          "ai_unavailable",
          "ai_failed",
          "invalid_output",
          "extract_failed",
        ],
        message: "Invalid parse error: {VALUE}",
      },
      default: null,
    },
    parseStartedAt: {
      type: Date,
      default: null,
    },
    parsedAt: {
      type: Date,
      default: null,
    },
    skillsEditedByUser: {
      type: Boolean,
      default: false,
    },
    extractedText: {
      type: String,
      default: "",
      select: false,
    },
    skills: {
      type: [
        {
          type: String,
          set: normalizeText,
          maxlength: [
            RESUME_SKILL_MAX_LEN,
            `Skill cannot exceed ${RESUME_SKILL_MAX_LEN} characters`,
          ],
        },
      ],
      default: [],
      validate: {
        validator: (val) =>
          Array.isArray(val) && val.length <= RESUME_SKILLS_MAX,
        message: `Skills cannot exceed ${RESUME_SKILLS_MAX} items`,
      },
    },
    roleTitles: {
      type: [
        {
          type: String,
          set: normalizeText,
          maxlength: [
            RESUME_ROLE_MAX_LEN,
            `Role title cannot exceed ${RESUME_ROLE_MAX_LEN} characters`,
          ],
        },
      ],
      default: [],
      validate: {
        validator: (val) =>
          Array.isArray(val) && val.length <= RESUME_ROLES_MAX,
        message: `Role titles cannot exceed ${RESUME_ROLES_MAX} items`,
      },
    },
    experienceYears: {
      type: Number,
      default: null,
      min: [0, "Experience years cannot be negative"],
      max: [
        RESUME_EXPERIENCE_MAX_YEARS,
        `Experience years cannot exceed ${RESUME_EXPERIENCE_MAX_YEARS}`,
      ],
    },
    locationPreference: {
      type: String,
      maxlength: 100,
      set: normalizeText,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  }
);

const Resume = mongoose.model("Resume", resumeSchema);

export { resumeSchema, Resume };
export default Resume;
