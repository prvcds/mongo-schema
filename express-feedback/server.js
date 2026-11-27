const crypto = require("node:crypto");
const express = require("express");

const app = express();
const showcasedProjects = new Set(["portfolio-site", "schema-playground"]);

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });
  next();
});

app.use(express.json());

app.post("/api/projects/:projectId/feedback", (req, res, next) => {
  if (!showcasedProjects.has(req.params.projectId)) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    return next(error);
  }

  const { author, message, rating } = req.body || {};
  const errors = [];
  if (typeof author !== "string" || !author.trim()) {
    errors.push("author must be a non-empty string");
  }
  if (typeof message !== "string" || !message.trim()) {
    errors.push("message must be a non-empty string");
  } else if (message.trim().length > 1000) {
    errors.push("message must be at most 1000 characters");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push("rating must be an integer from 1 to 5");
  }

  if (errors.length) {
    const error = new Error("Feedback validation failed");
    error.statusCode = 400;
    error.details = errors;
    return next(error);
  }

  res.status(201).json({
    projectId: req.params.projectId,
    feedback: {
      author: author.trim(),
      message: message.trim(),
      rating
    }
  });
});

app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const status = error.statusCode || error.status || 500;
  const message = status >= 500 ? "Internal server error" : error.message;
  const response = {
    error: {
      message,
      requestId: req.requestId
    }
  };

  if (error.details) {
    response.error.details = error.details;
  }
  if (error.type === "entity.parse.failed") {
    response.error.message = "Request body must be valid JSON";
  }
  res.status(status).json(response);
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Portfolio feedback API listening on http://localhost:3000");
  });
}

module.exports = app;
