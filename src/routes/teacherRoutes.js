const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
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
} = require('../controllers/teacherController');

const router = express.Router();

router.use(protect, authorize('instructor'));

// Dashboard summary
router.get('/stats', getMyStats);
router.get('/students', getMyStudents);

// Courses & batches
router.get('/courses', getMyCourses);
router.get('/courses/:courseId/batches', getCourseBatches);

// Modules & lessons
router.post('/courses/:courseId/modules', createModule);
router.get('/courses/:courseId/modules', getCourseModules);
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);
router.post('/modules/:moduleId/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// Live classes (calendar)
router.post('/live-classes', scheduleLiveClass);
router.get('/live-classes', getMyLiveClasses);
router.put('/live-classes/:id', updateLiveClass);
router.delete('/live-classes/:id', cancelLiveClass);
router.get('/live-classes/:id/roster', getLiveClassRoster);
router.post('/live-classes/:id/attendance', recordAttendance);

// Announcements
router.post('/announcements', postAnnouncement);

module.exports = router;
