import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchWorldBankData, REGION_CODES } from "./lib/worldBank.js";
import { fetchResearchReport } from "./lib/researchReport.js";
import { buildLocalReport, loadFrameworks, matchFrameworks } from "./lib/frameworks.js";
import { fetchExploreData } from "./lib/exploreFetch.js";
import { fetchExploreSummary } from "./lib/exploreSummary.js";
import { initDb } from "./lib/db.js";
import { signup, signin, signout, getSession, setCookieHeader, clearCookieHeader } from "./lib/auth.js";

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

// Protected pages — server will redirect to /auth.html if no valid session
const PROTECTED = [
  "/", "/index.html",
  "/explore.html", "/investigate.html",
  "/build.html", "/frameworks.html",
];

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

function redirect(res, location, cookie) {
  const headers = { Location: location };
  if (cookie) headers["Set-Cookie"] = cookie;
  res.writeHead(302, headers);
  res.end();
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

loadEnv();

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0];

  // ── AUTH API ──────────────────────────────────────────────

  if (req.method === "POST" && url === "/api/auth/signup") {
    try {
      const { name, email, password } = JSON.parse(await readBody(req));
      const result = await signup(name, email, password);
      if (!result.ok) return sendJson(res, 400, result);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": setCookieHeader(result.sessionId),
      });
      return res.end(JSON.stringify({ ok: true, user: result.user }));
    } catch (err) {
      console.error("Signup error:", err.message);
      return sendJson(res, 500, { ok: false, error: "Server error during signup." });
    }
  }

  if (req.method === "POST" && url === "/api/auth/signin") {
    try {
      const { email, password } = JSON.parse(await readBody(req));
      const result = await signin(email, password);
      if (!result.ok) return sendJson(res, 401, result);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": setCookieHeader(result.sessionId),
      });
      return res.end(JSON.stringify({ ok: true, user: result.user }));
    } catch (err) {
      console.error("Signin error:", err.message);
      return sendJson(res, 500, { ok: false, error: "Server error during sign in." });
    }
  }

  if (req.method === "POST" && url === "/api/auth/signout") {
    try {
      await signout(req.headers.cookie);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": clearCookieHeader(),
      });
      return res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: "Server error during sign out." });
    }
  }

  if (req.method === "GET" && url === "/api/auth/me") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      return sendJson(res, 200, { ok: true, user: { id: session.user_id, name: session.name, email: session.email } });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: "Server error." });
    }
  }

  // ── PROTECTED PAGE GUARD ──────────────────────────────────

  if (req.method === "GET" && PROTECTED.includes(url)) {
    const session = await getSession(req.headers.cookie);
    if (!session) {
      return redirect(res, `/auth.html?next=${encodeURIComponent(url)}`);
    }
  }

  // ── EXISTING API ROUTES ───────────────────────────────────

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
        return sendJson(res, 400, { success: false, error: "Interest and region are required." });
      }
      const exploreData = await fetchExploreData(interest.trim(), region.trim());
      const summary = await fetchExploreSummary(
        exploreData.topic, exploreData.region,
        exploreData.dataSummary || "No indicator data available."
      );
      const { rawApiResponses, ...payload } = exploreData;
      return sendJson(res, 200, {
        success: true, ...payload,
        summary: summary.paragraph,
        summaryGenerated: summary.success,
        rawApiResponses,
      });
    } catch (err) {
      console.error("Explore endpoint error:", err.message);
      return sendJson(res, 500, { success: false, error: "Failed to load regional snapshot." });
    }
  }

  if (req.method === "POST" && url === "/api/build") {
    try {
      const body = JSON.parse(await readBody(req));
      const { topic, region } = body;
      if (!topic?.trim()) {
        return sendJson(res, 400, { success: false, error: "Topic is required." });
      }
      const data = buildLocalReport(topic.trim(), region?.trim() || null);
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      console.error("Build endpoint error:", err.message);
      return sendJson(res, 500, { success: false, error: "Failed to build research scaffold." });
    }
  }

  if (req.method === "POST" && url === "/api/research") {
    try {
      const body = JSON.parse(await readBody(req));
      const { topic, region } = body;
      if (!topic?.trim() || !region?.trim()) {
        return sendJson(res, 400, { success: false, error: "Topic and region are required." });
      }
      const wb = await fetchWorldBankData(region, topic);
      const result = await fetchResearchReport(topic, region, wb.formatted);
      if (!result.success) return sendJson(res, 502, result);
      const matched = matchFrameworks(topic);
      const frameworks = matched.map((fw) => ({
        id: fw.id, name: fw.name, dimension: fw.dimension,
        relevance: fw.matches?.length
          ? `Matched: ${fw.matches.slice(0, 3).join(", ")}`
          : "Core lens for LMIC research",
      }));
      return sendJson(res, 200, {
        success: true, data: result.data,
        meta: {
          region: wb.regionLabel, regionCode: wb.regionCode,
          yearRange: wb.yearRange, worldBankData: wb.formatted, frameworks,
        },
      });
    } catch (err) {
      console.error("Research endpoint error:", err.message);
      return sendJson(res, 500, { success: false, error: "Failed to fetch data. Check your connection and try again." });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405);
  res.end("Method not allowed");
});

// Init DB tables then start server
initDb()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Reserc running at http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialise database:", err.message);
    process.exit(1);
  });
