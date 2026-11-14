const nodemailer = require("nodemailer");
const config = require("../config");
const logger = require("../config/logger");

const { fromEmail, fromName } = config.mail;

// --- Provider 1: Brevo over HTTPS (works on Render) ---
async function sendViaBrevo({ to, subject, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.mail.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
      signal: AbortSignal.timeout(10000),
  });
   if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
  const { messageId } = await res.json();
  return { messageId };
}

// --- Provider 2: SMTP (local development with Ethereal) ---
let smtp;  // undefined = not checked yet, null = not configured
function getSmtp() {
  if (smtp !== undefined) return smtp;
  const { host, port, user, pass } = config.mail;
  smtp = host && user && pass
    ? nodemailer.createTransport({
        host, port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user, pass },
        connectionTimeout: 10000,
      })
    : null;
  return smtp;
}

async function sendViaSmtp({ to, subject, text }) {
  const info = await getSmtp().sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, text });
  return { messageId: info.messageId, preview: nodemailer.getTestMessageUrl(info) || undefined };
}

// --- Public interface: unchanged ---
let warned = false;
async function send(message) {
  const provider = config.mail.brevoApiKey ? 'brevo' : getSmtp() ? 'smtp' : null;
  if (!provider) {
    if (!warned) logger.warn('No email provider configured; email notifications disabled');
    warned = true;
    return null;
  }
  const result = provider === 'brevo' ? await sendViaBrevo(message) : await sendViaSmtp(message);
  logger.info({ provider, ...result }, 'Email sent');
  return result;
}

module.exports = { send };
// let transporter; // undefined = not checked yet, null = email disabled

// function getTransporter() {
//   if (transporter !== undefined) return transporter;
//   const { host, port, user, pass } = config.mail;
//   if (!host || !user || !pass) {
//     logger.warn("SMTP not configured; email notifications disabled");
//     transporter = null;
//     return transporter;
//   }
//   transporter = nodemailer.createTransport({
//     host,
//     port,
//     secure: port === 465,
//     auth: { user, pass },
//     connectionTimeout: 10000,
//   });
//   return transporter;
// }

// async function send({ to, subject, text }) {
//   const t = getTransporter();
//   if (!t) return null;
//   const info = await t.sendMail({ from: config.mail.from, to, subject, text });
//   const preview = nodemailer.getTestMessageUrl(info); // only set for Ethereal
//   logger.info(
//     { messageId: info.messageId, ...(preview && { preview }) },
//     "Email sent",
//   );
//   return info;
// }

// module.exports = { send };