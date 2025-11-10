
async function loadCourse(){
  const id = new URLSearchParams(location.search).get("id");
  const data = await API.get("/api/courses/" + id);
  qs("#title").innerText = data.title;
  qs("#meta").innerText = `${data.category} • ${data.instructor} • ${data.duration} hrs`;
  qs("#desc").innerText = data.description;

  // progress
  const p = await API.get("/api/progress/" + id);
  setProgress(qs(".progress > div"), p.percent || 0);
  qs("#pLabel").innerText = (p.percent || 0) + "%";

  // module buttons
  const modules = data.total_modules || 8;
  const area = qs("#modules");
  area.innerHTML = Array.from({length: modules}).map((_,i)=>`
    <button class="btn ghost" onclick="updateProgress(${data.id}, ${i+1})">Mark up to Module ${i+1} Complete</button>
  `).join("");
}

async function updateProgress(course_id, completed){
  const res = await API.post("/api/progress/update", { course_id, completed_modules: completed });
  setProgress(qs(".progress > div"), res.percent);
  qs("#pLabel").innerText = res.percent + "%";
}

document.addEventListener("DOMContentLoaded", loadCourse);
