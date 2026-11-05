import Application from "../models/Application.js";
import { LIMITS } from "../config/constants.js";
import { deriveStatus } from "../utils/deriveStatus.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const addReply = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (application.replies.length >= LIMITS.maxReplies) {
    return res.status(400).json({
      message: `Maximum ${LIMITS.maxReplies} replies per application`,
    });
  }

  application.replies.push(req.body);
  application.status = deriveStatus(application.replies);

  await application.save();

  return res.status(201).json({ application });
});

export const updateReply = asyncHandler(async (req, res) => {
  const { id, replyId } = req.params;
  const userId = req.session.userId;

  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  const reply = application.replies.id(replyId);
  if (!reply) {
    return res.status(404).json({ message: "Reply not found" });
  }

  if (req.body.deadline === null) {
    reply.set("deadline", undefined);
  }

  const fields = { ...req.body };
  if (fields.deadline === null) {
    delete fields.deadline;
  }
  reply.set(fields);

  application.status = deriveStatus(application.replies);

  await application.save();

  return res.status(200).json({ application });
});

export const deleteReply = asyncHandler(async (req, res) => {
  const { id, replyId } = req.params;
  const userId = req.session.userId;

  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  const reply = application.replies.id(replyId);
  if (!reply) {
    return res.status(404).json({ message: "Reply not found" });
  }

  reply.deleteOne();
  application.status = deriveStatus(application.replies);

  await application.save();

  return res.status(200).json({ application });
});
