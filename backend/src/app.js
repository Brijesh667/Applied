import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import config from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import jobRoutes from "./routes/job.routes.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.set("query parser", "extended");

if (config.isProduction) {
  app.set("trust proxy", config.trustProxyHops);
}

// Middlewares
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: config.clientUrls,
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));

// Session middleware
app.use(
  session({
    name: "sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongoUri,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      sameSite: config.cookieSameSite,
      secure: config.cookieSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// Routes
// Health check route (excluded from apiLimiter)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// General API rate limiter for all other /api routes
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/jobs", jobRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
