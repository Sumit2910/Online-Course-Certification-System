
// Clerk front-end auth bootstrap
// Insert your publishable key below. For local demo without real Clerk,
// you can set DEMO_MODE = true to bypass (NOT FOR PRODUCTION).

const DEMO_MODE = true; // set to false when you add a real Clerk key
window.DEMO_MODE = DEMO_MODE;
const CLERK_PUBLISHABLE_KEY = "YOUR_CLERK_PUBLISHABLE_KEY";

window.userId = null;
window.userRole = "student";

async function initAuth(){
  if (DEMO_MODE) {
    // lightweight demo flow
    const fake = localStorage.getItem("demo_user_id") || `user_${Math.random().toString(36).slice(2,8)}`;
    localStorage.setItem("demo_user_id", fake);
    window.userId = fake;
    // Fetch role
    const me = await API.get("/api/users/me");
    if (me && me.role) window.userRole = me.role;
    updateNav();
    return;
  }

  const clerkJs = document.createElement("script");
  clerkJs.setAttribute("data-clerk-publishable-key", CLERK_PUBLISHABLE_KEY);
  clerkJs.src = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js";
  document.head.appendChild(clerkJs);

  clerkJs.addEventListener("load", async () => {
    await window.Clerk.load();
    if (window.Clerk.user) {
      window.userId = window.Clerk.user.id;
      const me = await API.get("/api/users/me");
      if (me && me.role) window.userRole = me.role;
    }
    updateNav();
  });
}

function updateNav(){
  const authArea = document.getElementById("authArea");
  if (!authArea) return;
  if (window.userId) {
    authArea.innerHTML = `
      <span class="small">Signed in as <strong>${window.userId}</strong> (${window.userRole})</span>
      <a class="btn ghost" href="/dashboard.html">Dashboard</a>
      ${window.userRole==='admin'?'<a class="btn ghost" href="/admin.html">Admin</a>':''}
      ${window.userRole==='instructor'?'<a class="btn ghost" href="/instructor.html">Instructor</a>':''}
      <a class="btn ghost" href="/profile.html">Profile</a>
      <button class="btn" onclick="logoutDemo()">Logout</button>
    `;
  } else {
    authArea.innerHTML = `<a class="btn" href="/login.html">Login</a>`;
  }
}

async function setRole(role){
  const res = await API.post("/api/users/role", { role });
  if (res && res.ok) {
    window.userRole = role;
    updateNav();
    alert("Role saved: " + role);
  }
}

document.addEventListener("DOMContentLoaded", initAuth);

window.loginDemo = async function(email, password){
  const role = (String(email||'').trim().toLowerCase()==='user@admin.com')?'admin':
               (String(email||'').trim().toLowerCase()==='user@instructor.com')?'instructor':'student';
  const uid = String(email||'').trim().toLowerCase();
  window.userId = uid; window.userRole = role;
  localStorage.setItem('demo_user_id', uid);
  localStorage.setItem('demo_user_role', role);
  try { await API.post('/api/users/role', { role }); } catch (e) {}
  updateNav && updateNav();
  let target = localStorage.getItem('redirect_after_login');
  if (target) { localStorage.removeItem('redirect_after_login'); location.href = target; return; }
  location.href = role==='admin'?'/admin.html':role==='instructor'?'/instructor.html':'/dashboard.html';
};

window.logoutDemo = function(){
  localStorage.removeItem('demo_user_id');
  localStorage.removeItem('demo_user_role');
  window.userId = null; window.userRole = 'student';
  updateNav && updateNav();
  location.href = '/login.html';
};
