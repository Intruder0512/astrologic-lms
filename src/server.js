require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { connectDB, isDbConnected } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const requireDb = require('./middleware/requireDb');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const app = express();

// Hostinger (and most managed hosts) sit behind a reverse proxy that sets
// X-Forwarded-For. Without this, express-rate-limit can't reliably identify
// clients and logs a validation warning on every rate-limited request.
app.set('trust proxy', 1);

connectDB();

// Scripts stay locked to same-origin (script-src 'self') - every page's JS
// lives in external files under /assets/js, not inline <script> blocks, so
// this is the strict default and nothing needed loosening for it. Styles
// and fonts need explicit allowances for the two things this design uses:
// inline style="" attributes throughout the markup, and Google Fonts.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve the public-facing website (HTML/CSS/JS). Mounted before the API
// routes so a request for e.g. /index.html never reaches them, and before
// the rate limiters below so static assets aren't subject to API limits.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Basic rate limiting on public-facing endpoints (enquiries, auth) to reduce spam/abuse
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', publicLimiter);
app.use('/api/enquiries', publicLimiter);

// IMPORTANT: Razorpay webhook needs the raw request body to verify the HMAC
// signature, so it must be captured BEFORE express.json() parses the body.
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body; // Buffer, used in paymentController.razorpayWebhook
    req.body = JSON.parse(req.body.toString('utf8'));
    next();
  }
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded documents (Phase 1: local disk; move to S3/Blob before scaling - see middleware/upload.js)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Always responds, even if the database is down, so this can be used as a
// genuine uptime/health check independent of DB status.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ICAS API is running',
    phase: 2,
    database: isDbConnected() ? 'connected' : 'disconnected',
  });
});

// requireDb guards every route below this point - if MongoDB is down, these
// return a clean 503 instead of hanging or throwing a raw driver error,
// while the server process itself (and /api/health) stays up.
app.use('/api', requireDb);

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/faculty', facultyRoutes);

// JSON 404 for unmatched API routes; HTML 404 for everything else (a typo'd
// page URL, a stale link, etc.) - keeps the site itself from looking broken
// to a human visitor while API consumers still get a machine-readable 404.
app.use('/api', notFound);
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
