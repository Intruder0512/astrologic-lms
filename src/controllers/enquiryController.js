const asyncHandler = require('express-async-handler');
const Enquiry = require('../models/Enquiry');
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
    courseInterested,
    message,
    source: source || 'website',
  });

  // Automated acknowledgement (Section 10)
  if (email) {
    await sendEmail({
      to: email,
      subject: 'Thank you for your enquiry - ICAS Lucknow-III',
      html: `<p>Dear ${name},</p><p>Thank you for reaching out to ICAS Lucknow-III.
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

  const filter = {};
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;

  const skip = (Number(page) - 1) * Number(limit);

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .populate('courseInterested', 'title')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Enquiry.countDocuments(filter),
  ]);

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

  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }

  if (status) enquiry.status = status;
  if (assignedTo) enquiry.assignedTo = assignedTo;
  if (counsellingCallAt) enquiry.counsellingCallAt = counsellingCallAt;
  if (note) {
    enquiry.followUpNotes.push({ note, addedBy: req.user._id });
  }

  await enquiry.save();

  res.json({ success: true, enquiry });
});

module.exports = { createEnquiry, getEnquiries, updateEnquiry };
