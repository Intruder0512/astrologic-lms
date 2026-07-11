const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    quizScorePercentage: Number, // for quiz-type lessons
  },
  { timestamps: true }
);

lessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);
