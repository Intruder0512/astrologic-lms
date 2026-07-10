const { DataTypes, Model } = require('sequelize');
const slugify = require('slugify');
const { sequelize } = require('../config/db');

class Course extends Model {}

Course.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    courseCode: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: {
      type: DataTypes.ENUM('astrology', 'vastu', 'palmistry', 'nakshatra', 'other'),
      allowNull: false,
    },
    level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    shortDescription: DataTypes.STRING(300),
    learningOutcomes: { type: DataTypes.JSON, defaultValue: [] }, // array of strings
    eligibility: DataTypes.TEXT,
    prerequisites: DataTypes.TEXT,

    mode: {
      type: DataTypes.ENUM('online', 'offline', 'hybrid'),
      allowNull: false,
    },

    durationWeeks: DataTypes.INTEGER,
    totalSessions: DataTypes.INTEGER,
    sessionDurationMinutes: DataTypes.INTEGER,

    fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discountedFee: DataTypes.DECIMAL(10, 2),
    instalmentPlan: { type: DataTypes.JSON, defaultValue: [] }, // [{label, amount, dueOffsetDays}]

    requiredDocuments: { type: DataTypes.JSON, defaultValue: [] }, // array of strings
    certificateOffered: { type: DataTypes.BOOLEAN, defaultValue: true },
    certificateRules: DataTypes.TEXT,
    accessValidityDays: DataTypes.INTEGER,

    language: {
      type: DataTypes.ENUM('english', 'hindi', 'both'),
      defaultValue: 'english',
    },

    syllabus: { type: DataTypes.JSON, defaultValue: [] }, // [{moduleTitle, topics: []}]
    faqs: { type: DataTypes.JSON, defaultValue: [] }, // [{question, answer}]

    thumbnailUrl: DataTypes.STRING,
    bannerUrl: DataTypes.STRING,

    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
    },

    maxBatchSize: DataTypes.INTEGER,
    admissionDeadline: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    hooks: {
      beforeValidate: (course) => {
        if (course.title && !course.slug) {
          course.slug = slugify(course.title, { lower: true, strict: true });
        }
      },
    },
  }
);

module.exports = Course;
