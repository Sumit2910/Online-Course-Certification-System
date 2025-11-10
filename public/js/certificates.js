
async function tryGenerate(){
  const id = new URLSearchParams(location.search).get("id");
  const res = await API.post("/api/certificates/generate", { course_id: Number(id) });
  if (res.error) return alert(res.error);
  qs("#certId").innerText = res.certId;
  qs("#verifyLink").href = "/verify.html?certId=" + res.certId;
  qs("#certCard").style.display = "block";
  // Fetch course title for nicer render
  const course = await API.get("/api/courses/" + id);
  buildCourseCertificateCanvas(res.certId, course.title, window.userId, res.issued_at);
}

async function verify(){
  const id = new URLSearchParams(location.search).get("certId");
  const res = await API.get("/api/certificates/" + id);
  const mount = qs("#verifyMount");
  if (res && !res.error){
    mount.innerHTML = `
      <div class="card">
        <h3>Certificate Valid ✅</h3>
        <p><strong>ID:</strong> ${res.id}</p>
        <p><strong>Course:</strong> ${res.course}</p>
        <p><strong>User:</strong> ${res.user_id}</p>
        <p><strong>Issued:</strong> ${new Date(res.issued_at).toLocaleString()}</p>
      </div>
    `;
  } else {
    mount.innerHTML = `<div class="card"><h3>Invalid ❌</h3><p>${res.error||"Not found"}</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", ()=>{});


function buildCourseCertificateCanvas(certId, courseTitle, userId, issuedAtISO){
  // Create a simple composed certificate content (title + awarded to + course)
  const inner = document.getElementById("certCanvasInner");
  if (!inner) return;
  const issued = new Date(issuedAtISO || Date.now()).toLocaleDateString();
  inner.innerHTML = `
    <div style="text-align:center">
      <div style="letter-spacing:.2em;font-size:12px;color:#4a5568">CERTIFICATE</div>
      <h1 style="margin:6px 0 8px;font-size:32px">Certificate of Completion</h1>
      <div style="opacity:.7">Awarded to</div>
      <h2 style="margin:8px 0">${userId}</h2>
      <div style="opacity:.7">for successfully completing</div>
      <h3 style="margin:8px 0">${courseTitle||"Course"}</h3>
      <div style="margin-top:8px;font-size:12px;opacity:.7">Date: ${issued}</div>
    </div>
  `;
  document.getElementById("cidInline").innerText = certId;

  // Render QR into QR canvas block
  const qrc = document.getElementById("qrcodeCanvas");
  qrc.innerHTML = "";
  new QRCode(qrc, { text: location.origin + "/verify.html?certId=" + certId, width: 120, height: 120 });
}

async function downloadCertPNG(){
  const node = document.getElementById("certCanvas");
  if (!node) return alert("Nothing to download.");
  const canvas = await html2canvas(node, { scale: 2, useCORS: true });
  const dataURL = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "certificate.png";
  a.click();
}
