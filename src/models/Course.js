const mongoose = require('mongoose');
const slugify = require('slugify');

const faqSchema = new mongoose.Schema(
  { question: String, answer: String },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    courseCode: { type: String, unique: true, required: true },
    category: {
      type: String,
      enum: ['astrology', 'vastu', 'palmistry', 'nakshatra', 'other'],
      required: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 300 },
    learningOutcomes: [String],
    eligibility: String,
    prerequisites: String,

    instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      required: true,
    },

    durationWeeks: Number,
    totalSessions: Number,
    sessionDurationMinutes: Number,

    fee: { type: Number, required: true },
    discountedFee: Number,
    instalmentPlan: [
      {
        label: String, // e.g. "Instalment 1"
        amount: Number,
        dueOffsetDays: Number, // days from enrollment
      },
    ],

    requiredDocuments: [String],
    certificateOffered: { type: Boolean, default: true },
    certificateRules: String,
    accessValidityDays: Number, // how long after enrollment content stays accessible

    language: { type: String, enum: ['english', 'hindi', 'both'], default: 'english' },

    syllabus: [
      {
        moduleTitle: String,
        topics: [String],
      },
    ],

    faqs: [faqSchema],

    thumbnailUrl: String,
    bannerUrl: String,

    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },

    maxBatchSize: Number,
    admissionDeadline: Date,
  },
  { timestamps: true }
);

courseSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

courseSchema.index({ category: 1, level: 1, mode: 1, status: 1 });

module.exports = mongoose.model('Course', courseSchema);
