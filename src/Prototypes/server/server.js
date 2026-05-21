// src/server/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config/env");
const pool = require("./db");
const axios = require("axios");
const apiRouter = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { startScheduler } = require("./services/schedulerService");
const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY

const app = express();

const corsOptions = config.cors.origins.includes("*")
  ? {}
  : { origin: config.cors.origins, credentials: true };

app.use((req, res, next) => {
  if (config.nodeEnv !== "test") {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

// Placeholder for serving built frontend assets once available
app.use("/", express.static(path.resolve(__dirname, "static")));

app.use("/api", apiRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      status: "ok",
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    console.error("DB health check failed:", err);
    res.status(500).json({
      status: "error",
      dbError: err.message,
    });
  }
});

// Legacy API routes removed. All news logic is now handled via /api/news router.

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

// Start the weekly alerts scheduler
startScheduler();
