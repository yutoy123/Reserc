import { esc, setLoading } from "./common.js";

function renderStatCards(indicators) {
  return `<div class="explore-stats-row">${indicators.map((ind) => {
    if (!ind.hasData) {
      return `
        <div class="explore-stat-card explore-stat-empty">
          <div class="metric-label">${esc(ind.label)}</div>
          <p class="no-data-neutral">Limited regional data — view by country in Investigate</p>
        </div>`;
    }
    return `
      <div class="explore-stat-card">
        <div class="metric-label">${esc(ind.stat.label)}</div>
        <div class="metric-value">${esc(ind.stat.value)}</div>
        <div class="metric-unit">${esc(ind.stat.year)} · median · ${ind.stat.countryCount} countries</div>
        <div class="metric-meta">${esc(ind.stat.source)}</div>
        <div class="metric-note">${esc(ind.stat.note)}</div>
      </div>`;
  }).join("")}</div>`;
}

function renderBarChart(chart) {
  if (!chart?.countries?.length || chart.countries.length < 4) {
    return `<p class="no-data-neutral">Insufficient country-level data for this region (${chart?.countries?.length || 0} countries reported). This indicator has limited coverage among LIC/LMC countries here.</p>`;
  }
  const max = Math.max(...chart.countries.map((c) => c.value));
  return `
    <div class="bar-chart">
      ${chart.countries.map((c) => {
        const pct = max > 0 ? (c.value / max) * 100 : 0;
        return `
          <div class="bar-row">
            <span class="bar-label" title="${esc(c.name)}">${esc(c.name)}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="bar-value">${esc(c.displayValue)}</span>
          </div>`;
      }).join("")}
    </div>`;
}

function renderLineChart(chart) {
  if (!chart?.countries?.length || chart.countries.length < 3) {
    return `<p class="no-data-neutral">Insufficient country-level data for this region (${chart?.countries?.length || 0} countries reported). This indicator has limited coverage among LIC/LMC countries here.</p>`;
  }
  const sorted = [...chart.countries].sort((a, b) => a.value - b.value);
  const min = sorted[0].value;
  const max = sorted[sorted.length - 1].value;
  const range = max - min || 1;
  const w = 400, h = 120, pad = 20;
  const points = sorted.map((c, i) => {
    const x = pad + (i / (sorted.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((c.value - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return `
    <div class="line-chart-wrap">
      <svg viewBox="0 0 ${w} ${h}" class="line-chart" aria-hidden="true">
        <polyline points="${points}" fill="none" stroke="var(--forest)" stroke-width="2"/>
        ${sorted.map((c, i) => {
          const x = pad + (i / (sorted.length - 1 || 1)) * (w - pad * 2);
          const y = h - pad - ((c.value - min) / range) * (h - pad * 2);
          return `<circle cx="${x}" cy="${y}" r="3" fill="var(--gold)"/>`;
        }).join("")}
      </svg>
      <div class="line-chart-labels">
        <span>${esc(sorted[0].name)} (${esc(sorted[0].displayValue)})</span>
        <span>${esc(sorted[sorted.length-1].name)} (${esc(sorted[sorted.length-1].displayValue)})</span>
      </div>
    </div>`;
}

function renderCharts(charts) {
  if (!charts?.length) {
    return `<p class="no-data-neutral">No chart data available for this region — none of the selected indicators returned enough values for LIC/LMC countries here. Try Investigate for a full AI-generated brief.</p>`;
  }
  return charts.map((chart) => `
    <div class="chart-panel explore-chart-block">
      <div class="chart-header">
        <h3 class="chart-title">${esc(chart.label)}</h3>
        <p class="chart-meta">${chart.countries.length} LIC/LMC countries · latest available year</p>
      </div>
      ${chart.type === "line" ? renderLineChart(chart) : renderBarChart(chart)}
      <p class="chart-source">Source: World Bank WDI · Data year: ${esc(chart.year)}</p>
    </div>
  `).join("");
}

function renderExploreOutput(data) {
  return `
    <div class="explore-meta">
      <span class="explore-tag">${esc(data.category)} indicators</span>
      <span class="explore-tag">${data.lmicCountryCount} LIC/LMC countries in ${esc(data.region)}</span>
    </div>
    ${renderStatCards(data.indicators)}
    <div class="explore-charts-section">
      <h3 class="section-heading">Country comparisons</h3>
      <div class="explore-charts-grid">${renderCharts(data.charts)}</div>
    </div>
    <div class="explore-summary-section">
      <h3 class="section-heading">What these numbers mean</h3>
      <p class="explore-summary">${esc(data.summary)}</p>
      ${data.summaryGenerated ? "" : `<p class="summary-note">AI summary requires ANTHROPIC_API_KEY in .env</p>`}
    </div>
  `;
}

export function initExplore() {
  const form = document.getElementById("exploreForm");
  const statusBar = document.getElementById("exploreStatus");
  const output = document.getElementById("exploreOutput");
  const toInvestigate = document.getElementById("toInvestigate");
  const toBuild = document.getElementById("toBuild");

  function skeletonExplore() {
    return `
      <div class="sk-explore">
        <div class="sk-block sk-explore-title"></div>
        <div class="sk-stat-row">
          ${Array.from({ length: 4 }, () => '<div class="sk-block sk-stat"></div>').join('')}
        </div>
        <div class="sk-block sk-chart-label"></div>
        <div class="sk-block sk-chart-block"></div>
        <div class="sk-block sk-chart-label" style="margin-top:20px"></div>
        <div class="sk-block sk-chart-block"></div>
      </div>`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const interest = document.getElementById("interest").value.trim();
    const region = document.getElementById("exploreRegion").value;
    if (statusBar) { statusBar.className = "status-bar"; statusBar.textContent = ""; }
    output.innerHTML = skeletonExplore();
    output.style.display = "block";

    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest, region }),
      });
      const json = await res.json();
      if (json.rawApiResponses) {
        console.log("[Explore] Raw World Bank API responses:", json.rawApiResponses);
      }
      if (!json.success) {
        statusBar.className = "status-bar error";
        statusBar.textContent = json.error;
        return;
      }
      statusBar.textContent = `Live data · ${json.region} · ${json.indicators.filter(i => i.hasData).length}/${json.indicators.length} indicators`;
      output.innerHTML = renderExploreOutput(json);
      output.style.display = "block";
      const q = `?topic=${encodeURIComponent(interest)}&region=${encodeURIComponent(region)}`;
      toInvestigate.href = `/investigate.html${q}`;
      toBuild.href = `/build.html?topic=${encodeURIComponent(interest)}&region=${encodeURIComponent(region)}`;
    } catch (err) {
      output.innerHTML = "";
      output.style.display = "none";
      if (statusBar) { statusBar.className = "status-bar error"; statusBar.textContent = "Could not load data."; }
      console.error("[Explore] Error:", err);
    }
  });
}
