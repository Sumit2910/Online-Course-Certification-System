
// /public/js/module_viewer.js - patched

function getParam(p) {
  return new URLSearchParams(location.search).get(p);
}

document.addEventListener("DOMContentLoaded", async () => {
  const courseId = getParam("course");
  const moduleId = getParam("module");

  if (!courseId || !moduleId) {
    alert("Invalid module link");
    return;
  }

  // Load modules from previous page
  let modData = [];
  try {
    modData = JSON.parse(localStorage.getItem("lastModules")) || [];
  } catch {
    modData = [];
  }

  const current = modData.find(m => String(m.id) == String(moduleId));

  // Safely fill UI
  qs("#modTitle").textContent = current?.title || "Module";
  qs("#modDesc").textContent = current?.desc || "No details available.";

  qs("#backBtn").href = "/course.html?id=" + courseId;

  // ----------------------------------
  // MARK MODULE AS COMPLETED
  // ----------------------------------
  qs("#markDoneBtn").addEventListener("click", async () => {
    if (!window.userId) {
      alert("Please log in to mark progress.");
      location.href = "/login.html";
      return;
    }

    try {
      if (window.showLoader) window.showLoader();

      const res = await API.post("/module/complete", {
        course_id: Number(courseId),
        module_id: Number(moduleId)
      });

      if (window.hideLoader) window.hideLoader();

      if (res.ok) {
        alert("Module marked as completed!");
        location.href = "/course.html?id=" + courseId;
      } else {
        alert("Error marking module: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      if (window.hideLoader) window.hideLoader();
      console.error(err);
      alert("Connection error while marking module.");
    }
  });
});
