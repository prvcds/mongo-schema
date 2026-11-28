const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { after, before, test } = require("node:test");
const MemoryStore = require("../src/memory-store");
const createApp = require("../src/app");
const { hashPassword, verifyPassword } = require("../src/passwords");

const JWT_SECRET = crypto.randomBytes(32).toString("base64");
const LOGIN_PASSWORD = crypto.randomBytes(24).toString("hex");
const INSTRUCTOR_PASSWORD = crypto.randomBytes(24).toString("hex");

let server;
let baseUrl;
let store;
let studentToken;
let instructorToken;

async function post(path, body, token) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function login(email, password) {
  const response = await post("/api/auth/login", { email, password });
  assert.equal(response.status, 200);
  return (await response.json()).accessToken;
}

before(async () => {
  const users = [
    {
      id: "student-1",
      email: "student@example.test",
      passwordHash: await hashPassword(LOGIN_PASSWORD),
      role: "student",
      active: true,
    },
    {
      id: "student-2",
      email: "other-student@example.test",
      passwordHash: await hashPassword("another-student-password"),
      role: "student",
      active: true,
    },
    {
      id: "instructor-1",
      email: "instructor@example.test",
      passwordHash: await hashPassword(INSTRUCTOR_PASSWORD),
      role: "instructor",
      active: true,
    },
  ];
  store = new MemoryStore({
    users,
    courses: [
      {
        id: "course-1",
        studentIds: ["student-1"],
        instructorIds: ["instructor-1"],
        quizIds: ["quiz-1"],
      },
      {
        id: "course-2",
        studentIds: ["student-2"],
        instructorIds: [],
        quizIds: ["quiz-2"],
      },
    ],
    progress: [
      { userId: "student-1", courseId: "course-1", completedLessons: 2, totalLessons: 5 },
      { userId: "student-2", courseId: "course-2", completedLessons: 1, totalLessons: 4 },
    ],
  });

  server = createApp({ store, jwtSecret: JWT_SECRET }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  studentToken = await login("student@example.test", LOGIN_PASSWORD);
  instructorToken = await login("instructor@example.test", INSTRUCTOR_PASSWORD);
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("registration hashes the password and never accepts a caller-selected role", async () => {
  const password = "new-student-password";
  const response = await post("/api/auth/register", {
    email: "  new-student@example.test ",
    password,
    role: "instructor",
  });
  const body = await response.json();
  const user = store.findUserByEmail("new-student@example.test");

  assert.equal(response.status, 201);
  assert.equal(body.user.role, "student");
  assert.notEqual(user.passwordHash, password);
  assert.ok(await verifyPassword(password, user.passwordHash));
  assert.equal(body.expiresInSeconds, 900);
});

test("login rejects an incorrect password with the same generic response", async () => {
  const wrongPassword = await post("/api/auth/login", {
    email: "student@example.test",
    password: "wrong-password-value",
  });
  const unknownEmail = await post("/api/auth/login", {
    email: "unknown@example.test",
    password: "wrong-password-value",
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(await wrongPassword.json(), { error: "Invalid email or password" });
  assert.deepEqual(await unknownEmail.json(), { error: "Invalid email or password" });
});

test("protected progress returns only the signed-in student's own record", async () => {
  const response = await fetch(`${baseUrl}/api/courses/course-1/progress`, {
    headers: { authorization: `Bearer ${studentToken}` },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    courseId: "course-1",
    progress: {
      userId: "student-1",
      courseId: "course-1",
      completedLessons: 2,
      totalLessons: 5,
    },
  });
});

test("quiz attempt is attributed to the token owner, not a submitted user ID", async () => {
  const response = await post(
    "/api/courses/course-1/quizzes/quiz-1/attempts",
    { answers: { question1: "B" }, userId: "student-2" },
    studentToken,
  );
  const attempt = store.attempts[0];

  assert.equal(response.status, 201);
  assert.equal(attempt.userId, "student-1");
  assert.equal(attempt.courseId, "course-1");
});

test("course feedback is attributed to the authenticated student", async () => {
  const response = await post(
    "/api/courses/course-1/feedback",
    { message: "Useful quiz review", rating: 5, userId: "student-2" },
    studentToken,
  );
  const feedback = store.feedback[0];

  assert.equal(response.status, 201);
  assert.equal(feedback.userId, "student-1");
  assert.equal(feedback.courseId, "course-1");
});

test("missing, expired, wrong-role, and cross-course requests are rejected", async () => {
  const noToken = await fetch(`${baseUrl}/api/courses/course-1/progress`);
  assert.equal(noToken.status, 401);

  const expiredToken = jwt.sign(
    { sub: "student-1" },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: -1, issuer: "learning-platform-demo", audience: "learning-platform-api" },
  );
  const expired = await fetch(`${baseUrl}/api/courses/course-1/progress`, {
    headers: { authorization: `Bearer ${expiredToken}` },
  });
  assert.equal(expired.status, 401);

  const wrongRole = await post(
    "/api/courses/course-1/quizzes/quiz-1/attempts",
    { answers: { question1: "B" } },
    instructorToken,
  );
  assert.equal(wrongRole.status, 403);

  const wrongCourse = await post(
    "/api/courses/course-2/quizzes/quiz-2/attempts",
    { answers: { question1: "B" } },
    studentToken,
  );
  assert.equal(wrongCourse.status, 403);
});

test("instructor progress access is limited to courses they teach", async () => {
  const allowed = await fetch(`${baseUrl}/api/courses/course-1/progress`, {
    headers: { authorization: `Bearer ${instructorToken}` },
  });
  const denied = await fetch(`${baseUrl}/api/courses/course-2/progress`, {
    headers: { authorization: `Bearer ${instructorToken}` },
  });

  assert.equal(allowed.status, 200);
  assert.equal(denied.status, 403);
});
