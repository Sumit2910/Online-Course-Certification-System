// public/js/auth.js
// Demo-only email-based auth
//
// Roles:
// - user@admin.com       -> admin
// - user@instructor.com  -> instructor
// - anything else        -> student

window.userId = null;
window.userRole = "student";
const API_BASE = "https://online-course-certification-system.onrender.com";  

const API = {
  get: (url, opts = {}) =>
    fetch(API_BASE + url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "Content-Type": "application/json",
        "x-user-id": window.userId || ""
      }
    }).then(r => r.json()),
  post: (url, data = {}, opts = {}) =>
    fetch(API_BASE + url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        ...(opts.headers || {}),
        "Content-Type": "application/json",
        "x-user-id": window.userId || ""
      }
    }).then(r => r.json())
};


function roleFromEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (e === "user@admin.com") return "admin";
  if (e === "user@instructor.com") return "instructor";
  return "student";
}

function defaultHome(role) {
  if (role === "admin") return "/admin.html";
  if (role === "instructor") return "/instructor.html";
  return "/dashboard.html";
}

window.loginDemo = async function (email, password) {
  const uid = String(email || "").trim().toLowerCase();
  if (!uid) {
    alert("Please enter an email");
    return;
  }

  const role = roleFromEmail(uid);

  // Save session in memory + localStorage
  window.userId = uid;
  window.userRole = role;
  localStorage.setItem("demo_user_id", uid);
  localStorage.setItem("demo_user_role", role);

  // Best-effort role save on server
  try {
    await API.post("/api/users/role", { role });
  } catch (e) {
    console.warn("role save failed", e);
  }

  if (typeof updateNav === "function") updateNav();

  // Handle redirect-after-login logic
  let pending = localStorage.getItem("redirect_after_login");
  if (pending) {
    localStorage.removeItem("redirect_after_login");
    // protect role-specific pages
    if (pending.includes("/admin.html") && role !== "admin") {
      pending = defaultHome(role);
    }
    if (pending.includes("/instructor.html") && role !== "instructor") {
      pending = defaultHome(role);
    }
    if (window.showLoader) window.showLoader();
    location.href = pending;
    return;
  }

  // Default redirect based on role
  if (window.showLoader) window.showLoader();
  location.href = defaultHome(role);
};

window.logoutDemo = function () {
  localStorage.removeItem("demo_user_id");
  localStorage.removeItem("demo_user_role");
  window.userId = null;
  window.userRole = "student";
  if (typeof updateNav === "function") updateNav();
  if (window.showLoader) window.showLoader();
  location.href = "/index.html";
};

function initAuth() {
  // If this page wants to appear anonymous, ignore stored session
  if (window.NO_SESSION_ON_THIS_PAGE) {
    window.userId = null;
    window.userRole = "student";
    if (typeof updateNav === "function") updateNav();
    return;
  }

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
