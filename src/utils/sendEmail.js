const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a transactional email.
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Do not throw - email failure should not break the request flow.
    // In production, push failures to a retry queue / logging service instead.
    console.error(`Email send failed to ${to}: ${err.message}`);
  }
};

// Pre-built templates matching Section 6.2 admission workflow touchpoints
const emailTemplates = {
  registrationReceived: (name, courseName) => ({
    subject: 'We received your registration - ICAS AstroLogic Chapter',
    html: `<p>Dear ${name},</p>
      <p>Thank you for registering for <strong>${courseName}</strong> with ICAS AstroLogic Chapter.
      Your application is now under verification. We will notify you once it is reviewed.</p>
      <p>Warm regards,<br/>ICAS AstroLogic Chapter</p>`,
  }),
  admissionApproved: (name, courseName, batchName) => ({
    subject: 'Admission Approved - Welcome to ICAS AstroLogic Chapter',
    html: `<p>Dear ${name},</p>
      <p>Congratulations! Your admission to <strong>${courseName}</strong> has been approved.
      You have been allocated to batch: <strong>${batchName}</strong>.</p>
      <p>You can now log in to your student dashboard to access course material.</p>
      <p>Warm regards,<br/>ICAS AstroLogic Chapter</p>`,
  }),
  paymentReceived: (name, amount, receiptNumber) => ({
    subject: 'Payment Confirmation - ICAS AstroLogic Chapter',
    html: `<p>Dear ${name},</p>
      <p>We have received your payment of ₹${amount}. Receipt number: <strong>${receiptNumber}</strong>.</p>
      <p>Warm regards,<br/>ICAS AstroLogic Chapter</p>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
