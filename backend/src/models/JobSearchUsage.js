import mongoose from "mongoose";

const jobSearchUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // MongoDB TTL index: auto-deletes entries older than 24 hours (86400 seconds)
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound index for querying recent search usage by user within rolling window
jobSearchUsageSchema.index({ userId: 1, createdAt: -1 });

const JobSearchUsage = mongoose.model("JobSearchUsage", jobSearchUsageSchema);

export { jobSearchUsageSchema, JobSearchUsage };
export default JobSearchUsage;
