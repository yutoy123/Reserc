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

  return scored.slice(0, 5);
}

export function getInterdisciplinaryNote(frameworks) {
  const dims = new Set(frameworks.map((f) => f.dimension));
  const names = frameworks.map((f) => f.name);

  if (dims.has("social") && dims.has("environmental")) {
    return `Your topic sits at the intersection of social and environmental economics. Consider combining ${names.slice(0, 3).join(", ")} — researchers increasingly use mixed lenses for LMIC topics that span community behavior and natural resource use.`;
  }
  if (dims.has("social") && frameworks.length >= 2) {
    return `Your topic draws on multiple social lenses (${names.filter((_, i) => frameworks[i].dimension === "social").join(", ")}). Look for papers that combine behavioral insights with institutional or welfare analysis.`;
  }
  if (dims.has("environmental")) {
    return `Environmental dimensions are present. Check whether your argument needs ecological limits (stock-flow thinking) or market-based instruments (valuation and policy design) — they answer different questions.`;
  }
  return null;
}

export function buildScaffold(topic, frameworks) {
  const primary = frameworks[0]?.name || "Development Economics";
  const secondary = frameworks[1]?.name;

  return {
    researchQuestions: [
      "What is your dependent variable — what outcome are you trying to explain or measure?",
      "What is your independent variable or intervention of interest?",
      "What is the unit of analysis (household, community, district, country)?",
      "What time period and geographic scope define your study?",
    ],
    methods: suggestMethods(topic, frameworks),
    hypothesisTemplate: `In the context of ${primary}${secondary ? ` and ${secondary}` : ""}, a plausible hypothesis might take the form: [X variable / intervention] is associated with [Y outcome] because [theoretical mechanism linking them in LMIC contexts]. Try drafting yours for: "${topic}".`,
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

  if (lower.match(/case|uganda|ghana|kenya|country|village|rural/)) {
    methods.push({
      name: "Case study",
      why: "Deep contextual understanding of a specific LMIC setting; strong for institutional and behavioral mechanisms.",
    });
  }
  if (lower.match(/compare|across|regional|cross-country/)) {
    methods.push({
      name: "Comparative analysis",
      why: "Useful when institutional or policy variation across similar LMICs is your explanatory variable.",
    });
  }
  if (lower.match(/impact|effect|correlation|penetration|rate|percent|data/)) {
    methods.push({
      name: "Quantitative regression",
      why: "Appropriate when you have panel or cross-sectional data and want to estimate associations controlling for confounders.",
    });
  }
  if (frameworks.some((f) => f.id === "behavioral-economics")) {
    methods.push({
      name: "RCT or quasi-experimental design",
      why: "Behavioral frameworks often rely on experimental evidence to isolate causal mechanisms.",
    });
  }

  if (methods.length === 0) {
    methods.push({
      name: "Mixed methods",
      why: "Combines qualitative depth with quantitative patterns — common and valuable in LMIC research where data is incomplete.",
    });
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
      relevance: fw.matches.length
        ? `Matched: ${fw.matches.slice(0, 4).join(", ")}`
        : "Core lens for LMIC research",
      lmicApplication: fw.lmicApplication,
      useWhen: fw.useWhen,
    })),
    interdisciplinary,
    scaffold,
  };
}
