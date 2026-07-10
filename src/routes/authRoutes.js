const express = require('express');
const { registerStudent, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerStudent);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
