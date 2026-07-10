const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    instalmentLabel: String, // e.g. "Instalment 1 of 3", null if full payment
    couponCode: String,
    discountApplied: { type: Number, default: 0 },

    method: {
      type: String,
      enum: ['razorpay', 'cash', 'bank_transfer', 'other'],
      required: true,
    },

    // Razorpay-specific
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded', 'pending_verification'],
      default: 'created',
    },

    receiptNumber: { type: String, unique: true, sparse: true },
    invoiceUrl: String,

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for offline entries
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
