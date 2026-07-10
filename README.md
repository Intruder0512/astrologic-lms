# ICAS AstroLogic Chapter — Website & Backend (Phase 1)

Full-stack Node.js/Express + MongoDB app covering **Section 15, Phase 1** of
the project spec: a public marketing website matching ICAS Lucknow's
structure and course catalogue, plus the admissions/enquiries/payments
backend behind it.

Live classes (Section 5.5, using **Microsoft Teams** per your requirement) and
the full curriculum/video/PDF LMS (Section 5.2–5.8) are **Phase 2** — not in
this delivery.

## What's included

**Public website** (`/public`) — Home, Courses (live-filtered catalogue),
Course detail, Who We Are, Contact/Enquiry, Register, Log In, Student
Dashboard, Policies. Design is a custom system grounded in the chapter's own
emblem (vermillion/marigold/indigo palette) and Vedic astrology's own
geometry (the kundli chart's diamond-in-square as a recurring structural
motif) — not a generic template. Served as static files by the same Express
app, same-origin, so there's no CORS or separate deployment to manage.

**Backend API** — auth, course catalogue, student registration + document
upload, Razorpay payments, admin approval workflow, admin dashboard metrics.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth (roles: `admin`, `instructor`, `student`)
- Multer (local disk in Phase 1 — swap for S3/Blob before production scale)
- Razorpay (order creation, client-side signature verification, webhook) —
  lazily initialized, so missing keys degrade gracefully instead of crashing
  the app on boot
- Nodemailer (SMTP transactional email)
- Vanilla HTML/CSS/JS frontend (no build step, no framework) — fetches from
  the same-origin `/api` at runtime

## Setup

```bash
cd astrologic-lms
cp .env.example .env      # fill in real values (MONGODB_URI, JWT_SECRET, etc.)
npm install
npm run seed               # creates the first admin user from .env
npm run seed:courses        # seeds the 7-course ICAS catalogue (Jyotish/Vastu/Nakshatra ladder)
npm run dev                  # starts on http://localhost:5000 - visit / for the website
```

Requires a MongoDB connection string — for hosted deployment (e.g.
Hostinger's MongoDB Atlas connector), see the notes below. Locally or on any
other host, set `MONGODB_URI` (or `MONGO_URI`) directly in `.env`.

## Project structure

```
public/
  index.html, courses.html, course.html, about.html, contact.html,
  register.html, login.html, dashboard.html, policies.html, 404.html
  assets/
    css/styles.css       design system (tokens + components)
    js/api.js             same-origin API client, auth token storage
    js/main.js             nav toggle, header auth state, footer year
    js/page-*.js            one file per page's specific logic
    logo.png                your ICAS emblem
src/
  config/db.js            MongoDB connection (retry-with-backoff, no crash)
  models/                 User, Student, Course, Batch, Enquiry, Payment
  middleware/              auth (JWT + role guard), requireDb, upload, errorHandler
  controllers/              business logic per resource
  routes/                    Express routers, mounted in server.js
  utils/                     token generation, email templates, seed scripts
  server.js                app entrypoint - serves /public AND /api
```

## API summary

### Public
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Student self-registration |
| POST | `/api/auth/login` | Login (any role) |
| GET | `/api/courses` | Catalogue with filters (category, level, mode, language, instructor, certification, search) |
| GET | `/api/courses/:slug` | Course detail + upcoming batches |
| POST | `/api/enquiries` | Public enquiry form |
| POST | `/api/payments/webhook` | Razorpay server-to-server webhook |

### Student (JWT required, role=student)
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Own profile |
| PUT | `/api/students/me` | Update profile fields |
| POST | `/api/students/me/documents` | Upload a document (multipart, field `document`, body `type`) |
| POST | `/api/students/me/register-interest` | Register interest in a course/batch |
| GET | `/api/students/me/dashboard` | Dashboard summary (Section 8) |
| POST | `/api/payments/create-order` | Create Razorpay order for fee/instalment |
| POST | `/api/payments/verify` | Verify payment signature client-side |

### Admin (JWT required, role=admin)
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/dashboard` | Metrics (Section 9.1) |
| GET/POST/PUT/DELETE | `/api/admin/courses` | Course CRUD |
| POST | `/api/admin/batches` | Create batch |
| GET | `/api/admin/students` | List applications, filter by admissionStatus |
| PUT | `/api/admin/students/:id/review` | Approve / reject / request correction |
| PUT | `/api/admin/students/:id/allocate-batch` | Allocate approved student to a batch |
| GET/PUT | `/api/admin/enquiries` | Lead list + status/assignment updates |
| POST | `/api/admin/payments/offline` | Record cash/bank-transfer payment |

## Admission workflow (matches Section 6.2)

```
register (auth) → register-interest (course) → upload documents
  → under_verification → payment → admin review (approve/reject)
  → allocate-batch → batch_allocated → LMS access (Phase 2)
```

## Notes before production

- **File storage**: `middleware/upload.js` uses local disk. Move to S3/Azure
  Blob before deploying anywhere with an ephemeral filesystem.
- **Razorpay webhook**: needs the *raw* request body for signature
  verification — already wired correctly in `server.js` (mounted before
  `express.json()`). Don't reorder that.
- **Email**: swap in real SMTP credentials; failures are logged, not thrown,
  so a broken mailer won't block registrations/payments.
- **Rate limiting**: basic limiter on `/api/auth` and `/api/enquiries` only —
  tune for production traffic.
