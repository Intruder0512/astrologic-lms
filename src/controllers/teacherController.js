const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const CourseModule = require('../models/CourseModule');
const Lesson = require('../models/Lesson');
const LiveClass = require('../models/LiveClass');
const Announcement = require('../models/Announcement');
const Student = require('../models/Student');
const msGraph = require('../services/msGraph');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// Helper: verify the logged-in instructor is actually assigned to a course.
const assertOwnsCourse = async (courseId, instructorId) => {
  const course = await Course.findOne({ _id: courseId, instructors: instructorId });
  if (!course) {
    const err = new Error('Course not found, or you are not assigned as an instructor for it');
    err.statusCode = 403;
    throw err;
  }
  return course;
};

// Helper: get all batch-allocated, active students in a batch, with their user records
const getBatchStudents = async (batchId) => {
  const students = await Student.find({
    'enrollments.batch': batchId,
    admissionStatus: { $in: ['approved', 'batch_allocated'] },
  }).populate('user', 'name email');
  return students.filter((s) => s.user);
};

// @desc    List courses this instructor is assigned to
// @route   GET /api/teacher/courses
// @access  Private/Instructor
const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructors: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: courses.length, courses });
});

// @desc    List batches for a course this instructor teaches
// @route   GET /api/teacher/courses/:courseId/batches
// @access  Private/Instructor
const getCourseBatches = asyncHandler(async (req, res) => {
  await assertOwnsCourse(req.params.courseId, req.user._id);
  const batches = await Batch.find({ course: req.params.courseId }).sort({ startDate: 1 });
  res.json({ success: true, batches });
});

// ---------- Modules & Lessons ----------

const createModule = asyncHandler(async (req, res) => {
  await assertOwnsCourse(req.params.courseId, req.user._id);
  const module = await CourseModule.create({
    course: req.params.courseId,
    title: req.body.title,
    description: req.body.description,
    order: req.body.order || 0,
  });
  res.status(201).json({ success: true, module });
});

const getCourseModules = asyncHandler(async (req, res) => {
  await assertOwnsCourse(req.params.courseId, req.user._id);
  const modules = await CourseModule.find({ course: req.params.courseId }).sort({ order: 1 });
  const lessons = await Lesson.find({ course: req.params.courseId }).sort({ order: 1 });

  const modulesWithLessons = modules.map((m) => ({
    ...m.toObject(),
    lessons: lessons.filter((l) => String(l.module) === String(m._id)),
  }));

  res.json({ success: true, modules: modulesWithLessons });
});

const updateModule = asyncHandler(async (req, res) => {
  const module = await CourseModule.findById(req.params.id);
  if (!module) {
    res.status(404);
    throw new Error('Module not found');
  }
  await assertOwnsCourse(module.course, req.user._id);

  module.title = req.body.title ?? module.title;
  module.description = req.body.description ?? module.description;
  if (req.body.order !== undefined) module.order = req.body.order;
  await module.save();

  res.json({ success: true, module });
});

const deleteModule = asyncHandler(async (req, res) => {
  const module = await CourseModule.findById(req.params.id);
  if (!module) {
    res.status(404);
    throw new Error('Module not found');
  }
  await assertOwnsCourse(module.course, req.user._id);

  await Lesson.deleteMany({ module: module._id });
  await module.deleteOne();

  res.json({ success: true, message: 'Module and its lessons deleted' });
});

