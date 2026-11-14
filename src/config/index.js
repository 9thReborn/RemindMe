require("dotenv").config();

// Fail fast: crash at startup, not at the first login hours later
const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const env = process.env.NODE_ENV || "development";

module.exports = Object.freeze({
  env,
  isProd: env === "production",
  isTest: env === "test",
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwt: Object.freeze({
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  }),
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  bcryptRounds: env === "test" ? 4 : 12,
  logLevel: process.env.LOG_LEVEL || (env === "test" ? "silent" : "info"),
  mail: Object.freeze({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@remindme.dev',
    fromName: process.env.MAIL_FROM_NAME || 'RemindMe',
    brevoApiKey: process.env.BREVO_API_KEY,
  }),
});