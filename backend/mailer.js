// mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: +process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465",  // SSL on 465, otherwise TLS
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.PASSWORD,
  },
});

async function sendLeaveEmail({ from_email, from_name, to_email, cc_email, subject, body }) {
  const info = await transporter.sendMail({
    // always use your verified sender here
    from: `"${from_name}" <${process.env.SENDER_EMAIL}>`,
    // let replies go to the original requester
    replyTo: `"${from_name}" <${from_email}>`,
    to: to_email,
    cc: cc_email || undefined,
    subject,
    text: body,
  });
}

// new helper to send decision notifications
async function sendDecisionEmail({ to_email, cc_email, subject, body }) {
  return transporter.sendMail({
    from: `"No-Reply" <${process.env.SENDER_EMAIL}>`,
    to: to_email,
    cc: cc_email || undefined,
    subject,
    text: body,
  });
}

module.exports = {
  sendLeaveEmail,
  sendDecisionEmail,
};