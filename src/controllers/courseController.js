const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { Course, Batch, User } = require('../models');

// @desc    List published courses with filters (Section 4.3)
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
  const {
    category,
    level,
    mode,
    language,
    instructor,
    certification,
    search,
    page = 1,
    limit = 12,
  } = req.query;

  const where = { status: 'published' };
  if (category) where.category = category;
  if (level) where.level = level;
  if (mode) where.mode = mode;
  if (language) where.language = language;
  if (certification === 'true') where.certificateOffered = true;
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { shortDescription: { [Op.like]: `%${search}%` } },
    ];
  }

  const include = [
    {
      model: User,
      as: 'instructors',
      attributes: ['id', 'name'],
      through: { attributes: [] },
      ...(instructor ? { where: { id: instructor } } : {}),
    },
  ];

  const offset = (Number(page) - 1) * Number(limit);

  const { rows: courses, count: total } = await Course.findAndCountAll({
    where,
    include,
    attributes: { exclude: ['syllabus', 'faqs', 'description'] },
    order: [['createdAt', 'DESC']],
    offset,
    limit: Number(limit),
    distinct: true,
  });

  res.json({
    success: true,
    count: courses.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    courses,
  });
});

// @desc    Get single course detail page with upcoming batches (Section 4.4)
// @route   GET /api/courses/:slug
// @access  Public
const getCourseBySlug = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
    where: { slug: req.params.slug, status: 'published' },
    include: [{ model: User, as: 'instructors', attributes: ['id', 'name'], through: { attributes: [] } }],
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const batches = await Batch.findAll({
    where: { courseId: course.id, status: { [Op.in]: ['upcoming', 'ongoing'] } },
    order: [['startDate', 'ASC']],
  });

  res.json({ success: true, course, batches });
});

// @desc    Create a course
// @route   POST /api/admin/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
  const { instructorIds, ...courseData } = req.body;
  const course = await Course.create(courseData);

  if (instructorIds && instructorIds.length) {
    await course.setInstructors(instructorIds);
  }

  res.status(201).json({ success: true, course });
});

// @desc    Update a course
// @route   PUT /api/admin/courses/:id
// @access  Private/Admin
const updateCourse = asyncHandler(async (req, res) => {
  const { instructorIds, ...courseData } = req.body;
  const course = await Course.findByPk(req.params.id);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  await course.update(courseData);
  if (instructorIds) {
    await course.setInstructors(instructorIds);
  }

  res.json({ success: true, course });
});

// @desc    Archive a course (soft delete)
// @route   DELETE /api/admin/courses/:id
// @access  Private/Admin
const archiveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  course.status = 'archived';
  await course.save();

  res.json({ success: true, message: 'Course archived', course });
});

// @desc    List all courses for admin (any status)
// @route   GET /api/admin/courses
// @access  Private/Admin
const getAllCoursesAdmin = asyncHandler(async (req, res) => {
  const courses = await Course.findAll({
    include: [{ model: User, as: 'instructors', attributes: ['id', 'name'], through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, count: courses.length, courses });
});

module.exports = {
  getCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  archiveCourse,
  getAllCoursesAdmin,
};
