
# Online Course Certification System — Prototype

A professional prototype implementing:
1) Role-based login/signup (via Clerk on the frontend; backend stores roles)  
2) Course catalog & filters (category, instructor, duration)  
3) Enrollment confirmation notification (logged + visible in UI; plug real email/SMS later)  
4) Progress tracking with completion bars and module indicators  
5) Assessments (quizzes + file upload) and peer review placeholder  
6) Grade visibility (immediate vs after instructor approval)  
7) Certificate generation (unique ID + QR)  
8) Customizable certificate creation (several designs) with on-site verification

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla). Multiple pages in `/public` with a shared `styles.css`.
- **Auth**: **Clerk** (frontend). Set your publishable key in `public/js/auth.js`.
- **Backend**: Node.js + Express + SQLite (file DB `occ.db` auto-created).

## Quick Start
```bash
cd occ-prototype
npm install
npm run start
# visit http://localhost:3000
```

## Configure Clerk (required for real login/signup)
Edit `public/js/auth.js`:
- Replace `YOUR_CLERK_PUBLISHABLE_KEY` with your key.
- Replace `your-domain.clerk.accounts` if needed (or keep the default loader).

Protected pages check `window.Clerk`. For local demo without keys, toggle `const DEMO_MODE = true` in `public/js/auth.js` to bypass Clerk for exploration (not secure).

## Email/SMS
`Enrollment` creates a dev notification entry viewable on the Dashboard (and logs to server). Replace the `sendNotification()` function in `server.js` with Twilio/SendGrid in production.

## Certificate Verification
Each certificate has a unique ID + QR code. Shareable verify link:
```
/verify.html?certId=<ID>
```
This page checks against the backend `/api/certificates/:id`.

## Admin Role
The `admin.html` page shows simple controls for instructors/admins (create courses, approve grades). Assign your role once after login at `/signup.html` or via the dashboard role selector.

---

© 2025
"# Online-Course-Certification-System" 