const createLesson = asyncHandler(async (req, res) => {
  const module = await CourseModule.findById(req.params.moduleId);
  if (!module) {
    res.status(404);
    throw new Error('Module not found');
  }
  await assertOwnsCourse(module.course, req.user._id);

  const validTypes = ['video', 'pdf', 'live_class', 'quiz', 'assignment', 'text', 'link'];
  if (!validTypes.includes(req.body.type)) {
    res.status(400);
    throw new Error(`Lesson type must be one of: ${validTypes.join(', ')}`);
  }

  const lesson = await Lesson.create({
    ...req.body,
    course: module.course,
    module: module._id,
  });

  res.status(201).json({ success: true, lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }
  await assertOwnsCourse(lesson.course, req.user._id);

  Object.assign(lesson, req.body);
  await lesson.save();

  res.json({ success: true, lesson });
});

const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) {
    res.status(404);
    throw new Error('Lesson not found');
  }
  await assertOwnsCourse(lesson.course, req.user._id);

  await lesson.deleteOne();
  res.json({ success: true, message: 'Lesson deleted' });
});

// ---------- Live Classes (Microsoft Teams) ----------

const scheduleLiveClass = asyncHandler(async (req, res) => {
  const { courseId, batchId, title, description, scheduledStart, scheduledEnd } = req.body;

  const course = await assertOwnsCourse(courseId, req.user._id);

  const batch = await Batch.findOne({ _id: batchId, course: courseId });
  if (!batch) {
    res.status(400);
    throw new Error('Invalid batch for this course');
  }

  if (!scheduledStart || !scheduledEnd || new Date(scheduledEnd) <= new Date(scheduledStart)) {
    res.status(400);
    throw new Error('scheduledEnd must be after scheduledStart');
  }

  let teamsMeetingId, teamsJoinUrl;
  const organizerUpn = req.user.microsoftUpn;

  if (msGraph.isConfigured() && organizerUpn) {
    try {
      const meeting = await msGraph.createTeamsMeeting({
        organizerUpn,
        subject: `${course.title}: ${title}`,
        startDateTime: scheduledStart,
        endDateTime: scheduledEnd,
      });
      teamsMeetingId = meeting.meetingId;
      teamsJoinUrl = meeting.joinUrl;
    } catch (err) {
      // Don't block scheduling the class if Teams creation fails - the
      // instructor can add a join link manually and the class still exists.
      console.error(`Teams meeting creation failed: ${err.message}`);
    }
  }

  const liveClass = await LiveClass.create({
    course: courseId,
    batch: batchId,
    title,
    description,
    instructor: req.user._id,
    scheduledStart,
    scheduledEnd,
    teamsMeetingId,
    teamsJoinUrl,
    teamsOrganizerUpn: organizerUpn,
  });

  const students = await getBatchStudents(batchId);
  await Promise.all(
    students.map((s) => {
      const template = emailTemplates.liveClassScheduled(s.user.name, course.title, liveClass);
      return sendEmail({ to: s.user.email, ...template });
    })
  );

  res.status(201).json({
    success: true,
    liveClass,
    teamsConfigured: msGraph.isConfigured(),
    notifiedStudents: students.length,
  });
});

const updateLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id).populate('course', 'title');
  if (!liveClass) {
    res.status(404);
    throw new Error('Live class not found');
  }
  await assertOwnsCourse(liveClass.course._id, req.user._id);

  const { title, description, scheduledStart, scheduledEnd } = req.body;
  const wasRescheduled = scheduledStart && new Date(scheduledStart).getTime() !== liveClass.scheduledStart.getTime();

  if (title) liveClass.title = title;
  if (description !== undefined) liveClass.description = description;
  if (scheduledStart) liveClass.scheduledStart = scheduledStart;
  if (scheduledEnd) liveClass.scheduledEnd = scheduledEnd;
  liveClass.status = 'rescheduled';

  if (liveClass.teamsMeetingId && msGraph.isConfigured() && liveClass.teamsOrganizerUpn) {
    try {
      await msGraph.updateTeamsMeeting({
        organizerUpn: liveClass.teamsOrganizerUpn,
        meetingId: liveClass.teamsMeetingId,
        subject: title ? `${liveClass.course.title}: ${title}` : undefined,
        startDateTime: scheduledStart,
        endDateTime: scheduledEnd,
      });
    } catch (err) {
      console.error(`Teams meeting update failed: ${err.message}`);
    }
  }

  await liveClass.save();

  if (wasRescheduled) {
    const students = await getBatchStudents(liveClass.batch);
    await Promise.all(
      students.map((s) => {
        const template = emailTemplates.liveClassRescheduled(s.user.name, liveClass.course.title, liveClass);
        return sendEmail({ to: s.user.email, ...template });
      })
    );
  }

  res.json({ success: true, liveClass });
});

const cancelLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id).populate('course', 'title');
  if (!liveClass) {
    res.status(404);
    throw new Error('Live class not found');
  }
  await assertOwnsCourse(liveClass.course._id, req.user._id);

  liveClass.status = 'cancelled';
  await liveClass.save();

  if (liveClass.teamsMeetingId && msGraph.isConfigured() && liveClass.teamsOrganizerUpn) {
    try {
      await msGraph.cancelTeamsMeeting({
        organizerUpn: liveClass.teamsOrganizerUpn,
        meetingId: liveClass.teamsMeetingId,
      });
    } catch (err) {
      console.error(`Teams meeting cancellation failed: ${err.message}`);
    }
  }

  const students = await getBatchStudents(liveClass.batch);
  await Promise.all(
    students.map((s) => {
      const template = emailTemplates.liveClassCancelled(s.user.name, liveClass.course.title, liveClass);
      return sendEmail({ to: s.user.email, ...template });
    })
  );

  res.json({ success: true, message: 'Live class cancelled and students notified' });
});

const getMyLiveClasses = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const where = { instructor: req.user._id };
  if (from || to) {
    where.scheduledStart = {};
    if (from) where.scheduledStart.$gte = new Date(from);
    if (to) where.scheduledStart.$lte = new Date(to);
  }

  const liveClasses = await LiveClass.find(where)
    .populate('course', 'title')
    .populate('batch', 'batchName')
    .sort({ scheduledStart: 1 });

  res.json({ success: true, count: liveClasses.length, liveClasses });
});

const getLiveClassRoster = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) {
    res.status(404);
    throw new Error('Live class not found');
  }
  await assertOwnsCourse(liveClass.course, req.user._id);

  const students = await getBatchStudents(liveClass.batch);
  const attendanceMap = new Map(liveClass.attendance.map((a) => [String(a.student), a]));

  const roster = students.map((s) => ({
    studentId: s._id,
    name: s.user.name,
    email: s.user.email,
    present: attendanceMap.get(String(s._id))?.present || false,
  }));

  res.json({ success: true, roster });
});

const recordAttendance = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id);
  if (!liveClass) {
    res.status(404);
    throw new Error('Live class not found');
  }
  await assertOwnsCourse(liveClass.course, req.user._id);

  const { attendance } = req.body;
  if (!Array.isArray(attendance)) {
    res.status(400);
    throw new Error('attendance must be an array of { studentId, present }');
  }

  liveClass.attendance = attendance.map((a) => ({
    student: a.studentId,
    present: !!a.present,
    joinedAt: a.present ? new Date() : undefined,
    markedBy: req.user._id,
  }));
  liveClass.status = 'completed';
  await liveClass.save();

  res.json({ success: true, message: 'Attendance recorded', attendanceCount: liveClass.attendance.length });
});

// ---------- Announcements ----------

const postAnnouncement = asyncHandler(async (req, res) => {
  const { courseId, batchId, title, message } = req.body;
  const course = await assertOwnsCourse(courseId, req.user._id);

  const announcement = await Announcement.create({
    course: courseId,
    batch: batchId || undefined,
    title,
    message,
    postedBy: req.user._id,
  });

  const students = batchId
    ? await getBatchStudents(batchId)
    : await Student.find({
        'enrollments.course': courseId,
        admissionStatus: { $in: ['approved', 'batch_allocated'] },
      }).populate('user', 'name email');

  const validStudents = students.filter((s) => s.user);
  await Promise.all(
    validStudents.map((s) => {
      const template = emailTemplates.announcementPosted(s.user.name, course.title, announcement);
      return sendEmail({ to: s.user.email, ...template });
    })
  );

  announcement.emailSent = true;
  await announcement.save();

  res.status(201).json({ success: true, announcement, notifiedStudents: validStudents.length });
});

