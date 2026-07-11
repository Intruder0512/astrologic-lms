const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  createCourse,
  updateCourse,
  archiveCourse,
  getAllCoursesAdmin,
} = require('../controllers/courseController');

const { getEnquiries, updateEnquiry } = require('../controllers/enquiryController');

const { recordOfflinePayment } = require('../controllers/paymentController');

const {
  getStudents,
  reviewAdmission,
  allocateBatch,
  createBatch,
  getDashboardMetrics,
  createInstructor,
  getInstructors,
  updateInstructor,
  getChapterCalendar,
} = require('../controllers/adminController');

const {
  getAllFacultyAdmin,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} = require('../controllers/facultyController');

const uploadFacultyPhoto = require('../middleware/uploadFacultyPhoto');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardMetrics);

// Courses
router.get('/courses', getAllCoursesAdmin);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', archiveCourse);

// Batches
router.post('/batches', createBatch);

// Students / Admissions
router.get('/students', getStudents);
router.put('/students/:id/review', reviewAdmission);
router.put('/students/:id/allocate-batch', allocateBatch);

// Enquiries / Leads
router.get('/enquiries', getEnquiries);
router.put('/enquiries/:id', updateEnquiry);

// Payments
router.post('/payments/offline', recordOfflinePayment);

// Instructors (Phase 2)
router.post('/instructors', createInstructor);
router.get('/instructors', getInstructors);
router.put('/instructors/:id', updateInstructor);

// Chapter-wide calendar (Phase 2)
router.get('/calendar', getChapterCalendar);

// Faculty profiles (draft/published, same pattern as courses)
router.get('/faculty', getAllFacultyAdmin);
router.post('/faculty', uploadFacultyPhoto.single('photo'), createFaculty);
router.put('/faculty/:id', uploadFacultyPhoto.single('photo'), updateFaculty);
router.delete('/faculty/:id', deleteFaculty);

module.exports = router;
