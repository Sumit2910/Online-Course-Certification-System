const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const multer = require("multer");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// ---- MIDDLEWARE ----
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// CORS: allow a configurable list of origins (comma-separated in CORS_ORIGIN),
// falling back to "reflect the request origin" so the app works out of the box
// whether the frontend is served by this same server or a separate host.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"]
}));

// ---- UPLOADS (for assessment file submissions) ----
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

// ---- STATIC FRONTEND ----
// Serves everything in /public, including index.html at "/".
app.use(express.static(path.join(__dirname, "public")));

// ---- DATABASE SETUP ----
const dbFile = path.join(__dirname, "occ.db");
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      role TEXT DEFAULT 'student'
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      category TEXT,
      instructor TEXT,
      duration INTEGER,
      description TEXT,
      total_modules INTEGER DEFAULT 3
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      user_id TEXT,
      course_id INTEGER,
      created_at TEXT,
      PRIMARY KEY(user_id, course_id)
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS module_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      course_id INTEGER,
      module_id INTEGER,
      completed INTEGER DEFAULT 0
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT,
      course_id INTEGER,
      completed_modules INTEGER DEFAULT 0,
      percent INTEGER DEFAULT 0,
      PRIMARY KEY(user_id, course_id)
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS grades (
      user_id TEXT,
      course_id INTEGER,
      score INTEGER DEFAULT 0,
      released INTEGER DEFAULT 0,
      PRIMARY KEY(user_id, course_id)
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id INTEGER,
      issued_at TEXT
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS certificates_custom (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      title TEXT,
      issuer TEXT,
      design TEXT,
      issued_at TEXT
    )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      message TEXT,
      created_at TEXT
    )`);

  // SEED COURSES (only on a fresh database)
  db.get("SELECT COUNT(*) AS c FROM courses", (err, row) => {
    if (row && row.c === 0) {
      const stmt = db.prepare(
        `INSERT INTO courses (title, category, instructor, duration, description, total_modules)
         VALUES (?,?,?,?,?,?)`
      );
      [
        ["Intro to Java", "Programming", "Dr. Kapoor", 20, "Java basics to OOP.", 4],
        ["Data Structures", "CS Core", "Prof. Roy", 30, "Stacks, queues, trees.", 4],
        ["Web Dev Fundamentals", "Web", "A. Sen", 25, "HTML, CSS, JS.", 4],
        ["AI for Beginners", "AI/ML", "Dr. Nandi", 15, "Foundations of AI.", 3]
      ].forEach(c => stmt.run(c));
      stmt.finalize();
    }
  });
});

// ---- AUTH ----
// Prototype auth: the frontend sends whoever is "signed in" via x-user-id.
// There's no password/session verification behind it (see README), so this
// stays a demo, not production auth.
function authUser(req, res, next) {
  const uid = req.headers["x-user-id"];
  if (!uid) return res.status(401).json({ error: "Missing x-user-id" });
  req.userId = uid;
  next();
}

// Role check: looks up the role actually stored server-side for this user,
// rather than trusting anything the client claims about itself.
function requireRole(role) {
  return (req, res, next) => {
    db.get("SELECT role FROM users WHERE user_id=?", [req.userId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const actualRole = row?.role || "student";
      if (actualRole !== role) {
        return res.status(403).json({ error: `Requires ${role} role` });
      }
      next();
    });
  };
}

// ---- API ROUTES ----

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "OCC Backend Running" });
});

// USERS
app.post("/api/users/role", authUser, (req, res) => {
  const { role } = req.body;
  db.run(
    `INSERT INTO users (user_id, role)
     VALUES (?,?)
     ON CONFLICT(user_id) DO UPDATE SET role=excluded.role`,
    [req.userId, role],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, user_id: req.userId, role });
    }
  );
});

app.get("/api/users/me", authUser, (req, res) => {
  db.get(
    "SELECT role FROM users WHERE user_id=?",
    [req.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ user_id: req.userId, role: row?.role || "student" });
    }
  );
});

// COURSES
app.get("/api/courses", (req, res) => {
  const { category, instructor, minDuration, maxDuration, q } = req.query;
  const clauses = [];
  const params = [];

  if (category) { clauses.push("category = ?"); params.push(category); }
  if (instructor) { clauses.push("instructor = ?"); params.push(instructor); }
  if (minDuration) { clauses.push("duration >= ?"); params.push(Number(minDuration)); }
  if (maxDuration) { clauses.push("duration <= ?"); params.push(Number(maxDuration)); }
  if (q) {
    clauses.push("(title LIKE ? OR description LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  db.all(`SELECT * FROM courses ${where} ORDER BY title`, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/courses/:id", (req, res) => {
  db.get(
    "SELECT * FROM courses WHERE id=?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Course not found" });
      res.json(row);
    }
  );
});

// Admin: create a course
app.post("/api/courses", authUser, requireRole("admin"), (req, res) => {
  const { title, category, instructor, duration, description, total_modules } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  db.run(
    `INSERT INTO courses (title, category, instructor, duration, description, total_modules)
     VALUES (?,?,?,?,?,?)`,
    [title, category || "", instructor || "", Number(duration) || 0, description || "", Number(total_modules) || 3],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// ENROLLMENT
app.post("/api/enroll", authUser, (req, res) => {
  const now = new Date().toISOString();
  const courseId = req.body.course_id;

  db.run(
    `INSERT OR IGNORE INTO enrollments (user_id, course_id, created_at)
     VALUES (?,?,?)`,
    [req.userId, courseId, now],
    err => {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        `INSERT OR IGNORE INTO progress (user_id, course_id, completed_modules, percent)
         VALUES (?,?,0,0)`,
        [req.userId, courseId]
      );

      // Enrollment confirmation notification
      db.get("SELECT title FROM courses WHERE id=?", [courseId], (err2, course) => {
        db.run(
          `INSERT INTO notifications (id, user_id, type, message, created_at)
           VALUES (?,?,?,?,?)`,
          [
            uuidv4(),
            req.userId,
            "enrollment",
            `You're enrolled in ${course?.title || "a new course"}.`,
            now
          ]
        );
      });

      res.json({ ok: true });
    }
  );
});

