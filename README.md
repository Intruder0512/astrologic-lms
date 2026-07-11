# ICAS — Website & Backend (Phase 1 + Phase 2)

Full-stack Node.js/Express + MongoDB app for **ICAS**, a chapter
of the Indian Council of Astrological Sciences based at Purushottamanand
Ashram, Iradat Nagar, Hasanganj, Lucknow. Covers **Section 15, Phase 1**
(public website + admissions/enquiries/payments) and now **Phase 2**: course
content structure, Microsoft Teams live classes, a calendar, and email
notifications for schedule changes.

**Chapter scope, verified against the official ICAS registry**
(icasindia.org/ICAS/Centres.html): this chapter is registered to teach
**Jyotish Praveena and Jyotish Visharada only**, both online and in direct
classroom, coordinated by Shri Markandeya Shukla. Don't add other course
types without confirming this chapter has been registered to teach them.

## Phase 2: what's new

**Three account types, all functional now:**
- **Admin** — everything from Phase 1, plus creating/managing instructor
  accounts and a chapter-wide calendar view.
- **Instructor (teacher)** — a real dashboard (`/teacher-dashboard.html`):
  see assigned courses, schedule live classes (auto-creates a Teams meeting
  and emails the batch), take attendance, post announcements.
- **Student (learner)** — calendar of upcoming classes with one-click Teams
  join links, course content (modules/lessons), lesson completion tracking,
  announcements - all from the existing student dashboard plus the new
  `/calendar.html`.

**Microsoft Teams integration** (`src/services/msGraph.js`) — creates a real
Teams meeting via Microsoft Graph API when an instructor schedules a class.
Requires Azure AD app registration - see the setup steps in that file's
header comment. **Not configured yet? Nothing breaks** — classes still get
created and students still get emailed, just without an auto-generated Teams
link (same graceful-degradation pattern as Razorpay in Phase 1).

**Calendar** (`/calendar.html`) — role-aware: shows the logged-in user's
own classes (student: enrolled batches; instructor: courses they teach;
admin: everything). Month grid + upcoming agenda list, both pulling from
the same `LiveClass` data the scheduling flow creates.

**Email notifications, wired to real events** (not just Phase 1's admission
emails) — a class being scheduled, rescheduled, or cancelled all trigger an
email to every enrolled, batch-allocated student in that batch. Posting an
announcement does too. Uses the same SMTP config as Phase 1.


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
npm run seed:courses        # seeds Jyotish Praveena + Visharada (the only courses this chapter is officially registered to teach)
npm run dev                  # starts on http://localhost:5000 - visit / for the website
```

Requires a MongoDB connection string — for hosted deployment (e.g.
Hostinger's MongoDB Atlas connector), see the notes below. Locally or on any
other host, set `MONGODB_URI` (or `MONGO_URI`) directly in `.env`.

**Creating an instructor (teacher) account** — there's no self-signup for
this role by design. Log in as admin and call:
```bash
curl -X POST http://localhost:5000/api/admin/instructors \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shri Markandeya Shukla","email":"instructor@example.com","password":"ChangeMe@123","microsoftUpn":"instructor@yourtenant.onmicrosoft.com"}'
```
`microsoftUpn` is required for that instructor's live classes to get an
auto-created Teams link — see `src/services/msGraph.js` for the Azure AD
setup this depends on. Then use the admin panel (or a direct `PUT
/api/admin/courses/:id`) to add that instructor to the courses they teach.

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
  models/                 User, Student, Course, Batch, Enquiry, Payment,
                            CourseModule, Lesson, LiveClass, Announcement,
                            LessonProgress (Phase 2)
  middleware/              auth (JWT + role guard), requireDb, upload, errorHandler
  services/msGraph.js      Microsoft Teams meeting creation (Phase 2)
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
| GET | `/api/students/me/courses/:courseId/content` | Modules + lessons for an enrolled course (Phase 2) |
| POST | `/api/students/me/lessons/:id/complete` | Mark a lesson complete / submit quiz score (Phase 2) |
| GET | `/api/students/me/calendar` | Upcoming live classes across enrolled batches (Phase 2) |
| GET | `/api/students/me/announcements` | Announcements for enrolled courses (Phase 2) |
| POST | `/api/payments/create-order` | Create Razorpay order for fee/instalment |
| POST | `/api/payments/verify` | Verify payment signature client-side |

### Instructor / Teacher (JWT required, role=instructor) — Phase 2
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/teacher/courses` | Courses this instructor is assigned to |
| GET | `/api/teacher/courses/:courseId/batches` | Batches for a course they teach |
| POST/GET | `/api/teacher/courses/:courseId/modules` | Create / list modules |
| PUT/DELETE | `/api/teacher/modules/:id` | Update / delete a module |
| POST | `/api/teacher/modules/:moduleId/lessons` | Add a lesson (video/pdf/live_class/quiz/assignment/text/link) |
| PUT/DELETE | `/api/teacher/lessons/:id` | Update / delete a lesson |
| POST | `/api/teacher/live-classes` | Schedule a live class — creates Teams meeting + emails the batch |
| PUT | `/api/teacher/live-classes/:id` | Reschedule — updates Teams meeting + re-emails |
| DELETE | `/api/teacher/live-classes/:id` | Cancel — deletes Teams meeting + emails cancellation |
| GET | `/api/teacher/live-classes?from=&to=` | This instructor's calendar data |
| GET | `/api/teacher/live-classes/:id/roster` | Batch roster for attendance |
| POST | `/api/teacher/live-classes/:id/attendance` | Record attendance |
| POST | `/api/teacher/announcements` | Post + email an announcement |

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
| POST/GET/PUT | `/api/admin/instructors` | Create / list / update instructor (teacher) accounts (Phase 2) |
| GET | `/api/admin/calendar` | Chapter-wide calendar, every course/instructor (Phase 2) |

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
