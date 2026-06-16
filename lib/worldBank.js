const BASE_URL = "https://api.worldbank.org/v2";

export const DEFAULT_INDICATORS = [
  { id: "FX.OWN.TOTL.ZS", label: "Bank account ownership (% age 15+)", unit: "%", source: "Global Findex" },
  { id: "SI.POV.DDAY", label: "Poverty headcount ratio at $2.15/day", unit: "%", source: "WDI" },
  { id: "NY.GDP.PCAP.CD", label: "GDP per capita (current USD)", unit: "USD", source: "WDI" },
  { id: "FP.CPI.TOTL.ZG", label: "Inflation, consumer prices (annual %)", unit: "%", source: "WDI" },
  { id: "IT.CEL.SETS.P2", label: "Mobile cellular subscriptions (per 100)", unit: "per 100", source: "WDI" },
  { id: "EG.ELC.ACCS.ZS", label: "Access to electricity (% of population)", unit: "%", source: "WDI" },
];

export const TOPIC_INDICATORS = {
  food: [
    { id: "AG.PRD.FOOD.XD", label: "Food production index", unit: "index", source: "WDI" },
    { id: "FP.CPI.FOOD.ZG", label: "Food price inflation (annual %)", unit: "%", source: "WDI" },
    { id: "SN.ITK.DEFC.ZS", label: "Prevalence of undernourishment", unit: "%", source: "WDI" },
  ],
  health: [
    { id: "SH.DYN.MORT", label: "Mortality rate, under-5 (per 1,000)", unit: "per 1,000", source: "WDI" },
    { id: "SH.XPD.CHEX.GD.ZS", label: "Current health expenditure (% of GDP)", unit: "%", source: "WDI" },
    { id: "SP.DYN.LE00.IN", label: "Life expectancy at birth", unit: "years", source: "WDI" },
  ],
  education: [
    { id: "SE.PRM.ENRR", label: "Primary school enrollment (% gross)", unit: "%", source: "WDI" },
    { id: "SE.SEC.ENRR", label: "Secondary school enrollment (% gross)", unit: "%", source: "WDI" },
    { id: "SE.ADT.LITR.ZS", label: "Literacy rate, adult total", unit: "%", source: "WDI" },
  ],
  finance: [
    { id: "FS.AST.PRVT.GD.ZS", label: "Domestic credit to private sector (% GDP)", unit: "%", source: "WDI" },
    { id: "BX.KLT.DINV.WD.GD.ZS", label: "Foreign direct investment, net inflows (% GDP)", unit: "%", source: "WDI" },
    { id: "FM.LBL.BMNY.GD.ZS", label: "Broad money (% of GDP)", unit: "%", source: "WDI" },
  ],
  climate: [
    { id: "EN.ATM.CO2E.PC", label: "CO2 emissions (metric tons per capita)", unit: "metric tons", source: "WDI" },
    { id: "AG.LND.FRST.ZS", label: "Forest area (% of land area)", unit: "%", source: "WDI" },
    { id: "EG.USE.PCAP.KG.OE", label: "Energy use (kg of oil equivalent per capita)", unit: "kg", source: "WDI" },
  ],
};

export const REGION_CODES = {
  "sub-saharan africa": "SSA",
  "ssa": "SSA",
  "south asia": "SAS",
  "sas": "SAS",
  "east asia and pacific": "EAP",
  "eap": "EAP",
  "latin america and caribbean": "LCN",
  "lcn": "LCN",
  "middle east and north africa": "MNA",
  "mena": "MNA",
  "europe and central asia": "ECS",
  "ecs": "ECS",
  "north america": "NAC",
  "low income": "LIC",
  "lower middle income": "LMC",
  "upper middle income": "UMC",
  "low and middle income": "LMY",
  "world": "WLD",
};

function pickIndicators(topic) {
  const lower = topic.toLowerCase();
  const extra = [];
  for (const [key, indicators] of Object.entries(TOPIC_INDICATORS)) {
    if (lower.includes(key)) extra.push(...indicators);
  }
  const seen = new Set();
  return [...DEFAULT_INDICATORS, ...extra].filter((ind) => {
    if (seen.has(ind.id)) return false;
    seen.add(ind.id);
    return true;
  });
}

export function resolveRegionCode(region) {
  const normalized = region.trim().toLowerCase();
  if (REGION_CODES[normalized]) return REGION_CODES[normalized];
  return region.trim().toUpperCase().replace(/\s+/g, "");
}

