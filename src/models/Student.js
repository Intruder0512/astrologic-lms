const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Student extends Model {}

Student.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },

    guardianName: DataTypes.STRING,
    dob: DataTypes.DATEONLY,
    gender: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    address: DataTypes.TEXT,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    pincode: DataTypes.STRING,
    educationalQualification: DataTypes.STRING,
    occupation: DataTypes.STRING,
    priorAstrologyExperience: DataTypes.TEXT,
    preferredLanguage: {
      type: DataTypes.ENUM('english', 'hindi', 'both'),
      defaultValue: 'english',
    },

    // Array of { id, type, fileUrl, originalName, uploadedAt, verified }
    documents: { type: DataTypes.JSON, defaultValue: [] },

    declarationAccepted: { type: DataTypes.BOOLEAN, defaultValue: false },
    declarationAcceptedAt: DataTypes.DATE,

    admissionStatus: {
      type: DataTypes.ENUM(
        'application_submitted',
        'documents_pending',
        'under_verification',
        'payment_pending',
        'approved',
        'batch_allocated',
        'rejected',
        'correction_required'
      ),
      defaultValue: 'application_submitted',
    },
    rejectionReason: DataTypes.TEXT,
  },
  { sequelize, modelName: 'Student', tableName: 'students' }
);

module.exports = Student;
