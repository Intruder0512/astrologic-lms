const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a Razorpay order for course fee (full or instalment)
// @route   POST /api/payments/create-order
// @access  Private/Student
const createOrder = asyncHandler(async (req, res) => {
  const { courseId, batchId, instalmentLabel } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  let amount = course.discountedFee || course.fee;

  if (instalmentLabel) {
    const instalment = course.instalmentPlan.find((i) => i.label === instalmentLabel);
    if (!instalment) {
      res.status(400);
      throw new Error('Invalid instalment label for this course');
    }
    amount = instalment.amount;
  }

  const student = await Student.findOne({ user: req.user._id });
  if (!student) {
    res.status(404);
    throw new Error('Student profile not found');
  }

  // Razorpay expects amount in the smallest currency unit (paise for INR)
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      studentId: String(student._id),
      courseId: String(course._id),
      batchId: batchId || '',
      instalmentLabel: instalmentLabel || 'full',
    },
  });

  const payment = await Payment.create({
    student: student._id,
    course: course._id,
    batch: batchId || undefined,
    amount,
    instalmentLabel: instalmentLabel || undefined,
    method: 'razorpay',
    razorpayOrderId: razorpayOrder.id,
    status: 'created',
  });

  res.status(201).json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    paymentRecordId: payment._id,
  });
});

// @desc    Verify payment signature after Razorpay checkout completes client-side
// @route   POST /api/payments/verify
// @access  Private/Student
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Missing Razorpay verification fields');
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment verification failed - signature mismatch');
  }

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'paid',
      receiptNumber: `ICAS-${Date.now()}`,
    },
    { new: true }
  ).populate('student');

  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  // Move student to payment cleared / approval-ready state
  const student = await Student.findById(payment.student._id).populate('user');
  if (student && student.admissionStatus !== 'approved' && student.admissionStatus !== 'batch_allocated') {
    student.admissionStatus = 'under_verification';
    await student.save();
  }

  if (student && student.user) {
    const template = emailTemplates.paymentReceived(
      student.user.name,
      payment.amount,
      payment.receiptNumber
    );
    await sendEmail({ to: student.user.email, ...template });
  }

  res.json({ success: true, payment });
});

// @desc    Razorpay webhook (server-to-server, source of truth - use in addition to client verify)
// @route   POST /api/payments/webhook
// @access  Public (secured via signature header)
const razorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.rawBody) // requires raw body - see server.js note
    .digest('hex');

  if (webhookSignature !== expectedSignature) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = req.body.event;

  if (event === 'payment.captured') {
    const orderId = req.body.payload.payment.entity.order_id;
    await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'paid' });
  } else if (event === 'payment.failed') {
    const orderId = req.body.payload.payment.entity.order_id;
    await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'failed' });
  }

  res.json({ success: true });
});

// @desc    Record an offline payment (cash / bank transfer) - Section 7
// @route   POST /api/admin/payments/offline
// @access  Private/Admin
const recordOfflinePayment = asyncHandler(async (req, res) => {
  const { studentId, courseId, batchId, amount, method, notes, instalmentLabel } = req.body;

  if (!['cash', 'bank_transfer', 'other'].includes(method)) {
    res.status(400);
    throw new Error('Invalid offline payment method');
  }

  const payment = await Payment.create({
    student: studentId,
    course: courseId,
    batch: batchId || undefined,
    amount,
    instalmentLabel,
    method,
    status: 'paid',
    receiptNumber: `ICAS-${Date.now()}`,
    recordedBy: req.user._id,
    notes,
  });

  res.status(201).json({ success: true, payment });
});

module.exports = { createOrder, verifyPayment, razorpayWebhook, recordOfflinePayment };
