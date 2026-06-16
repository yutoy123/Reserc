/**
 * Hardcoded topic → World Bank indicator lookup for Explore mode.
 * Each topic category maps to 4–6 WDI codes.
 */

const INDICATOR_DEFS = {
  "EN.ATM.CO2E.PC": {
    label: "CO₂ emissions (metric tons per capita)",
    unit: "metric tons",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "AG.LND.FRST.ZS": {
    label: "Forest area (% of land area)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "EG.FEC.RNEW.ZS": {
    label: "Renewable energy consumption (%)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "EG.USE.PCAP.KG.OE": {
    label: "Energy use (kg oil equivalent per capita)",
    unit: "kg",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "EN.ATM.CO2E.KT": {
    label: "Total CO₂ emissions (kt)",
    unit: "kt",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "FX.OWN.TOTL.ZS": {
    label: "Bank account ownership (% age 15+)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "FS.AST.PRVT.GD.ZS": {
    label: "Domestic credit to private sector (% GDP)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "BX.KLT.DINV.WD.GD.ZS": {
    label: "Foreign direct investment (% GDP)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "FM.LBL.BMNY.GD.ZS": {
    label: "Broad money (% of GDP)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SI.POV.DDAY": {
    label: "Poverty headcount at $2.15/day",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "NY.GDP.PCAP.CD": {
    label: "GDP per capita (current USD)",
    unit: "USD",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "FP.CPI.TOTL.ZG": {
    label: "Inflation, consumer prices (annual %)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "line",
  },
  "AG.PRD.FOOD.XD": {
    label: "Food production index",
    unit: "index",
    source: "World Bank WDI",
    chartType: "line",
  },
  "FP.CPI.FOOD.ZG": {
    label: "Food price inflation (annual %)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "line",
  },
  "SN.ITK.DEFC.ZS": {
    label: "Prevalence of undernourishment",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SH.DYN.MORT": {
    label: "Under-5 mortality (per 1,000 live births)",
    unit: "per 1,000",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SH.XPD.CHEX.GD.ZS": {
    label: "Health expenditure (% of GDP)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SP.DYN.LE00.IN": {
    label: "Life expectancy at birth (years)",
    unit: "years",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SE.PRM.ENRR": {
    label: "Primary school enrollment (% gross)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SE.SEC.ENRR": {
    label: "Secondary school enrollment (% gross)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SE.ADT.LITR.ZS": {
    label: "Adult literacy rate",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "IT.CEL.SETS.P2": {
    label: "Mobile subscriptions (per 100 people)",
    unit: "per 100",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "EG.ELC.ACCS.ZS": {
    label: "Access to electricity (% of population)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SL.UEM.TOTL.ZS": {
    label: "Unemployment (% of labor force)",
    unit: "%",
    source: "World Bank WDI",
    chartType: "bar",
  },
  "SP.DYN.TFRT.IN": {
    label: "Fertility rate (births per woman)",
    unit: "births",
    source: "World Bank WDI",
    chartType: "bar",
  },
};

const TOPIC_CATEGORIES = [
  {
    id: "environmental",
    keywords: [
      "environment", "environmental", "climate", "carbon", "co2", "forest",
      "renewable", "pollution", "ecological", "green", "emissions", "sustainability",
    ],
    indicators: [
      "EN.ATM.CO2E.PC", "AG.LND.FRST.ZS", "EG.FEC.RNEW.ZS",
      "EG.USE.PCAP.KG.OE", "EN.ATM.CO2E.KT", "EG.ELC.ACCS.ZS",
    ],
  },
  {
    id: "financial",
    keywords: [
      "financial", "finance", "bank", "credit", "mobile money", "inclusion",
      "savings", "microfinance", "fintech", "remittance", "investment",
    ],
    indicators: [
      "FX.OWN.TOTL.ZS", "FS.AST.PRVT.GD.ZS", "BX.KLT.DINV.WD.GD.ZS",
      "FM.LBL.BMNY.GD.ZS", "NY.GDP.PCAP.CD", "SI.POV.DDAY",
    ],
  },
  {
    id: "food",
    keywords: [
      "food", "agriculture", "hunger", "nutrition", "inflation", "farming",
      "undernourishment", "crop", "livestock",
    ],
    indicators: [
      "AG.PRD.FOOD.XD", "FP.CPI.FOOD.ZG", "SN.ITK.DEFC.ZS",
      "FP.CPI.TOTL.ZG", "SI.POV.DDAY", "NY.GDP.PCAP.CD",
    ],
  },
  {
    id: "health",
    keywords: [
      "health", "mortality", "healthcare", "disease", "maternal", "child mortality",
      "life expectancy", "hospital",
    ],
    indicators: [
      "SH.DYN.MORT", "SH.XPD.CHEX.GD.ZS", "SP.DYN.LE00.IN",
      "SP.DYN.TFRT.IN", "SI.POV.DDAY", "NY.GDP.PCAP.CD",
    ],
  },
  {
    id: "education",
    keywords: [
      "education", "school", "literacy", "enrollment", "learning", "student",
      "primary", "secondary", "university",
    ],
    indicators: [
      "SE.PRM.ENRR", "SE.SEC.ENRR", "SE.ADT.LITR.ZS",
      "NY.GDP.PCAP.CD", "SI.POV.DDAY", "SP.DYN.LE00.IN",
    ],
  },
  {
    id: "development",
    keywords: [
      "poverty", "development", "growth", "inequality", "lmic", "low income",
      "middle income", "urbanization", "employment", "labor",
    ],
    indicators: [
      "SI.POV.DDAY", "NY.GDP.PCAP.CD", "FP.CPI.TOTL.ZG",
      "SL.UEM.TOTL.ZS", "EG.ELC.ACCS.ZS", "IT.CEL.SETS.P2",
    ],
  },
];

const DEFAULT_INDICATORS = [
  "SI.POV.DDAY", "NY.GDP.PCAP.CD", "FP.CPI.TOTL.ZG",
  "EG.ELC.ACCS.ZS", "IT.CEL.SETS.P2", "FX.OWN.TOTL.ZS",
];

export function resolveExploreIndicators(topic) {
  const lower = topic.toLowerCase();
  let best = { score: 0, indicators: DEFAULT_INDICATORS, category: "general" };

  for (const cat of TOPIC_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) score += kw.includes(" ") ? 3 : 1;
    }
    if (score > best.score) {
      best = { score, indicators: cat.indicators, category: cat.id };
    }
  }

  const ids = best.indicators.slice(0, 6);
  return {
    category: best.category,
    indicators: ids.map((id) => ({
      id,
      ...INDICATOR_DEFS[id],
    })),
  };
}

export { INDICATOR_DEFS };
