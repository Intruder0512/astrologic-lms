const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: { type: String, required: true },
    whatsapp: String,
    location: String,
    courseInterested: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    message: String,

    source: {
      type: String,
      enum: ['website', 'google_ads', 'meta_ads', 'referral', 'walk_in', 'other'],
      default: 'website',
    },

    status: {
      type: String,
      enum: [
        'new_enquiry',
        'contacted',
        'counselling_scheduled',
        'interested',
        'registration_started',
        'payment_pending',
        'enrolled',
        'not_interested',
      ],
      default: 'new_enquiry',
    },

    counsellingCallAt: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    followUpNotes: [
      {
        note: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
