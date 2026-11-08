const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");

module.exports = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const details = result
      .array()
      .map((e) => ({ field: e.path, message: e.msg }));
    next(AppError.badRequest("Validation failed", details));
  },
];