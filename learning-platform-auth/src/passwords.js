const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  crypto.randomBytes(32).toString("hex"),
  BCRYPT_COST,
);

function passwordValidationError(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return `Password must be at most ${MAX_PASSWORD_BYTES} UTF-8 bytes`;
  }
  return null;
}

async function hashPassword(password) {
  const error = passwordValidationError(password);
  if (error) throw new TypeError(error);
  return bcrypt.hash(password, BCRYPT_COST);
}

async function verifyPassword(password, passwordHash) {
  if (typeof password !== "string" || Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return false;
  }
  return bcrypt.compare(password, passwordHash || DUMMY_PASSWORD_HASH);
}

module.exports = { hashPassword, passwordValidationError, verifyPassword };
