# ICAS AstroLogic Chapter — Backend (Phase 1: Website & Admissions)

Custom Node.js backend covering **Section 15, Phase 1** of the project spec:
public course catalogue, enquiries, student registration + document upload,
Razorpay payments, admin approval workflow, and admin dashboard metrics.

Live classes (Section 5.5, using **Microsoft Teams** per your requirement) and
the full curriculum/video/PDF LMS (Section 5.2–5.8) are **Phase 2** — not in
this delivery. Say the word and I'll build that next on top of this
foundation (it will need a `Course Content` model, Microsoft Graph API
integration for Teams meeting creation, and student-facing lesson routes).

## Stack

- Node.js + Express
- MySQL + Sequelize ORM
- JWT auth (roles: `admin`, `instructor`, `student`)
- Multer (local disk in Phase 1 — swap for S3/Blob before production scale)
- Razorpay (order creation, client-side signature verification, webhook)
- Nodemailer (SMTP transactional email)

## Setup

```bash
cd astrologic-lms
cp .env.example .env      # fill in real values (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, etc.)
npm install
npm run seed               # creates the first admin user from .env
npm run dev                 # starts on http://localhost:5000
```

Requires a MySQL database — on Hostinger, create one under **Databases → MySQL Databases**
and copy the database name, username, and password into `.env`. `DB_HOST` is
usually `localhost` for same-server hosting.

In development, `NODE_ENV !== 'production'` triggers `sequelize.sync({ alter: true })`
on boot, which auto-creates/updates tables from the models — no manual SQL needed to
get started. For production, switch to proper `sequelize-cli` migrations instead of
relying on `alter: true`, since it can make destructive changes on complex schema
diffs.

## Project structure

```
src/
  config/db.js            MongoDB connection
  models/                 User, Student, Course, Batch, Enquiry, Payment
  middleware/              auth (JWT + role guard), upload (Multer), errorHandler
  controllers/              business logic per resource
  routes/                    Express routers, mounted in server.js
  utils/                     token generation, email templates, admin seed script
  server.js                app entrypoint
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
- **Database sync**: `sequelize.sync({ alter: true })` only runs when
  `NODE_ENV !== 'production'`. Set `NODE_ENV=production` on Hostinger and use
  migrations instead, or the app will skip auto-sync and expect tables to
  already exist — run the sync once manually (temporarily set `NODE_ENV=development`,
  boot once, then switch back) or set up `sequelize-cli` migrations properly.
- **Nested data as JSON columns**: fields like `Course.syllabus`,
  `Course.faqs`, `Student.documents`, and `Enquiry.followUpNotes` are stored
  as MySQL JSON columns rather than separate tables, matching the nested
  structure from the original spec. This keeps the schema close to the
  Mongoose version but means you can't query *inside* them with SQL `WHERE`
  clauses — fine for Phase 1's access patterns, worth revisiting if reporting
  needs grow in Phase 3.

## Verified locally

This version was tested end-to-end against a real MySQL instance (registration,
login, admin course creation with auto-slug, catalogue filters, course detail,
public enquiries, student registration → dashboard flow) before being pushed —
not just syntax-checked.
