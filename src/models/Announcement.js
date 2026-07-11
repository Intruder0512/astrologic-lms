const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // null = all batches of the course
    title: { type: String, required: true },
    message: { type: String, required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementSchema.index({ course: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
