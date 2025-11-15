
// /public/js/catalog.js - patched

if (typeof API_BASE === "undefined") {
    console.error("API_BASE not loaded!");
}

async function loadCatalog(ev) {
  if (ev) ev.preventDefault();

  const mount = qs("#catalog");
  if (!mount) return;

  const params = new URLSearchParams();

  const catEl = qs("#fCategory");
  const instEl = qs("#fInstructor");
  const minEl = qs("#fMin");
  const maxEl = qs("#fMax");
  const qEl   = qs("#fQ");

  const category   = catEl ? catEl.value.trim() : "";
  const instructor = instEl ? instEl.value.trim() : "";
  const minD       = minEl ? minEl.value.trim() : "";
  const maxD       = maxEl ? maxEl.value.trim() : "";
  const q          = qEl ? qEl.value.trim() : "";

  if (category)   params.set("category", category);
  if (instructor) params.set("instructor", instructor);
  if (minD)       params.set("minDuration", minD);
  if (maxD)       params.set("maxDuration", maxD);
  if (q)          params.set("q", q);

  const query = params.toString();
  const url = "/courses/" + (query ? "?" + query : "");

  console.log("Calling URL:", API_BASE + url);

  try {
    if (window.showLoader) window.showLoader();

    const data = await API.get(url);

    if (window.hideLoader) window.hideLoader();

    console.log("Courses data:", data);

    if (!data || !Array.isArray(data) || data.length === 0) {
      mount.innerHTML = `
        <p class="small" style="opacity:.7;">
          No courses match your filters.
        </p>
      `;
      return;
    }

    mount.innerHTML = data.map(c => `
      <div class="card">
        <div class="badge">${c.category || "General"}</div>
        <h3>${c.title}</h3>
        <div class="meta">
          By ${c.instructor || "TBA"} • ${c.duration || 0} hrs • ${c.total_modules || 0} modules
        </div>
        <p class="small">${c.description || ""}</p>
        <div style="display:flex;gap:8px;margin-top:8px">
          <a class="btn" href="/course.html?id=${c.id}">View</a>
          <button class="btn secondary" type="button" onclick="enroll(${c.id})">Enroll</button>
        </div>
      </div>
    `).join("");

  } catch (e) {
    if (window.hideLoader) window.hideLoader();
    console.error("Error in loadCatalog:", e);
    mount.innerHTML = `
      <p class="small" style="color:#f87171;">
        Failed to load courses. Please try again.
      </p>
    `;
  }
}

async function enroll(course_id) {
  if (!window.userId) {
    localStorage.setItem("redirect_after_login", "/course.html?id=" + course_id);
    if (window.showLoader) window.showLoader();
    location.href = "/login.html";
    return;
  }

  try {
    if (window.showLoader) window.showLoader();
    const res = await API.post("/api/enroll", { course_id });
    if (window.hideLoader) window.hideLoader();

    if (res && res.ok) {
      alert("Enrolled successfully! You can track progress in your dashboard.");
    } else {
      alert(res?.error || "Failed to enroll.");
    }
  } catch (e) {
    if (window.hideLoader) window.hideLoader();
    console.error(e);
    alert("Failed to enroll.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  qsa("#fCategory, #fInstructor, #fMin, #fMax, #fQ").forEach(i => {
    if(i) i.addEventListener("change", loadCatalog);
  });

  const searchBtn = qs("#searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", loadCatalog);
  }

  loadCatalog();
});
