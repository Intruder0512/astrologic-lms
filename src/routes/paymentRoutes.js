const express = require('express');
const { createOrder, verifyPayment, razorpayWebhook } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Webhook must receive raw body - mounted separately in server.js before JSON parsing
router.post('/webhook', razorpayWebhook);

router.use(protect, authorize('student'));
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;
