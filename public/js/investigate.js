import { esc } from "./common.js";

export function badgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "badge-active";
  if (s === "completed") return "badge-completed";
  return "badge-proposed";
}

export function renderMetrics(metrics) {
  return `<div class="metrics-grid">${metrics.map(m => `
    <div class="metric-card">
      <div class="metric-label">${esc(m.label)}</div>
      <div class="metric-value">${esc(m.value)}</div>
      <div class="metric-unit">${esc(m.unit)} · ${esc(m.year)}</div>
      <div class="metric-meta">${esc(m.source)}</div>
      ${m.note ? `<div class="metric-note">${esc(m.note)}</div>` : ""}
    </div>
  `).join("")}</div>`;
}

export function renderPolicies(policies) {
  return policies.map((p, i) => `
    <div class="policy-card" data-idx="${i}">
      <div class="policy-header" onclick="togglePolicy(${i})">
        <span class="policy-title">${esc(p.title)}</span>
        <span>
          <span class="badge ${badgeClass(p.status)}">${esc(p.status)}</span>
          <span class="policy-chevron"> ▾</span>
        </span>
      </div>
      <div class="policy-body">
        <p>${esc(p.description)}</p>
        <div class="policy-actor">${esc(p.actor)}</div>
        <div class="policy-countries">${(p.countries || []).map(esc).join(" · ")}</div>
      </div>
    </div>
  `).join("");
}

export function renderGaps(gaps) {
  return gaps.map(g => `
    <div class="gap-item">
      <div class="gap-title">${esc(g.gap)}</div>
      <p class="gap-why">${esc(g.why_it_matters)}</p>
      <p class="gap-angle">${esc(g.suggested_angle)}</p>
    </div>
  `).join("");
}

export function renderSources(sources) {
  return `<ul class="source-list">${sources.map(s => `
    <li class="source-item">
      <span>
        ${s.url
          ? `<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
          : `<span>${esc(s.title)}</span>`}
        <span class="source-meta"> — ${esc(s.org)}</span>
      </span>
      <span class="source-meta">${esc(s.type)}</span>
    </li>
  `).join("")}</ul>`;
}

export function renderChips(topics) {
  return `<div class="chips">${topics.map(t =>
    `<button type="button" class="chip" data-topic="${esc(t)}">${esc(t)}</button>`
  ).join("")}</div>`;
}

function renderFrameworkChips(frameworks, topic) {
  if (!frameworks?.length) return "";
  return `<div class="framework-chip-list">${frameworks.map(fw => `
    <div class="framework-chip-row">
      <a class="framework-chip-name" href="/frameworks.html#${esc(fw.id)}" title="${esc(fw.relevance)}">${esc(fw.name)}</a>
      <a class="framework-chip-action" href="/build.html?topic=${encodeURIComponent(topic)}&framework=${esc(fw.id)}">Build with this lens →</a>
    </div>
  `).join("")}</div>`;
}

export function renderReport(data, reportEl, meta, onChipClick) {
  const topic = data.topic_title;
  const topicParam = encodeURIComponent(topic);
  const regionParam = meta?.region ? encodeURIComponent(meta.region) : "";

  reportEl.innerHTML = `
    <h2 class="report-title">${esc(topic)}</h2>

    <p class="report-headline">${esc(data.context_summary.headline)}</p>

    ${renderMetrics(data.key_metrics)}

    <div class="section">
      ${(data.context_summary.paragraphs || []).map(p =>
        `<p class="context-para">${esc(p)}</p>`
      ).join("")}
    </div>

    <div class="section">
      <h3 class="section-heading">Policy Responses</h3>
      ${renderPolicies(data.policy_responses)}
    </div>

    <div class="gaps-section">
      <h3 class="section-heading">Research Gaps</h3>
      ${renderGaps(data.research_gaps)}
    </div>

    <div class="section">
      <h3 class="section-heading">Suggested Sources</h3>
      ${renderSources(data.suggested_sources)}
    </div>

    <div class="section">
      <h3 class="section-heading">Related Topics</h3>
      ${renderChips(data.related_topics || [])}
    </div>

    ${meta?.frameworks?.length ? `
    <div class="section frameworks-bridge">
      <h3 class="section-heading">Relevant Frameworks</h3>
      <p style="font-size:.9rem;color:var(--ink-soft);margin-bottom:12px">
        These economic lenses match your topic. Read the framework or open Build mode to structure your argument.
      </p>
      ${renderFrameworkChips(meta.frameworks, topic)}
    </div>
    ` : ""}

    <div class="section report-next-steps">
      <a href="/build.html?topic=${topicParam}${regionParam ? `&region=${regionParam}` : ""}" class="btn btn-forest">Build your argument →</a>
    </div>
  `;
  reportEl.classList.add("visible");

  reportEl.querySelectorAll(".chip[data-topic]").forEach(chip => {
    chip.addEventListener("click", () => onChipClick(chip.dataset.topic));
  });
}

window.togglePolicy = function(idx) {
  const card = document.querySelector(`.policy-card[data-idx="${idx}"]`);
  if (card) card.classList.toggle("open");
};
