import { Router } from "express";
import { register, login, logout, me } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validators/auth.validators.js";
import { isAuthenticated } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", isAuthenticated, logout);
router.get("/me", isAuthenticated, me);

export default router;
