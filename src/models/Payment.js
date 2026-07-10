const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Payment extends Model {}

Payment.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    batchId: DataTypes.INTEGER,

    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING, defaultValue: 'INR' },

    instalmentLabel: DataTypes.STRING,
    couponCode: DataTypes.STRING,
    discountApplied: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    method: {
      type: DataTypes.ENUM('razorpay', 'cash', 'bank_transfer', 'other'),
      allowNull: false,
    },

    razorpayOrderId: DataTypes.STRING,
    razorpayPaymentId: DataTypes.STRING,
    razorpaySignature: DataTypes.STRING,

    status: {
      type: DataTypes.ENUM('created', 'paid', 'failed', 'refunded', 'pending_verification'),
      defaultValue: 'created',
    },

    receiptNumber: { type: DataTypes.STRING, unique: true },
    invoiceUrl: DataTypes.STRING,

    recordedById: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
  },
  { sequelize, modelName: 'Payment', tableName: 'payments' }
);

module.exports = Payment;
