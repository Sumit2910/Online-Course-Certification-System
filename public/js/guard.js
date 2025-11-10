
// Auth & Role Guard
// Usage on any page:
//   window.REQUIRE_AUTH = true;             // require any signed-in user
//   window.REQUIRED_ROLE = "admin";         // require a specific role
//   window.ALLOW_ROLES = ["admin","instructor"]; // or allow a list
//
// The guard runs on DOMContentLoaded:
// - Redirects to /login.html if not signed in and REQUIRE_AUTH/REQUIRED_ROLE is set
// - Redirects to /dashboard.html if role is insufficient (except admin page shows a hint)

(function(){
  function defaultHome(role){
    if (role === 'admin') return '/admin.html';
    if (role === 'instructor') return '/instructor.html';
    return '/dashboard.html';
  }
  function pathRequiredRole(pathname){
    if (!pathname) return null;
    if (pathname.includes('/admin.html')) return 'admin';
    if (pathname.includes('/instructor.html')) return 'instructor';
    return null;
  }
  function getSession(){
    const uid = localStorage.getItem("demo_user_id");
    const role = localStorage.getItem("demo_user_role") || "student";
    return { uid, role };
  }

  function hasRole(role, required, allowList){
    if (!required && (!allowList || allowList.length===0)) return true;
    if (required) return role === required;
    if (allowList && allowList.length) return allowList.includes(role);
    return true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const { uid, role } = getSession();
    const needAuth = !!(window.REQUIRE_AUTH || window.REQUIRED_ROLE || (window.ALLOW_ROLES && window.ALLOW_ROLES.length));
    if (needAuth && !uid){
      localStorage.setItem("redirect_after_login", location.pathname + location.search);
      location.href = "/login.html";
      return;
    }
    if (uid){
      // restore globals used by other scripts
      window.userId = uid;
      window.userRole = role;
      if (typeof updateNav === "function") updateNav();
    }
    if (!hasRole(role, window.REQUIRED_ROLE, window.ALLOW_ROLES)){
      alert("You do not have permission to view this page. Your role is: " + role);
      location.href = defaultHome(role);
    }
    // After login redirect support
    const pending = localStorage.getItem("redirect_after_login");
    if (uid && pending && location.pathname === "/login.html"){
      localStorage.removeItem("redirect_after_login");
      location.href = pending;
    }
  });
})();
