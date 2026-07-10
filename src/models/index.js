const { sequelize } = require('../config/db');
const User = require('./User');
const Student = require('./Student');
const StudentEnrollment = require('./StudentEnrollment');
const Course = require('./Course');
const CourseInstructor = require('./CourseInstructor');
const Batch = require('./Batch');
const Enquiry = require('./Enquiry');
const Payment = require('./Payment');

// User <-> Student (1:1)
User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile' });
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Course <-> User (many:many, instructors)
Course.belongsToMany(User, { through: CourseInstructor, foreignKey: 'courseId', as: 'instructors' });
User.belongsToMany(Course, { through: CourseInstructor, foreignKey: 'userId', as: 'coursesTeaching' });

// Course -> Batch (1:many)
Course.hasMany(Batch, { foreignKey: 'courseId', as: 'batches' });
Batch.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Batch -> User (instructor, many:1)
Batch.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// Student <-> Course/Batch via StudentEnrollment
Student.hasMany(StudentEnrollment, { foreignKey: 'studentId', as: 'enrollments' });
StudentEnrollment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
StudentEnrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
StudentEnrollment.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Course.hasMany(StudentEnrollment, { foreignKey: 'courseId', as: 'enrollments' });
Batch.hasMany(StudentEnrollment, { foreignKey: 'batchId', as: 'enrollments' });

// Enquiry -> Course / User (assignedTo)
Enquiry.belongsTo(Course, { foreignKey: 'courseInterestedId', as: 'courseInterested' });
Enquiry.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });

// Payment -> Student / Course / Batch / User (recordedBy)
Payment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Payment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Payment.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Payment.belongsTo(User, { foreignKey: 'recordedById', as: 'recordedBy' });
Student.hasMany(Payment, { foreignKey: 'studentId', as: 'payments' });

module.exports = {
  sequelize,
  User,
  Student,
  StudentEnrollment,
  Course,
  CourseInstructor,
  Batch,
  Enquiry,
  Payment,
};
