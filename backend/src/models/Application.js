import mongoose from "mongoose";
import {
  LIMITS,
  PAY_TYPES,
  STATUSES,
  REPLY_TYPES,
} from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

const replySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Reply type is required"],
      enum: {
        values: REPLY_TYPES,
        message: "Invalid reply type: {VALUE}",
      },
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true;
          const received = this?.receivedDate
            ? new Date(this.receivedDate)
            : new Date();
          return new Date(value) >= received;
        },
        message: "Deadline cannot be before received date",
      },
    },
    completed: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: "",
      maxlength: [
        LIMITS.replyNotes,
        `Reply notes cannot exceed ${LIMITS.replyNotes} characters`,
      ],
      set: normalizeText,
    },
  },
  {
    timestamps: true,
  }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      maxlength: [
        LIMITS.companyName,
        `Company name cannot exceed ${LIMITS.companyName} characters`,
      ],
      set: normalizeText,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      maxlength: [
        LIMITS.role,
        `Role cannot exceed ${LIMITS.role} characters`,
      ],
      set: normalizeText,
    },
    appliedFrom: {
      type: String,
      required: [true, "Applied from is required"],
      maxlength: [
        LIMITS.appliedFrom,
        `Applied from cannot exceed ${LIMITS.appliedFrom} characters`,
      ],
      set: normalizeText,
    },
    pay: {
      type: {
        type: String,
        required: [true, "Pay type is required"],
        enum: {
          values: PAY_TYPES,
          message: "Invalid pay type: {VALUE}",
        },
      },
      amount: {
        type: Number,
        required: [true, "Pay amount is required"],
        min: [LIMITS.payMin, `Pay amount cannot be less than ${LIMITS.payMin}`],
        max: [LIMITS.payMax, `Pay amount cannot exceed ${LIMITS.payMax}`],
      },
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
      maxlength: [
        LIMITS.duration,
        `Duration cannot exceed ${LIMITS.duration} characters`,
      ],
      set: normalizeText,
    },
    skills: {
      type: String,
      default: "",
      maxlength: [
        LIMITS.skills,
        `Skills cannot exceed ${LIMITS.skills} characters`,
      ],
      set: normalizeText,
    },
    description: {
      type: String,
      default: "",
      maxlength: [
        LIMITS.description,
        `Description cannot exceed ${LIMITS.description} characters`,
      ],
      set: normalizeText,
    },
    jobLink: {
      type: String,
      trim: true,
      maxlength: [500, "Job link cannot exceed 500 characters"],
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https?:\/\//i.test(value);
        },
        message: "Job link must start with http:// or https://",
      },
    },
    notes: {
      type: String,
      default: "",
      maxlength: [
        LIMITS.notes,
        `Notes cannot exceed ${LIMITS.notes} characters`,
      ],
      set: normalizeText,
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: "Invalid status: {VALUE}",
      },
      default: "applied",
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    replies: [replySchema],
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ userId: 1, appliedDate: -1 });
applicationSchema.index({ userId: 1, companyName: 1 });
applicationSchema.index({ userId: 1, status: 1 });

const Application = mongoose.model("Application", applicationSchema);

export { replySchema, applicationSchema, Application };
export default Application;
