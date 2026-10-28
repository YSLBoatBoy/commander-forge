# Commander Forge – project notes

Self-hosted MTG Commander deckbuilder. Owner runs it on Unraid via the Docker image `ghcr.io/yslboatboy/commander-forge:latest`, built by `.github/workflows/docker.yml` on every push to `main`.

## Layout

```
public/            the page (no build step)
  index.html       markup only
  css/app.css      all styles; color tokens on :root with dark-mode overrides
  js/app.js        all page logic, one IIFE, ~1,900 lines (sections marked "// ===== name =====")
  data/            commanders.json (Scryfall is:commander list, "name|ci|edhrecRank" lines in one JSON string)
                   precons.json (MTGJSON Commander decks: {n:[names], d:[[name,set,year,[cmdIdx],[mainIdx|[idx,qty]]]]})
server/
  server.js        node:http server: static files + JSON API (see routes below)
  db.js            node:sqlite, one file at $DATA_DIR/commander-forge.db
  proxy.js         whitelisted, cached GET proxy for Scryfall/EDHREC/Spellbook/MTGJSON
  ai.js            Gemini + Anthropic streaming; keys stay server-side
test/              node:test. frontend.test.js runs app.js in a vm with a fake DOM.
tools/build-artifact.js   inlines everything into dist/commander-forge.html for the Claude artifact
unraid/            Unraid template XML + icon
```

No npm dependencies on purpose. Node ≥ 22.13 (Docker uses node:24-alpine).

## Two runtimes, one app.js

`app.js` must keep working in both:

1. **Self-hosted** (`SERVER === true`, detected by `GET api/health` at boot): live data via `api/proxy`, AI via `api/ai` (`serverSample`), collection/builds/state via the API, downloads via Blob links.
2. **Claude artifact** (`window.claude` present): live data via the Claude desktop browser (`host:claude_browser` MCP: `preview_start`, `navigate`, `get_page_text`), AI via `claude.use("sample")`, collection via `claude.use("db")` under `data/users/<id>/coll-<letter>`. Published artifact: https://claude.ai/artifact/MjjxP5LCQx3EHdaLjxVsxD (republish `dist/commander-forge.html` after `npm run build:artifact`, capabilities: sample, downloads, db, user, mcp host:claude_browser [preview_start, navigate, get_page_text]).

Key indirections: `browserGet(url)` (data), `sample(input, opts)` / `sample.json` (AI; same contract in both modes: `onText({text,delta})`, `signal`, `modelTier: "quick"|"default"`), `buildsAll/buildsPut/buildsDel`, `flushColl/initCollectionStore`.

## API

| Route | |
|---|---|
| `GET /api/health` | `{ok, mode:"server", version}`; never needs the password |
| `GET /api/proxy?url=` | allowed hosts only; `X-Cache: HIT/MISS/STALE` |
| `GET/PUT /api/settings/ai` | keys are write-only; GET returns `hasKey` + `keyHint` |
| `POST /api/ai` `{prompt, tier, json}` | streams text; a late error is appended as `\u0000ERR{json}` |
| `GET /api/ai/models?provider=` | live model list for the dropdowns (falls back to `ORDER` in ai.js) |
| `GET/PUT /api/collection` | `{items:[[name,qty,addedMs,loc]]}`; `loc` is a deck name or `""` for the general collection (PUT replaces all) |
| `GET /api/builds`, `GET/PUT/DELETE /api/builds/:name` | saved builds |
| `GET/PUT /api/state` | unused since 1.1 (the working deck is no longer kept between visits); kept for compatibility |

## Conventions

- Plain, user-facing copy; errors say what happened and what to do.
- Card roles (`c.c`): payoff, engine, ramp, draw, removal, wipe, protection, land. Flags (`c.f`): gc, combo, xturn, mld, tutor.
- Bracket rules live in `BRACKETS`; the Game Changers list in `GAME_CHANGERS` (keep in sync with Scryfall `is:gamechanger`; live data also sets `c.gcLive`).
- Run `npm test` before pushing; CI blocks the image if tests fail.
- Default AI models: `server/ai.js` `DEFAULTS` and `GEM_DEFAULT` in app.js. Check current model IDs before changing.
- Model fallback: `runAi` tries the chosen model, then `ORDER[provider]` (lighter first for quick tasks) on overloaded/rate-limit/timeout/unknown-model errors, only before any text streamed. `X-AI-Model` / `X-AI-Skipped` headers tell the page which model answered. Toggle: `autoFallback` setting.
- Working deck: every visit starts empty (`loadInitial`). Nothing is kept until the user clicks **Save deck** (step 8, `saveDeck`), which writes to Saved builds. `save()` only marks `DIRTY`; a `beforeunload` prompt guards unsaved changes. Bracket, budget and export format persist in `localStorage cforge.prefs`.
- Collection places: each entry is one card in one place (`COLL` keyed by `ckey(name, loc)`). `owned(name)` sums every place and lists them in `.locs`; `ownedWhere()` makes the "in Vivi Storm" label. Replace only empties the chosen place.
