const puppeteer = require("puppeteer");

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function list(items, render) {
  return (items || []).map(render).join("");
}

function resumeHtml(resume) {
  const c = resume.content || {};
  const heading = (label) => `<h2>${escapeHtml(label)}</h2>`;
  const bullets = (items) => items?.length ? `<ul>${list(items, item => `<li>${escapeHtml(item)}</li>`)}</ul>` : "";
  const contact = [c.email, c.phone, c.location, c.website].filter(Boolean).map(escapeHtml).join(" · ");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 16mm 17mm; }
  * { box-sizing: border-box; } body { font-family: Arial, Helvetica, sans-serif; color: #172033; font-size: 10pt; line-height: 1.38; }
  h1 { font-size: 24pt; margin: 0 0 4px; color: #101828; } .contact { color: #475467; font-size: 9pt; margin-bottom: 14px; overflow-wrap: anywhere; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #98a2b3; padding-bottom: 4px; margin: 14px 0 7px; color: #344054; }
  p { margin: 3px 0 6px; } ul { margin: 4px 0 7px; padding-left: 18px; } li { margin-bottom: 3px; }
  .entry { margin-bottom: 9px; break-inside: avoid; } .entry-head { font-weight: bold; } .muted { color: #475467; }
  .skills { margin: 3px 0; } a { color: inherit; text-decoration: none; }
  </style></head><body>
  <h1>${escapeHtml(c.fullName || "Your Name")}</h1><div class="contact">${contact}</div>
  ${c.summary ? `${heading("Professional Summary")}<p>${escapeHtml(c.summary)}</p>` : ""}
  ${c.skills?.length ? `${heading("Skills")}<p class="skills">${c.skills.map(escapeHtml).join(" · ")}</p>` : ""}
  ${c.experience?.length ? `${heading("Experience")}${list(c.experience, e => `<div class="entry"><div class="entry-head">${escapeHtml(e.role || "")}${e.company ? ` — ${escapeHtml(e.company)}` : ""}</div><div class="muted">${escapeHtml([e.location, e.startDate, e.endDate].filter(Boolean).join(" · "))}</div>${bullets(e.bullets)}</div>`)}` : ""}
  ${c.projects?.length ? `${heading("Projects")}${list(c.projects, p => `<div class="entry"><div class="entry-head">${escapeHtml(p.name || "Project")}</div>${p.technologies?.length ? `<div class="muted">${p.technologies.map(escapeHtml).join(" · ")}</div>` : ""}${bullets(p.bullets)}</div>`)}` : ""}
  ${c.education?.length ? `${heading("Education")}${list(c.education, e => `<div class="entry"><div class="entry-head">${escapeHtml(e.degree || "")}${e.institution ? ` — ${escapeHtml(e.institution)}` : ""}</div><div class="muted">${escapeHtml([e.location, e.startDate, e.endDate].filter(Boolean).join(" · "))}</div>${bullets(e.details)}</div>`)}` : ""}
  ${c.certifications?.length ? `${heading("Certifications")}${bullets(c.certifications)}` : ""}
  </body></html>`;
}

const fs = require("fs");

function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  return possiblePaths.find((p) => p && fs.existsSync(p));
}

async function renderResumePdf(resume) {
  const executablePath = findChromeExecutable();
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setContent(resumeHtml(resume), { waitUntil: "networkidle0" });
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}

module.exports = { renderResumePdf };
