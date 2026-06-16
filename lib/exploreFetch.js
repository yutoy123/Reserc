import { resolveRegionCode } from "./worldBank.js";
import { resolveExploreIndicators } from "./exploreIndicators.js";

const BASE_URL = "https://api.worldbank.org/v2";
const SOURCE_LABEL = "World Bank WDI";

/** Maps our region codes → World Bank region / adminregion ids */
const WB_REGION_IDS = {
  SSA: ["SSA", "SSF"],
  SAS: ["SAS"],
  EAP: ["EAP", "EAS"],
  LCN: ["LAC", "LCN"],
  MNA: ["MNA", "MEA"],
  ECS: ["ECA", "ECS"],
  LIC: ["SSF", "SAS", "EAS", "LAC", "MNA", "ECA"],
  LMC: ["SSF", "SAS", "EAS", "LAC", "MNA", "ECA"],
  WLD: null,
};

let countryMetaCache = null;

async function loadCountryMetadata() {
  if (countryMetaCache) return countryMetaCache;
  const res = await fetch(`${BASE_URL}/country?format=json&per_page=500`);
  if (!res.ok) throw new Error(`World Bank country API error: ${res.status}`);
  const data = await res.json();
  countryMetaCache = (data[1] || [])
    .filter((c) => c.iso2Code && c.iso2Code.length === 2)
    .map((c) => ({
      id: c.iso2Code,
      name: c.name,
      regionId: c.region?.id,
      adminRegionId: c.adminregion?.id,
      incomeId: c.incomeLevel?.id,
    }));
  return countryMetaCache;
}

function getLmicCountriesInRegion(countries, regionCode) {
  const allowedRegions = WB_REGION_IDS[regionCode];
  return countries.filter((c) => {
    if (c.incomeId !== "LIC" && c.incomeId !== "LMC") return false;
    if (!allowedRegions) return true;
    return (
      allowedRegions.includes(c.regionId) ||
      allowedRegions.includes(c.adminRegionId)
    );
  });
}

async function fetchIndicatorAllCountries(indicatorId) {
  const allRows = [];
  const rawPages = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE_URL}/country/all/indicator/${indicatorId}?format=json&mrv=1&per_page=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`World Bank API error (${indicatorId}): ${res.status}`);
    const raw = await res.json();
    rawPages.push({ url, raw });
    totalPages = raw[0]?.pages || 1;
    allRows.push(...(raw[1] || []));
    page++;
  }

  return { url: rawPages[0]?.url, raw: rawPages, rows: allRows };
}

function formatDisplayValue(value, unit) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (unit === "%") return `${num.toFixed(1)}%`;
  if (unit === "USD") return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (unit === "index") return num.toFixed(1);
  return num.toFixed(2);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function processIndicator(indicator, allowedIds, regionName) {
  const allowed = new Set(allowedIds.map((c) => c.id));
  const nameById = Object.fromEntries(allowedIds.map((c) => [c.id, c.name]));

  const filtered = indicator.rows.filter(
    (r) => r.value != null && allowed.has(r.country?.id)
  );

  if (!filtered.length) {
    return {
      id: indicator.id,
      label: indicator.label,
      unit: indicator.unit,
      source: SOURCE_LABEL,
      chartType: indicator.chartType,
      hasData: false,
      noDataMessage: `No data available for this region (${regionName}) among LIC and LMC countries.`,
      stat: null,
      chart: null,
    };
  }

  const values = filtered.map((r) => Number(r.value));
  const med = median(values);
  const years = filtered.map((r) => Number(r.date));
  const medianYear = String(Math.round(median(years)));

  const countries = filtered
    .map((r) => ({
      code: r.country.id,
      name: nameById[r.country.id] || r.country.value,
      value: Number(r.value),
      year: r.date,
      displayValue: formatDisplayValue(r.value, indicator.unit),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return {
    id: indicator.id,
    label: indicator.label,
    unit: indicator.unit,
    source: SOURCE_LABEL,
    chartType: indicator.chartType,
    hasData: true,
    stat: {
      label: indicator.label,
      value: formatDisplayValue(med, indicator.unit),
      rawValue: med,
      year: medianYear,
      source: SOURCE_LABEL,
      countryCount: filtered.length,
      note: `Median across ${filtered.length} LIC/LMC countries in ${regionName}`,
    },
    chart: {
      type: indicator.chartType,
      label: indicator.label,
      unit: indicator.unit,
      source: SOURCE_LABEL,
      year: medianYear,
      countries,
    },
  };
}

export async function fetchExploreData(topic, region) {
  const regionCode = resolveRegionCode(region);
  const { category, indicators: indicatorDefs } = resolveExploreIndicators(topic);
  const allCountries = await loadCountryMetadata();
  const lmicInRegion = getLmicCountriesInRegion(allCountries, regionCode);
  const regionName = region.trim();

  const rawApiResponses = [];
  const fetched = await Promise.all(
    indicatorDefs.map(async (def) => {
      try {
        const { url, raw, rows } = await fetchIndicatorAllCountries(def.id);
        rawApiResponses.push({ indicator: def.id, url, raw });
        return { ...def, rows };
      } catch (err) {
        console.error(`[Explore] Failed to fetch ${def.id}:`, err.message);
        rawApiResponses.push({ indicator: def.id, error: err.message });
        return { ...def, rows: [] };
      }
    })
  );

  const indicators = fetched.map((ind) =>
    processIndicator(ind, lmicInRegion, regionName)
  );

  const charts = indicators.filter((i) => i.hasData).slice(0, 3).map((i) => i.chart);

  return {
    topic,
    region: regionName,
    regionCode,
    category,
    lmicCountryCount: lmicInRegion.length,
    indicators,
    charts,
    rawApiResponses,
    dataSummary: indicators
      .filter((i) => i.hasData)
      .map((i) => `${i.label}: median ${i.stat.value} (${i.stat.year}), n=${i.stat.countryCount}`)
      .join("\n"),
  };
}
