const asyncHandler = require('express-async-handler');
const { User, Student } = require('../models');
const generateToken = require('../utils/generateToken');

// @desc    Register a new student (public self-registration)
// @route   POST /api/auth/register
// @access  Public
const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, whatsapp } = req.body;

  if (!name || !email || !password || !phone) {
    res.status(400);
    throw new Error('Name, email, password and phone are required');
  }

  const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, phone, whatsapp, role: 'student' });
  const student = await Student.create({ userId: user.id });

  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentProfileId: student.id,
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

  const user = await User.findOne({ where: { email: email.toLowerCase() } });

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

  const token = generateToken(user.id);

  res.json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// @desc    Get logged-in user's own profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
  let profile = null;

  if (user.role === 'student') {
    profile = await Student.findOne({
      where: { userId: user.id },
      include: [
        {
          association: 'enrollments',
          include: [
            { association: 'course', attributes: ['id', 'title', 'slug', 'thumbnailUrl'] },
            { association: 'batch', attributes: ['id', 'batchName', 'startDate'] },
          ],
        },
      ],
    });
  }

  res.json({ success: true, user, profile });
});

module.exports = { registerStudent, login, getMe };
