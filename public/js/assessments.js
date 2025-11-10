
async function submitQuiz(){
  const id = new URLSearchParams(location.search).get("id");
  const answers = {
    q1: (qs("input[name=q1]:checked")||{}).value || null,
    q2: (qs("input[name=q2]:checked")||{}).value || null,
  };
  const res = await API.post("/api/assessments/submit", { course_id: Number(id), answers });
  renderResult(res);
}

async function submitFile(){
  const id = new URLSearchParams(location.search).get("id");
  const fd = new FormData();
  const f = qs("#file").files[0];
  if (!f) return alert("Choose a file");
  fd.append("file", f);
  fd.append("course_id", Number(id));

  const r = await fetch("/api/assessments/submit", {
    method:"POST",
    headers: {"x-user-id": window.userId || ""},
    body: fd
  });
  const res = await r.json();
  renderResult(res);
}

async function checkGrade(){
  const id = new URLSearchParams(location.search).get("id");
  const res = await API.get("/api/grades/" + id);
  renderResult(res);
}

function renderResult(res){
  const mount = qs("#result");
  if (!res) return;
  if (res.released){
    mount.innerHTML = `<div class="card"><h3>Your Score</h3><p>${res.score}</p></div>`;
  } else {
    mount.innerHTML = `<div class="card"><h3>Pending</h3><p>Awaiting instructor approval.</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", ()=>{});
