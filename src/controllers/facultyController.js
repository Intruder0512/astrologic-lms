const asyncHandler = require('express-async-handler');
const Faculty = require('../models/Faculty');

// Parses comma-separated string fields (specializations, qualifications,
// languages) coming from a multipart form into arrays. Also accepts real
// arrays if the client sends JSON instead.
const toArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
};

// @desc    List published faculty profiles (public site)
// @route   GET /api/faculty
// @access  Public
const getPublishedFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.find({ status: 'published' }).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, count: faculty.length, faculty });
});

// @desc    List all faculty profiles, any status (admin)
// @route   GET /api/admin/faculty
// @access  Private/Admin
const getAllFacultyAdmin = asyncHandler(async (req, res) => {
  const faculty = await Faculty.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, count: faculty.length, faculty });
});

// @desc    Create a faculty profile
// @route   POST /api/admin/faculty
// @access  Private/Admin
// Accepts multipart/form-data (field "photo" for the image) or plain JSON.
const createFaculty = asyncHandler(async (req, res) => {
  const { name, designation, bio, experienceYears, email, phone, order, status, photoUrl } = req.body;

  if (!name || !bio) {
    res.status(400);
    throw new Error('Name and bio are required');
  }

  const faculty = await Faculty.create({
    name,
    designation,
    bio,
    experienceYears: experienceYears ? Number(experienceYears) : undefined,
    specializations: toArray(req.body.specializations),
    qualifications: toArray(req.body.qualifications),
    languages: toArray(req.body.languages),
    email,
    phone,
    order: order ? Number(order) : 0,
    status: status === 'published' ? 'published' : 'draft',
    photoUrl: req.file ? `/uploads/faculty/${req.file.filename}` : photoUrl,
  });

  res.status(201).json({ success: true, faculty });
});

// @desc    Update a faculty profile (including publish/unpublish)
// @route   PUT /api/admin/faculty/:id
// @access  Private/Admin
const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) {
    res.status(404);
    throw new Error('Faculty profile not found');
  }

  const { name, designation, bio, experienceYears, email, phone, order, status, photoUrl } = req.body;

  if (name !== undefined) faculty.name = name;
  if (designation !== undefined) faculty.designation = designation;
  if (bio !== undefined) faculty.bio = bio;
  if (experienceYears !== undefined) faculty.experienceYears = Number(experienceYears);
  if (req.body.specializations !== undefined) faculty.specializations = toArray(req.body.specializations);
  if (req.body.qualifications !== undefined) faculty.qualifications = toArray(req.body.qualifications);
  if (req.body.languages !== undefined) faculty.languages = toArray(req.body.languages);
  if (email !== undefined) faculty.email = email;
  if (phone !== undefined) faculty.phone = phone;
  if (order !== undefined) faculty.order = Number(order);
  if (status !== undefined) faculty.status = status === 'published' ? 'published' : 'draft';
  if (req.file) faculty.photoUrl = `/uploads/faculty/${req.file.filename}`;
  else if (photoUrl !== undefined) faculty.photoUrl = photoUrl;

  await faculty.save();
  res.json({ success: true, faculty });
});

// @desc    Delete a faculty profile
// @route   DELETE /api/admin/faculty/:id
// @access  Private/Admin
const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) {
    res.status(404);
    throw new Error('Faculty profile not found');
  }
  await faculty.deleteOne();
  res.json({ success: true, message: 'Faculty profile deleted' });
});

module.exports = {
  getPublishedFaculty,
  getAllFacultyAdmin,
  createFaculty,
  updateFaculty,
  deleteFaculty,
};
