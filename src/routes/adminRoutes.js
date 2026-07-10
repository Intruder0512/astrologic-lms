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
} = require('../controllers/adminController');

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

module.exports = router;
