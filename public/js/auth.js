// Demo login accounts:
//   user@admin.com        → admin
//   user@instructor.com   → instructor
//   anything else         → student

window.userId = null;
window.userRole = "student";

// Backend API base (Render)
const API_BASE = "https://online-course-certification-system.onrender.com";

// Unified API wrapper
window.API = {
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

// Determine role based on email
function roleFromEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (e === "user@admin.com") return "admin";
  if (e === "user@instructor.com") return "instructor";
  return "student";
}

// Role-specific default home pages
function defaultHome(role) {
  if (role === "admin") return "/admin.html";
  if (role === "instructor") return "/instructor.html";
  return "/dashboard.html";
}

// ------------------------------
// LOGIN FUNCTION
// ------------------------------
window.loginDemo = async function (email, password) {
  const uid = String(email || "").trim().toLowerCase();

  if (!uid) return alert("Enter an email to sign in.");

  const role = roleFromEmail(uid);

  // Apply session
  window.userId = uid;
  window.userRole = role;

  // Save in localStorage
  localStorage.setItem("demo_user_id", uid);
  localStorage.setItem("demo_user_role", role);

  // Try to register/update role in backend
  try {
    await API.post("/api/users/role", { role });
  } catch (err) {
    console.warn("Failed to sync user role:", err);
  }

  if (typeof updateNav === "function") updateNav();

  // Handle intended redirect
  let redirectURL = localStorage.getItem("redirect_after_login");

  if (redirectURL) {
    localStorage.removeItem("redirect_after_login");

    // Access-check
    if (redirectURL.includes("/admin.html") && role !== "admin")
      redirectURL = defaultHome(role);

    if (redirectURL.includes("/instructor.html") && role !== "instructor")
      redirectURL = defaultHome(role);

    if (window.showLoader) window.showLoader();
    location.href = redirectURL;
    return;
  }

  // Default post-login
  if (window.showLoader) window.showLoader();
  location.href = defaultHome(role);
};

// ------------------------------
// LOGOUT
// ------------------------------
window.logoutDemo = function () {
  localStorage.removeItem("demo_user_id");
  localStorage.removeItem("demo_user_role");

  window.userId = null;
  window.userRole = "student";

  if (typeof updateNav === "function") updateNav();
  if (window.showLoader) window.showLoader();

  location.href = "/index.html";
};

// ------------------------------
// SESSION RESTORE
// ------------------------------
function initAuth() {
  // Pages that must ALWAYS behave like logged-out
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
