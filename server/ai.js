// AI providers. The API keys live only on the server; the browser never sees them.
// Each provider streams plain text deltas through onDelta(text) and resolves {finish}.

export const DEFAULTS = {
  provider: "gemini",
  gemini: { model: "gemini-3.8-flash", fast: "gemini-3.5-flash-lite" },
  anthropic: { model: "claude-sonnet-5-5", fast: "claude-haiku-5-5" },
};

export class AiError extends Error {
  constructor(code, message, status = 502) { super(message); this.code = code; this.status = status; }
}

// Reads a server-sent-events body and calls onEvent(parsedJson) for each data line.
async function readSse(res, onEvent) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let ev; try { ev = JSON.parse(data); } catch { continue; }
      onEvent(ev);
    }
  }
}

function httpError(provider, status, message) {
  if (status === 429) return new AiError("rate_limited", `${provider}'s rate limit was hit. Wait a minute and try again.`, 429);
  if (status === 401 || status === 403 || /api key|api_key|authentication|permission/i.test(message)) return new AiError("bad_key", `${provider} rejected the API key. Check it in AI engine settings.`, 400);
  if (status === 404) return new AiError("bad_model", `${provider} doesn't recognize that model name. Check it in AI engine settings.`, 400);
  if (status === 529 || status === 503) return new AiError("overloaded", `${provider} is overloaded right now. Try again shortly.`, 503);
  return new AiError("upstream_error", message || `${provider} returned an error (${status}).`, 502);
}

export async function geminiStream({ key, model, prompt, json, signal, onDelta, fetchImpl = fetch }) {
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 16384 } };
  if (json) body.generationConfig.responseMimeType = "application/json";
  const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body), signal,
  });
  if (process.env.AI_LOG !== "0") console.log(`[ai] Gemini ${model} HTTP ${res.status}`);
  if (!res.ok) { let m = ""; try { m = (await res.json()).error?.message || ""; } catch {} if (process.env.AI_LOG !== "0") console.log(`[ai] Gemini error: ${m}`); throw httpError("Gemini", res.status, m); }
  let finish = "";
  await readSse(res, (ev) => {
    if (ev.promptFeedback?.blockReason) throw new AiError("refused", `Gemini blocked this request (${ev.promptFeedback.blockReason}).`, 400);
    const cand = ev.candidates?.[0];
    if (cand?.finishReason) finish = cand.finishReason;
    const t = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (t) onDelta(t);
  });
  // STOP is a normal end; anything else (RECITATION, SAFETY, OTHER, or no reason at all) means the answer was cut short.
  if (finish === "MAX_TOKENS") return { finish: "length" };
  if (finish && finish !== "STOP") return { finish: "cut", reason: finish };
  if (!finish) return { finish: "cut", reason: "stream ended" };
  return { finish: "stop" };
}

export async function anthropicStream({ key, model, prompt, json, signal, onDelta, fetchImpl = fetch }) {
  const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 16000, stream: true,
      messages: [{ role: "user", content: prompt + (json ? "\n\nReply with only the JSON, no other text." : "") }],
    }),
    signal,
  });
  if (!res.ok) { let m = ""; try { m = (await res.json()).error?.message || ""; } catch {} throw httpError("Anthropic", res.status, m); }
  let finish = "stop";
  await readSse(res, (ev) => {
    if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") onDelta(ev.delta.text);
    else if (ev.type === "message_delta" && ev.delta?.stop_reason === "max_tokens") finish = "length";
    else if (ev.type === "error") throw new AiError("upstream_error", ev.error?.message || "Anthropic stream error.");
  });
  return { finish };
}

// Models tried in order when the chosen one is busy. Live lists from the providers fill the dropdowns.
export const ORDER = {
  gemini: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
  anthropic: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"],
};
// Errors where trying another model can help (only before any text has streamed).
const FALLBACK_ON = new Set(["overloaded", "rate_limited", "timeout", "bad_model", "upstream_error", "unreachable", "cut"]);
// Same leniency as the page's parseLoose: plain JSON, a ```json fence, or the outermost {...} / [...].
export function looksLikeJson(t) {
  const tryParse = (x) => { try { JSON.parse(x); return true; } catch { return false; } };
  if (tryParse(t)) return true;
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f && tryParse(f[1])) return true;
  const a = [t.indexOf("{"), t.indexOf("[")].filter((x) => x >= 0).sort((x, y) => x - y)[0], b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  return a != null && b > a && tryParse(t.slice(a, b + 1));
}

