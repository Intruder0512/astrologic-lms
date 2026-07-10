const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class CourseInstructor extends Model {}

CourseInstructor.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, modelName: 'CourseInstructor', tableName: 'course_instructors' }
);

module.exports = CourseInstructor;
