// /public/js/certificates.js - FIXED

function getParam(p) {
  return new URLSearchParams(location.search).get(p);
}

async function tryGenerate() {
  const id = getParam("id");
  if (!window.userId) {
    alert("Please log in to generate certificate.");
    location.href = "/login.html";
    return;
  }

  try {
    if (window.showLoader) window.showLoader();

    // 1) Call backend to generate certificate
    const res = await API.post("/certificates/generate", { course_id: Number(id) });

    if (window.hideLoader) window.hideLoader();

    if (!res || res.error) {
      // backend returns { error: "Course not completed" } if progress < 100
      alert(res?.error || "Failed to generate certificate.");
      return;
    }

    // 2) Show certificate info in UI
    qs("#certId").innerText = res.certId;
    qs("#verifyLink").href = "/verify.html?certId=" + res.certId;
    qs("#certCard").style.display = "block";

    // 3) Load course details (BUG FIX: missing slash)
    const course = await API.get("/courses/" + id);

    // issued_at isn't returned by backend here, so we pass undefined
    buildCourseCertificateCanvas(res.certId, course.title, window.userId, res.issued_at);
  } catch (err) {
    if (window.hideLoader) window.hideLoader();
    console.error(err);
    alert("Error generating certificate.");
  }
}

async function verify() {
  const id = getParam("certId");
  const mount = qs("#verifyMount");

  try {
    if (window.showLoader) window.showLoader();

    // BUG FIX: missing slash
    const res = await API.get("/certificates/" + id);

    if (window.hideLoader) window.hideLoader();

    if (!res || res.error) {
      mount.innerHTML = `
        <div class="card">
          <h3>Invalid ❌</h3>
          <p>${res?.error || "Certificate not found"}</p>
        </div>
      `;
      return;
    }

    const isCustom = res.name && res.design;

    if (!isCustom) {
      // NOTE: backend row has course_id, not "course"; this is just display
      mount.innerHTML = `
        <div class="card">
          <h3>Certificate Valid ✅</h3>
          <p><strong>ID:</strong> ${res.id}</p>
          <p><strong>Course ID:</strong> ${res.course_id}</p>
          <p><strong>User:</strong> ${res.user_id}</p>
          <p><strong>Issued:</strong> ${new Date(res.issued_at).toLocaleString()}</p>
        </div>
      `;
    } else {
      mount.innerHTML = `
        <div class="card">
          <h3>Certificate Valid ✅</h3>
          <p><strong>ID:</strong> ${res.id}</p>
          <p><strong>Title:</strong> ${res.title}</p>
          <p><strong>Name:</strong> ${res.name}</p>
          <p><strong>Issuer:</strong> ${res.issuer}</p>
          <p><strong>Issued:</strong> ${new Date(res.issued_at).toLocaleString()}</p>
        </div>
      `;
    }
  } catch (err) {
    if (window.hideLoader) window.hideLoader();
    console.error(err);
    mount.innerHTML = `
      <div class="card">
        <h3>Error ❌</h3>
        <p>Could not verify certificate.</p>
      </div>
    `;
  }
}

function buildCourseCertificateCanvas(certId, courseTitle, userId, issuedAtISO) {
  const inner = qs("#certCanvasInner");
  if (!inner) return;

  const issued = new Date(issuedAtISO || Date.now()).toLocaleDateString();

  inner.innerHTML = `
    <div style="text-align:center">
      <div style="letter-spacing:.2em;font-size:12px;color:#4a5568">CERTIFICATE</div>
      <h1 style="margin:6px 0 8px;font-size:32px">Certificate of Completion</h1>
      <div style="opacity:.7">Awarded to</div>
      <h2 style="margin:8px 0">${userId}</h2>
      <div style="opacity:.7">for completing</div>
      <h3 style="margin:8px 0">${courseTitle || "Course"}</h3>
      <div style="margin-top:8px;font-size:12px;opacity:.7">Issued: ${issued}</div>
    </div>
  `;

  qs("#cidInline").innerText = certId;

  const qrc = qs("#qrcodeCanvas");
  if (qrc) {
    qrc.innerHTML = "";
    new QRCode(qrc, {
      text: location.origin + "/verify.html?certId=" + certId,
      width: 120,
      height: 120
    });
  }
}

async function downloadCertPNG() {
  const node = qs("#certCanvas");
  if (!node) return alert("Nothing to download.");
  try {
    const canvas = await html2canvas(node, { scale: 2, useCORS: true });
    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "certificate.png";
    a.click();
  } catch (err) {
    console.error(err);
    alert("Failed to generate PNG.");
  }
}
