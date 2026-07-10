const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// @desc    Register a new student (public self-registration)
// @route   POST /api/auth/register
// @access  Public
const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, whatsapp } = req.body;

  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error('Name, email, password and phone are required');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    whatsapp,
    role: 'student',
  });

  const student = await Student.create({ user: user._id });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentProfileId: student._id,
    },
  });
});

// @desc    Login (all roles)
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact the chapter office.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// @desc    Get logged-in user's own profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let profile = null;

  if (user.role === 'student') {
    profile = await Student.findOne({ user: user._id })
      .populate('enrollments.course', 'title slug thumbnailUrl')
      .populate('enrollments.batch', 'batchName startDate');
  }

  res.json({ success: true, user, profile });
});

module.exports = { registerStudent, login, getMe };
