const jwt = require("jsonwebtoken");

const TOKEN_ISSUER = "learning-platform-demo";
const TOKEN_AUDIENCE = "learning-platform-api";
const TOKEN_TTL_SECONDS = 15 * 60;

function issueAccessToken(user, secret) {
  return jwt.sign(
    { sub: user.id },
    secret,
    {
      algorithm: "HS256",
      audience: TOKEN_AUDIENCE,
      expiresIn: TOKEN_TTL_SECONDS,
      issuer: TOKEN_ISSUER,
    },
  );
}

function createAuthenticate({ secret, store }) {
  return (req, res, next) => {
    const authorization = req.get("authorization") || "";
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let claims;
    try {
      claims = jwt.verify(match[1], secret, {
        algorithms: ["HS256"],
        audience: TOKEN_AUDIENCE,
        issuer: TOKEN_ISSUER,
      });
    } catch {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    if (!claims || typeof claims.sub !== "string") {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    const user = store.findUserById(claims.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: "Account is unavailable" });
    }

    req.user = user;
    next();
  };
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}

function requireCourseMembership(store, role) {
  return (req, res, next) => {
    const course = store.findCourseById(req.params.courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const memberIds = role === "student" ? course.studentIds : course.instructorIds;
    if (!memberIds.includes(req.user.id)) {
      return res.status(403).json({ error: "Course access denied" });
    }

    req.course = course;
    next();
  };
}

module.exports = {
  TOKEN_TTL_SECONDS,
  createAuthenticate,
  issueAccessToken,
  requireCourseMembership,
  requireRole,
};
