const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Batch extends Model {}

Batch.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    batchName: { type: DataTypes.STRING, allowNull: false },
    mode: { type: DataTypes.ENUM('online', 'offline', 'hybrid'), allowNull: false },

    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: DataTypes.DATEONLY,

    classroomLocation: DataTypes.STRING,
    roomAllocation: DataTypes.STRING,

    schedule: { type: DataTypes.JSON, defaultValue: [] }, // [{day, startTime, endTime}]

    instructorId: DataTypes.INTEGER,
    maxCapacity: { type: DataTypes.INTEGER, defaultValue: 30 },
    enrolledCount: { type: DataTypes.INTEGER, defaultValue: 0 },

    status: {
      type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'upcoming',
    },
  },
  {
    sequelize,
    modelName: 'Batch',
    tableName: 'batches',
    getterMethods: {
      seatsLeft() {
        return Math.max((this.maxCapacity || 0) - (this.enrolledCount || 0), 0);
      },
    },
  }
);

module.exports = Batch;
