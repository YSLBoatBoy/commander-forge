// Fetches card data for the page from a fixed list of public Magic data sites, with a SQLite cache.
// Only these hosts are allowed, so the server can't be used to reach anything else on your network.
export const ALLOWED_HOSTS = {
  "api.scryfall.com": 12 * 3600e3,              // prices change daily
  "json.edhrec.com": 24 * 3600e3,
  "backend.commanderspellbook.com": 24 * 3600e3,
  "mtgjson.com": 7 * 24 * 3600e3,
};

const UA = "CommanderForge/1.0 (self-hosted deckbuilder)";
let lastScryfall = 0;

export function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return { ok: false, reason: "Not a valid URL." }; }
  if (u.protocol !== "https:") return { ok: false, reason: "Only https is allowed." };
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_HOSTS, u.hostname)) return { ok: false, reason: `Host ${u.hostname} isn't on the allowed list.` };
  if (u.username || u.password || (u.port && u.port !== "443")) return { ok: false, reason: "Credentials and custom ports aren't allowed." };
  return { ok: true, url: u };
}

export async function proxyFetch(db, raw, { fetchImpl = fetch, fresh = false } = {}) {
  const chk = checkUrl(raw);
  if (!chk.ok) return { status: 400, body: JSON.stringify({ code: "bad_url", message: chk.reason }) };
  const url = chk.url.toString();
  const ttl = ALLOWED_HOSTS[chk.url.hostname];
  if (!fresh) {
    const hit = db.cacheGet(url);
    if (hit && Date.now() - hit.fetched < ttl) return { status: hit.status, body: hit.body, cached: true };
  }
  if (chk.url.hostname === "api.scryfall.com") {          // Scryfall asks for 50–100 ms between requests
    const wait = lastScryfall + 110 - Date.now();
    lastScryfall = Date.now() + Math.max(0, wait);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  let res;
  try {
    res = await fetchImpl(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  } catch (e) {
    const stale = db.cacheGet(url);
    if (stale) return { status: stale.status, body: stale.body, cached: true, stale: true };
    return { status: 502, body: JSON.stringify({ code: "upstream_unreachable", message: `Couldn't reach ${chk.url.hostname}.` }) };
  }
  const body = await res.text();
  // Cache successes and Scryfall/EDHREC "not found" answers (they are real answers, not outages).
  if (res.ok || res.status === 404) db.cachePut(url, res.status, body);
  return { status: res.status, body };
}
