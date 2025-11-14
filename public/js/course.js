// -----------------------------
// /public/js/course.js  (FIXED FOR RENDER DEPLOYMENT)
// -----------------------------

// Fallback module lists
const FALLBACK_MODULES = {
  "1": [
    { id: 1, title: "Introduction & Course Overview", duration: "15 min", desc: "Welcome and course roadmap." },
    { id: 2, title: "Java Basics: Variables & Data Types", duration: "30 min", desc: "Primitive types, variables, input/output." },
    { id: 3, title: "Control Structures & Loops", duration: "40 min", desc: "If/else, loops, nested structures." }
  ],
  "2": [
    { id: 1, title: "Complexity Analysis Recap", duration: "20 min", desc: "Big-O basics." },
    { id: 2, title: "Arrays & Linked Lists", duration: "40 min", desc: "Sequential structures." },
    { id: 3, title: "Stacks & Queues", duration: "40 min", desc: "Operations and applications." }
  ],
  "3": [
    { id: 1, title: "HTML Basics", duration: "30 min", desc: "Elements, tags, structure." },
    { id: 2, title: "CSS Layout", duration: "40 min", desc: "Selectors, flexbox, grid." },
    { id: 3, title: "JavaScript Basics", duration: "45 min", desc: "DOM, events, functions." }
  ],
  "_default": [
    { id: 1, title: "Module 1: Overview", duration: "20 min", desc: "General intro." },
    { id: 2, title: "Module 2: Core Concepts", duration: "30 min", desc: "Theory + ideas." },
    { id: 3, title: "Module 3: Practice", duration: "40 min", desc: "Hands-on exercises." }
  ]
};

// URL helpers
function getCourseIdFromUrl() {
  return new URLSearchParams(location.search).get("id");
}

function updateProgressBar(total, done) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  qs("#pLabel").textContent = percent + "%";
  qs(".progress div").style.width = percent + "%";
}

// Render module cards
function renderModules(modules, completedSet, courseId) {
  const wrap = qs("#moduleList");
  wrap.innerHTML = modules.map(m => `
    <div class="module-card ${completedSet.has(m.id) ? "done" : ""}">
      <div class="module-header">
        <div>
          <div class="module-title">${m.title}</div>
          <div class="module-duration">${m.duration}</div>
        </div>

        <button class="btnOpenModule btn small"
                data-course="${courseId}"
                data-module="${m.id}">
          ${completedSet.has(m.id) ? "Review" : "Open"}
        </button>
      </div>

      <div class="module-body">
        <p>${m.desc}</p>
      </div>
    </div>
  `).join("");

  // Click → open module viewer
  qsa(".btnOpenModule").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.setItem("lastModules", JSON.stringify(modules));
      location.href = `/module.html?course=${courseId}&module=${btn.dataset.module}`;
    });
  });
}

// Main loader
async function loadCoursePage() {
  const id = getCourseIdFromUrl();
  if (!id) return alert("Invalid course");

  try {
    window.showLoader();

    // 1. Fetch course info
    const course = await API.get("/api/courses/" + id);

    qs("#courseTitle").textContent = course.title;
    qs("#courseMeta").textContent =
      `${course.category} • ${course.instructor} • ${course.duration} hrs`;
    qs("#courseDesc").textContent = course.description;

    // 2. Load modules (no module list exists in DB, so fallback)
    let modules = FALLBACK_MODULES[id] || FALLBACK_MODULES["_default"];

    // 3. Fetch completed module IDs
    let completedSet = new Set();
    try {
      const prog = await API.get("/api/progress/" + id);
      // Render backend returns:
      // { completed_modules, percent, total_modules }
      // → so use module_progress endpoint instead
      const mp = await API.get("/api/progress/" + id.replace("/progress/", "/progress/"));
    } catch { }

    // BETTER: Direct fetch completed module list
    try {
      const raw = await API.get("/api/progress/" + id);
      // But your backend progress endpoint doesn't return module list,
      // so use /api/progress/:courseId (first version)
      const list = await API.get("/api/progress/" + id);
      if (list.progress) {
        completedSet = new Set(list.progress.map(p => p.module_id));
      }
    } catch { }

    // 4. Render UI
    renderModules(modules, completedSet, id);
    updateProgressBar(modules.length, completedSet.size);

  } catch (err) {
    console.error(err);
    alert("Failed to load course.");
  } finally {
    window.hideLoader();
  }
}

document.addEventListener("DOMContentLoaded", loadCoursePage);
