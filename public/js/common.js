export function esc(str) {
  if (str == null) return "";
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

export function setActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.page === page);
  });
}

export function showStatus(el, msg, isError = false) {
  el.className = isError ? "status-bar error" : "status-bar";
  el.textContent = msg;
}

export function setLoading(el, btn, on, msg = "Loading…") {
  if (btn) btn.disabled = on;
  if (el) {
    el.className = "status-bar";
    el.innerHTML = on ? `<span class="spinner"></span> ${msg}` : "";
  }
}

export const REGIONS = [
  "Sub-Saharan Africa",
  "South Asia",
  "East Asia and Pacific",
  "Latin America and Caribbean",
  "Middle East and North Africa",
  "Europe and Central Asia",
  "Low Income",
  "Lower Middle Income",
  "Upper Middle Income",
  "World",
];

export function regionSelectHtml(id = "region") {
  const opts = REGIONS.map(
    (r) => `<option value="${esc(r)}">${esc(r)}</option>`
  ).join("");
  return `<select id="${id}" name="region" required>
    <option value="">Select a region…</option>${opts}
  </select>`;
}

document.addEventListener("DOMContentLoaded", setActiveNav);
