const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const User = require("../../models/User");
const RefreshToken = require("../../models/RefreshToken");
const AppError = require("../../utils/AppError");
const config = require("../../config");
const logger = require("../../config/logger");
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../../utils/tokens");

const REUSE_GRACE_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", config.bcryptRounds);

async function issueTokens(user, family = crypto.randomUUID()) {
  const refreshToken = generateRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + config.refreshTtlDays * DAY_MS),
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

async function signup({ username, password, email }) {
  const user = new User({ username, email });
  await user.setPassword(password);
  await user.save(); // duplicate username → 11000 → 409 via errorHandler
  logger.info({ userId: user.id }, "User signed up");
  return { user, ...(await issueTokens(user)) };
}

async function login({ username, password }) {
  const user = await User.findOne({ username }).select("+passwordHash");
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH); // spend the same time as a real check
    throw AppError.unauthorized("Invalid username or password");
  }
  if (!(await user.checkPassword(password))) {
    throw AppError.unauthorized("Invalid username or password");
  }
  logger.info({ userId: user.id }, "User logged in");
  return { user, ...(await issueTokens(user)) };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw AppError.unauthorized("No refresh token");
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  // Atomically consume the token: only one request can ever win
  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
  );

  if (!current) {
    const used = await RefreshToken.findOne({ tokenHash });
    if (used?.revokedAt && now - used.revokedAt > REUSE_GRACE_MS) {
      await RefreshToken.updateMany(
        { family: used.family, revokedAt: null },
        { $set: { revokedAt: now } },
      );
      logger.warn(
        { userId: used.user.toString(), family: used.family },
        "Refresh token reuse detected; session revoked",
      );
    }
    throw AppError.unauthorized("Invalid refresh token");
  }

  const user = await User.findById(current.user);
  if (!user) throw AppError.unauthorized("Invalid refresh token");
  return { user, ...(await issueTokens(user, current.family)) };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const token = await RefreshToken.findOne({
    tokenHash: hashToken(refreshToken),
  });
  if (token) {
    await RefreshToken.updateMany(
      { family: token.family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized("User no longer exists");
  return user;
}

module.exports = { signup, login, refresh, logout, getProfile };