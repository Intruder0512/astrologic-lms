const asyncHandler = require('express-async-handler');
const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Student,
  Batch,
  Course,
  Payment,
  Enquiry,
  StudentEnrollment,
  User,
} = require('../models');

// @desc    List student applications with filterable admission status
// @route   GET /api/admin/students
// @access  Private/Admin
const getStudents = asyncHandler(async (req, res) => {
  const { admissionStatus, page = 1, limit = 20 } = req.query;

  const where = {};
  if (admissionStatus) where.admissionStatus = admissionStatus;

  const offset = (Number(page) - 1) * Number(limit);

  const { rows: students, count: total } = await Student.findAndCountAll({
    where,
    include: [
      { association: 'user', attributes: ['id', 'name', 'email', 'phone', 'whatsapp'] },
      { association: 'enrollments', include: [{ association: 'course', attributes: ['id', 'title'] }] },
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: Number(limit),
    distinct: true,
  });

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
  const { decision, rejectionReason } = req.body;

  const student = await Student.findByPk(req.params.id, { include: [{ association: 'user' }] });
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

  const student = await Student.findByPk(req.params.id, { include: [{ association: 'user' }] });
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (student.admissionStatus !== 'approved') {
    res.status(400);
    throw new Error('Student must be in "approved" status before batch allocation');
  }

  const batch = await Batch.findByPk(batchId);
  if (!batch || batch.courseId !== Number(courseId)) {
    res.status(400);
    throw new Error('Invalid batch for the given course');
  }
  if (batch.enrolledCount >= batch.maxCapacity) {
    res.status(400);
    throw new Error('Selected batch is already full');
  }

  const enrollment = await StudentEnrollment.findOne({
    where: { studentId: student.id, courseId },
  });
  if (!enrollment) {
    res.status(400);
    throw new Error('No matching enrollment found for this course');
  }

  await enrollment.update({ batchId: batch.id });
  await student.update({ admissionStatus: 'batch_allocated' });
  await batch.update({ enrolledCount: batch.enrolledCount + 1 });

  const course = await Course.findByPk(courseId);
  if (student.user) {
    const { emailTemplates, sendEmail } = require('../utils/sendEmail');
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    newEnquiries,
    newRegistrations,
    pendingApplications,
    activeStudents,
    feeCollectedRow,
    outstandingCount,
    courseWiseEnrollments,
  ] = await Promise.all([
    Enquiry.count({ where: { status: 'new_enquiry' } }),
    Student.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
    Student.count({
      where: { admissionStatus: { [Op.in]: ['under_verification', 'documents_pending', 'payment_pending'] } },
    }),
    Student.count({ where: { admissionStatus: { [Op.in]: ['approved', 'batch_allocated'] } } }),
    Payment.findOne({
      where: { status: 'paid' },
      attributes: [[fn('SUM', col('amount')), 'total']],
      raw: true,
    }),
    Payment.count({ where: { status: 'created' } }),
    StudentEnrollment.findAll({
      attributes: ['courseId', [fn('COUNT', col('StudentEnrollment.id')), 'count']],
      include: [{ model: Course, as: 'course', attributes: ['title'] }],
      group: ['courseId', 'course.id'],
      raw: false,
    }),
  ]);

  res.json({
    success: true,
    metrics: {
      newEnquiries,
      newRegistrations,
      pendingApplications,
      activeStudents,
      totalFeeCollected: Number(feeCollectedRow?.total || 0),
      outstandingPaymentOrders: outstandingCount,
      courseWiseEnrollments: courseWiseEnrollments.map((r) => ({
        courseTitle: r.course?.title,
        count: Number(r.get('count')),
      })),
    },
  });
});

module.exports = {
  getStudents,
  reviewAdmission,
  allocateBatch,
  createBatch,
  getDashboardMetrics,
};
