
async function loadDashboard(){
  // notifications
  try{
    const notes = await API.get("/api/notifications");
    renderNotifications(notes, "#notifMount");
  }catch(e){ /* not logged */ }

  // role picker
  const roleSel = qs("#role");
  if (roleSel) roleSel.value = window.userRole || "student";
}

async function saveRole(){
  const role = qs("#role").value;
  await setRole(role);
}

document.addEventListener("DOMContentLoaded", loadDashboard);
