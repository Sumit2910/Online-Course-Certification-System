
// ===== GLOBAL API BASE (Render Backend) =====
const API_BASE = "https://online-course-certification-system.onrender.com";

// public/js/app.js
// Small helpers + header nav + global loader

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

// Create loader overlay once
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("pageLoader")) {
    const overlay = document.createElement("div");
    overlay.id = "pageLoader";
    overlay.innerHTML = `<div class="spinner"></div>`;
    document.body.appendChild(overlay);
  }

  // Mark internal link navigations with loader
  qsa('a[href^="/"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http")) return;
      // let normal navigation happen, just show loader
      if (window.showLoader) window.showLoader();
    });
  });

  // Initial nav update if auth already restored
  if (typeof updateNav === "function") updateNav();
});

// Loader helpers used everywhere
window.showLoader = function () {
  document.body.classList.add("loading");
};

window.hideLoader = function () {
  document.body.classList.remove("loading");
};

// Header nav rendering, based on window.userId / window.userRole
window.updateNav = function () {
  const area = document.getElementById("authArea");
  if (!area) return;

  const uid = window.userId;
  const role = window.userRole || "student";

  if (!uid) {
    area.innerHTML = `<a class="btn" href="/login.html">Login</a>`;
    return;
  }

  const adminLink = role === "admin" ? `<a class="btn ghost" href="/admin.html">Admin</a>` : "";
  const instrLink = role === "instructor" ? `<a class="btn ghost" href="/instructor.html">Instructor</a>` : "";

  area.innerHTML = `
    <span class="small">Signed in as <strong>${uid}</strong> (${role})</span>
    <a class="btn ghost" href="/dashboard.html">Dashboard</a>
    ${adminLink}
    ${instrLink}
    <a class="btn ghost" href="/profile.html">Profile</a>
    <button class="btn" type="button" onclick="logoutDemo()">Logout</button>
  `;
};


// Mobile nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });
});