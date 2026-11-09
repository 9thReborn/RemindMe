const nodemailer = require("nodemailer");
const config = require("../config");
const logger = require("../config/logger");

let transporter; // undefined = not checked yet, null = email disabled

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const { host, port, user, pass } = config.mail;
  if (!host || !user || !pass) {
    logger.warn("SMTP not configured; email notifications disabled");
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
  });
  return transporter;
}

async function send({ to, subject, text }) {
  const t = getTransporter();
  if (!t) return null;
  const info = await t.sendMail({ from: config.mail.from, to, subject, text });
  const preview = nodemailer.getTestMessageUrl(info); // only set for Ethereal
  logger.info(
    { messageId: info.messageId, ...(preview && { preview }) },
    "Email sent",
  );
  return info;
}

module.exports = { send };