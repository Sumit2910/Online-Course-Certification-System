
// /public/js/course.js - patched for API_BASE and modules mapping

const FALLBACK_MODULES = {
  "1": [
    { id: 1, title: "Introduction & Course Overview", duration: "15 min", desc: "Welcome and course roadmap." },
    { id: 2, title: "Java Basics: Variables & Data Types", duration: "30 min", desc: "Primitive types, variables, input/output." },
    { id: 3, title: "Control Structures & Loops", duration: "40 min", desc: "If/else, loops, nested structures." },
    { id: 4, title: "Object-Oriented Concepts", duration: "45 min", desc: "Classes, objects, inheritance, polymorphism." }
  ],
  "2": [
    { id: 1, title: "Complexity Analysis Recap", duration: "20 min", desc: "Big-O basics and algorithm efficiency." },
    { id: 2, title: "Arrays, Linked Lists & Strings", duration: "40 min", desc: "Sequential structures & memory layout." },
    { id: 3, title: "Stacks & Queues", duration: "40 min", desc: "LIFO/FIFO, operations, use-cases." },
    { id: 4, title: "Trees, Graphs & Applications", duration: "50 min", desc: "Tree/graph traversal and applications." }
  ],
  "3": [
    { id: 1, title: "HTML Basics & Page Structure", duration: "30 min", desc: "Elements, tags, semantic layout." },
    { id: 2, title: "CSS Fundamentals & Layout", duration: "40 min", desc: "Selectors, flexbox, grid." },
    { id: 3, title: "JavaScript Basics", duration: "45 min", desc: "Functions, DOM, events." },
    { id: 4, title: "Responsive Mini Project", duration: "60 min", desc: "Build a responsive page end-to-end." }
  ],
  "_default": [
    { id: 1, title: "Module 1: Overview", duration: "20 min", desc: "General introduction and objectives." },
    { id: 2, title: "Module 2: Core Concepts", duration: "30 min", desc: "Theory + core ideas." },
    { id: 3, title: "Module 3: Practice", duration: "40 min", desc: "Hands-on exercises." }
  ]
};

function getCourseIdFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("id");
}

function updateProgressBar(total, done) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const label = document.getElementById("pLabel");
  const bar = document.querySelector(".progress div");
  if (label) label.textContent = percent + "%";
  if (bar) bar.style.width = percent + "%";
}

// Render module cards
function renderModules(modules, completed = new Set(), courseId) {
  const wrap = document.getElementById("moduleList");
  if (!wrap) return;

  if (!modules || !modules.length) {
    wrap.innerHTML = `<p class="small">No modules are available for this course.</p>`;
    return;
  }

  wrap.innerHTML = modules
    .map(
      (m, i) => `
        <div class="module-card ${completed.has(m.id) ? "done" : ""}">
          <div class="module-header">
            <div>
              <div class="module-number">Module ${i + 1}</div>
              <div class="module-title">${m.title}</div>
              <div class="module-duration">${m.duration || ""}</div>
            </div>

            <div style="display:flex;align-items:center;gap:10px;">
              ${
                completed.has(m.id)
                  ? `<span class="module-check">✔</span>`
                  : ``
              }
              <button class="module-toggle">▶</button>
            </div>
          </div>

          <div class="module-body">
            <p class="small">${m.desc || "This module covers essential topics."}</p>

            <button 
              class="btn secondary small btnOpenModule"
              data-course="${courseId}"
              data-module="${m.id}"
            >
              View Module
            </button>
          </div>
        </div>
      `
    )
    .join("");

  // Expand / collapse behaviour
  document.querySelectorAll(".module-card").forEach((card) => {
    const toggle = card.querySelector(".module-toggle");
    const body = card.querySelector(".module-body");

    toggle.addEventListener("click", () => {
      card.classList.toggle("open");

      if (card.classList.contains("open")) {
        body.style.maxHeight = body.scrollHeight + "px";
        toggle.style.transform = "rotate(90deg)";
      } else {
        body.style.maxHeight = 0;
        toggle.style.transform = "rotate(0deg)";
      }
    });
  });

  // Module viewer navigation
  document.querySelectorAll(".btnOpenModule").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cId = btn.dataset.course;
      const mId = btn.dataset.module;

      // Save module list for viewer page
      localStorage.setItem("lastModules", JSON.stringify(modules));

      if (window.showLoader) window.showLoader();
      location.href = `/module.html?course=${cId}&module=${mId}`;
    });
  });
}

// Main loader
async function loadCoursePage() {
  const id = getCourseIdFromUrl();
  if (!id) {
    alert("No course selected");
    return;
  }

  try {
    if (window.showLoader) window.showLoader();
    const course = await API.get("/courses/" + id);
    if (window.hideLoader) window.hideLoader();

    // Fill header info
    const titleEl = document.getElementById("courseTitle");
    const metaEl = document.getElementById("courseMeta");
    const descEl = document.getElementById("courseDesc");

    if (titleEl) titleEl.textContent = course.title || "Course";
    if (metaEl)
      metaEl.textContent =
        (course.category || "") +
        (course.instructor ? " • " + course.instructor : "") +
        (course.duration ? " • " + course.duration + " hrs" : "");
    if (descEl) descEl.textContent = course.description || "No description available.";

    // Get modules: from API if present, otherwise fallback
    let modules = course.modules;
    if (!modules || !modules.length) {
      modules = FALLBACK_MODULES[String(course.id)] || FALLBACK_MODULES["_default"];
    }

    // Try to fetch progress; fail gracefully if API not implemented
    let completed = new Set();
    try {
      const prog = await API.get("/progress/" + course.id);
      if (prog && Array.isArray(prog.progress)) {
        completed = new Set(prog.progress.map((p) => p.module_id));
      }
    } catch (err) {
      // No progress API / error → treat as no modules completed
      completed = new Set();
    }

    // Save modules for module viewer
    localStorage.setItem("lastModules", JSON.stringify(modules));

    // Render UI
    renderModules(modules, completed, course.id);
    updateProgressBar(modules.length, completed.size);
  } catch (e) {
    if (window.hideLoader) window.hideLoader();
    console.error(e);
    alert("Failed to load course details.");
  }
}

document.addEventListener("DOMContentLoaded", loadCoursePage);
