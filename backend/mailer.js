// mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendLeaveEmail({ from_email, from_name, to_email, cc_email, subject, body }) {
  return transporter.sendMail({
    from: `"${from_name}" <${from_email}>`,
    to: to_email,
    cc: cc_email || undefined,
    subject,
    text: body,
  });
}

module.exports = { sendLeaveEmail };
