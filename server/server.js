// Commander Forge server: serves the page, proxies card data, runs the AI, and stores your data in SQLite.
// No npm dependencies. Run with: node server/server.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { openDb } from "./db.js";
import { proxyFetch } from "./proxy.js";
import { resolveAi, publicAiSettings, runAi, AiError } from "./ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const VERSION = process.env.APP_VERSION || readVersion();

function readVersion() {
  try { return JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version; } catch { return "dev"; }
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  const isObj = body !== null && typeof body === "object" && !Buffer.isBuffer(body);
  const data = isObj ? JSON.stringify(body) : body ?? "";
  res.writeHead(status, { "Content-Type": isObj ? MIME[".json"] : "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(data);
}

async function readBody(req, limit = 20 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error("Request too large."), { status: 413 }); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error("Body isn't valid JSON."), { status: 400 }); }
}

function checkAuth(req, password) {
  if (!password) return true;
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  const [, pass = ""] = Buffer.from(h.slice(6), "base64").toString("utf8").split(":");
  const a = Buffer.from(pass), b = Buffer.from(password);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = path.resolve(PUBLIC_DIR, "." + rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, "Forbidden");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      if (!path.extname(rel)) return serveStatic(req, res, "/index.html");
      return send(res, 404, "Not found");
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

export function createServer({ dataDir = process.env.DATA_DIR || path.resolve(__dirname, "..", "data"), env = process.env, fetchImpl = fetch } = {}) {
  const db = openDb(dataDir);
  db.cachePrune(30 * 24 * 3600e3);
  const password = env.APP_PASSWORD || "";

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;
    try {
      if (p !== "/api/health" && !checkAuth(req, password)) {
        return send(res, 401, "Sign in required.", { "WWW-Authenticate": 'Basic realm="Commander Forge", charset="UTF-8"' });
      }
      if (!p.startsWith("/api/")) {
        if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
        return serveStatic(req, res, p);
      }

      // ---- health ----
      if (p === "/api/health") return send(res, 200, { ok: true, mode: "server", version: VERSION });

      // ---- card data proxy (Scryfall, EDHREC, Commander Spellbook, MTGJSON) ----
      if (p === "/api/proxy" && req.method === "GET") {
        const r = await proxyFetch(db, url.searchParams.get("url") || "", { fetchImpl, fresh: url.searchParams.get("fresh") === "1" });
        return send(res, r.status, r.body, { "Content-Type": MIME[".json"], "X-Cache": r.cached ? (r.stale ? "STALE" : "HIT") : "MISS" });
      }

      // ---- AI settings ----
      if (p === "/api/settings/ai") {
        if (req.method === "GET") return send(res, 200, publicAiSettings(resolveAi(db, env)));
        if (req.method === "PUT") {
          const b = await readBody(req);
          const cur = db.kvGet("ai_settings", {}) || {};
          const next = { ...cur };
          if (b.provider && ["gemini", "anthropic"].includes(b.provider)) next.provider = b.provider;
          for (const [from, to] of [["geminiKey", "geminiKey"], ["anthropicKey", "anthropicKey"]]) {
            if (typeof b[from] === "string" && b[from].trim()) next[to] = b[from].trim();
            if (b[from] === null) delete next[to];
          }
          for (const k of ["geminiModel", "geminiFast", "anthropicModel", "anthropicFast"]) if (typeof b[k] === "string" && b[k].trim()) next[k] = b[k].trim().slice(0, 100);
          db.kvSet("ai_settings", next);
          return send(res, 200, publicAiSettings(resolveAi(db, env)));
        }
      }

      // ---- AI: streams plain text; an error after streaming starts arrives as "\u0000ERR" + JSON ----
      if (p === "/api/ai" && req.method === "POST") {
        const b = await readBody(req, 2 * 1024 * 1024);
        const prompt = String(b.prompt || "");
        if (!prompt.trim()) return send(res, 400, { code: "invalid_request", message: "Empty prompt." });
        const cfg = resolveAi(db, env);
        const ctl = new AbortController();
        res.on("close", () => { if (!res.writableEnded) ctl.abort(); });
        let started = false;
        try {
          const out = await runAi(cfg, {
            prompt, tier: b.tier, json: !!b.json, signal: ctl.signal, fetchImpl,
            onDelta: (t) => {
              if (!started) { started = true; res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" }); }
              res.write(t);
            },
          });
          if (!started) return send(res, 502, { code: "empty_completion", message: "The AI returned an empty answer." });
          if (out.finish === "length") res.write("\u0000ERR" + JSON.stringify({ code: "truncated", message: "The answer was cut off." }));
          return res.end();
        } catch (e) {
          if (ctl.signal.aborted) return res.end();
          const err = e instanceof AiError ? e : new AiError("upstream_error", "Couldn't reach the AI service.", 502);
          console.error(`[ai] error ${err.code}: ${err.message}`);
          if (started) { res.write("\u0000ERR" + JSON.stringify({ code: err.code, message: err.message })); return res.end(); }
          return send(res, err.status, { code: err.code, message: err.message });
        }
      }

      // ---- collection ----
      if (p === "/api/collection") {
        if (req.method === "GET") return send(res, 200, { items: db.collectionAll() });
        if (req.method === "PUT") {
          const b = await readBody(req);
          if (!Array.isArray(b.items)) return send(res, 400, { code: "invalid_request", message: "Expected {items:[[name,qty,added],...]}." });
          const n = db.collectionReplace(b.items);
          return send(res, 200, { ok: true, count: n });
        }
      }

      // ---- saved builds ----
      if (p === "/api/builds" && req.method === "GET") return send(res, 200, { builds: db.buildsList() });
      const bm = p.match(/^\/api\/builds\/(.+)$/);
      if (bm) {
        const name = decodeURIComponent(bm[1]).slice(0, 200);
        if (req.method === "GET") { const st = db.buildGet(name); return st ? send(res, 200, { name, state: st }) : send(res, 404, { code: "not_found", message: "No build by that name." }); }
        if (req.method === "PUT") { const b = await readBody(req); if (!b.state || typeof b.state !== "object") return send(res, 400, { code: "invalid_request", message: "Expected {state}." }); db.buildPut(name, b.state, b.count); return send(res, 200, { ok: true }); }
        if (req.method === "DELETE") { db.buildDel(name); return send(res, 200, { ok: true }); }
      }

      // ---- current working state (so a build follows you between devices) ----
      if (p === "/api/state") {
        if (req.method === "GET") return send(res, 200, { state: db.kvGet("current_state", null) });
        if (req.method === "PUT") { const b = await readBody(req); db.kvSet("current_state", b.state || null); return send(res, 200, { ok: true }); }
      }

      return send(res, 404, { code: "not_found", message: "Unknown endpoint." });
    } catch (e) {
      if (!res.headersSent) return send(res, e.status || 500, { code: "server_error", message: e.status ? e.message : "Something went wrong on the server." });
      try { res.end(); } catch {}
      if (!e.status) console.error(e);
    }
  });
  server.on("close", () => db.close());
  return { server, db };
}

// Start when run directly.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8790);
  const { server, db } = createServer();
  server.listen(port, "0.0.0.0", () => console.log(`Commander Forge ${VERSION} listening on :${port} (data: ${db.file})`));
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
}
