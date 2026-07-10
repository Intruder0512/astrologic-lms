const { isDbConnected } = require('../config/db');

// Guards routes that need the database. Returns a clean 503 immediately
// instead of letting a request hang (Mongoose buffering) or throw a raw
// driver error if the connection is down - paired with db.js's retry logic,
// this means the server itself stays up and keeps responding even during a
// database outage, and only DB-dependent routes are affected.
const requireDb = (req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again in a moment.',
    });
  }
  next();
};

module.exports = requireDb;
