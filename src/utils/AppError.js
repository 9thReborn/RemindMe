class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details; // e.g. a list of validation errors
    this.isOperational = true; // an error we expected and chose to throw
    Error.captureStackTrace(this, this.constructor); // removes constructor from stack trace, trace begins at the point of thrown error
  }
}

// Small helpers so call sites read like sentences
AppError.badRequest = (msg = 'Bad request', details) => new AppError(msg, 400, details);
AppError.unauthorized = (msg = 'Unauthorized') => new AppError(msg, 401);
AppError.forbidden = (msg = 'Forbidden') => new AppError(msg, 403);
AppError.notFound = (msg = 'Not found') => new AppError(msg, 404);
AppError.conflict = (msg = 'Conflict') => new AppError(msg, 409);

module.exports = AppError;