// Settings come from the database, with environment variables taking priority.
export function resolveAi(db, env = process.env) {
  const s = db.kvGet("ai_settings", {}) || {};
  const provider = (env.AI_PROVIDER || s.provider || DEFAULTS.provider).toLowerCase();
  return {
    provider,
    autoFallback: s.autoFallback !== false,
    gemini: {
      key: env.GEMINI_API_KEY || s.geminiKey || "",
      model: env.GEMINI_MODEL || s.geminiModel || DEFAULTS.gemini.model,
      fast: env.GEMINI_FAST_MODEL || s.geminiFast || DEFAULTS.gemini.fast,
      keyFromEnv: !!env.GEMINI_API_KEY,
    },
    anthropic: {
      key: env.ANTHROPIC_API_KEY || s.anthropicKey || "",
      model: env.ANTHROPIC_MODEL || s.anthropicModel || DEFAULTS.anthropic.model,
      fast: env.ANTHROPIC_FAST_MODEL || s.anthropicFast || DEFAULTS.anthropic.fast,
      keyFromEnv: !!env.ANTHROPIC_API_KEY,
    },
    providerFromEnv: !!env.AI_PROVIDER,
  };
}

export function publicAiSettings(cfg) {
  const mask = (k) => (k ? "••••" + k.slice(-4) : "");
  return {
    provider: cfg.provider,
    providerFromEnv: cfg.providerFromEnv,
    autoFallback: cfg.autoFallback,
    gemini: { model: cfg.gemini.model, fast: cfg.gemini.fast, hasKey: !!cfg.gemini.key, keyHint: mask(cfg.gemini.key), keyFromEnv: cfg.gemini.keyFromEnv },
    anthropic: { model: cfg.anthropic.model, fast: cfg.anthropic.fast, hasKey: !!cfg.anthropic.key, keyHint: mask(cfg.anthropic.key), keyFromEnv: cfg.anthropic.keyFromEnv },
  };
}

// The order to try models in: your pick first, then the rest (lighter models first for quick tasks).
export function candidates(cfg, provider, tier) {
  const c = cfg[provider];
  const order = ORDER[provider];
  const list = tier === "quick" ? [c.fast, ...order.slice().reverse(), c.model] : [c.model, ...order, c.fast];
  const out = [...new Set(list.filter(Boolean))];
  return cfg.autoFallback ? out.slice(0, 5) : out.slice(0, 1);
}

// Gives up if the provider goes quiet: no first text within firstMs, or a gap longer than idleMs.
export const TIMEOUTS = { firstMs: 60_000, idleMs: 60_000 };

async function attempt(p, model, key, { prompt, json, signal, onDelta, fetchImpl, timeouts }) {
  const name = p === "gemini" ? "Gemini" : "Anthropic";
  const fn = p === "gemini" ? geminiStream : anthropicStream;
  const ctl = new AbortController();
  let timedOut = "", streamed = false;
  let timer = setTimeout(() => { timedOut = "first"; ctl.abort(); }, timeouts.firstMs);
  const onOuter = () => ctl.abort();
  signal?.addEventListener("abort", onOuter);
  try {
    const out = await fn({
      key, model, prompt, json, signal: ctl.signal, fetchImpl,
      onDelta: (t) => { streamed = true; clearTimeout(timer); timer = setTimeout(() => { timedOut = "idle"; ctl.abort(); }, timeouts.idleMs); onDelta(t); },
    });
    return out;
  } catch (e) {
    let err = e;
    if (timedOut) {
      const secs = Math.round((timedOut === "first" ? timeouts.firstMs : timeouts.idleMs) / 1000);
      err = new AiError("timeout", timedOut === "first" ? `${name} (${model}) didn't answer within ${secs} seconds.` : `${name} stopped answering partway through. Try again.`, 504);
    } else if (signal?.aborted) {
      throw e;
    } else if (!(e instanceof AiError)) {
      const cause = e?.cause?.code || e?.cause?.message || e?.message || String(e);
      err = new AiError("unreachable", `Couldn't reach ${name} from your server (${cause}).`, 502);
    }
    err.streamed = streamed;
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuter);
  }
}

