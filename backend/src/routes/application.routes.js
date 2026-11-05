import { Router } from "express";
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/application.controller.js";
import { isAuthenticated } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import {
  createApplicationSchema,
  updateApplicationSchema,
  listQuerySchema,
} from "../validators/application.validators.js";
import replyRoutes from "./reply.routes.js";

const router = Router();

router.use(isAuthenticated);

router.use("/:id/replies", replyRoutes);

router.post("/", validate(createApplicationSchema), createApplication);
router.get("/", validateQuery(listQuerySchema), getApplications);
router.get("/:id", validateObjectId("id"), getApplicationById);
router.put(
  "/:id",
  validateObjectId("id"),
  validate(updateApplicationSchema),
  updateApplication
);
router.delete("/:id", validateObjectId("id"), deleteApplication);

export default router;
