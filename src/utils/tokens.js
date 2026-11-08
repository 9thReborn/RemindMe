const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const config = require("../config");

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl, algorithm: "HS256" },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { algorithms: ["HS256"] });
}

const generateRefreshToken = () => crypto.randomBytes(48).toString("base64url");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
};