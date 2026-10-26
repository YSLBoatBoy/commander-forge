import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "../server/server.js";

let base, srv, dir, calls = [];

// A fake internet: card-data hosts and the two AI providers.
function sse(events) {
  const enc = new TextEncoder();
  const chunks = events.map((e) => enc.encode("data: " + JSON.stringify(e) + "\n\n"));
  let i = 0;
  return new ReadableStream({ pull(c) { if (i < chunks.length) c.enqueue(chunks[i++]); else c.close(); } });
}
async function fakeFetch(url, init = {}) {
  calls.push({ url: String(url), init });
  const u = String(url);
  if (u.startsWith("https://api.scryfall.com/")) return new Response(JSON.stringify({ object: "card", name: "Sol Ring" }), { status: 200 });
  if (u.startsWith("https://json.edhrec.com/missing")) return new Response("{}", { status: 404 });
  if (u.includes("generativelanguage.googleapis.com")) {
    if (init.headers["x-goog-api-key"] !== "GOODKEY") return new Response(JSON.stringify({ error: { message: "API key not valid." } }), { status: 400 });
    return new Response(sse([{ candidates: [{ content: { parts: [{ text: '{"ok":' }] } }] }, { candidates: [{ content: { parts: [{ text: "true}" }] }, finishReason: "STOP" }] }]), { status: 200 });
  }
  if (u === "https://api.anthropic.com/v1/messages") {
    return new Response(sse([{ type: "content_block_delta", delta: { type: "text_delta", text: "Hello " } }, { type: "content_block_delta", delta: { type: "text_delta", text: "there" } }, { type: "message_delta", delta: { stop_reason: "end_turn" } }]), { status: 200 });
  }
  throw new TypeError("network down");
}

async function api(p, opts = {}) {
  const r = await fetch(base + p, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, json, headers: r.headers };
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cforge-"));
  ({ server: srv } = createServer({ dataDir: dir, env: {}, fetchImpl: fakeFetch }));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { await new Promise((r) => srv.close(r)); fs.rmSync(dir, { recursive: true, force: true }); });

