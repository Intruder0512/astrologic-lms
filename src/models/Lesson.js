const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'true_false'], default: 'mcq' },
    options: [String], // for mcq; true_false uses implicit ['True', 'False']
    correctAnswerIndex: { type: Number, required: true },
  },
  { _id: true }
);

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['video', 'pdf', 'live_class', 'quiz', 'assignment', 'text', 'link'],
      required: true,
    },
    order: { type: Number, default: 0 },

    // type: video
    videoUrl: String,
    // type: pdf
    pdfUrl: String,
    // type: text
    textContent: String,
    // type: link
    externalUrl: String,
    // type: live_class
    liveClass: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveClass' },
    // type: quiz
    quizQuestions: [quizQuestionSchema],
    passingPercentage: { type: Number, default: 60 },
    // type: assignment
    assignmentInstructions: String,
    assignmentDueDate: Date,

    releaseDate: Date, // optional drip-content date; null = available immediately on enrollment
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, module: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
