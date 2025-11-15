
// Unified session variables
window.userId = null;
window.userRole = "student";

// ======================================================
// API WRAPPER — uses ONE consistent session source
// ======================================================
window.API = {
  get: (url, opts = {}) =>
    fetch(API_BASE + url, {
      ...opts,
      method: "GET",
      credentials: "include",
      headers: {
        ...(opts.headers || {}),
        "Content-Type": "application/json",
        "x-user-id": localStorage.getItem("user_id") || ""
      }
    }).then(r => r.json()),

  post: (url, data = {}, opts = {}) =>
    fetch(API_BASE + url, {
      ...opts,
      method: "POST",
      credentials: "include",
      body: JSON.stringify(data),
      headers: {
        ...(opts.headers || {}),
        "Content-Type": "application/json",
        "x-user-id": localStorage.getItem("user_id") || ""
      }
    }).then(r => r.json())
};

// ======================================================
// ROLE DETERMINATION (demo)
// ======================================================
function roleFromEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (e === "user@admin.com") return "admin";
  if (e === "user@instructor.com") return "instructor";
  return "student";
}

// Redirect based on role
function defaultHome(role) {
  if (role === "admin") return "/admin.html";
  if (role === "instructor") return "/instructor.html";
  return "/dashboard.html";
}

// ======================================================
// LOGIN
// ======================================================
window.loginDemo = async function (email, password) {
  const uid = String(email || "").trim().toLowerCase();

  if (!uid) return alert("Enter an email to sign in.");

  const role = roleFromEmail(uid);

  // Save session to localStorage (UNIFIED)
  localStorage.setItem("user_id", uid);
  localStorage.setItem("user_role", role);

  // Update window variables
  window.userId = uid;
  window.userRole = role;

  // Register/update backend role
  try {
    await API.post("/users/role", { role });
  } catch (err) {
    console.warn("Failed to sync user role:", err);
  }

  if (typeof updateNav === "function") updateNav();

  // Handle redirect
  let redirectURL = localStorage.getItem("redirect_after_login");
  if (redirectURL) {
    localStorage.removeItem("redirect_after_login");

    // Protect restricted pages
    if (redirectURL.includes("/admin.html") && role !== "admin")
      redirectURL = defaultHome(role);

    if (redirectURL.includes("/instructor.html") && role !== "instructor")
      redirectURL = defaultHome(role);

    if (window.showLoader) window.showLoader();
    location.href = redirectURL;
    return;
  }

  // Default navigation
  if (window.showLoader) window.showLoader();
  location.href = defaultHome(role);
};

// ======================================================
// LOGOUT
// ======================================================
window.logoutDemo = function () {
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_role");

  window.userId = null;
  window.userRole = "student";

  if (typeof updateNav === "function") updateNav();
  if (window.showLoader) window.showLoader();

  location.href = "/index.html";
};

// ======================================================
// SESSION RESTORE (runs on every page automatically)
// ======================================================
function initAuth() {
  // When page explicitly disables session
  if (window.NO_SESSION_ON_THIS_PAGE) {
    window.userId = null;
    window.userRole = "student";
    if (typeof updateNav === "function") updateNav();
    return;
  }

  const uid = localStorage.getItem("user_id");
  const role = localStorage.getItem("user_role");

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
