import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cache = null;

export function loadFrameworks() {
  if (cache) return cache;
  const raw = fs.readFileSync(
    path.join(__dirname, "../public/data/frameworks.json"),
    "utf8"
  );
  cache = JSON.parse(raw);
  return cache;
}

const EXTRA_KEYWORDS = {
  "ecological-economics": [
    "climate", "adaptation", "resilience", "biodiversity", "land use",
    "soil", "fisheries", "watershed", "flood", "drought", "sea level",
    "natural resource", "commons", "food security", "environmental",
    "forest", "deforestation", "carbon sink", "water scarcity"
  ],
  "environmental-economics": [
    "climate", "adaptation", "carbon tax", "mitigation", "emission",
    "clean energy", "pollution", "environmental policy", "climate change",
    "climate finance", "green climate", "loss and damage", "ndc",
    "adaptation fund", "climate risk", "heat stress", "extreme weather"
  ],
  "green-economics": [
    "climate", "adaptation", "low carbon", "clean technology", "solar",
    "wind energy", "energy access", "climate resilient", "sustainable",
    "green infrastructure", "nature-based", "agroforestry"
  ],
  "development-economics": [
    "climate", "adaptation", "vulnerability", "livelihoods", "income",
    "poverty", "food", "agriculture", "rural", "household", "aid",
    "structural", "growth", "lmic", "low income", "developing"
  ],
  "behavioral-economics": [
    "adoption", "behavior", "perception", "risk", "insurance",
    "farmer decision", "uptake", "nudge", "trust", "social norm",
    "savings", "mobile money", "index insurance", "willingness to pay"
  ],
  "institutional-economics": [
    "governance", "land", "property", "tenure", "customary",
    "local institution", "community", "coordination", "policy",
    "regulation", "state capacity", "decentralization", "aid"
  ],
  "social-economics": [
    "gender", "women", "household", "vulnerability", "social protection",
    "cash transfer", "community", "inequality", "welfare", "equity",
    "marginalized", "indigenous", "displacement", "migration"
  ],
  "market-economy": [
    "market", "price", "trade", "commodity", "supply chain",
    "food price", "inflation", "competition", "private sector", "export"
  ],
  "mixed-economy": [
    "subsidy", "state", "government", "public", "policy",
    "intervention", "social protection", "industrial", "hybrid"
  ]
};

function scoreFramework(topic, fw) {
  const lower = topic.toLowerCase();
  let score = 0;
  const matches = [];
  for (const kw of fw.keywords) {
    if (lower.includes(kw)) {
      score += kw.split(" ").length > 1 ? 3 : 1;
      matches.push(kw);
    }
  }
  const extras = EXTRA_KEYWORDS[fw.id] || [];
  for (const kw of extras) {
    if (lower.includes(kw) && !matches.includes(kw)) {
      score += kw.split(" ").length > 1 ? 2 : 1;
      matches.push(kw);
    }
  }
  if (fw.dimension === "core") score += 2;
  return { score, matches };
}

export function matchFrameworks(topic) {
  const data = loadFrameworks();
  const scored = Object.values(data.frameworks)
    .map((fw) => {
      const { score, matches } = scoreFramework(topic, fw);
      return { ...fw, score, matches };
    })
    .filter((fw) => fw.score > 0)
    .sort((a, b) => b.score - a.score);

  const development = data.frameworks["development-economics"];
  const hasDev = scored.some((f) => f.id === "development-economics");
  if (!hasDev) {
    scored.unshift({ ...development, score: 2, matches: ["lmic context"] });
  }

  const results = scored.slice(0, 5);
  if (results.length < 2) {
    const ecological = data.frameworks["ecological-economics"];
    if (!results.some(f => f.id === "ecological-economics")) {
      results.push({ ...ecological, score: 1, matches: ["environmental dimension"] });
    }
  }
  return results;
}

export function getInterdisciplinaryNote(frameworks) {
  const dims = new Set(frameworks.map((f) => f.dimension));
  const names = frameworks.map((f) => f.name);
  if (dims.has("social") && dims.has("environmental")) {
    return `Your topic sits at the intersection of social and environmental economics. Consider combining ${names.slice(0, 3).join(", ")} — researchers increasingly use mixed lenses for LMIC topics that span community behaviour and natural resource use.`;
  }
  if (dims.has("environmental") && frameworks.length >= 2) {
    return `Your topic has both environmental and development dimensions. Check whether your argument centres on ecological limits (Ecological Economics) or market instruments and policy design (Environmental Economics) — they answer different questions.`;
  }
  if (dims.has("social") && frameworks.length >= 2) {
    return `Your topic draws on multiple social lenses. Look for papers that combine behavioural insights with institutional or welfare analysis.`;
  }
  return null;
}

