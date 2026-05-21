// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./server/db"); // ready for later use
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY

// middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

// static frontend
app.use("/", express.static("static"));

// basic health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// basic db health check route
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

// current api (news api) routes
// general headlines
app.get("/api/currentapi/headlines", async (req, res) => {
  try {
    const response = await axios.get("https://api.currentsapi.services/v1/latest-news", {
      params: { apiKey: CURRENTS_API_KEY }
    });
    res.json(response.data);
  } catch (err) {
    console.error("Currents API error:", err.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// category-based news (politics, sports, entertainment, etc.)
app.get("/api/currentapi/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const response = await axios.get("https://api.currentsapi.services/v1/search", {
      params: { apiKey: CURRENTS_API_KEY, category }
    });
    res.json(response.data);
  } catch (err) {
    console.error("Currents API error:", err.message);
    res.status(500).json({ error: "Failed to fetch category news" });
  }
});

// search by keyword
app.get("/api/currentapi/search", async (req, res) => {
  const { q } = req.query;
  try {
    const response = await axios.get("https://api.currentsapi.services/v1/search", {
      params: { apiKey: CURRENTS_API_KEY, keywords: q }
    });
    res.json(response.data);
  } catch (err) {
    console.error("Currents API error:", err.message);
    res.status(500).json({ error: "Failed to search news" });
  }
});

// news api (different api) routes
// general headlines
app.get("/api/newsapi/headlines", async (req, res) => {
  try {
    const response = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: {
        apiKey: NEWS_API_KEY,
        country: "us" // you can change or make dynamic
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error("NewsAPI error:", err.message);
    res.status(500).json({ error: "Failed to fetch top headlines" });
  }
});

// categorical headlines (sports, politics, etc)
app.get("/api/newsapi/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const response = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: {
        apiKey: NEWS_API_KEY,
        country: "us",
        category
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error("NewsAPI error:", err.message);
    res.status(500).json({ error: "Failed to fetch category headlines" });
  }
});

// search
app.get("/api/newsapi/search", async (req, res) => {
  const { q } = req.query;
  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        apiKey: NEWS_API_KEY,
        q
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error("NewsAPI error:", err.message);
    res.status(500).json({ error: "Failed to search news" });
  }
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});