// @desc    Summary stats for the instructor's own dashboard - class counts,
//          student counts, attendance rate
// @route   GET /api/teacher/stats
// @access  Private/Instructor
const getMyStats = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructors: req.user._id });
  const courseIds = courses.map((c) => c._id);

  const batches = await Batch.find({ course: { $in: courseIds } });
  const batchIds = batches.map((b) => b._id);

  const liveClasses = await LiveClass.find({ instructor: req.user._id });
  const completedClasses = liveClasses.filter((c) => c.status === 'completed');
  const upcomingClasses = liveClasses.filter(
    (c) => c.status !== 'cancelled' && c.status !== 'completed' && new Date(c.scheduledStart) >= new Date()
  );

  const students = batchIds.length
    ? await Student.find({
        'enrollments.batch': { $in: batchIds },
        admissionStatus: { $in: ['approved', 'batch_allocated'] },
      })
    : [];

  let totalMarked = 0;
  let totalPresent = 0;
  completedClasses.forEach((c) => {
    c.attendance.forEach((a) => {
      totalMarked++;
      if (a.present) totalPresent++;
    });
  });
  const attendanceRate = totalMarked ? Math.round((totalPresent / totalMarked) * 100) : null;

  res.json({
    success: true,
    stats: {
      totalCourses: courses.length,
      totalClasses: liveClasses.length,
      upcomingClasses: upcomingClasses.length,
      completedClasses: completedClasses.length,
      totalStudents: students.length,
      attendanceRate, // percentage, or null if no attendance recorded yet
    },
  });
});

// @desc    All students across this instructor's batches, with per-student
//          attendance history
// @route   GET /api/teacher/students
// @access  Private/Instructor
const getMyStudents = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructors: req.user._id });
  const courseIds = courses.map((c) => c._id);

  const batches = await Batch.find({ course: { $in: courseIds } });
  const batchIds = batches.map((b) => b._id);

  if (!batchIds.length) {
    return res.json({ success: true, count: 0, students: [] });
  }

  const students = await Student.find({
    'enrollments.batch': { $in: batchIds },
    admissionStatus: { $in: ['approved', 'batch_allocated'] },
  }).populate('user', 'name email phone');

  const completedClasses = await LiveClass.find({ instructor: req.user._id, status: 'completed' });

  const result = students.map((s) => {
    const enrollment = s.enrollments.find((e) => batchIds.some((id) => String(id) === String(e.batch)));
    const batch = batches.find((b) => String(b._id) === String(enrollment?.batch));
    const course = courses.find((c) => String(c._id) === String(enrollment?.course));

    let present = 0;
    let total = 0;
    completedClasses.forEach((lc) => {
      if (String(lc.batch) !== String(enrollment?.batch)) return;
      const entry = lc.attendance.find((a) => String(a.student) === String(s._id));
      if (entry) {
        total++;
        if (entry.present) present++;
      }
    });

    return {
      studentId: s._id,
      name: s.user?.name,
      email: s.user?.email,
      phone: s.user?.phone,
      course: course?.title,
      batch: batch?.batchName,
      attendancePresent: present,
      attendanceTotal: total,
      attendancePercent: total ? Math.round((present / total) * 100) : null,
    };
  });

  res.json({ success: true, count: result.length, students: result });
});

module.exports = {
  getMyCourses,
  getCourseBatches,
  createModule,
  getCourseModules,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  scheduleLiveClass,
  updateLiveClass,
  cancelLiveClass,
  getMyLiveClasses,
  getLiveClassRoster,
  recordAttendance,
  postAnnouncement,
  getMyStats,
  getMyStudents,
};
