const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// @desc    Update own student profile (Section 6.1 fields)
// @route   PUT /api/students/me
// @access  Private/Student
const updateMyProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'guardianName',
    'dob',
    'gender',
    'address',
    'city',
    'state',
    'pincode',
    'educationalQualification',
    'occupation',
    'preferredStudyMode',
    'priorAstrologyExperience',
    'preferredLanguage',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const student = await Student.findOneAndUpdate({ user: req.user._id }, updates, {
    new: true,
    runValidators: true,
  });

  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  res.json({ success: true, student });
});

// @desc    Upload a document (photo, ID proof, address proof, etc.)
// @route   POST /api/students/me/documents
// @access  Private/Student
// Expects multipart/form-data with field "document" and body field "type"
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const { type } = req.body;
  const validTypes = ['photo', 'signature', 'id_proof', 'address_proof', 'education_proof', 'other'];
  if (!validTypes.includes(type)) {
    res.status(400);
    throw new Error(`Invalid document type. Must be one of: ${validTypes.join(', ')}`);
  }

  const student = await Student.findOne({ user: req.user._id });
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  student.documents.push({
    type,
    fileUrl: `/uploads/documents/${req.file.filename}`,
    originalName: req.file.originalname,
  });

  // Once core documents are present, move out of "documents_pending"
  if (student.admissionStatus === 'documents_pending' || student.admissionStatus === 'application_submitted') {
    const hasCore = ['photo', 'id_proof', 'address_proof'].every((t) =>
      student.documents.some((d) => d.type === t)
    );
    if (hasCore) student.admissionStatus = 'under_verification';
  }

  await student.save();

  res.status(201).json({ success: true, documents: student.documents });
});

// @desc    Submit course registration/enquiry intent (Section 6.2 step 1-2)
// @route   POST /api/students/me/register-interest
// @access  Private/Student
const registerForCourse = asyncHandler(async (req, res) => {
  const { courseId, batchId } = req.body;

  const course = await Course.findById(courseId);
  if (!course || course.status !== 'published') {
    res.status(404);
    throw new Error('Course not found or not available');
  }

  let batch = null;
  if (batchId) {
    batch = await Batch.findById(batchId);
    if (!batch || String(batch.course) !== String(course._id)) {
      res.status(400);
      throw new Error('Invalid batch for this course');
    }
    if (batch.enrolledCount >= batch.maxCapacity) {
      res.status(400);
      throw new Error('This batch is full. Please choose another batch.');
    }
  }

  const student = await Student.findOne({ user: req.user._id });

  const alreadyRegistered = student.enrollments.some(
    (e) => String(e.course) === String(course._id) && e.status === 'active'
  );
  if (alreadyRegistered) {
    res.status(400);
    throw new Error('You are already registered for this course');
  }

  student.enrollments.push({ course: course._id, batch: batch ? batch._id : undefined });
  if (student.admissionStatus === 'application_submitted') {
    student.admissionStatus = 'documents_pending';
  }
  await student.save();

  const template = emailTemplates.registrationReceived(req.user.name, course.title);
  await sendEmail({ to: req.user.email, ...template });

  res.status(201).json({
    success: true,
    message: 'Registration recorded. Please upload required documents and complete payment.',
    admissionStatus: student.admissionStatus,
  });
});

// @desc    Get own admission/dashboard summary (Section 8)
// @route   GET /api/students/me/dashboard
// @access  Private/Student
const getMyDashboard = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id })
    .populate({
      path: 'enrollments.course',
      select: 'title slug thumbnailUrl fee instructors',
      populate: { path: 'instructors', select: 'name email' },
    })
    .populate('enrollments.batch', 'batchName startDate mode classroomLocation instructor');

  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  const profileFields = [
    'guardianName',
    'dob',
    'gender',
    'address',
    'city',
    'state',
    'pincode',
    'educationalQualification',
  ];
  const filledFields = profileFields.filter((f) => student[f]);
  const profileCompletionPercent = Math.round((filledFields.length / profileFields.length) * 100);

  res.json({
    success: true,
    admissionStatus: student.admissionStatus,
    profileCompletionPercent,
    enrollments: student.enrollments,
    documents: student.documents,
  });
});

module.exports = { updateMyProfile, uploadDocument, registerForCourse, getMyDashboard };
