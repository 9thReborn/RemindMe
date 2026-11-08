const AppError = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/tokens");

module.exports = function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return next(AppError.unauthorized("Missing access token"));
    }
    try {
         const payload = verifyAccessToken(token);
         req.user = { id: payload.sub, username: payload.username };
         req.log = req.log.child({ userId: req.user.id });
         next();
    } catch {
      next(AppError.unauthorized("Invalid or expired token"));
    }
}