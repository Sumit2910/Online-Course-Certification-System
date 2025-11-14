// public/js/auth.js
// Rules:
// - user@admin.com       -> admin
// - user@instructor.com  -> instructor
// - anything else        -> student

window.userId = null;
window.userRole = "student";

const API = {
  get: (url, opts={}) => fetch(url, { ...opts, headers: { ...(opts.headers||{}), "Content-Type":"application/json", "x-user-id": window.userId||"" } }).then(r=>r.json()),
  post: (url, data={}, opts={}) => fetch(url, { method:"POST", body: JSON.stringify(data), headers: { ...(opts.headers||{}), "Content-Type":"application/json", "x-user-id": window.userId||"" } }).then(r=>r.json()),
};

function qs(sel){ return document.querySelector(sel); }

function roleFromEmail(email){
  const e = (String(email||"").trim().toLowerCase());
  if (e === "user@admin.com") return "admin";
  if (e === "user@instructor.com") return "instructor";
  return "student";
}

function defaultHome(role){
  if (role === 'admin') return '/admin.html';
  if (role === 'instructor') return '/instructor.html';
  return '/dashboard.html';
}

window.loginDemo = async function(email, password){
  const uid = String(email || "").trim().toLowerCase();
  if (!uid) { alert("Enter an email"); return; }
  const role = roleFromEmail(uid);
  // Save to session (localStorage)
  window.userId = uid;
  window.userRole = role;
  localStorage.setItem("demo_user_id", uid);
  localStorage.setItem("demo_user_role", role);

  // Persist role server-side (best-effort)
  try { await API.post("/api/users/role", { role }); } catch(e) { console.warn("role save failed", e); }

  // Update header
  if (typeof updateNav === "function") updateNav();

  // If there was a pending protected page saved, use it only if allowed for this role
  let pending = localStorage.getItem("redirect_after_login");
  if (pending) {
    localStorage.removeItem("redirect_after_login");
    // If pending requires a specific role, check it
    if (pending.includes("/admin.html") && role !== "admin") return location.href = defaultHome(role);
    if (pending.includes("/instructor.html") && role !== "instructor") return location.href = defaultHome(role);
    return location.href = pending;
  }

  // Otherwise go to default home for role
  location.href = defaultHome(role);
};

window.logoutDemo = function(){
  localStorage.removeItem("demo_user_id");
  localStorage.removeItem("demo_user_role");
  window.userId = null;
  window.userRole = "student";
  if (typeof updateNav === "function") updateNav();
  location.href = "/index.html"; // keep visitor on homepage after logout
};

// initAuth: only RESTORE session if present; do NOT create random user
function initAuth(){
  const uid = localStorage.getItem("demo_user_id");
  const role = localStorage.getItem("demo_user_role");
  if (uid) {
    window.userId = uid;
    window.userRole = role || "student";
  } else {
    window.userId = null;
    window.userRole = "student";
  }
  if (typeof updateNav === "function") updateNav();
}

document.addEventListener("DOMContentLoaded", initAuth);
