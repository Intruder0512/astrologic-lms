const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true }, // e.g. "Centre Coordinator & Lead Faculty"
    photoUrl: String,
    bio: { type: String, required: true },
    experienceYears: Number,
    specializations: [String], // e.g. ["Vedic Astrology", "Dasha Analysis"]
    qualifications: [String],
    languages: [String],
    email: String,
    phone: String,

    // Optional link to a real login account if this faculty member also
    // teaches through the LMS (schedules live classes, etc.) - not required,
    // since a profile can exist for display purposes alone (e.g. a guest
    // faculty member without system access).
    linkedInstructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    order: { type: Number, default: 0 }, // display order on the public site
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

facultySchema.index({ status: 1, order: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
