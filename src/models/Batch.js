const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batchName: { type: String, required: true }, // e.g. "Aug 2026 - Weekend Morning"
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], required: true },

    startDate: { type: Date, required: true },
    endDate: Date,

    // Offline-specific (Section 5.6)
    classroomLocation: String,
    roomAllocation: String,

    schedule: [
      {
        day: {
          type: String,
          enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        },
        startTime: String, // "18:00"
        endTime: String, // "19:30"
      },
    ],

    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxCapacity: { type: Number, default: 30 },
    enrolledCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

batchSchema.virtual('seatsLeft').get(function () {
  return Math.max(this.maxCapacity - this.enrolledCount, 0);
});
batchSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Batch', batchSchema);
