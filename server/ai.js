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
  if (!res.ok) { let m = ""; try { m = (await res.json()).error?.message || ""; } catch {} throw httpError("Gemini", res.status, m); }
  let finish = "";
  await readSse(res, (ev) => {
    if (ev.promptFeedback?.blockReason) throw new AiError("refused", `Gemini blocked this request (${ev.promptFeedback.blockReason}).`, 400);
    const cand = ev.candidates?.[0];
    if (cand?.finishReason) finish = cand.finishReason;
    const t = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    if (t) onDelta(t);
  });
  return { finish: finish === "MAX_TOKENS" ? "length" : "stop" };
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

// Settings come from the database, with environment variables taking priority.
export function resolveAi(db, env = process.env) {
  const s = db.kvGet("ai_settings", {}) || {};
  const provider = (env.AI_PROVIDER || s.provider || DEFAULTS.provider).toLowerCase();
  return {
    provider,
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
    gemini: { model: cfg.gemini.model, fast: cfg.gemini.fast, hasKey: !!cfg.gemini.key, keyHint: mask(cfg.gemini.key), keyFromEnv: cfg.gemini.keyFromEnv },
    anthropic: { model: cfg.anthropic.model, fast: cfg.anthropic.fast, hasKey: !!cfg.anthropic.key, keyHint: mask(cfg.anthropic.key), keyFromEnv: cfg.anthropic.keyFromEnv },
  };
}

export async function runAi(cfg, { prompt, tier, json, signal, onDelta, fetchImpl }) {
  const p = cfg.provider === "anthropic" ? "anthropic" : "gemini";
  const c = cfg[p];
  if (!c.key) throw new AiError("no_key", p === "gemini" ? "Add a Google Gemini API key in AI engine settings." : "Add an Anthropic API key in AI engine settings.", 400);
  const model = tier === "quick" ? c.fast : c.model;
  const fn = p === "gemini" ? geminiStream : anthropicStream;
  return fn({ key: c.key, model, prompt, json, signal, onDelta, fetchImpl });
}
