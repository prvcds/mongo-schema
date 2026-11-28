const MemoryStore = require("./memory-store");
const createApp = require("./app");
const { hashPassword } = require("./passwords");

async function createServerApp(env = process.env) {
  const jwtSecret = env.JWT_SECRET;
  if (typeof jwtSecret !== "string" || Buffer.byteLength(jwtSecret, "utf8") < 32) {
    throw new Error("Set JWT_SECRET to a random value of at least 32 bytes");
  }
  if (!env.DEMO_STUDENT_PASSWORD || !env.DEMO_INSTRUCTOR_PASSWORD) {
    throw new Error("Set DEMO_STUDENT_PASSWORD and DEMO_INSTRUCTOR_PASSWORD to run the demo");
  }

  const student = {
    id: "student-demo",
    email: (env.DEMO_STUDENT_EMAIL || "student@example.test").toLowerCase(),
    passwordHash: await hashPassword(env.DEMO_STUDENT_PASSWORD),
    role: "student",
    active: true,
  };
  const instructor = {
    id: "instructor-demo",
    email: (env.DEMO_INSTRUCTOR_EMAIL || "instructor@example.test").toLowerCase(),
    passwordHash: await hashPassword(env.DEMO_INSTRUCTOR_PASSWORD),
    role: "instructor",
    active: true,
  };
  const courseId = "course-learning-basics";
  const store = new MemoryStore({
    users: [student, instructor],
    courses: [{
      id: courseId,
      studentIds: [student.id],
      instructorIds: [instructor.id],
      quizIds: ["quiz-learning-basics"],
    }],
    progress: [{
      userId: student.id,
      courseId,
      completedLessons: 3,
      totalLessons: 8,
      updatedAt: new Date().toISOString(),
    }],
  });

  return createApp({ store, jwtSecret });
}

if (require.main === module) {
  createServerApp()
    .then((app) => {
      const port = Number(process.env.PORT) || 3001;
      app.listen(port, () => {
        console.log(`Learning platform auth demo listening on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error(`Unable to start learning platform demo: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = { createServerApp };
