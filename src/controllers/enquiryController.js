const asyncHandler = require('express-async-handler');
const { Enquiry, Course, User } = require('../models');
const { sendEmail } = require('../utils/sendEmail');

// @desc    Submit a public enquiry (Section 4.1, 10)
// @route   POST /api/enquiries
// @access  Public
const createEnquiry = asyncHandler(async (req, res) => {
  const { name, phone, email, whatsapp, courseInterested, message, source } = req.body;

  if (!name || !phone) {
    res.status(400);
    throw new Error('Name and phone number are required');
  }

  const enquiry = await Enquiry.create({
    name,
    phone,
    email,
    whatsapp,
    courseInterestedId: courseInterested || null,
    message,
    source: source || 'website',
  });

  if (email) {
    await sendEmail({
      to: email,
      subject: 'Thank you for your enquiry - ICAS AstroLogic Chapter',
      html: `<p>Dear ${name},</p><p>Thank you for reaching out to ICAS AstroLogic Chapter.
        Our counselling team will contact you shortly.</p>`,
    });
  }

  res.status(201).json({ success: true, enquiry });
});

// @desc    List enquiries with filters (admin)
// @route   GET /api/admin/enquiries
// @access  Private/Admin
const getEnquiries = asyncHandler(async (req, res) => {
  const { status, source, assignedTo, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;
  if (source) where.source = source;
  if (assignedTo) where.assignedToId = assignedTo;

  const offset = (Number(page) - 1) * Number(limit);

  const { rows: enquiries, count: total } = await Enquiry.findAndCountAll({
    where,
    include: [
      { model: Course, as: 'courseInterested', attributes: ['id', 'title'] },
      { model: User, as: 'assignedTo', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: Number(limit),
  });

  res.json({
    success: true,
    count: enquiries.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    enquiries,
  });
});

// @desc    Update enquiry status / assign / add follow-up note
// @route   PUT /api/admin/enquiries/:id
// @access  Private/Admin
const updateEnquiry = asyncHandler(async (req, res) => {
  const { status, assignedTo, counsellingCallAt, note } = req.body;

  const enquiry = await Enquiry.findByPk(req.params.id);
  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  if (status) enquiry.status = status;
  if (assignedTo) enquiry.assignedToId = assignedTo;
  if (counsellingCallAt) enquiry.counsellingCallAt = counsellingCallAt;
  if (note) {
    const notes = Array.isArray(enquiry.followUpNotes) ? [...enquiry.followUpNotes] : [];
    notes.push({ note, addedById: req.user.id, addedAt: new Date() });
    enquiry.followUpNotes = notes;
  }

  await enquiry.save();

  res.json({ success: true, enquiry });
});

module.exports = { createEnquiry, getEnquiries, updateEnquiry };
