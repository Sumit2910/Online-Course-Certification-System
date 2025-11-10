
// Common helpers
const API = {
  get: (url, opts={}) => fetch(url, { ...opts, headers: { ...(opts.headers||{}), "Content-Type":"application/json", "x-user-id": window.userId||"" } }).then(r=>r.json()),
  post: (url, data={}, opts={}) => fetch(url, { method:"POST", body: JSON.stringify(data), headers: { ...(opts.headers||{}), "Content-Type":"application/json", "x-user-id": window.userId||"" } }).then(r=>r.json()),
};

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function setProgress(el, pct){ el.style.width = (pct||0) + "%"; }
function fmt(s){ return (s??"").toString(); }

function renderNotifications(list, mountSel){
  const mount = qs(mountSel);
  if (!mount) return;
  mount.innerHTML = list.map(n => `
    <div class="card">
      <div class="small">${new Date(n.created_at).toLocaleString()}</div>
      <div><strong>${n.type.toUpperCase()}</strong>: ${fmt(n.message)}</div>
    </div>
  `).join("");
}
