function getParam(p) {
  return new URLSearchParams(location.search).get(p);
}

document.addEventListener("DOMContentLoaded", async () => {
  const courseId = getParam("course");
  const moduleId = getParam("module");

  const modData = JSON.parse(localStorage.getItem("lastModules")) || [];
  const current = modData.find(m => m.id == moduleId);

  // Fill UI
  qs("#modTitle").textContent = current?.title || "Module";
  qs("#modDesc").textContent = current?.desc || "";

  qs("#backBtn").href = "/course.html?id=" + courseId;

  qs("#markDoneBtn").addEventListener("click", async () => {
    const res = await API.post("/api/module/complete", {
      course_id: Number(courseId),
      module_id: Number(moduleId)
    });

   if (res.ok) {
  alert("Module marked as completed!");
  location.href = "/course.html?id=" + courseId;
} else {
  alert("Error marking module: " + (res.error || "Unknown error"));
}

  });
});
