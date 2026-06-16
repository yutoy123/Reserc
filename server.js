import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchWorldBankData, REGION_CODES } from "./lib/worldBank.js";
import { fetchResearchReport } from "./lib/researchReport.js";
import { buildLocalReport, loadFrameworks, matchFrameworks } from "./lib/frameworks.js";
import { fetchExploreData } from "./lib/exploreFetch.js";
import { fetchExploreSummary } from "./lib/exploreSummary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const urlPath = (req.url || "/").split("?")[0];
  let filePath = path.join(PUBLIC, urlPath === "/" ? "index.html" : urlPath);

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end("Not found");
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0];

  if (req.method === "GET" && url === "/api/regions") {
    const regions = Object.entries(REGION_CODES)
      .filter(([key]) => key.length > 3)
      .map(([name, code]) => ({
        name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
        code,
      }));
    return sendJson(res, 200, regions);
  }

  if (req.method === "GET" && url === "/api/frameworks") {
    return sendJson(res, 200, loadFrameworks());
  }

  if (req.method === "POST" && url === "/api/explore") {
    try {
      const body = JSON.parse(await readBody(req));
      const { interest, region } = body;
      if (!interest?.trim() || !region?.trim()) {
        return sendJson(res, 400, {
          success: false,
          error: "Interest and region are required.",
        });
      }

      const exploreData = await fetchExploreData(interest.trim(), region.trim());
      console.log("[Explore] Raw World Bank API responses:", JSON.stringify(exploreData.rawApiResponses, null, 2));

      const summary = await fetchExploreSummary(
        exploreData.topic,
        exploreData.region,
        exploreData.dataSummary || "No indicator data available."
      );

      const { rawApiResponses, ...payload } = exploreData;

      return sendJson(res, 200, {
        success: true,
        ...payload,
        summary: summary.paragraph,
        summaryGenerated: summary.success,
        rawApiResponses,
      });
    } catch (err) {
      console.error("Explore endpoint error:", err.message);
      return sendJson(res, 500, {
        success: false,
        error: "Failed to load regional snapshot.",
      });
    }
  }

  if (req.method === "POST" && url === "/api/build") {
    try {
      const body = JSON.parse(await readBody(req));
      const { topic, region } = body;
      if (!topic?.trim()) {
        return sendJson(res, 400, {
          success: false,
          error: "Topic is required.",
        });
      }

      const data = buildLocalReport(topic.trim(), region?.trim() || null);
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      console.error("Build endpoint error:", err.message);
      return sendJson(res, 500, {
        success: false,
        error: "Failed to build research scaffold.",
      });
    }
  }

  if (req.method === "POST" && url === "/api/research") {
    try {
      const body = JSON.parse(await readBody(req));
      const { topic, region } = body;
      if (!topic?.trim() || !region?.trim()) {
        return sendJson(res, 400, {
          success: false,
          error: "Topic and region are required.",
        });
      }

      const wb = await fetchWorldBankData(region, topic);
      const result = await fetchResearchReport(topic, region, wb.formatted);
      if (!result.success) return sendJson(res, 502, result);

      const matched = matchFrameworks(topic);
      const frameworks = matched.map((fw) => ({
        id: fw.id,
        name: fw.name,
        dimension: fw.dimension,
        relevance: fw.matches?.length
          ? `Matched: ${fw.matches.slice(0, 3).join(", ")}`
          : "Core lens for LMIC research",
      }));

      return sendJson(res, 200, {
        success: true,
        data: result.data,
        meta: {
          region: wb.regionLabel,
          regionCode: wb.regionCode,
          yearRange: wb.yearRange,
          worldBankData: wb.formatted,
          frameworks,
        },
      });
    } catch (err) {
      console.error("Research endpoint error:", err.message);
      return sendJson(res, 500, {
        success: false,
        error: "Failed to fetch data. Check your connection and try again.",
      });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Fieldnotes running at http://localhost:${PORT}`);
});
