import mongoose from "mongoose";

export const validateObjectId = (paramNameOrReq = "id", customLabelOrRes, next) => {
  // If used directly as middleware: validateObjectId(req, res, next)
  if (
    typeof paramNameOrReq === "object" &&
    paramNameOrReq !== null &&
    paramNameOrReq.params &&
    typeof customLabelOrRes === "object" &&
    typeof next === "function"
  ) {
    const req = paramNameOrReq;
    const value = req.params.id;
    if (!mongoose.isValidObjectId(value)) {
      const label = req.baseUrl?.includes("resumes") ? "resume id" : "application id";
      return customLabelOrRes.status(400).json({ message: `Invalid ${label}` });
    }
    return next();
  }

  // Used as factory: validateObjectId("id", "resume id") or validateObjectId("id") or validateObjectId("replyId")
  const paramName = typeof paramNameOrReq === "string" ? paramNameOrReq : "id";
  const customLabel = typeof customLabelOrRes === "string" ? customLabelOrRes : null;

  return (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.isValidObjectId(value)) {
      let label = customLabel;
      if (!label) {
        if (req.baseUrl?.includes("resumes") || paramName === "resumeId") {
          label = "resume id";
        } else if (paramName === "id") {
          label = "application id";
        } else if (paramName === "replyId") {
          label = "reply id";
        } else {
          label = `${paramName} id`;
        }
      }
      return res.status(400).json({ message: `Invalid ${label}` });
    }
    next();
  };
};

export default validateObjectId;
