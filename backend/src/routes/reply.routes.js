import { Router } from "express";
import {
  addReply,
  updateReply,
  deleteReply,
} from "../controllers/reply.controller.js";
import { isAuthenticated } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import {
  createReplySchema,
  updateReplySchema,
} from "../validators/reply.validators.js";

const router = Router({ mergeParams: true });

router.use(isAuthenticated);
router.use(validateObjectId("id"));

router.post("/", validate(createReplySchema), addReply);
router.patch(
  "/:replyId",
  validateObjectId("replyId"),
  validate(updateReplySchema),
  updateReply
);
router.delete("/:replyId", validateObjectId("replyId"), deleteReply);

export default router;
