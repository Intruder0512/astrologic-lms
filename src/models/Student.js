const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['photo', 'signature', 'id_proof', 'address_proof', 'education_proof', 'other'],
      required: true,
    },
    fileUrl: { type: String, required: true },
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Personal details (Section 6.1)
    guardianName: String,
    dob: Date,
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    address: String,
    city: String,
    state: String,
    pincode: String,
    educationalQualification: {
      type: String,
      enum: ['below_10th', '10th', '12th', 'graduate', 'post_graduate', 'doctorate', 'other'],
    },
    occupation: {
      type: String,
      enum: [
        'salaried_private',
        'salaried_government',
        'business_self_employed',
        'retired',
        'homemaker',
        'student',
        'not_working',
        'other',
      ],
    },
    preferredStudyMode: { type: String, enum: ['online', 'offline', 'hybrid'] },
    priorAstrologyExperience: String, // used as free-text "what interests you about astrology / about yourself"
    preferredLanguage: { type: String, enum: ['english', 'hindi', 'both'], default: 'english' },

    documents: [documentSchema],

    declarationAccepted: { type: Boolean, default: false },
    declarationAcceptedAt: Date,

    // Admission workflow status (Section 6.3)
    admissionStatus: {
      type: String,
      enum: [
        'application_submitted',
        'documents_pending',
        'under_verification',
        'payment_pending',
        'approved',
        'batch_allocated',
        'rejected',
        'correction_required',
      ],
      default: 'application_submitted',
    },
    rejectionReason: String,

    enrollments: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
        enrolledAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['active', 'completed', 'dropped', 'suspended'],
          default: 'active',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
