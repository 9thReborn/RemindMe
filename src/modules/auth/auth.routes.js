const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const controller = require("./auth.controller");
const validate = require("../../middleware/validate");
const requireAuth = require("../../middleware/auth");
const AppError = require("../../utils/AppError");
const config = require("../../config");
const { signupRules, loginRules } = require("./auth.validators");

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // only failed attempts count
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req, res, next) =>
    next(new AppError("Too many attempts, please try again later", 429)),
});

router.post(
  "/signup",
  credentialLimiter,
  validate(signupRules),
  controller.signup,
);
router.post(
  "/login",
  credentialLimiter,
  validate(loginRules),
  controller.login,
);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

module.exports = router;