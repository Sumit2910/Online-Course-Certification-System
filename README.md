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

## Quick Start

```bash
npm install
npm run dev       # nodemon, auto-restarts on changes
# or
npm start         # plain node
```

Visit http://localhost:3000 — the backend now serves the frontend directly,
so there's nothing else to run.

or visit *https://certifykaro.onrender.com* to get a live experience

**Demo logins** (use these emails on the login page, any password):
- `user@admin.com` — admin dashboard, course creation, grade release
- `user@instructor.com` — instructor dashboard
- any other email — student

## License

MIT.