// onDelta(text, model) is called with the model that is actually answering.
// Resolves {finish, model, skipped:[{model, code}]}.
export async function runAi(cfg, { prompt, tier, json, signal, onDelta, fetchImpl, timeouts = TIMEOUTS }) {
  const p = cfg.provider === "anthropic" ? "anthropic" : "gemini";
  const c = cfg[p];
  if (!c.key) throw new AiError("no_key", p === "gemini" ? "Add a Google Gemini API key in AI engine settings." : "Add an Anthropic API key in AI engine settings.", 400);
  const base = candidates(cfg, p, tier);
  // JSON answers are held back until they're complete and parse, so a cut-short answer can be retried:
  // the first model gets a second try, then the fallback list (when auto-fallback is on).
  const list = json ? [base[0], ...base] : base;
  const skipped = [];
  let last;
  for (const model of list) {
    const started = Date.now();
    let buf = "";
    try {
      const out = await attempt(p, model, c.key, { prompt, json, signal, fetchImpl, timeouts, onDelta: json ? (t) => { buf += t; } : (t) => onDelta(t, model, skipped) });
      if (json) {
        if (out.finish !== "stop" || !looksLikeJson(buf)) {
          const why = out.finish === "length" ? "ran out of room" : out.finish === "cut" ? `stopped early (${out.reason})` : "didn't send valid JSON";
          throw Object.assign(new AiError("cut", `${p === "gemini" ? "Gemini" : "Claude"} (${model}) ${why}.`, 502), { streamed: false });
        }
        onDelta(buf, model, skipped);
      }
      if (process.env.AI_LOG !== "0") console.log(`[ai] ${p} ${model} ok ${Date.now() - started}ms${skipped.length ? " after " + skipped.map((s) => s.model + ":" + s.code).join(", ") : ""}`);
      return { ...out, model, skipped };
    } catch (e) {
      if (signal?.aborted) throw e;
      last = e;
      if (process.env.AI_LOG !== "0") console.log(`[ai] ${p} ${model} failed (${e.code}): ${e.message}`);
      if (json) e.streamed = false;   // nothing reached the page yet
      if (e.streamed || !FALLBACK_ON.has(e.code)) throw e;
      skipped.push({ model, code: e.code });
    }
  }
  if (skipped.length > 1) {
    const allBusy = skipped.every((s) => s.code === "overloaded" || s.code === "rate_limited");
    throw new AiError(last.code, allBusy
      ? `Every ${p === "gemini" ? "Gemini" : "Claude"} model is busy right now (tried ${skipped.map((s) => s.model).join(", ")}). Wait a minute and try again.`
      : `${last.message} Also tried: ${[...new Set(skipped.map((s) => s.model))].filter((m) => m !== list[list.length - 1] || skipped.filter((x) => x.model === m).length > 1).join(", ")}.`, last.status);
  }
  throw last;
}

// Lists models for the dropdowns. Falls back to the built-in order if the provider can't be asked.
const modelCache = new Map();
export async function listModels(cfg, provider, fetchImpl = fetch) {
  const p = provider === "anthropic" ? "anthropic" : "gemini";
  const c = cfg[p];
  const fallback = ORDER[p].map((id) => ({ id, label: id }));
  if (!c.key) return { models: fallback, live: false };
  const ck = p + ":" + c.key.slice(-6);
  const hit = modelCache.get(ck);
  if (hit && Date.now() - hit.t < 3600e3) return hit.v;
  try {
    let models = [];
    if (p === "gemini") {
      const r = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": c.key }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) return { models: fallback, live: false };
      const j = await r.json();
      models = (j.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => ({ id: String(m.name || "").replace(/^models\//, ""), label: m.displayName || m.name }))
        .filter((m) => /^gemini-/.test(m.id) && !/(image|tts|live|embed|audio|transcribe|robotics|computer|omni|nano|banana|vision|aqa|learnlm)/i.test(m.id));
    } else {
      const r = await fetchImpl("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": c.key, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) return { models: fallback, live: false };
      const j = await r.json();
      models = (j.data || []).map((m) => ({ id: m.id, label: m.display_name || m.id }));
    }
    const rank = (id) => { const i = ORDER[p].indexOf(id); return i < 0 ? 99 : i; };
    models.sort((a, b) => rank(a.id) - rank(b.id) || b.id.localeCompare(a.id));
    for (const id of ORDER[p]) if (!models.some((m) => m.id === id)) models.push({ id, label: id + " (not listed)" });
    const v = { models, live: true };
    modelCache.set(ck, { t: Date.now(), v });
    return v;
  } catch {
    return { models: fallback, live: false };
  }
}
