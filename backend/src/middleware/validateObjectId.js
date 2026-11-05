import mongoose from "mongoose";

export const validateObjectId = (paramNameOrReq = "id", res, next) => {
  // If used directly as middleware: validateObjectId(req, res, next)
  if (
    typeof paramNameOrReq === "object" &&
    paramNameOrReq !== null &&
    paramNameOrReq.params &&
    typeof next === "function"
  ) {
    const req = paramNameOrReq;
    const value = req.params.id;
    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({ message: "Invalid application id" });
    }
    return next();
  }

  // Used as factory: validateObjectId("id") or validateObjectId("replyId")
  const paramName = typeof paramNameOrReq === "string" ? paramNameOrReq : "id";
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.isValidObjectId(value)) {
      const label =
        paramName === "id"
          ? "application id"
          : paramName === "replyId"
          ? "reply id"
          : `${paramName} id`;
      return res.status(400).json({ message: `Invalid ${label}` });
    }
    next();
  };
};

export default validateObjectId;
