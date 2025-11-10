
async function loadCatalog(){
  const params = new URLSearchParams();
  const category = qs("#fCategory").value;
  const instructor = qs("#fInstructor").value;
  const minD = qs("#fMin").value;
  const maxD = qs("#fMax").value;
  const q = qs("#fQ").value;

  if (category) params.set("category", category);
  if (instructor) params.set("instructor", instructor);
  if (minD) params.set("minDuration", minD);
  if (maxD) params.set("maxDuration", maxD);
  if (q) params.set("q", q);

  const data = await API.get("/api/courses?" + params.toString());
  const mount = qs("#catalog");
  mount.innerHTML = data.map(c => `
    <div class="card">
      <div class="badge">${c.category}</div>
      <h3>${c.title}</h3>
      <div class="meta">By ${c.instructor} • ${c.duration} hrs • ${c.total_modules} modules</div>
      <p class="small">${c.description}</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <a class="btn" href="/course.html?id=${c.id}">View</a>
        <button class="btn secondary" onclick="enroll(${c.id})">Enroll</button>
      </div>
    </div>
  `).join("");
}

async function enroll(course_id){
  const res = await API.post("/api/enroll", { course_id });
  if (res.ok) alert("Enrolled! Check Dashboard notifications.");
  else alert(res.error || "Failed");
}

document.addEventListener("DOMContentLoaded", () => {
  qsa("input,select").forEach(i=> i.addEventListener("change", loadCatalog));
  qs("#searchBtn").addEventListener("click", loadCatalog);
  loadCatalog();
});
