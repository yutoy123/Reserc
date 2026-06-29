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
import { signup, signin, signout, getSession, oauthLogin, setCookieHeader, clearCookieHeader } from "./lib/auth.js";
import { saveItem, recordHistory, toggleSaved, deleteItem, getLibrary, getHistory, getItem } from "./lib/library.js";
import { streamChat } from "./lib/chatAgent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml",
};

const PROTECTED = [
  "/", "/index.html", "/explore.html", "/investigate.html",
  "/build.html", "/frameworks.html", "/chat.html", "/library.html", "/compare.html",
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
    req.on("data", c => chunks.push(c));
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

function oauthBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function serveStatic(req, res) {
  const urlPath = (req.url || "/").split("?")[0];
  let filePath = path.join(PUBLIC, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end("Forbidden"); }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())
    filePath = path.join(filePath, "index.html");
  if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end("Not found"); }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

loadEnv();

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0];

  // ── AUTH ─────────────────────────────────────────────────────────

  if (req.method === "POST" && url === "/api/auth/signup") {
    try {
      const { name, email, password } = JSON.parse(await readBody(req));
      const result = await signup(name, email, password);
      if (!result.ok) return sendJson(res, 400, result);
      res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": setCookieHeader(result.sessionId) });
      return res.end(JSON.stringify({ ok: true, user: result.user }));
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: "Server error during signup." });
    }
  }

  if (req.method === "POST" && url === "/api/auth/signin") {
    try {
      const { email, password } = JSON.parse(await readBody(req));
      const result = await signin(email, password);
      if (!result.ok) return sendJson(res, 401, result);
      res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": setCookieHeader(result.sessionId) });
      return res.end(JSON.stringify({ ok: true, user: result.user }));
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: "Server error during sign in." });
    }
  }

  if (req.method === "POST" && url === "/api/auth/signout") {
    try {
      await signout(req.headers.cookie);
      res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": clearCookieHeader() });
      return res.end(JSON.stringify({ ok: true }));
    } catch { return sendJson(res, 500, { ok: false }); }
  }

  if (req.method === "GET" && url === "/api/auth/me") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      return sendJson(res, 200, { ok: true, user: { id: session.user_id, name: session.name, email: session.email } });
    } catch { return sendJson(res, 500, { ok: false }); }
  }

  // ── OAUTH ─────────────────────────────────────────────────────────

  if (req.method === "GET" && url === "/api/auth/google") {
    const gId = process.env.GOOGLE_CLIENT_ID;
    if (!gId) return redirect(res, "/auth.html?oauth_error=google_not_configured");
    const { randomBytes } = await import("crypto");
    const state = randomBytes(16).toString("hex");
    const base  = oauthBaseUrl(req);
    const next  = new URLSearchParams(req.url.split("?")[1] || "").get("next") || "/";
    const params = new URLSearchParams({
      client_id: gId,
      redirect_uri: `${base}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    const cookieOpts = "HttpOnly; SameSite=Lax; Path=/; Max-Age=600";
    res.writeHead(302, {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": [
        `oauth_state=${state}; ${cookieOpts}`,
        `oauth_next=${encodeURIComponent(next)}; ${cookieOpts}`,
      ],
    });
    return res.end();
  }

  if (req.method === "GET" && url === "/api/auth/google/callback") {
    try {
      const qs     = new URLSearchParams(req.url.split("?")[1] || "");
      const code   = qs.get("code");
      const state  = qs.get("state");
      const cookies = Object.fromEntries(
        (req.headers.cookie || "").split(";").map(p => { const [k,...v]=p.trim().split("="); return [k,v.join("=")]; })
      );
      if (!code || !state || state !== cookies.oauth_state)
        return redirect(res, "/auth.html?oauth_error=state_mismatch");

      const base = oauthBaseUrl(req);
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, grant_type: "authorization_code",
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${base}/api/auth/google/callback`,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return redirect(res, "/auth.html?oauth_error=token_failed");

      const userRes  = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const gUser    = await userRes.json();
      if (!gUser.email) return redirect(res, "/auth.html?oauth_error=no_email");

      const result = await oauthLogin(gUser.name, gUser.email, "google", gUser.id);
      const next = decodeURIComponent(cookies.oauth_next || "/");
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      res.writeHead(302, {
        Location: safeNext,
        "Set-Cookie": [setCookieHeader(result.sessionId), "oauth_state=; Max-Age=0; Path=/", "oauth_next=; Max-Age=0; Path=/"],
      });
      return res.end();
    } catch (err) {
      console.error("Google OAuth error:", err.message);
      return redirect(res, "/auth.html?oauth_error=google_failed");
    }
  }

  if (req.method === "GET" && url === "/api/auth/github") {
    const ghId = process.env.GITHUB_CLIENT_ID;
    if (!ghId) return redirect(res, "/auth.html?oauth_error=github_not_configured");
    const { randomBytes } = await import("crypto");
    const state = randomBytes(16).toString("hex");
    const base  = oauthBaseUrl(req);
    const next  = new URLSearchParams(req.url.split("?")[1] || "").get("next") || "/";
    const params = new URLSearchParams({
      client_id: ghId,
      redirect_uri: `${base}/api/auth/github/callback`,
      scope: "user:email",
      state,
    });
    const cookieOpts = "HttpOnly; SameSite=Lax; Path=/; Max-Age=600";
    res.writeHead(302, {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie": [
        `oauth_state=${state}; ${cookieOpts}`,
        `oauth_next=${encodeURIComponent(next)}; ${cookieOpts}`,
      ],
    });
    return res.end();
  }

  if (req.method === "GET" && url === "/api/auth/github/callback") {
    try {
      const qs    = new URLSearchParams(req.url.split("?")[1] || "");
      const code  = qs.get("code");
      const state = qs.get("state");
      const cookies = Object.fromEntries(
        (req.headers.cookie || "").split(";").map(p => { const [k,...v]=p.trim().split("="); return [k,v.join("=")]; })
      );
      if (!code || !state || state !== cookies.oauth_state)
        return redirect(res, "/auth.html?oauth_error=state_mismatch");

      const base = oauthBaseUrl(req);
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          redirect_uri: `${base}/api/auth/github/callback`,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return redirect(res, "/auth.html?oauth_error=token_failed");

      const headers  = { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Reserc-App" };
      const userRes  = await fetch("https://api.github.com/user", { headers });
      const ghUser   = await userRes.json();

      let email = ghUser.email;
      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
        const emails    = await emailsRes.json();
        const primary   = emails.find(e => e.primary && e.verified);
        email = primary?.email || emails[0]?.email;
      }
      if (!email) return redirect(res, "/auth.html?oauth_error=no_email");

      const result = await oauthLogin(ghUser.name || ghUser.login, email, "github", ghUser.id);
      const next = decodeURIComponent(cookies.oauth_next || "/");
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      res.writeHead(302, {
        Location: safeNext,
        "Set-Cookie": [setCookieHeader(result.sessionId), "oauth_state=; Max-Age=0; Path=/", "oauth_next=; Max-Age=0; Path=/"],
      });
      return res.end();
    } catch (err) {
      console.error("GitHub OAuth error:", err.message);
      return redirect(res, "/auth.html?oauth_error=github_failed");
    }
  }

  // ── PROTECTED PAGE GUARD ──────────────────────────────────────────

  if (req.method === "GET" && PROTECTED.includes(url)) {
    const session = await getSession(req.headers.cookie);
    if (!session) return redirect(res, `/auth.html?next=${encodeURIComponent(url)}`);
  }

  // ── LIBRARY ───────────────────────────────────────────────────────

  if (req.method === "POST" && url === "/api/library/save") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false, error: "Not authenticated." });
      const { type, title, topic, region, payload, countryA, countryB } = JSON.parse(await readBody(req));
      const id = await saveItem(session.user_id, type, title, topic, region, payload, countryA, countryB);
      return sendJson(res, 200, { ok: true, id });
    } catch (err) {
      console.error("Library save error:", err.message);
      return sendJson(res, 500, { ok: false, error: "Failed to save." });
    }
  }

  if (req.method === "GET" && url === "/api/library") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      const items = await getLibrary(session.user_id);
      return sendJson(res, 200, { ok: true, items });
    } catch (err) {
      return sendJson(res, 500, { ok: false });
    }
  }

  if (req.method === "GET" && url === "/api/history") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      const items = await getHistory(session.user_id);
      return sendJson(res, 200, { ok: true, items });
    } catch (err) {
      return sendJson(res, 500, { ok: false });
    }
  }

  const toggleMatch = url?.match(/^\/api\/library\/(\d+)\/toggle$/);
  if (req.method === "POST" && toggleMatch) {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      const result = await toggleSaved(session.user_id, parseInt(toggleMatch[1]));
      return sendJson(res, 200, { ok: true, saved: result?.saved });
    } catch { return sendJson(res, 500, { ok: false }); }
  }

  const deleteMatch = url?.match(/^\/api\/library\/(\d+)$/);
  if (req.method === "DELETE" && deleteMatch) {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      await deleteItem(session.user_id, parseInt(deleteMatch[1]));
      return sendJson(res, 200, { ok: true });
    } catch { return sendJson(res, 500, { ok: false }); }
  }

  const getItemMatch = url?.match(/^\/api\/library\/(\d+)$/);
  if (req.method === "GET" && getItemMatch) {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      const item = await getItem(session.user_id, parseInt(getItemMatch[1]));
      if (!item) return sendJson(res, 404, { ok: false });
      return sendJson(res, 200, { ok: true, item });
    } catch { return sendJson(res, 500, { ok: false }); }
  }

  // ── CHAT ─────────────────────────────────────────────────────────

  if (req.method === "POST" && url === "/api/chat") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false, error: "Not authenticated." });
      const { messages } = JSON.parse(await readBody(req));
      if (!messages?.length) return sendJson(res, 400, { ok: false, error: "Messages required." });
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      await streamChat(messages, res);
    } catch (err) {
      console.error("Chat error:", err.message);
      if (!res.headersSent) return sendJson(res, 500, { ok: false, error: "Chat failed." });
      res.end();
    }
    return;
  }

  // ── COMPARE ──────────────────────────────────────────────────────

  if (req.method === "POST" && url === "/api/compare") {
    try {
      const session = await getSession(req.headers.cookie);
      if (!session) return sendJson(res, 401, { ok: false });
      const { regionA, regionB, topic } = JSON.parse(await readBody(req));
      if (!regionA || !regionB) return sendJson(res, 400, { ok: false, error: "Two regions required." });
      const t = topic?.trim() || "economic development";
      const [dataA, dataB] = await Promise.all([
        fetchWorldBankData(regionA, t),
        fetchWorldBankData(regionB, t),
      ]);
      return sendJson(res, 200, { ok: true, regionA: dataA, regionB: dataB });
    } catch (err) {
      console.error("Compare error:", err.message);
      return sendJson(res, 500, { ok: false, error: "Failed to fetch comparison data." });
    }
  }

  // ── EXISTING ROUTES ───────────────────────────────────────────────

  if (req.method === "GET" && url === "/api/regions") {
    const regions = Object.entries(REGION_CODES)
      .filter(([key]) => key.length > 3)
      .map(([name, code]) => ({ name: name.replace(/\b\w/g, c => c.toUpperCase()), code }));
    return sendJson(res, 200, regions);
  }

  if (req.method === "GET" && url === "/api/frameworks") {
    return sendJson(res, 200, loadFrameworks());
  }

  if (req.method === "POST" && url === "/api/explore") {
    try {
      const { interest, region } = JSON.parse(await readBody(req));
      if (!interest?.trim() || !region?.trim())
        return sendJson(res, 400, { success: false, error: "Interest and region are required." });
      const exploreData = await fetchExploreData(interest.trim(), region.trim());
      const summary = await fetchExploreSummary(exploreData.topic, exploreData.region, exploreData.dataSummary || "No indicator data available.");
      const { rawApiResponses, ...payload } = exploreData;
      return sendJson(res, 200, { success: true, ...payload, summary: summary.paragraph, summaryGenerated: summary.success, rawApiResponses });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: "Failed to load regional snapshot." });
    }
  }

  if (req.method === "POST" && url === "/api/build") {
    try {
      const { topic, region } = JSON.parse(await readBody(req));
      if (!topic?.trim()) return sendJson(res, 400, { success: false, error: "Topic is required." });
      const session = await getSession(req.headers.cookie);
      const data = buildLocalReport(topic.trim(), region?.trim() || null);
      if (session) {
        const title = `Build: ${topic.trim()}${region ? ` · ${region}` : ""}`;
        recordHistory(session.user_id, "build", title, topic.trim(), region || null, data).catch(() => {});
      }
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: "Failed to build research scaffold." });
    }
  }

  if (req.method === "POST" && url === "/api/research") {
    try {
      const { topic, region } = JSON.parse(await readBody(req));
      if (!topic?.trim() || !region?.trim())
        return sendJson(res, 400, { success: false, error: "Topic and region are required." });
      const wb = await fetchWorldBankData(region, topic);
      const result = await fetchResearchReport(topic, region, wb.formatted);
      if (!result.success) return sendJson(res, 502, result);
      const matched = matchFrameworks(topic);
      const frameworks = matched.map(fw => ({
        id: fw.id, name: fw.name, dimension: fw.dimension,
        relevance: fw.matches?.length ? `Matched: ${fw.matches.slice(0, 3).join(", ")}` : "Core lens for LMIC research",
      }));
      const session = await getSession(req.headers.cookie);
      if (session) {
        const title = `${topic} · ${region}`;
        recordHistory(session.user_id, "investigate", title, topic, region, { data: result.data, meta: { region: wb.regionLabel, worldBankData: wb.formatted, frameworks } }).catch(() => {});
      }
      return sendJson(res, 200, { success: true, data: result.data, meta: { region: wb.regionLabel, regionCode: wb.regionCode, yearRange: wb.yearRange, worldBankData: wb.formatted, frameworks } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: "Failed to fetch data. Check your connection and try again." });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405);
  res.end("Method not allowed");
});

initDb()
  .then(() => server.listen(PORT, "0.0.0.0", () => console.log(`Reserc running at http://0.0.0.0:${PORT}`)))
  .catch(err => { console.error("DB init failed:", err.message); process.exit(1); });
