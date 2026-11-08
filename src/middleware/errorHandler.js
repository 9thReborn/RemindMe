const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const config = require("../config");
const logger = require("../config/logger");

function normalize(err) {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return AppError.badRequest("Validation failed", details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }
  if (err.code === 11000) {
    // MongoDB duplicate key, e.g. username taken
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return AppError.conflict(`${field} already exists`);
  }
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return AppError.unauthorized("Invalid or expired token");
  }
  if (err.type === "entity.parse.failed") {
    // malformed JSON body
    return AppError.badRequest("Malformed JSON");
  }
  // Errors from body-parser and similar libraries carry a safe 4xx status
  if (err.expose && err.status >= 400 && err.status < 500) {
    return new AppError(err.message, err.status);
  }
  return null; // unknown: treat as a bug
}

module.exports = function errorHandler(err, req, res, next) {
  const known = normalize(err);
  const statusCode = known ? known.statusCode : 500;
  const log = req.log || logger; // req.log carries the request ID

  if (statusCode >= 500) {
    log.error({ err }, "Unhandled error");
  } else {
    log.warn({ statusCode, msg: known.message }, "Request failed");
  }

  if (res.headersSent) return next(err); // too late to send our own response

  res.status(statusCode).json({
    status: "error",
    message: known ? known.message : "Something went wrong",
    ...(known?.details && { details: known.details }),
    requestId: req.id,
    ...(!config.isProd && { stack: err.stack }),
  });
};