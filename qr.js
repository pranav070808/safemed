// SafeMed Emergency QR Code Generator — Person 3
// Generates a QR code linking to a beautiful emergency card page
// Uses qrcode.js library (loaded via CDN in HTML)

const EMERGENCY_PAGE = "https://pranav070808.github.io/safemed/emergency.html";

function generateEmergencyQR(patientData, containerId) {
  const p = patientData.patient || {};
  const allergies = (patientData.allergies || [])
    .filter(a => a.confidence === "verified")
    .map(a => a.allergy);
  const activeMeds = (patientData.medicines || [])
    .filter(m => m.status === "active" || m.status === "unknown")
    .map(m => ({ n: m.generic || m.brand, d: m.dose || "" }));
  const conditions = (patientData.conditions || [])
    .filter(c => c.confidence === "verified")
    .map(c => c.condition);
  const warnings = (patientData.conflicts || [])
    .filter(c => c.severity === "high")
    .map(c => c.title);

  // Compact JSON for QR (short keys to save space)
  const compact = {
    p: { n: p.name, a: p.age, g: p.gender, b: p.blood_group },
    a: allergies,
    c: conditions,
    m: activeMeds,
    w: warnings,
    d: new Date().toLocaleDateString("en-IN")
  };

  const encoded = btoa(encodeURIComponent(JSON.stringify(compact)));
  const qrUrl = EMERGENCY_PAGE + "#" + encoded;

  // Generate QR
  const container = document.getElementById(containerId);
  if (!container) return qrUrl;
  container.innerHTML = "";

  if (typeof QRCode !== "undefined") {
    new QRCode(container, {
      text: qrUrl,
      width: 256,
      height: 256,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  return qrUrl;
}

window.SafeMedQR = { generateEmergencyQR };