// Admin: list all enrollments
app.get("/api/admin/enrollments", authUser, requireRole("admin"), (req, res) => {
  db.all(
    `SELECT e.user_id, e.course_id, c.title, e.created_at
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     ORDER BY e.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// MY COURSES
app.get("/api/my/courses", authUser, (req, res) => {
  db.all(
    `SELECT c.*, p.percent
     FROM enrollments e
     JOIN courses c ON e.course_id=c.id
     LEFT JOIN progress p ON p.course_id=c.id AND p.user_id=e.user_id
     WHERE e.user_id=?`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// NOTIFICATIONS
app.get("/api/notifications", authUser, (req, res) => {
  db.all(
    `SELECT id, type, message, created_at FROM notifications
     WHERE user_id=? ORDER BY created_at DESC LIMIT 20`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// MODULE COMPLETE
function recomputeCourseProgress(userId, courseId, cb) {
  db.get(
    "SELECT total_modules FROM courses WHERE id=?",
    [courseId],
    (err, row) => {
      if (err) return cb(err);
      const total = row.total_modules;
      db.get(
        `SELECT COUNT(*) AS c FROM module_progress 
         WHERE user_id=? AND course_id=? AND completed=1`,
        [userId, courseId],
        (err2, r2) => {
          if (err2) return cb(err2);
          const completed = r2.c;
          const percent = Math.round((completed / total) * 100);
          db.run(
            `INSERT INTO progress (user_id, course_id, completed_modules, percent)
             VALUES (?,?,?,?)
             ON CONFLICT(user_id,course_id)
             DO UPDATE SET completed_modules=excluded.completed_modules,
                           percent=excluded.percent`,
            [userId, courseId, completed, percent],
            err3 => cb(err3, { completed, percent, total })
          );
        }
      );
    }
  );
}

app.post("/api/module/complete", authUser, (req, res) => {
  const { course_id, module_id } = req.body;

  db.run(
    `INSERT OR REPLACE INTO module_progress (user_id, course_id, module_id, completed)
     VALUES (?,?,?,1)`,
    [req.userId, course_id, module_id],
    err => {
      if (err) return res.status(500).json({ error: err.message });

      recomputeCourseProgress(req.userId, course_id, (err2, stats) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true, stats });
      });
    }
  );
});

// ASSESSMENTS
// Accepts either a JSON quiz submission ({ course_id, answers }) or a
// multipart file upload (field name "file", plus a course_id form field).
// `upload.single` only engages for multipart/form-data requests; it passes
// JSON requests straight through.
const QUIZ_ANSWER_KEY = { q1: "a", q2: "b" };

app.post("/api/assessments/submit", authUser, upload.single("file"), (req, res) => {
  const courseId = Number(req.body.course_id);
  if (!courseId) return res.status(400).json({ error: "course_id is required" });

  const now = new Date().toISOString();

  if (req.file) {
    // File submission: held for instructor review, not auto-scored.
    db.run(
      `INSERT INTO grades (user_id, course_id, score, released)
       VALUES (?,?,0,0)
       ON CONFLICT(user_id, course_id) DO UPDATE SET score=0, released=0`,
      [req.userId, courseId],
      err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, released: false, message: "Submitted for instructor review." });
      }
    );
    return;
  }

  // Quiz submission: auto-graded immediately.
  let answers = req.body.answers;
  if (typeof answers === "string") {
    try { answers = JSON.parse(answers); } catch { answers = {}; }
  }
  answers = answers || {};

  const total = Object.keys(QUIZ_ANSWER_KEY).length;
  const correct = Object.entries(QUIZ_ANSWER_KEY).filter(
    ([q, a]) => answers[q] === a
  ).length;
  const score = Math.round((correct / total) * 100);

  db.run(
    `INSERT INTO grades (user_id, course_id, score, released)
     VALUES (?,?,?,1)
     ON CONFLICT(user_id, course_id) DO UPDATE SET score=excluded.score, released=1`,
    [req.userId, courseId, score],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, released: true, score });
    }
  );

  void now; // reserved for future use (e.g. submission history)
});

// GRADES
app.get("/api/grades/:courseId", authUser, (req, res) => {
  db.get(
    "SELECT score, released FROM grades WHERE user_id=? AND course_id=?",
    [req.userId, req.params.courseId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { score: 0, released: 0 });
    }
  );
});

// Admin/instructor: release a held grade
app.post("/api/grades/release", authUser, requireRole("admin"), (req, res) => {
  const { user_id, course_id, score } = req.body;
  if (!user_id || !course_id) {
    return res.status(400).json({ error: "user_id and course_id are required" });
  }

  db.run(
    `INSERT INTO grades (user_id, course_id, score, released)
     VALUES (?,?,?,1)
     ON CONFLICT(user_id, course_id) DO UPDATE SET released=1${score != null ? ", score=excluded.score" : ""}`,
    score != null ? [user_id, course_id, Number(score)] : [user_id, course_id, 0],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    }
  );
});

// CERTIFICATE GENERATION
app.post("/api/certificates/generate", authUser, (req, res) => {
  const { course_id } = req.body;

  db.get(
    "SELECT percent FROM progress WHERE user_id=? AND course_id=?",
    [req.userId, course_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row || row.percent < 100)
        return res.status(400).json({ error: "Course not completed" });

      const id = uuidv4();
      const now = new Date().toISOString();

      db.run(
        `INSERT INTO certificates (id, user_id, course_id, issued_at)
         VALUES (?,?,?,?)`,
        [id, req.userId, course_id, now],
        err2 => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ ok: true, certId: id, issued_at: now });
        }
      );
    }
  );
});

// CUSTOM CERTIFICATE (manual design/save)
app.post("/api/certificates/custom", authUser, (req, res) => {
  const { name, title, issuer, design } = req.body;

  if (!name || !title || !issuer || !design) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO certificates_custom (id, user_id, name, title, issuer, design, issued_at)
     VALUES (?,?,?,?,?,?,?)`,
    [id, req.userId, name, title, issuer, design, now],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, certId: id, issued_at: now });
    }
  );
});

// GET CERTIFICATE (checks both standard and custom tables)
app.get("/api/certificates/:id", (req, res) => {
  const certId = req.params.id;

  db.get(
    `SELECT id, user_id, course_id, issued_at FROM certificates WHERE id=?`,
    [certId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        return res.json({ type: "standard", ...row });
      }

      db.get(
        `SELECT id, user_id, name, title, issuer, design, issued_at
         FROM certificates_custom WHERE id=?`,
        [certId],
        (err2, row2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          if (row2) return res.json({ type: "custom", ...row2 });
          return res.status(404).json({ error: "Certificate not found" });
        }
      );
    }
  );
});

// ---- START SERVER ----
app.listen(PORT, "0.0.0.0", () => {
  console.log(`OCC server running on port ${PORT}`);
});
