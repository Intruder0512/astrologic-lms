const asyncHandler = require('express-async-handler');
const { Student, Course, Batch, StudentEnrollment } = require('../models');
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
    'priorAstrologyExperience',
    'preferredLanguage',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const student = await Student.findOne({ where: { userId: req.user.id } });
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  await student.update(updates);

  res.json({ success: true, student });
});

// @desc    Upload a document (photo, ID proof, address proof, etc.)
// @route   POST /api/students/me/documents
// @access  Private/Student
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

  const student = await Student.findOne({ where: { userId: req.user.id } });
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  const documents = Array.isArray(student.documents) ? [...student.documents] : [];
  documents.push({
    type,
    fileUrl: `/uploads/documents/${req.file.filename}`,
    originalName: req.file.originalname,
    uploadedAt: new Date(),
    verified: false,
  });

  let admissionStatus = student.admissionStatus;
  if (admissionStatus === 'documents_pending' || admissionStatus === 'application_submitted') {
    const hasCore = ['photo', 'id_proof', 'address_proof'].every((t) =>
      documents.some((d) => d.type === t)
    );
    if (hasCore) admissionStatus = 'under_verification';
  }

  await student.update({ documents, admissionStatus });

  res.status(201).json({ success: true, documents });
});

// @desc    Submit course registration/enquiry intent (Section 6.2 step 1-2)
// @route   POST /api/students/me/register-interest
// @access  Private/Student
const registerForCourse = asyncHandler(async (req, res) => {
  const { courseId, batchId } = req.body;

  const course = await Course.findOne({ where: { id: courseId, status: 'published' } });
  if (!course) {
    res.status(404);
    throw new Error('Course not found or not available');
  }

  let batch = null;
  if (batchId) {
    batch = await Batch.findByPk(batchId);
    if (!batch || batch.courseId !== course.id) {
      res.status(400);
      throw new Error('Invalid batch for this course');
    }
    if (batch.enrolledCount >= batch.maxCapacity) {
      res.status(400);
      throw new Error('This batch is full. Please choose another batch.');
    }
  }

  const student = await Student.findOne({ where: { userId: req.user.id } });

  const existing = await StudentEnrollment.findOne({
    where: { studentId: student.id, courseId: course.id, status: 'active' },
  });
  if (existing) {
    res.status(400);
    throw new Error('You are already registered for this course');
  }

  await StudentEnrollment.create({
    studentId: student.id,
    courseId: course.id,
    batchId: batch ? batch.id : null,
  });

  if (student.admissionStatus === 'application_submitted') {
    await student.update({ admissionStatus: 'documents_pending' });
  }

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
  const student = await Student.findOne({
    where: { userId: req.user.id },
    include: [
      {
        association: 'enrollments',
        include: [
          { association: 'course', attributes: ['id', 'title', 'slug', 'thumbnailUrl', 'fee'] },
          { association: 'batch', attributes: ['id', 'batchName', 'startDate', 'mode', 'classroomLocation'] },
        ],
      },
    ],
  });

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
