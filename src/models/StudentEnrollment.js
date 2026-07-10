const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class StudentEnrollment extends Model {}

StudentEnrollment.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    batchId: { type: DataTypes.INTEGER, allowNull: true },
    enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'dropped', 'suspended'),
      defaultValue: 'active',
    },
  },
  { sequelize, modelName: 'StudentEnrollment', tableName: 'student_enrollments' }
);

module.exports = StudentEnrollment;
