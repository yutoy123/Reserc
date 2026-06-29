import { setLoading } from "./common.js";
import { renderReport } from "./investigate.js";

const form        = document.getElementById("searchForm");
const statusBar   = document.getElementById("statusBar");
const reportEl    = document.getElementById("report");
const searchBtn   = document.getElementById("searchBtn");
const topicInput  = document.getElementById("topic");
const regionSelect = document.getElementById("region");

const params = new URLSearchParams(location.search);
if (params.get("topic"))  topicInput.value   = params.get("topic");
if (params.get("region")) regionSelect.value = params.get("region");

let lastResult = null;

// ── Report action bar ──────────────────────────────────────────────
function injectActionBar(topic, region, reportData) {
  let bar = document.getElementById("reportActionBar");
  if (bar) bar.remove();

  bar = document.createElement("div");
  bar.id = "reportActionBar";
  bar.style.cssText = `
    display:flex;gap:10px;flex-wrap:wrap;margin:24px 0 0;
    padding:16px 0;border-top:1px solid var(--sand);
  `;

  bar.innerHTML = `
    <button id="saveReportBtn" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--ochre);color:var(--ochre);background:none;cursor:pointer;transition:all .2s">
      ☆ Save to Library
    </button>
    <button id="exportPdfBtn" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--rule);color:var(--ink-soft);background:none;cursor:pointer;transition:all .2s">
      ↓ Export PDF
    </button>
    <button id="copyCiteBtn" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--rule);color:var(--ink-soft);background:none;cursor:pointer;transition:all .2s">
      ❝ Copy Citation
    </button>
    <a href="/chat.html" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--rule);color:var(--ink-soft);text-decoration:none;transition:all .2s">
      ↗ Discuss with AI
    </a>
  `;

  reportEl.after(bar);

  // Save to library
  bar.querySelector("#saveReportBtn").addEventListener("click", async function () {
    const title = `${topic} · ${region}`;
    const res   = await fetch("/api/library/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "investigate", title, topic, region, payload: reportData }),
    });
    const data = await res.json();
    if (data.ok) {
      this.textContent = "★ Saved";
      this.style.background = "var(--ochre)";
      this.style.color = "var(--cream)";
      this.disabled = true;
    }
  });

  // Export PDF
  bar.querySelector("#exportPdfBtn").addEventListener("click", () => {
    const style = document.createElement("style");
    style.id = "__print_style";
    style.textContent = `
      @media print {
        .site-nav, .search-form, .status-bar, #reportActionBar, footer { display:none!important; }
        body { background:#fff; }
        .report { box-shadow:none!important; }
        .page-header { margin-top:0; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById("__print_style")?.remove(), 1000);
  });

  // Copy citation (APA format)
  bar.querySelector("#copyCiteBtn").addEventListener("click", async function () {
    const year = new Date().getFullYear();
    const citation = `World Bank. (${year}). ${topic} — Regional data for ${region}. World Bank Open Data. https://data.worldbank.org`;
    await navigator.clipboard.writeText(citation);
    this.textContent = "✓ Copied!";
    setTimeout(() => { this.textContent = "❝ Copy Citation"; }, 2000);
  });
}

// ── Skeleton HTML for investigate loading ──────────────────────────
function skeletonReport() {
  const sectionSkel = (lines = 3) => `
    <div class="sk-section-block">
      <div class="sk-block sk-section-heading"></div>
      ${Array.from({ length: lines }, (_, i) =>
        `<div class="sk-block sk-line${i === lines - 1 ? ' w60' : i % 2 === 1 ? ' w80' : ''}"></div>`
      ).join('')}
    </div>`;
  return `
    <div class="sk-report">
      <div class="sk-block sk-report-title"></div>
      <div class="sk-metrics">
        ${Array.from({ length: 5 }, () => '<div class="sk-block sk-metric"></div>').join('')}
      </div>
      ${sectionSkel(3)}
      ${sectionSkel(4)}
      ${sectionSkel(3)}
      ${sectionSkel(2)}
    </div>`;
}

// ── Main search ────────────────────────────────────────────────────
async function runSearch(topic, region) {
  if (searchBtn) searchBtn.disabled = true;
  if (statusBar) { statusBar.className = "status-bar"; statusBar.textContent = ""; }
  reportEl.classList.remove("visible");
  reportEl.innerHTML = skeletonReport();
  document.getElementById("reportActionBar")?.remove();

  try {
    const res  = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, region }),
    });
    const json = await res.json();
    if (!json.success) {
      statusBar.className = "status-bar error";
      statusBar.textContent = json.error || "Report generation failed.";
      return;
    }
    statusBar.textContent = "";
    lastResult = json;
    renderReport(json.data, reportEl, json.meta, (t) => {
      topicInput.value = t;
      form.dispatchEvent(new Event("submit"));
    });
    reportEl.scrollIntoView({ behavior: "smooth", block: "start" });
    injectActionBar(topic, region, json);
  } catch {
    reportEl.innerHTML = "";
    if (statusBar) { statusBar.className = "status-bar error"; statusBar.textContent = "Network error. Is the server running?"; }
  } finally {
    if (searchBtn) searchBtn.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch(topicInput.value.trim(), regionSelect.value);
});

if (params.get("topic") && params.get("region")) {
  runSearch(params.get("topic"), params.get("region"));
}
