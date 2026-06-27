import { esc, setLoading } from "./common.js";

const form        = document.getElementById("buildForm");
const statusBar   = document.getElementById("statusBar");
const reportEl    = document.getElementById("buildReport");
const buildBtn    = document.getElementById("buildBtn");
const topicInput  = document.getElementById("topic");
const regionSelect = document.getElementById("region");

const params = new URLSearchParams(location.search);
if (params.get("topic"))  topicInput.value   = params.get("topic");
if (params.get("region")) regionSelect.value = params.get("region");

const DIMENSION_LABELS = { core: "Core lens", social: "Social", environmental: "Environmental", systems: "Systems" };

function renderBuildReport(data, highlightFrameworkId) {
  const fwCards = data.frameworks.map((fw, i) => {
    const isPrimary = highlightFrameworkId ? fw.id === highlightFrameworkId : i === 0;
    return `
    <div class="framework-card ${isPrimary ? "primary" : ""} ${isPrimary ? "open" : ""}" data-fw="${esc(fw.id)}">
      <div class="framework-header" role="button" tabindex="0">
        <div>
          <h3><a href="/frameworks.html#${esc(fw.id)}">${esc(fw.name)}</a></h3>
          <span class="dimension-badge dim-${esc(fw.dimension)}">${esc(DIMENSION_LABELS[fw.dimension] || fw.dimension)}</span>
        </div>
        <span class="policy-chevron">▾</span>
      </div>
      <div class="framework-body">
        <p class="framework-relevance">${esc(fw.relevance)}</p>
        <p>${esc(fw.summary)}</p>
        <p class="fw-lmic"><strong>LMIC context:</strong> ${esc(fw.lmicApplication)}</p>
        <p class="fw-use">Use when: ${esc(fw.useWhen)}</p>
        <button type="button" class="btn btn-forest btn-sm apply-lens" data-fw-id="${esc(fw.id)}" data-fw-name="${esc(fw.name)}">
          Apply this lens to hypothesis
        </button>
      </div>
    </div>
  `;
  }).join("");

  const methods   = data.scaffold.methods.map(m => `<li><strong>${esc(m.name)}</strong> — ${esc(m.why)}</li>`).join("");
  const questions = data.scaffold.researchQuestions.map((q, i) => `
    <label class="question-field">
      <span class="q-num">${i + 1}</span>
      <input type="text" class="research-q" placeholder="${esc(q)}" aria-label="${esc(q)}">
    </label>
  `).join("");
  const structure = data.scaffold.argumentStructure.map(s => `<li>${esc(s)}</li>`).join("");

  reportEl.innerHTML = `
    <h2 class="report-title">Argument scaffold: ${esc(data.topic)}</h2>
    ${data.interdisciplinary ? `
      <div class="interdisciplinary-note">
        <h4>Interdisciplinary angle</h4>
        <p>${esc(data.interdisciplinary)}</p>
      </div>
    ` : ""}
    <div class="section">
      <h3 class="section-heading">Relevant frameworks</h3>
      <p style="font-size:.9rem;color:var(--ink-soft);margin-bottom:16px">Click a framework to expand. Each links to the full framework page.</p>
      ${fwCards}
    </div>
    <div class="section">
      <h3 class="section-heading">Structure your research questions</h3>
      <div class="scaffold-block">
        <p class="scaffold-prompt">Fill in your answers — these force clarity before you draft a hypothesis.</p>
        <div class="question-grid">${questions}</div>
      </div>
    </div>
    <div class="section">
      <h3 class="section-heading">Suggested methodological approaches</h3>
      <div class="scaffold-block"><ul class="scaffold-list">${methods}</ul></div>
    </div>
    <div class="section">
      <h3 class="section-heading">Hypothesis scaffold</h3>
      <div class="scaffold-block">
        <p class="scaffold-prompt">Draft your hypothesis below. Use "Apply this lens" on a framework to update the template.</p>
        <textarea id="hypothesisDraft" class="hypothesis-draft" rows="5">${esc(data.scaffold.hypothesisTemplate)}</textarea>
      </div>
    </div>
    <div class="section">
      <h3 class="section-heading">Argument structure</h3>
      <div class="scaffold-block"><ol class="scaffold-list">${structure}</ol></div>
    </div>
    <div class="section report-next-steps">
      <a href="/investigate.html?topic=${encodeURIComponent(data.topic)}${data.region ? `&region=${encodeURIComponent(data.region)}` : ""}" class="btn btn-secondary" style="color:var(--ink);border-color:var(--rule);margin-right:8px">Get data in Investigate →</a>
      <a href="/frameworks.html" class="btn btn-forest">Browse all frameworks →</a>
    </div>
  `;
  reportEl.classList.add("visible");

  reportEl.querySelectorAll(".framework-header").forEach(header => {
    header.addEventListener("click", () => header.closest(".framework-card").classList.toggle("open"));
    header.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); header.closest(".framework-card").classList.toggle("open"); }
    });
  });

  reportEl.querySelectorAll(".apply-lens").forEach(btn => {
    btn.addEventListener("click", () => {
      const draft = reportEl.querySelector("#hypothesisDraft");
      draft.value = `In the context of ${btn.dataset.fwName}, a plausible hypothesis for "${data.topic}" might take the form: [X variable / intervention] is associated with [Y outcome] because [theoretical mechanism linking them in LMIC contexts].`;
      draft.focus();
    });
  });

  if (highlightFrameworkId) {
    const card = reportEl.querySelector(`[data-fw="${highlightFrameworkId}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function injectActionBar(topic, region, buildData) {
  let bar = document.getElementById("buildActionBar");
  if (bar) bar.remove();

  bar = document.createElement("div");
  bar.id = "buildActionBar";
  bar.style.cssText = `
    display:flex;gap:10px;flex-wrap:wrap;margin:24px 0 0;
    padding:16px 0;border-top:1px solid var(--sand);
  `;

  bar.innerHTML = `
    <button id="saveBuildBtn" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--ochre);color:var(--ochre);background:none;cursor:pointer;transition:all .2s">
      ☆ Save to Library
    </button>
    <button id="exportBuildBtn" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--rule);color:var(--ink-soft);background:none;cursor:pointer;transition:all .2s">
      ↓ Export PDF
    </button>
    <a href="/chat.html" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;padding:8px 16px;border:1px solid var(--rule);color:var(--ink-soft);text-decoration:none;transition:all .2s">
      ↗ Discuss with AI
    </a>
  `;

  reportEl.after(bar);

  bar.querySelector("#saveBuildBtn").addEventListener("click", async function () {
    const title = `Build: ${topic}${region ? " · " + region : ""}`;
    const res   = await fetch("/api/library/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "build", title, topic, region, payload: buildData }),
    });
    const data = await res.json();
    if (data.ok) {
      this.textContent = "★ Saved";
      this.style.background = "var(--ochre)";
      this.style.color = "var(--cream)";
      this.disabled = true;
    }
  });

  bar.querySelector("#exportBuildBtn").addEventListener("click", () => {
    const style = document.createElement("style");
    style.id = "__print_style";
    style.textContent = `
      @media print {
        .site-nav, #buildForm, .field, .status-bar, #buildActionBar, footer { display:none!important; }
        body { background:#fff; }
        .report { box-shadow:none!important; }
        .hypothesis-draft { border:1px solid #ccc!important; }
        input.research-q { border:1px solid #ccc!important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById("__print_style")?.remove(), 1000);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const topic  = topicInput.value.trim();
  const region = regionSelect.value;
  setLoading(statusBar, buildBtn, true, "Matching frameworks and building scaffold…");
  reportEl.classList.remove("visible");
  document.getElementById("buildActionBar")?.remove();

  try {
    const res  = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, region }),
    });
    const json = await res.json();
    if (!json.success) {
      statusBar.className = "status-bar error";
      statusBar.textContent = json.error;
      return;
    }
    statusBar.textContent = "";
    renderBuildReport(json.data, params.get("framework"));
    injectActionBar(topic, region, json.data);
  } catch {
    statusBar.className = "status-bar error";
    statusBar.textContent = "Network error. Is the server running?";
  } finally {
    setLoading(statusBar, buildBtn, false);
  }
});

if (params.get("topic")) form.dispatchEvent(new Event("submit"));
