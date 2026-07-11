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

const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }) + ' IST';

// Pre-built templates matching Section 6.2 admission workflow touchpoints
const emailTemplates = {
  registrationReceived: (name, courseName) => ({
    subject: 'We received your registration - ICAS',
    html: `<p>Dear ${name},</p>
      <p>Thank you for registering for <strong>${courseName}</strong> with ICAS.
      Your application is now under verification. We will notify you once it is reviewed.</p>
      <p>Warm regards,<br/>ICAS</p>`,
  }),
  admissionApproved: (name, courseName, batchName) => ({
    subject: 'Admission Approved - Welcome to ICAS',
    html: `<p>Dear ${name},</p>
      <p>Congratulations! Your admission to <strong>${courseName}</strong> has been approved.
      You have been allocated to batch: <strong>${batchName}</strong>.</p>
      <p>You can now log in to your student dashboard to access course material.</p>
      <p>Warm regards,<br/>ICAS</p>`,
  }),
  paymentReceived: (name, amount, receiptNumber) => ({
    subject: 'Payment Confirmation - ICAS',
    html: `<p>Dear ${name},</p>
      <p>We have received your payment of ₹${amount}. Receipt number: <strong>${receiptNumber}</strong>.</p>
      <p>Warm regards,<br/>ICAS</p>`,
  }),
  liveClassScheduled: (name, courseName, liveClass) => ({
    subject: `Live Class Scheduled: ${liveClass.title} - ${courseName}`,
    html: `<p>Dear ${name},</p>
      <p>A live class has been scheduled for <strong>${courseName}</strong>:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Class</td><td><strong>${liveClass.title}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Date &amp; Time</td><td>${formatDateTime(liveClass.scheduledStart)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Duration</td><td>Until ${formatDateTime(liveClass.scheduledEnd)}</td></tr>
      </table>
      ${liveClass.teamsJoinUrl ? `<p><a href="${liveClass.teamsJoinUrl}" style="background:#c1272d;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Join on Microsoft Teams</a></p>` : '<p>The join link will be shared closer to the class.</p>'}
      <p>You can also see this on your calendar in the student dashboard.</p>
      <p>Warm regards,<br/>ICAS</p>`,
  }),
  liveClassRescheduled: (name, courseName, liveClass) => ({
    subject: `Class Rescheduled: ${liveClass.title} - ${courseName}`,
    html: `<p>Dear ${name},</p>
      <p>The following live class has been <strong>rescheduled</strong>:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Class</td><td><strong>${liveClass.title}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">New Date &amp; Time</td><td>${formatDateTime(liveClass.scheduledStart)}</td></tr>
      </table>
      ${liveClass.teamsJoinUrl ? `<p><a href="${liveClass.teamsJoinUrl}" style="background:#c1272d;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Join on Microsoft Teams</a></p>` : ''}
      <p>Warm regards,<br/>ICAS</p>`,
  }),
  liveClassCancelled: (name, courseName, liveClass) => ({
    subject: `Class Cancelled: ${liveClass.title} - ${courseName}`,
    html: `<p>Dear ${name},</p>
      <p>The live class <strong>${liveClass.title}</strong> originally scheduled for
      ${formatDateTime(liveClass.scheduledStart)} has been <strong>cancelled</strong>.
      We'll notify you once it's rescheduled.</p>
      <p>Warm regards,<br/>ICAS</p>`,
  }),
  announcementPosted: (name, courseName, announcement) => ({
    subject: `${courseName}: ${announcement.title}`,
    html: `<p>Dear ${name},</p>
      <p><strong>${announcement.title}</strong></p>
      <p>${announcement.message}</p>
      <p style="color:#888;font-size:0.85em;">Posted for ${courseName}</p>
      <p>Warm regards,<br/>ICAS</p>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
