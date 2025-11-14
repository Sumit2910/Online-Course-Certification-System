
function getParam(p) {
  return new URLSearchParams(location.search).get(p);
}

// --------------------------------------------------
// GENERATE COURSE CERTIFICATE
// --------------------------------------------------
async function tryGenerate() {
  const id = getParam("id");
  if (!window.userId) {
    alert("Please log in to generate certificate.");
    location.href = "/login.html";
    return;
  }

  try {
    if (window.showLoader) window.showLoader();

    // FIX: use API_BASE via API wrapper
    const res = await API.post("/api/certificates/generate", { 
      course_id: Number(id)
    });

    if (window.hideLoader) window.hideLoader();

    if (res.error) {
      alert(res.error);
      return;
    }

    // Update UI
    qs("#certId").innerText = res.certId;
    qs("#verifyLink").href = "/verify.html?certId=" + res.certId;
    qs("#certCard").style.display = "block";

    // Fetch course name
    const course = await API.get("/api/courses/" + id);

    buildCourseCertificateCanvas(
      res.certId,
      course.title,
      window.userId,
      res.issued_at
    );
  } catch (err) {
    if (window.hideLoader) window.hideLoader();
    console.error(err);
    alert("Error generating certificate.");
  }
}

// --------------------------------------------------
// VERIFY CERTIFICATE
// --------------------------------------------------
async function verify() {
  const id = getParam("certId");
  const mount = qs("#verifyMount");

  try {
    if (window.showLoader) window.showLoader();

    const res = await API.get("/api/certificates/" + id);

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

    // Distinguish between standard & custom certificates
    const isCustom = res.name && res.design;

    if (!isCustom) {
      // Standard certificate
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
      // Custom certificate
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
    mount.innerHTML = `<div class="card"><h3>Error ❌</h3><p>Could not verify certificate.</p></div>`;
  }
}

// --------------------------------------------------
// CERTIFICATE CANVAS RENDERING
// --------------------------------------------------
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

  // QR code
  const qrc = qs("#qrcodeCanvas");
  qrc.innerHTML = "";
  new QRCode(qrc, { 
    text: location.origin + "/verify.html?certId=" + certId,
    width: 120,
    height: 120
  });
}

// --------------------------------------------------
// DOWNLOAD IMAGE
// --------------------------------------------------
async function downloadCertPNG() {
  const node = qs("#certCanvas");
  if (!node) {
    alert("Nothing to download.");
    return;
  }

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
