const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const CourseModule = require('../models/CourseModule');
const Lesson = require('../models/Lesson');
const LiveClass = require('../models/LiveClass');
const LessonProgress = require('../models/LessonProgress');
const Announcement = require('../models/Announcement');

// Helper: confirm the student is actively enrolled (approved or batch-allocated) in a course

const getEnrolledStudentOrFail = async (userId, courseId) => {
  const student = await Student.findOne({ user: userId });
  if (!student) {
    const err = new Error('Student profile not found');
    err.statusCode = 404;
    throw err;
  }
  const enrollment = student.enrollments.find(
    (e) => String(e.course) === String(courseId) && e.status === 'active'
  );
  if (!enrollment || !['approved', 'batch_allocated'].includes(student.admissionStatus)) {
    const err = new Error('You are not actively enrolled in this course');
    err.statusCode = 403;
    throw err;
  }
  return { student, enrollment };
};

// @desc    Get modules + lessons for a course the student is enrolled in
// @route   GET /api/students/me/courses/:courseId/content
// @access  Private/Student
const getCourseContent = asyncHandler(async (req, res) => {
  const { student } = await getEnrolledStudentOrFail(req.user._id, req.params.courseId);

  const modules = await CourseModule.find({ course: req.params.courseId }).sort({ order: 1 });
  const lessons = await Lesson.find({ course: req.params.courseId })
    .sort({ order: 1 })
    .populate('liveClass', 'title scheduledStart scheduledEnd teamsJoinUrl status');

  const progress = await LessonProgress.find({ student: student._id, course: req.params.courseId });
  const progressMap = new Map(progress.map((p) => [String(p.lesson), p]));

  const now = new Date();
  const modulesWithLessons = modules.map((m) => ({
    ...m.toObject(),
    lessons: lessons
      .filter((l) => String(l.module) === String(m._id))
      .filter((l) => !l.releaseDate || new Date(l.releaseDate) <= now) // drip content gating
      .map((l) => {
        const lessonObj = l.toObject();
        // Strip quiz answer keys from the student-facing payload
        if (lessonObj.quizQuestions) {
          lessonObj.quizQuestions = lessonObj.quizQuestions.map(({ correctAnswerIndex, ...q }) => q);
        }
        const p = progressMap.get(String(l._id));
        lessonObj.completed = p?.completed || false;
        lessonObj.quizScorePercentage = p?.quizScorePercentage;
        return lessonObj;
      }),
  }));

  res.json({ success: true, modules: modulesWithLessons });
});

// @desc    Mark a lesson complete (or submit quiz score)
// @route   POST /api/students/me/lessons/:id/complete
// @access  Private/Student
const completeLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }

  const { student } = await getEnrolledStudentOrFail(req.user._id, lesson.course);

  const update = { completed: true, completedAt: new Date() };
  if (req.body.quizScorePercentage !== undefined) {
    update.quizScorePercentage = req.body.quizScorePercentage;
  }

  const progress = await LessonProgress.findOneAndUpdate(
    { student: student._id, lesson: lesson._id },
    { $set: update, $setOnInsert: { course: lesson.course } },
    { upsert: true, new: true }
  );

  res.json({ success: true, progress });
});

// @desc    Get upcoming/past live classes across all enrolled, batch-allocated courses (calendar data)
// @route   GET /api/students/me/calendar?from=&to=
// @access  Private/Student
const getMyCalendar = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  const batchIds = student.enrollments
    .filter((e) => e.status === 'active' && e.batch)
    .map((e) => e.batch);

  if (!batchIds.length) {
    return res.json({ success: true, count: 0, liveClasses: [] });
  }

  const { from, to } = req.query;
  const where = { batch: { $in: batchIds }, status: { $ne: 'cancelled' } };
  if (from || to) {
    where.scheduledStart = {};
    if (from) where.scheduledStart.$gte = new Date(from);
    if (to) where.scheduledStart.$lte = new Date(to);
  }

  const liveClasses = await LiveClass.find(where)
    .populate('course', 'title')
    .populate('batch', 'batchName')
    .populate('instructor', 'name')
    .select('-attendance -teamsMeetingId -teamsOrganizerUpn') // don't leak internal Teams IDs or other students' attendance
    .sort({ scheduledStart: 1 });

  res.json({ success: true, count: liveClasses.length, liveClasses });
});

// @desc    Get announcements for the student's enrolled courses
// @route   GET /api/students/me/announcements
// @access  Private/Student
const getMyAnnouncements = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  const courseIds = student.enrollments.filter((e) => e.status === 'active').map((e) => e.course);
  const batchIds = student.enrollments.filter((e) => e.status === 'active' && e.batch).map((e) => e.batch);

  const announcements = await Announcement.find({
    course: { $in: courseIds },
    $or: [{ batch: { $in: batchIds } }, { batch: { $exists: false } }],
  })
    .populate('course', 'title')
    .populate('postedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, count: announcements.length, announcements });
});

module.exports = { getCourseContent, completeLesson, getMyCalendar, getMyAnnouncements };
