const express = require('express');
const {
  updateMyProfile,
  uploadDocument,
  registerForCourse,
  getMyDashboard,
} = require('../controllers/studentController');
const {
  getCourseContent,
  completeLesson,
  getMyCalendar,
  getMyAnnouncements,
} = require('../controllers/studentContentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect, authorize('student'));

router.put('/me', updateMyProfile);
router.post('/me/documents', upload.single('document'), uploadDocument);
router.post('/me/register-interest', registerForCourse);
router.get('/me/dashboard', getMyDashboard);

// Phase 2: course content, progress, calendar, announcements
router.get('/me/courses/:courseId/content', getCourseContent);
router.post('/me/lessons/:id/complete', completeLesson);
router.get('/me/calendar', getMyCalendar);
router.get('/me/announcements', getMyAnnouncements);

module.exports = router;
