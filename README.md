# Online Course Certification System — Prototype

A role-based course platform: catalog & filters, enrollment, module progress
tracking, quizzes + file-upload assignments with instructor-gated grading,
certificate generation with QR verification, and a customizable certificate
designer.

This is a fixed-up version of the original prototype — see **"What was fixed"**
below for the full list of bugs resolved to get it to a genuinely deployable
state. The tech stack is unchanged from the original.

## Tech Stack

- **Frontend**: HTML, CSS, vanilla JavaScript — multiple pages under `/public`
- **Backend**: Node.js + Express
- **Database**: SQLite (file-based, `occ.db`, auto-created on first run)
- **Auth**: a demo/prototype scheme — not Clerk, not real sessions (see below)

## How auth actually works (read this before you rely on it)

There's no password verification or real session system. "Signing in" just
stores an email in `localStorage` and derives a role from it:

- `user@admin.com` → admin
- `user@instructor.com` → instructor
- anything else → student

Every API request sends that email as an `x-user-id` header, and the backend
now checks the **stored role for that ID** (not whatever the client claims)
before allowing admin-only actions — but it still trusts that the header
itself hasn't been spoofed. This is fine for a portfolio demo; it is **not**
production-ready auth. If you want to harden this later, swap the
`x-user-id` header for real signed sessions or a provider like Clerk/Auth0
and verify tokens server-side in `authUser`/`requireRole`.

## Quick Start

```bash
npm install
npm run dev       # nodemon, auto-restarts on changes
# or
npm start         # plain node
```

Visit http://localhost:3000 — the backend now serves the frontend directly,
so there's nothing else to run.

**Demo logins** (use these emails on the login page, any password):
- `user@admin.com` — admin dashboard, course creation, grade release
- `user@instructor.com` — instructor dashboard
- any other email — student

## Deploy (Render — matches the original setup)

SQLite needs a real, persistent process (not a serverless function), so
Render's free web service tier is the natural fit:

1. Push this repo to GitHub.
2. Go to https://render.com/ → **New → Web Service** → connect the repo.
3. Render should auto-detect Node. If asked:
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`
4. No required environment variables. Optional: `CORS_ORIGIN` — a
   comma-separated list of allowed origins, only needed if you later split
   the frontend onto a different domain than the backend. Left unset, CORS
   reflects whatever origin makes the request, which is fine since frontend
   and backend are now the same origin.
5. Deploy. Your app will be live at `https://your-service.onrender.com`.

**Known limitation**: Render's free tier disk is ephemeral — `occ.db` and any
uploaded assignment files reset on redeploy or when the service spins down
from inactivity. Fine for a demo; for anything persistent, add a Render Disk
(paid) or move to a hosted DB (e.g. Postgres) later.

## What was fixed

This repo had a working idea with a few bugs that blocked real deployment:

1. **No single deployable unit** — the backend never served the frontend;
   they were meant to run on two separate hosts with a hardcoded URL between
   them. Backend now serves `/public` directly; `config.js`'s `API_BASE` is
   now a relative `/api`.
2. **CORS hardcoded to one Netlify domain** — replaced with an optional,
   configurable allowlist.
3. **`guard.js` / `auth.js` localStorage key mismatch** — route guarding
   (admin/instructor page protection) silently never worked because the two
   files read different key names. Fixed to match.
4. **Double `/api/` prefix bug in `admin.html`** — course creation,
   enrollment listing, and grade release all called
   `API.post('/api/...')` on top of an `API_BASE` that already ends in
   `/api`, producing 404s. Fixed.
5. **Missing `API_BASE` prefix in the assignment file upload** — it hit the
   frontend's own origin instead of the backend. Fixed.
6. **Course filters were collected by the UI but ignored by the backend** —
   `/api/courses` now actually filters by category, instructor, duration
   range, and search text.
7. **Assessments, grades, notifications, and several admin routes didn't
   exist server-side at all**, despite the frontend already calling them.
   Added: `POST /api/assessments/submit` (auto-graded quiz JSON, or a file
   upload via `multer` held for instructor review), `GET /api/grades/:id`,
   `POST /api/grades/release`, `GET /api/notifications` (plus an actual
   notification written on enrollment), `POST /api/courses`, and
   `GET /api/admin/enrollments`.
8. Added real server-side role checks (`requireRole`) instead of trusting
   the client, removed a dead duplicate `API` object, removed an unused
   `qrcode` dependency, and cleaned up stray/broken files
   (`server.js.bak`, `server.js.patched`, a committed prototype `occ.db`).

## API Overview

All routes are under `/api`. Endpoints marked 🔒 require an `x-user-id`
header; 🔒admin also requires that user's stored role to be `admin`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness check |
| POST | `/users/role` 🔒 | set the caller's role |
| GET | `/users/me` 🔒 | get the caller's role |
| GET | `/courses` | list, with optional `category`, `instructor`, `minDuration`, `maxDuration`, `q` |
| GET | `/courses/:id` | course detail |
| POST | `/courses` 🔒admin | create a course |
| POST | `/enroll` 🔒 | enroll in a course, writes a notification |
| GET | `/admin/enrollments` 🔒admin | all enrollments |
| GET | `/my/courses` 🔒 | caller's enrolled courses + progress |
| GET | `/notifications` 🔒 | caller's recent notifications |
| POST | `/module/complete` 🔒 | mark a module done, recomputes progress % |
| POST | `/assessments/submit` 🔒 | JSON quiz (auto-graded) or multipart file (pending review) |
| GET | `/grades/:courseId` 🔒 | caller's grade for a course |
| POST | `/grades/release` 🔒admin | release/set a held grade |
| POST | `/certificates/generate` 🔒 | requires 100% progress |
| POST | `/certificates/custom` 🔒 | designer-issued certificate |
| GET | `/certificates/:id` | public verification lookup |

## Project structure

```
server.js              # Express app: DB setup, all /api routes, static hosting
public/
  *.html                # one page per view
  js/
    config.js            # API_BASE
    api.js                # fetch wrapper (adds x-user-id header)
    auth.js               # demo login/logout/session restore
    guard.js              # page-level auth/role redirects
    app.js                # shared nav/loader helpers
    catalog.js, course.js, dashboard.js, module_viewer.js,
    certificates.js, designer.js, assessments.js
  css/, images/, templates/
uploads/                # assignment file submissions (gitignored, created at runtime)
occ.db                  # SQLite file (gitignored, created at runtime)
```

## Possible next steps

- Replace the demo auth with real sessions or a provider (Clerk, Auth0)
- Move off SQLite to Postgres for a host with ephemeral disks
- Add pagination to `/api/courses` and `/api/admin/enrollments`
- Build a real peer-review flow for assignment grading (currently: single
  instructor release)

## License

MIT.
