const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Batch = require('../models/Batch');

// @desc    List published courses with filters (Section 4.3)
// @route   GET /api/courses
// @access  Public
// Query params: category, level, mode, language, instructor, certification, search, page, limit
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

  const filter = { status: 'published' };

  if (category) filter.category = category;
  if (level) filter.level = level;
  if (mode) filter.mode = mode;
  if (language) filter.language = language;
  if (instructor) filter.instructors = instructor;
  if (certification === 'true') filter.certificateOffered = true;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { shortDescription: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('instructors', 'name')
      .select('-syllabus -faqs -description') // keep catalogue payload light
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Course.countDocuments(filter),
  ]);

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
  const course = await Course.findOne({ slug: req.params.slug, status: 'published' }).populate(
    'instructors',
    'name'
  );

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const batches = await Batch.find({
    course: course._id,
    status: { $in: ['upcoming', 'ongoing'] },
  }).sort({ startDate: 1 });

  res.json({ success: true, course, batches });
});

// @desc    Create a course
// @route   POST /api/admin/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json({ success: true, course });
});

// @desc    Update a course
// @route   PUT /api/admin/courses/:id
// @access  Private/Admin
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  res.json({ success: true, course });
});

// @desc    Delete (archive) a course - soft delete preferred over hard delete
// @route   DELETE /api/admin/courses/:id
// @access  Private/Admin
const archiveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { status: 'archived' },
    { new: true }
  );

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  res.json({ success: true, message: 'Course archived', course });
});

// @desc    List all courses for admin (any status)
// @route   GET /api/admin/courses
// @access  Private/Admin
const getAllCoursesAdmin = asyncHandler(async (req, res) => {
  const courses = await Course.find().populate('instructors', 'name').sort({ createdAt: -1 });
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
