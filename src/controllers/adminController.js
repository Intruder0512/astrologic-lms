const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Enquiry = require('../models/Enquiry');
const User = require('../models/User');
const LiveClass = require('../models/LiveClass');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// @desc    List student applications with filterable admission status
// @route   GET /api/admin/students
// @access  Private/Admin
const getStudents = asyncHandler(async (req, res) => {
  const { admissionStatus, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (admissionStatus) filter.admissionStatus = admissionStatus;

  const skip = (Number(page) - 1) * Number(limit);

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('user', 'name email phone whatsapp')
      .populate('enrollments.course', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Student.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: students.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    students,
  });
});

// @desc    Approve or reject a student's admission (Section 6.2 - Admin Verification step)
// @route   PUT /api/admin/students/:id/review
// @access  Private/Admin
const reviewAdmission = asyncHandler(async (req, res) => {
  const { decision, rejectionReason } = req.body; // decision: 'approve' | 'reject' | 'request_correction'

  const student = await Student.findById(req.params.id).populate('user');
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (decision === 'approve') {
    student.admissionStatus = 'approved';
  } else if (decision === 'reject') {
    student.admissionStatus = 'rejected';
    student.rejectionReason = rejectionReason || 'Not specified';
  } else if (decision === 'request_correction') {
    student.admissionStatus = 'correction_required';
    student.rejectionReason = rejectionReason || 'Please review and correct your submitted details';
  } else {
    res.status(400);
    throw new Error("Decision must be 'approve', 'reject' or 'request_correction'");
  }

  await student.save();

  res.json({ success: true, admissionStatus: student.admissionStatus, student });
});

// @desc    Allocate an approved student to a batch (final step before LMS access)
// @route   PUT /api/admin/students/:id/allocate-batch
// @access  Private/Admin
const allocateBatch = asyncHandler(async (req, res) => {
  const { courseId, batchId } = req.body;

  const student = await Student.findById(req.params.id).populate('user');
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (student.admissionStatus !== 'approved') {
    res.status(400);
    throw new Error('Student must be in "approved" status before batch allocation');
  }

  const batch = await Batch.findById(batchId);
  if (!batch || String(batch.course) !== String(courseId)) {
    res.status(400);
    throw new Error('Invalid batch for the given course');
  }
  if (batch.enrolledCount >= batch.maxCapacity) {
    res.status(400);
    throw new Error('Selected batch is already full');
  }

  const enrollment = student.enrollments.find((e) => String(e.course) === String(courseId));
  if (!enrollment) {
    res.status(400);
    throw new Error('No matching enrollment found for this course');
  }
  enrollment.batch = batch._id;
  student.admissionStatus = 'batch_allocated';

  batch.enrolledCount += 1;

  await Promise.all([student.save(), batch.save()]);

  const course = await Course.findById(courseId);
  if (student.user) {
    const template = emailTemplates.admissionApproved(student.user.name, course.title, batch.batchName);
    await sendEmail({ to: student.user.email, ...template });
  }

  res.json({ success: true, message: 'Student allocated to batch', student });
});

// @desc    Create a batch for a course
// @route   POST /api/admin/batches
// @access  Private/Admin
const createBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.create(req.body);
  res.status(201).json({ success: true, batch });
});

// @desc    Admin dashboard summary metrics (Section 9.1)
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardMetrics = asyncHandler(async (req, res) => {
  const [
    newEnquiries,
    newRegistrations,
    pendingApplications,
    activeStudents,
    feeCollectionAgg,
    outstandingCount,
    courseWiseEnrollments,
  ] = await Promise.all([
    Enquiry.countDocuments({ status: 'new_enquiry' }),
    Student.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
    Student.countDocuments({
      admissionStatus: { $in: ['under_verification', 'documents_pending', 'payment_pending'] },
    }),
    Student.countDocuments({ admissionStatus: { $in: ['approved', 'batch_allocated'] } }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.countDocuments({ status: 'created' }),
    Student.aggregate([
      { $unwind: '$enrollments' },
      { $group: { _id: '$enrollments.course', count: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $project: { courseTitle: '$course.title', count: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    metrics: {
      newEnquiries,
      newRegistrations,
      pendingApplications,
      activeStudents,
      totalFeeCollected: feeCollectionAgg[0]?.total || 0,
      outstandingPaymentOrders: outstandingCount,
      courseWiseEnrollments,
    },
  });
});

// @desc    Create an instructor (teacher) account
// @route   POST /api/admin/instructors
// @access  Private/Admin
const createInstructor = asyncHandler(async (req, res) => {
  const { name, email, password, phone, microsoftUpn } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const instructor = await User.create({
    name,
    email,
    password,
    phone,
    microsoftUpn,
    role: 'instructor',
  });

  res.status(201).json({
    success: true,
    instructor: { id: instructor._id, name: instructor.name, email: instructor.email, role: instructor.role },
  });
});

// @desc    List all instructors
// @route   GET /api/admin/instructors
// @access  Private/Admin
const getInstructors = asyncHandler(async (req, res) => {
  const instructors = await User.find({ role: 'instructor' }).select('-password');
  res.json({ success: true, count: instructors.length, instructors });
});

// @desc    Update an instructor's details (including microsoftUpn for Teams, or deactivate)
// @route   PUT /api/admin/instructors/:id
// @access  Private/Admin
const updateInstructor = asyncHandler(async (req, res) => {
  const instructor = await User.findOne({ _id: req.params.id, role: 'instructor' });
  if (!instructor) {
    res.status(404);
    throw new Error('Instructor not found');
  }

  const allowedFields = ['name', 'phone', 'whatsapp', 'microsoftUpn', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) instructor[field] = req.body[field];
  });
  await instructor.save();

  res.json({ success: true, instructor: { ...instructor.toObject(), password: undefined } });
});

// @desc    Chapter-wide calendar - all live classes across every course/instructor
// @route   GET /api/admin/calendar?from=&to=
// @access  Private/Admin
const getChapterCalendar = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const where = {};
  if (from || to) {
    where.scheduledStart = {};
    if (from) where.scheduledStart.$gte = new Date(from);
    if (to) where.scheduledStart.$lte = new Date(to);
  }

  const liveClasses = await LiveClass.find(where)
    .populate('course', 'title')
    .populate('batch', 'batchName')
    .populate('instructor', 'name email')
    .sort({ scheduledStart: 1 });

  res.json({ success: true, count: liveClasses.length, liveClasses });
});

module.exports = {
  getStudents,
  reviewAdmission,
  allocateBatch,
  createBatch,
  getDashboardMetrics,
  createInstructor,
  getInstructors,
  updateInstructor,
  getChapterCalendar,
};
