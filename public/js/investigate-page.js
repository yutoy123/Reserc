import { setLoading } from "./common.js";
import { renderReport } from "./investigate.js";

const form = document.getElementById("searchForm");
const statusBar = document.getElementById("statusBar");
const reportEl = document.getElementById("report");
const searchBtn = document.getElementById("searchBtn");
const topicInput = document.getElementById("topic");
const regionSelect = document.getElementById("region");

const params = new URLSearchParams(location.search);
if (params.get("topic")) topicInput.value = params.get("topic");
if (params.get("region")) regionSelect.value = params.get("region");

async function runSearch(topic, region) {
  setLoading(statusBar, searchBtn, true, "Fetching World Bank data and synthesizing report…");
  reportEl.classList.remove("visible");
  reportEl.innerHTML = "";

  try {
    const res = await fetch("/api/research", {
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
    renderReport(json.data, reportEl, json.meta, (t) => {
      topicInput.value = t;
      form.dispatchEvent(new Event("submit"));
    });
    reportEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    statusBar.className = "status-bar error";
    statusBar.textContent = "Network error. Is the server running?";
  } finally {
    setLoading(statusBar, searchBtn, false);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch(topicInput.value.trim(), regionSelect.value);
});

if (params.get("topic") && params.get("region")) {
  runSearch(params.get("topic"), params.get("region"));
}
