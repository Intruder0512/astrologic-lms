const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    present: { type: Boolean, default: false },
    joinedAt: Date,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { _id: false }
);

const liveClassSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    title: { type: String, required: true },
    description: String,
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },

    // Microsoft Teams (via Graph API) - see src/services/msGraph.js
    teamsMeetingId: String,
    teamsJoinUrl: String,
    teamsOrganizerUpn: String,

    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    recordingUrl: String,

    attendance: [attendanceEntrySchema],

    remindersSentAt: [Date], // tracks when schedule/reminder emails went out, avoids duplicate sends
  },
  { timestamps: true }
);

liveClassSchema.index({ batch: 1, scheduledStart: 1 });
liveClassSchema.index({ instructor: 1, scheduledStart: 1 });

module.exports = mongoose.model('LiveClass', liveClassSchema);
