class MemoryStore {
  constructor({ users = [], courses = [], progress = [] } = {}) {
    this.usersById = new Map();
    this.userIdByEmail = new Map();
    this.coursesById = new Map(courses.map((course) => [course.id, course]));
    this.progressByKey = new Map(
      progress.map((item) => [this.progressKey(item.userId, item.courseId), item]),
    );
    this.attempts = [];
    this.feedback = [];

    for (const user of users) this.addUser(user);
  }

  progressKey(userId, courseId) {
    return `${userId}:${courseId}`;
  }

  addUser(user) {
    const email = user.email.trim().toLowerCase();
    if (this.userIdByEmail.has(email)) return null;
    const normalizedUser = { ...user, email };
    this.usersById.set(user.id, normalizedUser);
    this.userIdByEmail.set(email, user.id);
    return normalizedUser;
  }

  findUserByEmail(email) {
    const userId = this.userIdByEmail.get(email.trim().toLowerCase());
    return userId ? this.usersById.get(userId) : null;
  }

  findUserById(userId) {
    return this.usersById.get(userId) || null;
  }

  findCourseById(courseId) {
    return this.coursesById.get(courseId) || null;
  }

  getProgress(userId, courseId) {
    return this.progressByKey.get(this.progressKey(userId, courseId)) || null;
  }

  getCourseProgress(courseId) {
    return [...this.progressByKey.values()].filter((item) => item.courseId === courseId);
  }

  recordAttempt(attempt) {
    this.attempts.push(attempt);
    return attempt;
  }

  recordFeedback(feedback) {
    this.feedback.push(feedback);
    return feedback;
  }
}

module.exports = MemoryStore;
