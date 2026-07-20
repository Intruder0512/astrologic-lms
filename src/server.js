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

// Canonical domain enforcement (301, permanent): redirect www -> non-www and
// http -> https. Without this, search engines see icaslucknow.com,
// www.icaslucknow.com, and the http:// versions of both as four separate
// sites with identical content, splitting ranking signals across all of
// them instead of consolidating on one. Every canonical URL, sitemap entry,
// and structured data reference in this codebase already assumes
// https://icaslucknow.com (non-www) as the one true form - this middleware
// is what actually enforces that at the server level instead of just
// hoping nobody links to the www version.
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();

  const host = req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const isWww = host.startsWith('www.');
  const isInsecure = proto !== 'https';

  if (isWww || isInsecure) {
    const canonicalHost = isWww ? host.slice(4) : host;
    return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
  }
  next();
});

connectDB();

// Scripts stay locked to same-origin (script-src 'self') - every page's JS
// lives in external files under /assets/js, not inline <script> blocks, so
// this is the strict default and nothing needed loosening for it. Styles
// and fonts need explicit allowances for the two things this design uses:
// inline style="" attributes throughout the markup, and Google Fonts.
// frame-src allows the Google Maps embed on the contact page - without it,
// the browser silently blocks the iframe (no console-visible breakage on
// the page itself, just an empty box), since frame-src falls back to
// default-src 'self' when not set explicitly.
//
// The three sha256 hashes below allowlist the site's inline JSON-LD
// structured data blocks (EducationalOrganization on index/about/contact,
// FAQPage on index, Course listing on courses.html) WITHOUT weakening
// script-src with 'unsafe-inline'. Hash-based CSP only matches the exact
// byte content of each block - if that content changes, its hash must be
// recomputed here too, or the structured data will silently stop rendering
// (no visible page breakage, since JSON-LD is inert data, but Google will
// stop seeing it). Recompute with:
//   python3 -c "import hashlib,base64; print(base64.b64encode(hashlib.sha256(open('block.txt','rb').read()).digest()).decode())"
// where block.txt is the exact content between the <script> tags (not
// including the tags themselves).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: [
          "'self'",
          "'sha256-O9tVuBDBpCVcZydpdqvKsoUmCR41LM1KSESV1dItS98='", // EducationalOrganization (index/about/contact) - updated when og-image.png became og-image.jpg
          "'sha256-BOIebiZZqiEyvM6yMBf8p1inKL/a06LuIW/LuEHElkw='", // FAQPage (index)
          "'sha256-jpqrsJNo+sNyMcLVX0wxiLYJxKNuJMF2KBbKge7o0P8='", // Course listing (courses.html)
          "'sha256-o774MftrJy6Z0Y+9OSxEy6ygrKRFvNjWNIx4B7wjSak='", // Async font-loading swap script (all pages)
        ],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", 'https://www.google.com'],
      },
    },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve the public-facing website (HTML/CSS/JS). Mounted before the API
// routes so a request for e.g. /index.html never reaches them, and before
// the rate limiters below so static assets aren't subject to API limits.
//
// Cache-Control is deliberately different for HTML vs everything else:
// HTML pages get a short cache (60s) since their content changes often and
// this project has already been bitten once by a caching layer serving
// stale HTML after a deploy. CSS/JS/images get a long cache (30 days) -
// CSS/JS are safe to cache hard because they're loaded with a version
// query string (?v=...) that changes whenever the file does, and images
// are safe because this codebase renames image files rather than
// overwriting them in place when content changes (see the SEO image
// rename from earlier).
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      }
    },
  })
);

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
