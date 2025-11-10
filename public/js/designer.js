
async function loadTemplate(design){
  const res = await fetch(`/templates/${design}.html`);
  return await res.text();
}

function fillTemplate(html, data){
  return html
    .replaceAll("[Recipient Name]", data.name)
    .replaceAll("[Course Title]", data.title)
    .replaceAll("[Date]", data.date)
    .replaceAll("[Issuer]", data.issuer || "");
}

async function preview(){
  const data = getForm();
  if (!data.name || !data.title){
    alert("Enter recipient name and title");
    return;
  }
  let html = await loadTemplate(data.design);
  // add Issuer placeholder if not present
  if (!html.includes("[Issuer]")){
    html = html.replace("</div>", '<p class="small">Issuer: [Issuer]</p></div>');
  }
  const filled = fillTemplate(html, data);
  document.getElementById("preview").innerHTML = filled;
}

function getForm(){
  const name = qs("#rName").value.trim();
  const title = qs("#cTitle").value.trim();
  const date = qs("#cDate").value || new Date().toISOString().slice(0,10);
  const issuer = qs("#cIssuer").value.trim();
  const design = qs("#design").value;
  return { name, title, date, issuer, design };
}

async function saveAndIssue(){
  const data = getForm();
  if (!window.userId){
    alert("Please sign in first.");
    return;
  }
  if (!data.name || !data.title){
    alert("Enter recipient name and title");
    return;
  }

  const payload = {
    name: data.name,
    title: data.title,
    date: data.date,
    issuer: data.issuer,
    design: data.design
  };
  const res = await API.post("/api/certificates/custom", payload);
  if (res && res.ok){
    qs("#cid").innerText = res.certId;
    new QRCode(document.getElementById("qrcode"), {
      text: location.origin + "/verify.html?certId=" + res.certId,
      width: 160, height: 160
    });
    qs("#verifyLink").href = "/verify.html?certId=" + res.certId;
    qs("#issued").style.display = "block";
    buildCustomCertificateCanvas(res.certId, data);
  } else {
    alert(res.error || "Failed to issue");
  }
}


function buildCustomCertificateCanvas(certId, data){
  // Wrap the chosen template and append footer with ID + QR
  const inner = document.getElementById("certCanvasCustomInner");
  const base = document.getElementById("preview").innerHTML || "";
  inner.innerHTML = base;
  document.getElementById("cidCustomInline").innerText = certId;
  const qrc = document.getElementById("qrcodeCustomCanvas");
  qrc.innerHTML = "";
  new QRCode(qrc, { text: location.origin + "/verify.html?certId=" + certId, width: 120, height: 120 });
}

async function downloadCustomPNG(){
  const node = document.getElementById("certCanvasCustom");
  if (!node) return alert("Nothing to download.");
  const canvas = await html2canvas(node, { scale: 2, useCORS: true });
  const dataURL = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "custom-certificate.png";
  a.click();
}
