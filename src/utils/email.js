// src/utils/email.js
const nodemailer = require('nodemailer');

// Transport configured via .env – default to MailHog on localhost:1025 (free dev)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT, 10) || 1025,
  secure: false, // MailHog does not use TLS
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

/** Send a simple email */
async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: 'no-reply@stayhub.example.com',
    to,
    subject,
    text,
    html,
  };
  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
