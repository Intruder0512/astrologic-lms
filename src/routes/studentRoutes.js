const express = require('express');
const {
  updateMyProfile,
  uploadDocument,
  registerForCourse,
  getMyDashboard,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect, authorize('student'));

router.put('/me', updateMyProfile);
router.post('/me/documents', upload.single('document'), uploadDocument);
router.post('/me/register-interest', registerForCourse);
router.get('/me/dashboard', getMyDashboard);

module.exports = router;