test("health reports server mode", async () => {
  const r = await api("/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.mode, "server");
});

test("serves the page and its assets, and blocks path traversal", async () => {
  const r = await api("/");
  assert.equal(r.status, 200);
  assert.match(r.text, /<title>Commander Forge<\/title>/);
  assert.equal((await api("/js/app.js")).status, 200);
  assert.equal((await api("/data/precons.json")).status, 200);
  const t = await api("/%2e%2e/package.json");
  assert.notEqual(t.status, 200);
});

test("proxy only allows card-data hosts and caches answers", async () => {
  assert.equal((await api("/api/proxy?url=" + encodeURIComponent("https://example.com/x"))).status, 400);
  assert.equal((await api("/api/proxy?url=" + encodeURIComponent("http://api.scryfall.com/x"))).status, 400);
  assert.equal((await api("/api/proxy?url=" + encodeURIComponent("https://192.168.1.1/x"))).status, 400);
  calls = [];
  const u = "/api/proxy?url=" + encodeURIComponent("https://api.scryfall.com/cards/named?exact=Sol%20Ring");
  const a = await api(u);
  assert.equal(a.status, 200);
  assert.equal(a.json.name, "Sol Ring");
  assert.equal(a.headers.get("x-cache"), "MISS");
  const b = await api(u);
  assert.equal(b.headers.get("x-cache"), "HIT");
  assert.equal(calls.filter((c) => c.url.includes("scryfall")).length, 1);
  const nf = await api("/api/proxy?url=" + encodeURIComponent("https://json.edhrec.com/missing.json"));
  assert.equal(nf.status, 404);
  const down = await api("/api/proxy?url=" + encodeURIComponent("https://mtgjson.com/api/v5/x.json"));
  assert.equal(down.status, 502);
});

test("AI needs a key, never exposes it, and streams Gemini answers", async () => {
  const none = await api("/api/ai", { method: "POST", body: { prompt: "hi" } });
  assert.equal(none.status, 400);
  assert.equal(none.json.code, "no_key");

  const bad = await api("/api/settings/ai", { method: "PUT", body: { provider: "gemini", geminiKey: "WRONGKEY" } });
  assert.equal(bad.json.gemini.hasKey, true);
  assert.ok(!JSON.stringify(bad.json).includes("WRONGKEY"));
  const rej = await api("/api/ai", { method: "POST", body: { prompt: "hi" } });
  assert.equal(rej.json.code, "bad_key");

  const ok = await api("/api/settings/ai", { method: "PUT", body: { geminiKey: "GOODKEY", geminiModel: "gemini-test" } });
  assert.equal(ok.json.gemini.keyHint, "••••DKEY");
  const get = await api("/api/settings/ai");
  assert.ok(!get.text.includes("GOODKEY"));
  calls = [];
  const r = await api("/api/ai", { method: "POST", body: { prompt: "say ok", json: true } });
  assert.equal(r.status, 200);
  assert.equal(r.text, '{"ok":true}');
  assert.ok(calls[0].url.includes("/models/gemini-test:"));
  const quick = await api("/api/ai", { method: "POST", body: { prompt: "say ok", tier: "quick" } });
  assert.equal(quick.status, 200);
  assert.ok(calls.at(-1).url.includes("gemini-3.5-flash-lite"));
});

test("Anthropic provider streams too", async () => {
  await api("/api/settings/ai", { method: "PUT", body: { provider: "anthropic", anthropicKey: "sk-ant-test" } });
  const r = await api("/api/ai", { method: "POST", body: { prompt: "hi" } });
  assert.equal(r.text, "Hello there");
  const sent = JSON.parse(calls.at(-1).init.body);
  assert.equal(sent.model, "claude-sonnet-5-5");
  await api("/api/settings/ai", { method: "PUT", body: { provider: "gemini" } });
});

test("collection saves and replaces", async () => {
  const put = await api("/api/collection", { method: "PUT", body: { items: [["Sol Ring", 3, 1], ["Rhystic Study", 1, 2], ["", 1, 0]] } });
  assert.equal(put.json.count, 2);
  const g = await api("/api/collection");
  assert.deepEqual(g.json.items.map((i) => i[0]), ["Rhystic Study", "Sol Ring"]);
  await api("/api/collection", { method: "PUT", body: { items: [["Opt", 2, 3]] } });
  assert.deepEqual((await api("/api/collection")).json.items, [["Opt", 2, 3]]);
});

test("saved builds and current state round-trip", async () => {
  const name = "Yennett, Cryptic Sovereign";
  await api("/api/builds/" + encodeURIComponent(name), { method: "PUT", body: { state: { cards: [{ n: "Sol Ring" }] }, count: "99/99" } });
  const list = await api("/api/builds");
  assert.equal(list.json.builds[0].name, name);
  const one = await api("/api/builds/" + encodeURIComponent(name));
  assert.equal(one.json.state.cards[0].n, "Sol Ring");
  await api("/api/builds/" + encodeURIComponent(name), { method: "DELETE" });
  assert.equal((await api("/api/builds")).json.builds.length, 0);
  await api("/api/state", { method: "PUT", body: { state: { mode: "new" } } });
  assert.equal((await api("/api/state")).json.state.mode, "new");
});

test("optional password protects everything but health", async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cforge-pw-"));
  const { server } = createServer({ dataDir: d, env: { APP_PASSWORD: "hunter2" }, fetchImpl: fakeFetch });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const b = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(b + "/")).status, 401);
  assert.equal((await fetch(b + "/api/health")).status, 200);
  assert.equal((await fetch(b + "/", { headers: { Authorization: "Basic " + Buffer.from("me:wrong").toString("base64") } })).status, 401);
  assert.equal((await fetch(b + "/", { headers: { Authorization: "Basic " + Buffer.from("me:hunter2").toString("base64") } })).status, 200);
  await new Promise((r) => server.close(r));
  fs.rmSync(d, { recursive: true, force: true });
});

test("data survives a restart", async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cforge-persist-"));
  let { server } = createServer({ dataDir: d, env: {}, fetchImpl: fakeFetch });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let b = `http://127.0.0.1:${server.address().port}`;
  await fetch(b + "/api/collection", { method: "PUT", body: JSON.stringify({ items: [["Sol Ring", 2, 0]] }) });
  await new Promise((r) => server.close(r));
  ({ server } = createServer({ dataDir: d, env: {}, fetchImpl: fakeFetch }));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  b = `http://127.0.0.1:${server.address().port}`;
  const items = (await (await fetch(b + "/api/collection")).json()).items;
  assert.deepEqual(items, [["Sol Ring", 2, 0]]);
  await new Promise((r) => server.close(r));
  fs.rmSync(d, { recursive: true, force: true });
});
