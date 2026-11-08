const authService = require("./auth.service");
const config = require("../../config");

const COOKIE = "refreshToken";
const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: "strict",
  path: "/api/auth",
  maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
});

function sendAuth(res, statusCode, { user, accessToken, refreshToken }) {
  res.cookie(COOKIE, refreshToken, cookieOptions());
  res
    .status(statusCode)
    .json({ status: "success", data: { user, accessToken } });
}

exports.signup = async (req, res) =>
  sendAuth(res, 201, await authService.signup(req.body));
exports.login = async (req, res) =>
  sendAuth(res, 200, await authService.login(req.body));
exports.refresh = async (req, res) =>
  sendAuth(res, 200, await authService.refresh(req.cookies[COOKIE]));

exports.logout = async (req, res) => {
  await authService.logout(req.cookies[COOKIE]);
  res.clearCookie(COOKIE, cookieOptions());
  res.status(204).end();
};

exports.me = async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.json({ status: "success", data: { user } });
};