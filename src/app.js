const express = require("express");
const cors = require("cors");

const routes = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// ─── Core Middlewares ───
app.use(cors());
app.use(express.json()); // JSON body parse করার জন্য

// ─── Health Check ───
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "BD Tax Return System API is running",
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───
app.use("/api", routes);

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler (সবার শেষে) ───
app.use(errorHandler);

module.exports = app;