async function fetchIndicator(regionCode, indicatorId) {
  const url = `${BASE_URL}/country/${regionCode}/indicator/${indicatorId}?format=json&per_page=10&date=2015:2024`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank API error: ${res.status}`);
  const data = await res.json();
  const rows = data[1] || [];
  const latest = rows.find((r) => r.value != null);
  return latest
    ? { year: latest.date, value: latest.value, country: latest.country?.value }
    : null;
}

function formatValue(value, unit) {
  if (value == null) return "N/A";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (unit === "%") return `${num.toFixed(1)}%`;
  if (unit === "USD") return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return num.toFixed(1);
}

export const REGION_COUNTRIES = {
  SSA: ["KE", "UG", "TZ", "NG", "GH", "ET", "ZA", "RW", "SN", "CI"],
  SAS: ["IN", "BD", "PK", "LK", "NP", "AF", "BT", "MV", "MM", "KH"],
  EAP: ["ID", "PH", "VN", "TH", "MY", "KH", "LA", "MM", "MN", "PG"],
  LCN: ["BR", "MX", "CO", "AR", "PE", "CL", "EC", "GT", "BO", "DO"],
  MNA: ["EG", "MA", "TN", "JO", "LB", "DZ", "IQ", "YE", "PS", "SD"],
  ECS: ["PL", "RO", "UA", "KZ", "GE", "AM", "AZ", "MD", "BG", "RS"],
  LIC: ["BD", "ET", "UG", "MZ", "BF", "ML", "NE", "TD", "SS", "YE"],
  LMC: ["IN", "NG", "PK", "VN", "PH", "EG", "KE", "UA", "MA", "BD"],
  UMC: ["BR", "MX", "CN", "ID", "TR", "TH", "ZA", "MY", "CO", "PE"],
  WLD: ["KE", "IN", "NG", "BD", "VN", "ET", "PH", "EG", "BR", "PK"],
};

function pickChartIndicator(topic) {
  const indicators = pickIndicators(topic);
  const preferred = indicators.find((i) => i.id === "FX.OWN.TOTL.ZS") || indicators[0];
  return preferred;
}

async function fetchIndicatorForCountries(countryCodes, indicatorId) {
  const codes = countryCodes.join(";");
  const url = `${BASE_URL}/country/${codes}/indicator/${indicatorId}?format=json&per_page=500&date=2018:2024`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank API error: ${res.status}`);
  const data = await res.json();
  const rows = data[1] || [];

  const byCountry = new Map();
  for (const row of rows) {
    if (row.value == null) continue;
    const code = row.country?.id;
    if (!code) continue;
    const existing = byCountry.get(code);
    if (!existing || Number(row.date) > Number(existing.year)) {
      byCountry.set(code, {
        code,
        name: row.country?.value,
        value: row.value,
        year: row.date,
      });
    }
  }
  return byCountry;
}

export async function fetchCountryComparison(region, topic, limit = 10) {
  const regionCode = resolveRegionCode(region);
  const indicator = pickChartIndicator(topic);
  const codes = (REGION_COUNTRIES[regionCode] || REGION_COUNTRIES.WLD).slice(0, limit);
  const byCountry = await fetchIndicatorForCountries(codes, indicator.id);

  const countries = codes
    .map((code) => byCountry.get(code))
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);

  return {
    indicator: {
      id: indicator.id,
      label: indicator.label,
      unit: indicator.unit,
      source: indicator.source,
    },
    countries: countries.map((c) => ({
      code: c.code,
      name: c.name,
      value: c.value,
      year: c.year,
      displayValue: formatValue(c.value, indicator.unit),
    })),
  };
}

export async function fetchWorldBankData(region, topic) {
  const regionCode = resolveRegionCode(region);
  const indicators = pickIndicators(topic);
  const results = await Promise.all(
    indicators.map(async (ind) => ({
      ...ind,
      data: await fetchIndicator(regionCode, ind.id),
    }))
  );

  const years = results.map((r) => r.data?.year).filter(Boolean).map(Number);
  const yearRange = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : "2015–2024";

  const regionLabel = results.find((r) => r.data?.country)?.data?.country || region;
  const lines = [`WORLD BANK DATA FOR ${regionLabel} (${yearRange}):`, ""];

  for (const { label, unit, source, id, data } of results) {
    const val = data ? formatValue(data.value, unit) : "N/A";
    const yearNote = data?.year ? ` (${data.year})` : "";
    lines.push(`- ${label}: ${val}${yearNote} — Source: ${source} (${id})`);
  }

  return {
    formatted: lines.join("\n"),
    regionCode,
    regionLabel,
    yearRange,
    indicators: results,
  };
}
