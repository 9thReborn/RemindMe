const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