function hypothesisTemplate(topic, primaryFw, secondaryFw) {
  const lower = topic.toLowerCase();
  if (lower.includes("climate") || lower.includes("adaptation")) {
    if (primaryFw.id === "ecological-economics") {
      return `In the context of Ecological Economics, a plausible hypothesis for "${topic}" might be: Households in [country/region] with access to [natural capital / ecosystem service] demonstrate greater adaptive capacity to climate shocks, as measured by [outcome indicator], compared to those dependent on [degraded resource base]. Try drafting yours below.`;
    }
    if (primaryFw.id === "environmental-economics") {
      return `In the context of Environmental Economics, a plausible hypothesis for "${topic}" might be: The adoption of [climate policy instrument, e.g. index insurance / carbon payment] is associated with [reduced vulnerability / improved welfare outcome] among [target group] in [LMIC context], because [market mechanism / incentive structure]. Try drafting yours below.`;
    }
    return `In the context of Development Economics, a plausible hypothesis for "${topic}" might be: [Climate shock variable] is negatively associated with [welfare/income outcome] for [household type] in [region], and this effect is mediated by [structural factor e.g. infrastructure, social protection access]. Try drafting yours below.`;
  }
  if (lower.includes("financial inclusion") || lower.includes("mobile money") || lower.includes("banking")) {
    return `In the context of ${primaryFw.name}${secondaryFw ? ` and ${secondaryFw.name}` : ""}, a plausible hypothesis for "${topic}" might be: Access to [mobile money / formal banking] is associated with [savings behaviour / consumption smoothing / investment outcome] among [target group] in [LMIC], because [mechanism linking financial access to the outcome]. Try drafting yours below.`;
  }
  if (lower.includes("food") || lower.includes("nutrition") || lower.includes("agriculture")) {
    return `In the context of ${primaryFw.name}, a plausible hypothesis for "${topic}" might be: [Agricultural / food system variable] is associated with [food security / nutritional outcome] in [LMIC region], with the effect moderated by [policy / institutional / environmental factor]. Try drafting yours below.`;
  }
  return `In the context of ${primaryFw.name}${secondaryFw ? ` and ${secondaryFw.name}` : ""}, a plausible hypothesis for "${topic}" might take the form: [X variable / intervention] is associated with [Y outcome] in [LMIC context] because [theoretical mechanism]. Try drafting yours below.`;
}

export function buildScaffold(topic, frameworks) {
  const primary = frameworks[0];
  const secondary = frameworks[1];
  return {
    researchQuestions: [
      "What is your dependent variable — what outcome are you trying to explain or measure?",
      "What is your independent variable or intervention of interest?",
      "What is the unit of analysis (household, community, district, country)?",
      "What time period and geographic scope define your study?",
    ],
    methods: suggestMethods(topic, frameworks),
    hypothesisTemplate: hypothesisTemplate(topic, primary, secondary),
    argumentStructure: [
      "1. Establish the problem — what does the data show, and why does it matter in this LMIC context?",
      "2. Introduce your theoretical lens — which framework explains the mechanism, not just the correlation?",
      "3. Present evidence — quantitative data, case evidence, or comparative analysis.",
      "4. Address alternative explanations — what else could drive this outcome?",
      "5. State implications — policy, further research, or methodological contribution.",
    ],
  };
}

function suggestMethods(topic, frameworks) {
  const lower = topic.toLowerCase();
  const methods = [];
  if (lower.match(/case|uganda|ghana|kenya|country|village|rural|ethiopia|bangladesh|cambodia/)) {
    methods.push({ name: "Case study", why: "Deep contextual understanding of a specific LMIC setting; strong for institutional and behavioural mechanisms." });
  }
  if (lower.match(/compare|across|regional|cross.country|multiple countries/)) {
    methods.push({ name: "Comparative analysis", why: "Useful when institutional or policy variation across similar LMICs is your explanatory variable." });
  }
  if (lower.match(/impact|effect|correlation|penetration|rate|percent|data|index|measure/)) {
    methods.push({ name: "Quantitative regression", why: "Appropriate when you have panel or cross-sectional data and want to estimate associations controlling for confounders." });
  }
  if (lower.match(/climate|adaptation|resilience|flood|drought|disaster/)) {
    methods.push({ name: "Vulnerability and resilience assessment", why: "Standard in climate-development research; combines household surveys, remote sensing data, and index construction to map adaptive capacity." });
  }
  if (frameworks.some((f) => f.id === "behavioral-economics")) {
    methods.push({ name: "RCT or quasi-experimental design", why: "Behavioural frameworks often rely on experimental evidence to isolate causal mechanisms." });
  }
  if (methods.length === 0) {
    methods.push({ name: "Mixed methods", why: "Combines qualitative depth with quantitative patterns — common and valuable in LMIC research where data is incomplete." });
  }
  return methods.slice(0, 3);
}

export function buildLocalReport(topic, region) {
  const frameworks = matchFrameworks(topic);
  const interdisciplinary = getInterdisciplinaryNote(frameworks);
  const scaffold = buildScaffold(topic, frameworks);
  return {
    topic,
    region: region || null,
    frameworks: frameworks.map((fw) => ({
      id: fw.id,
      name: fw.name,
      dimension: fw.dimension,
      summary: fw.summary,
      relevance: fw.matches.length ? `Matched on: ${fw.matches.slice(0, 4).join(", ")}` : "Core lens for LMIC research",
      lmicApplication: fw.lmicApplication,
      useWhen: fw.useWhen,
    })),
    interdisciplinary,
    scaffold,
  };
}
