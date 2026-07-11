const mongoose = require('mongoose');

const courseModuleSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courseModuleSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('CourseModule', courseModuleSchema);
