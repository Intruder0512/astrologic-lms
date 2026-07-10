const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Enquiry extends Model {}

Enquiry.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: DataTypes.STRING,
    phone: { type: DataTypes.STRING, allowNull: false },
    whatsapp: DataTypes.STRING,
    courseInterestedId: DataTypes.INTEGER,
    message: DataTypes.TEXT,

    source: {
      type: DataTypes.ENUM('website', 'google_ads', 'meta_ads', 'referral', 'walk_in', 'other'),
      defaultValue: 'website',
    },

    status: {
      type: DataTypes.ENUM(
        'new_enquiry',
        'contacted',
        'counselling_scheduled',
        'interested',
        'registration_started',
        'payment_pending',
        'enrolled',
        'not_interested'
      ),
      defaultValue: 'new_enquiry',
    },

    counsellingCallAt: DataTypes.DATE,
    assignedToId: DataTypes.INTEGER,
    followUpNotes: { type: DataTypes.JSON, defaultValue: [] }, // [{note, addedById, addedAt}]
  },
  { sequelize, modelName: 'Enquiry', tableName: 'enquiries' }
);

module.exports = Enquiry;
