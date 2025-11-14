
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// CORS (basic)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Static
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// Root -> login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- DB Setup ---
const dbFile = path.join(__dirname, "occ.db");
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    role TEXT DEFAULT 'student'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    category TEXT,
    instructor TEXT,
    duration INTEGER,
    description TEXT,
    total_modules INTEGER DEFAULT 8
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    user_id TEXT,
    course_id INTEGER,
    created_at TEXT,
    PRIMARY KEY(user_id, course_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT,
    course_id INTEGER,
    completed_modules INTEGER DEFAULT 0,
    percent INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, course_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS grades (
    user_id TEXT,
    course_id INTEGER,
    score INTEGER DEFAULT 0,
    released INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, course_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    course_id INTEGER,
    issued_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS certificates_custom (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    title TEXT,
    issuer TEXT,
    design TEXT,
    issued_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    message TEXT,
    created_at TEXT
  )`);

  // seed courses
  db.get(`SELECT COUNT(*) AS c FROM courses`, (err, row) => {
    if (row.c === 0) {
      const stmt = db.prepare(`INSERT INTO courses (title, category, instructor, duration, description, total_modules) VALUES (?,?,?,?,?,?)`);
      [
        ["Intro to Java", "Programming", "Dr. Kapoor", 20, "Learn Java basics to OOP.", 8],
        ["Data Structures", "CS Core", "Prof. Roy", 30, "Arrays, stacks, queues, trees, graphs.", 10],
        ["Web Dev Fundamentals", "Web", "A. Sen", 25, "HTML, CSS, JavaScript, responsive UI.", 9],
        ["AI for Beginners", "AI/ML", "Dr. Nandi", 15, "Foundations of AI and simple models.", 6]
      ].forEach(c => stmt.run(c));
      stmt.finalize();
    }
  });
});

// --- Utils ---
function authUser(req, res, next) {
  // For prototype: trust x-user-id header set by frontend (Clerk userId)
  const uid = req.headers["x-user-id"];
  if (!uid) return res.status(401).json({ error: "Missing x-user-id (Clerk userId)." });
  req.userId = uid;
  next();
}

function sendNotification(userId, type, message) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`INSERT INTO notifications (id, user_id, type, message, created_at) VALUES (?,?,?,?,?)`,
    [id, userId, type, message, now]);
  console.log(`[Notify:${type}] to ${userId}: ${message}`);
}

// --- User & Roles ---
app.post("/api/users/role", authUser, (req, res) => {
  const { role } = req.body;
  db.run(`INSERT INTO users (user_id, role) VALUES (?,?)
          ON CONFLICT(user_id) DO UPDATE SET role=excluded.role`, [req.userId, role], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, user_id: req.userId, role });
  });
});

app.get("/api/users/me", authUser, (req, res) => {
  db.get(`SELECT role FROM users WHERE user_id=?`, [req.userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ user_id: req.userId, role: row?.role || "student" });
  });
});

// --- Courses ---
app.get("/api/courses", (req, res) => {
  const { category, instructor, minDuration, maxDuration, q } = req.query;
  let base = `SELECT * FROM courses WHERE 1=1`;
  const params = [];
  if (category) { base += ` AND category LIKE ?`; params.push(`%${category}%`); }
  if (instructor) { base += ` AND instructor LIKE ?`; params.push(`%${instructor}%`); }
  if (minDuration) { base += ` AND duration >= ?`; params.push(Number(minDuration)); }
  if (maxDuration) { base += ` AND duration <= ?`; params.push(Number(maxDuration)); }
  if (q) { base += ` AND (title LIKE ? OR description LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  base += ` ORDER BY title`;
  db.all(base, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/courses/:id", (req, res) => {
  db.get(`SELECT * FROM courses WHERE id=?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Course not found" });
    res.json(row);
  });
});

app.post("/api/courses", authUser, (req, res) => {
  const { title, category, instructor, duration, description, total_modules } = req.body;
  db.run(`INSERT INTO courses (title, category, instructor, duration, description, total_modules) VALUES (?,?,?,?,?,?)`,
    [title, category, instructor, Number(duration || 0), description || "", Number(total_modules || 8)], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// --- Enrollment ---
app.post("/api/enroll", authUser, (req, res) => {
  const { course_id } = req.body;
  const now = new Date().toISOString();
  db.run(`INSERT OR IGNORE INTO enrollments (user_id, course_id, created_at) VALUES (?,?,?)`,
    [req.userId, course_id, now], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // init progress & grade rows
      db.run(`INSERT OR IGNORE INTO progress (user_id, course_id, completed_modules, percent) VALUES (?,?,0,0)`, [req.userId, course_id]);
      db.run(`INSERT OR IGNORE INTO grades (user_id, course_id, score, released) VALUES (?,?,0,0)`, [req.userId, course_id]);

      sendNotification(req.userId, "enrollment", `Enrollment confirmed for course ${course_id}`);
      res.json({ ok: true, message: "Enrollment successful. Confirmation notification created." });
    });
});

app.get("/api/notifications", authUser, (req, res) => {
  db.all(`SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50`, [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Progress ---
app.get("/api/progress/:courseId", authUser, (req, res) => {
  const { courseId } = req.params;
  db.get(`SELECT p.completed_modules, p.percent, c.total_modules
          FROM progress p JOIN courses c ON p.course_id=c.id
          WHERE p.user_id=? AND p.course_id=?`,
    [req.userId, courseId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json({ completed_modules: 0, percent: 0, total_modules: 0 });
      res.json(row);
    });
});

app.post("/api/progress/update", authUser, (req, res) => {
  const { course_id, completed_modules } = req.body;
  db.get(`SELECT total_modules FROM courses WHERE id=?`, [course_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Course not found" });
    const total = row.total_modules || 1;
    const comp = Math.max(0, Math.min(Number(completed_modules || 0), total));
    const percent = Math.round((comp / total) * 100);
    db.run(`INSERT INTO progress (user_id, course_id, completed_modules, percent)
            VALUES (?,?,?,?)
            ON CONFLICT(user_id, course_id) DO UPDATE SET completed_modules=excluded.completed_modules, percent=excluded.percent`,
      [req.userId, course_id, comp, percent], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true, completed_modules: comp, percent, total_modules: total });
      });
  });
});

// --- Assessments ---
const upload = multer({ dest: path.join(__dirname, "uploads") });

app.post("/api/assessments/submit", authUser, upload.single("file"), (req, res) => {
  // Simple scoring: if has answers, random score; else if file uploaded, set pending approval
  const { course_id, answers } = req.body;
  let score = 0;
  let released = 0;
  if (answers) {
    score = Math.floor(Math.random() * 21) + 80; // 80-100
    released = 1; // immediate scoring for MCQs
  } else if (req.file) {
    score = 0;
    released = 0; // needs instructor approval
  }
  // upsert
  db.run(`INSERT INTO grades (user_id, course_id, score, released)
          VALUES (?,?,?,?)
          ON CONFLICT(user_id, course_id) DO UPDATE SET score=excluded.score, released=excluded.released`,
    [req.userId, course_id, score, released], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, score, released });
    });
});

app.post("/api/grades/release", authUser, (req, res) => {
  // Instructors/admins would call this to release grades
  const { user_id, course_id } = req.body;
  db.run(`UPDATE grades SET released=1 WHERE user_id=? AND course_id=?`, [user_id, course_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.get("/api/grades/:courseId", authUser, (req, res) => {
  const { courseId } = req.params;
  db.get(`SELECT score, released FROM grades WHERE user_id=? AND course_id=?`,
    [req.userId, courseId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { score: 0, released: 0 });
    });
});

// --- Certificates ---
app.post("/api/certificates/custom", authUser, (req, res) => {
  const { name, title, issuer, design, date } = req.body;
  const id = require('uuid').v4();
  const issued = new Date(date || Date.now()).toISOString();
  db.run(`INSERT INTO certificates_custom (id, user_id, name, title, issuer, design, issued_at) VALUES (?,?,?,?,?,?,?)`,
    [id, req.userId, name || '', title || '', issuer || '', design || 'simple', issued], (err)=>{
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, certId: id, issued_at: issued, custom: true });
    });
});

app.post("/api/certificates/generate", authUser, (req, res) => {
  const { course_id } = req.body;
  // Ensure progress 100%
  db.get(`SELECT percent FROM progress WHERE user_id=? AND course_id=?`, [req.userId, course_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.percent < 100) return res.status(400).json({ error: "Course not completed" });
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(`INSERT INTO certificates (id, user_id, course_id, issued_at) VALUES (?,?,?,?)`,
      [id, req.userId, course_id, now], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ok: true, certId: id, issued_at: now });
      });
  });
});

app.get("/api/certificates/:id", (req, res) => {
  const id = req.params.id;
  // Try standard certificates first
  db.get(`SELECT c.id, c.issued_at, crs.title AS course, u.role, c.user_id
          FROM certificates c
          JOIN courses crs ON c.course_id=crs.id
          LEFT JOIN users u ON c.user_id=u.user_id
          WHERE c.id=?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.json(row);
    // Try custom certificates
    db.get(`SELECT id, issued_at, title AS course, user_id, name, issuer, design
            FROM certificates_custom WHERE id=?`, [id], (err2, row2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!row2) return res.status(404).json({ error: "Certificate not found" });
      res.json(row2);
    });
  });
});

// --- Admin listings ---
app.get("/api/admin/enrollments", (req, res) => {
  db.all(`SELECT e.user_id, e.course_id, e.created_at, c.title FROM enrollments e JOIN courses c ON e.course_id=c.id ORDER BY e.created_at DESC LIMIT 200`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Fallback to index
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
