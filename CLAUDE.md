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
| `GET /api/cards`, `POST /api/cards` `{cards:[[key,card,updatedMs]]}` | card details kept between visits (upsert) |
| `GET /api/builds`, `GET/PUT/DELETE /api/builds/:name` | saved builds |
| `GET/PUT /api/decks` | `{decks:{<deck name>:{commanders, desc, descSig, sugg, suggSig, ...}}}` extras for decks in the collection |
| `GET/PUT /api/state` | unused since 1.1 (the working deck is no longer kept between visits); kept for compatibility |

## Conventions

- Plain, user-facing copy; errors say what happened and what to do.
- Card roles (`c.c`): payoff, engine, ramp, draw, removal, wipe, protection, land. Flags (`c.f`): gc, combo, xturn, mld, tutor.
- Bracket rules live in `BRACKETS`; the Game Changers list in `GAME_CHANGERS` (keep in sync with Scryfall `is:gamechanger`; live data also sets `c.gcLive`).
- Run `npm test` before pushing; CI blocks the image if tests fail.
- Default AI models: `server/ai.js` `DEFAULTS` and `GEM_DEFAULT` in app.js. Check current model IDs before changing.
- JSON AI requests (`json:true`) are buffered in `runAi` until complete and valid (`looksLikeJson`); a cut-short answer (Gemini finishReason other than STOP, e.g. RECITATION with long card lists) is error `cut` and retried: first model twice, then the fallback list. Text requests stream as before; a cut ending is flagged with `\u0000ERR{code:"cut"}`.
- Gameplan descriptions: `describePlans` wraps `describePlansNow` and keeps `PLANS{busy,err,for}` so progress/errors show in the Gameplan step itself (also when EDHREC had no themes).
- Model fallback: `runAi` tries the chosen model, then `ORDER[provider]` (lighter first for quick tasks) on overloaded/rate-limit/timeout/unknown-model errors, only before any text streamed. `X-AI-Model` / `X-AI-Skipped` headers tell the page which model answered. Toggle: `autoFallback` setting.
- Working deck: every visit starts empty (`loadInitial`). Nothing is kept until the user clicks **Save deck** (step 9, `saveDeck`, async), which writes to Saved builds; `buildsPut` returns a promise and a failed save shows “Not saved: …” in `#saveNote` (DIRTY stays). The “Also add it to My collection as a deck” box (`#saveToColl`, hidden when already linked) creates a collection place from `builderDeckList()` and sets `S.fromDeck` so later saves update it. `save()` only marks `DIRTY`; a `beforeunload` prompt guards unsaved changes. Bracket, budget and export format persist in `localStorage cforge.prefs`.
- Collection places: each entry is one card in one place (`COLL` keyed by `ckey(name, loc)`). `owned(name)` sums every place and lists them in `.locs`; `ownedWhere()` makes the "in Vivi Storm" label. Replace only empties the chosen place.
- Deck shelf (My collection → Your decks): tiles from `decksList()`, details in `renderDeckDetail()`. Extras in `DECKMETA` (localStorage `cforge.deckmeta`, server `/api/decks`, artifact db doc `data/users/<id>/meta-decks`). AI write-ups store `descSig`/`suggSig` = `deckSig(loc)`; a mismatch shows the "changed since" note. Commander candidates come from `commanders.json` (`isCommanderName`). Playtest/Open go through `openDeckInBuilder()`, which sets `S.fromDeck`; while that deck exists, **Save** (`saveDeck`) also writes the build back into it (`writeBackDeck`: replaces that place's cards with `builderDeckList()`, keeps added-dates, updates commanders, follows a rename) and the button reads “Update “X” in My collection”.
- Suggested changes on the deck shelf: tick boxes (`SWAPOFF[loc]` = unticked) and **Make these changes** (`applySwaps`): cut leaves the deck (back to the general collection if `SWAPBACK`), add takes a copy out of the general collection when there is one (cards in other decks are proxies and stay put), swap gets `done:true`, `suggSig` is refreshed; Undo restores the collection and the meta.
- Ask answers can carry changes: the prompt asks for a final `CHANGES: {"cut":[],"add":[]}` line; `splitChanges` strips it (falls back to "remove…:"/"add…:" bullet lists), keeps only cuts that are in the deck and adds that aren't, stored as `asks[i].changes`. `askChangesUi` shows tick boxes (`ASKOFF["loc|at"]`); `applyAskChanges` uses the shared `applyDeckChanges(loc,cuts,adds,back)` (also used by `applySwaps`) and records `changes.made`.
- Cards you own (builder step 5): `ownedCandidates()` = owned cards not in the build that fit the colors (EDHREC picks first); `checkOwned()` asks the AI for use/maybe/skip per card (only cards with known colors or EDHREC links are sent), stored in `S.ownCheck` with `buildSig()`. Cards sitting in other decks count as normal owned cards (the owner proxies them).
- Surprise me (mode `spin`, `spinDeck()`): needs live data. Looks up the whole collection, keeps owned commanders with ≥45 owned non-land cards in their colors, spins `animateWheel`, then streams an AI draft limited to that owned pool (EDHREC picks first, ≤500 names). Off-list or off-color names are dropped; basics fill to 99. Final bracket = max(`rulesBracket()`, AI estimate); below 3 shows "This is bracket N. Click to Reroll". Result in `S.spin`.
- Collection sort by card type (`TYPE_GROUPS`, `typeGroup()`; front face decides, creatures beat artifact/enchantment, deck commanders get their own section): Archidekt-style columns `.tgrid/.tsec/.trow`, sorted by MV then name. Opening a deck switches A–Z to this view. Hover shows the card picture (`peek`, self-hosted only; `rec.img` from Scryfall `image_uris.normal`).
- Collection sort by color: `colorGroup()` (WUBRG, multicolor, colorless, lands, unknown).
- Card details (`CARDDB`): self-hosted keeps them in the `cards` table. `loadKeptCards()` at boot, `rememberCard` → `keepCard` → `flushCards` (debounced POST). `loadCollColors()` looks up the whole collection once in the background (`keepStale`); other `scryNames` calls refresh entries older than `CARD_STALE_MS` (3 days) for prices. `SCRY_MISS` stops repeat lookups of unknown names within a visit.
- Deck bracket (`deckBracket(loc)`, badge `bracketBadge`): rules floor from Game Changers (1–3 → 3, 4+ → 4), mass land denial (`MLD_CARDS`/`MLD_RE` → 4), extra turns (`XTURN_RE`; 1–2 → 2, 3+ → 4) and two-card infinite/win combos from Commander Spellbook (`checkDeckCombos`, cached in `DECKMETA[loc].combos` by `deckSig` → 3); level = max(floor, current AI write-up estimate, 2).
- Ask about this deck (deck shelf panel, `askPanel`/`askDeck`): free-form AI Q&A per deck, answers kept in `DECKMETA[loc].asks` (newest first, max 8). The matching precon is found in code (`preconMatches`: shared non-basic cards, commander boost; override saved as `DECKMETA[loc].precon` = "name|set" or "none") and `preconDiff` gives exact cut/added lists for the prompt, so the AI doesn't guess.
- Surprise me decks: refine ("Anything you'd like to see added?") offers only unused owned cards (`refineOwnedPool`) and drops other adds with a note.
- Backup & sync tab (`#syncView`, `renderSync`): `downloadBackup()` writes `{app:"commander-forge",v:1,from,collection,decks:DECKMETA,builds:{name:{t,count,state}},cards:[[key,card]]}`; `readBackupFile` previews counts, `importBackup` replaces COLL (all buckets flushed) and DECKMETA, adds builds, merges card details (server: `keepCard`/`flushCards`; Claude: `keepCardsInClaude` → db docs `cards-<letter>`, loaded at boot). Used to move data between Unraid and the Claude page.
- Mana symbols: `manaSym(t)` draws Archidekt-style pips as inline SVG (no image hosts, so it works inside Claude); `pips(cost)` renders a whole cost (handles hybrid, Phyrexian, split cards); `colorPips(ci)`. Palette tokens `--sW…--sL` on :root. Collection color view: sections `.cgsec.g0…g8` and the filter bar `COLLCF` / `renderColorBar()`.
