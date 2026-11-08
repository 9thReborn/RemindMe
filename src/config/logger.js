const pino = require("pino");
const config = require("./index");

const logger = pino({
  level: config.logLevel,
  base: { service: "remindme", env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "password",
      "*.password",
      "token",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});

module.exports = logger;