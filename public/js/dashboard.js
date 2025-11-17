
// /public/js/dashboard.js - patched

async function loadDashboard() {
  try {
    const notes = await API.get("/notifications");
    if (notes && typeof renderNotifications === "function") {
      renderNotifications(notes, "#notifMount");
    }
  } catch (e) {
    // ignore
  }

  const roleSel = qs("#role");
  if (roleSel) roleSel.value = window.userRole || "student";
}

async function saveRole() {
  const role = qs("#role").value;
  try {
    await API.post("/users/role", { role });
    alert("Role updated.");
  } catch (err) {
    console.error(err);
    alert("Failed to update role.");
  }
}

async function loadMyCourses() {
  const mount = qs("#myCourses");
  if (!mount) return;

  try {
    if (window.showLoader) window.showLoader();
    const data = await API.get("/my/courses");
    if (window.hideLoader) window.hideLoader();

    if (!data || !data.length) {
      mount.innerHTML = `
        <p class="small" style="opacity:.7;">
          You have not enrolled in any courses yet.
        </p>
      `;
      return;
    }

    mount.innerHTML = data
      .map(c => `
        <div class="card" style="margin-bottom:12px;">
          <div class="flex-row" style="display:flex;justify-content:space-between;align-items:center;gap:10px">

            <div>
              <div class="small" style="opacity:.7">${c.category || ""}</div>
              <div><strong>${c.title}</strong></div>
              <div class="small" style="opacity:.7">${c.instructor || ""} • ${c.duration || 0} hrs</div>
              <div class="small" style="opacity:.7;margin-top:6px;">
                Enrolled on ${c.created_at ? new Date(c.created_at).toLocaleString() : ""}
              </div>
            </div>

            <div style="min-width:150px;text-align:right;">
              <div class="small" style="opacity:.7">Progress</div>
              <div class="progress">
                <div style="width:${c.percent || 0}%"></div>
              </div>
              <div class="small" style="opacity:.7;margin-top:4px">${c.percent || 0}%</div>

              <a class="btn secondary" href="/course.html?id=${c.id}" style="margin-top:8px;display:inline-block;">
                Open
              </a>
            </div>

          </div>
        </div>
      `).join("");

  } catch (e) {
    console.error(e);
    mount.innerHTML = `
      <p class="small" style="opacity:.7;color:#ff8080">
        Failed to load enrolled courses.
      </p>
    `;
  }
}

//this comment line was used as dummy to help redeploy 

document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboard();
  await loadMyCourses();
});
