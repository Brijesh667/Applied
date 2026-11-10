import config from "./config/env.js";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";

let server;

const startServer = async () => {
  await connectDB();
  server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv} mode)`);
    console.log(`Trust proxy: ${config.trustProxy} hop(s)`);
  });
};

const gracefulShutdown = async (signal, exitCode = 0) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        console.log("HTTP server closed.");
        resolve();
      });
    });
  }

  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
  }

  process.exit(exitCode);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT", 0));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM", 0));

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await gracefulShutdown("uncaughtException", 1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  await gracefulShutdown("unhandledRejection", 1);
});

startServer();
