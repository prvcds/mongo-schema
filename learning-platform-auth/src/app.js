const crypto = require("node:crypto");
const express = require("express");
const {
  TOKEN_TTL_SECONDS,
  createAuthenticate,
  issueAccessToken,
  requireCourseMembership,
  requireRole,
} = require("./auth");
const { hashPassword, passwordValidationError, verifyPassword } = require("./passwords");

const MIN_JWT_SECRET_BYTES = 32;

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role };
}

function createApp({ store, jwtSecret }) {
  if (!store) throw new TypeError("A user and course store is required");
  if (typeof jwtSecret !== "string" || Buffer.byteLength(jwtSecret, "utf8") < MIN_JWT_SECRET_BYTES) {
    throw new TypeError(`JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes`);
  }

  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  app.use(express.json({ limit: "10kb" }));

  const authenticate = createAuthenticate({ secret: jwtSecret, store });

  app.post("/api/auth/register", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    const passwordError = passwordValidationError(password);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || passwordError) {
      return res.status(400).json({
        error: "Provide a valid email and a password of at least 12 characters (maximum 72 UTF-8 bytes)",
      });
    }
    if (store.findUserByEmail(email)) {
      return res.status(409).json({ error: "Account already exists" });
    }

    const user = store.addUser({
      id: crypto.randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      role: "student",
      active: true,
    });
    if (!user) return res.status(409).json({ error: "Account already exists" });

    return res.status(201).json({
      user: publicUser(user),
      accessToken: issueAccessToken(user, jwtSecret),
      expiresInSeconds: TOKEN_TTL_SECONDS,
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (!email || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = store.findUserByEmail(email);
    const passwordMatches = await verifyPassword(password, user?.passwordHash);
    if (!user || !user.active || !passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      user: publicUser(user),
      accessToken: issueAccessToken(user, jwtSecret),
      expiresInSeconds: TOKEN_TTL_SECONDS,
    });
  });

  app.post(
    "/api/courses/:courseId/quizzes/:quizId/attempts",
    authenticate,
    requireRole("student"),
    requireCourseMembership(store, "student"),
    (req, res) => {
      const { quizId } = req.params;
      if (!req.course.quizIds.includes(quizId)) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const answers = req.body?.answers;
      if (
        !answers ||
        typeof answers !== "object" ||
        Array.isArray(answers) ||
        Object.keys(answers).length === 0
      ) {
        return res.status(400).json({ error: "answers must be a non-empty object" });
      }

      const attempt = store.recordAttempt({
        id: crypto.randomUUID(),
        userId: req.user.id,
        courseId: req.course.id,
        quizId,
        answers,
        submittedAt: new Date().toISOString(),
      });
      return res.status(201).json({
        attemptId: attempt.id,
        quizId: attempt.quizId,
        submittedAt: attempt.submittedAt,
      });
    },
  );

  app.get("/api/courses/:courseId/progress", authenticate, (req, res) => {
    const course = store.findCourseById(req.params.courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    if (req.user.role === "student") {
      if (!course.studentIds.includes(req.user.id)) {
        return res.status(403).json({ error: "Course access denied" });
      }
      const progress = store.getProgress(req.user.id, course.id);
      return res.json({ courseId: course.id, progress });
    }

    if (req.user.role === "instructor" && course.instructorIds.includes(req.user.id)) {
      return res.json({
        courseId: course.id,
        progress: store.getCourseProgress(course.id),
      });
    }
    return res.status(403).json({ error: "Course access denied" });
  });

  app.post(
    "/api/courses/:courseId/feedback",
    authenticate,
    requireRole("student"),
    requireCourseMembership(store, "student"),
    (req, res) => {
      const { message, rating } = req.body || {};
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.trim().length > 1000 ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({ error: "Provide a message and a rating from 1 to 5" });
      }

      const feedback = store.recordFeedback({
        id: crypto.randomUUID(),
        courseId: req.course.id,
        userId: req.user.id,
        message: message.trim(),
        rating,
        submittedAt: new Date().toISOString(),
      });
      return res.status(201).json({
        id: feedback.id,
        courseId: feedback.courseId,
        message: feedback.message,
        rating: feedback.rating,
      });
    },
  );

  app.use((req, res) => res.status(404).json({ error: "Route not found" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Request body must be valid JSON" });
    }
    console.error(JSON.stringify({ requestId: req.requestId, errorName: error.name }));
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = createApp;
