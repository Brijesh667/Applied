import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    Boolean(
      req.originalUrl?.startsWith("/api/auth") ||
        req.baseUrl === "/api/auth" ||
        req.path?.startsWith("/auth")
    ),
});

export default { authLimiter, apiLimiter };
