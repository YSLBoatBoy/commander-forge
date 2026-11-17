// Runs the page's script against a tiny fake DOM so its deck logic can be tested without a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Objects made inside the vm have their own prototypes; compare plain copies.
const plain = (x) => JSON.parse(JSON.stringify(x));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadPage({ storage = {} } = {}) {
  let src = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");
  const hook = "globalThis.__T={get S(){return S},parseList,rowsToCards,parsePasted,collAddMany,owned,COLL,spent,exportText,deckCount,mainSize,runPlaytest,get PT(){return PT},applyPlaytest,preconsFor,preconText,get PRE(){return PRE},acMatch,parseLoose,pipCount,blockReason,fitBudget,enforceBracket,get CMDS(){return CMDS},describePlans,readPlansAnswer,setSample:(f)=>{sample=f;},loadExample,saveDeck,discardDeck,clearCollection,collSet,deleteLocation,moveLocation,decksList,ownedWhere,uniqueCards,commanderCandidates,deckCommanders,deckColors,deckSig,setMeta,describeDeck,suggestDeck,renameDeck,get DECKMETA(){return DECKMETA},ownedCandidates,checkOwned,useOwned,spinDeck,refine,splitChanges,applyAskChanges,applySwaps,get SWAPOFF(){return SWAPOFF},openDeckInBuilder,deckBracket,typeGroup,askDeck,preconMatches,preconDiff,deckPrecon,get PREDATA(){return PRE},rulesBracket,ownedCommanders,ownedPoolFor,colorGroup,get SPIN(){return SPIN},setLive:(v)=>{LIVE=v;},putCard:(d)=>{CARDDB[key(d.name)]=d;},get DECKERR(){return DECKERR},save,buildsAll,get DIRTY(){return DIRTY}};\n";
  src = src.replace("// ================= boot =================", hook + "// ================= boot =================");
  const data = {
    cmdData: fs.readFileSync(path.join(root, "public/data/commanders.json"), "utf8"),
    preconData: fs.readFileSync(path.join(root, "public/data/precons.json"), "utf8"),
  };
  const els = {};
  const el = (id) => els[id] || (els[id] = {
    id, value: id === "ptN" ? "500" : "", innerHTML: "", textContent: data[id] || "", hidden: false, disabled: false,
    checked: id !== "ownedOnly", style: {}, dataset: {}, className: "", classList: { add() {}, remove() {} },
    firstElementChild: { style: {} }, lastElementChild: {}, parentNode: { firstChild: {} }, nextElementSibling: null,
    addEventListener() {}, setAttribute() {}, removeAttribute() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    insertAdjacentHTML() {}, focus() {}, scrollIntoView() {},
  });
  const store = { ...storage };
  const ctx = {
    document: { getElementById: el, querySelectorAll: () => [], querySelector: () => null, head: { appendChild() {} }, createElement: () => el("x" + Math.random()) },
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
    sessionStorage: { getItem: () => null, setItem() {} },
    location: { hash: "", protocol: "file:" },
    window: { addEventListener() {}, scrollTo() {} }, navigator: {},
    fetch: () => Promise.reject(new Error("offline")),
    requestAnimationFrame: (f) => f(), setTimeout: () => 0, clearTimeout: () => {},
    console, Math, Date, JSON, Promise, URL, TextDecoder, TextEncoder, Blob: class {}, AbortController, performance,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { T: ctx.__T, els, store };
}

test("example deck is exactly 100 cards and exports for Archidekt", () => {
  const { T } = loadPage();
  T.loadExample();
  assert.equal(T.deckCount(), T.mainSize());
  const lines = T.exportText().split("\n");
  assert.equal(lines.reduce((a, l) => a + (parseInt(l) || 0), 0), 100);
  assert.match(lines[0], /^1x Yennett, Cryptic Sovereign \[Commander\{top\}\]$/);
});

test("imports Moxfield and Archidekt lists", () => {
  const { T } = loadPage();
  const rows = T.parseList("Commander\n1 Yennett, Cryptic Sovereign\n\nDeck\n1 Sol Ring (C21) 263\n1 Fire // Ice (MH2) 290 *F*\n1x Arcane Signet (cmr) 297 [Ramp] ^Have,#37d67a^\n8 Island\nSIDEBOARD:\n1 Counterspell");
  assert.deepEqual(plain(rows.map((r) => [r.q, r.n, r.sec])), [[1, "Yennett, Cryptic Sovereign", "commander"], [1, "Sol Ring", "deck"], [1, "Fire // Ice", "deck"], [1, "Arcane Signet", "deck"], [8, "Island", "deck"], [1, "Counterspell", "sideboard"]]);
  assert.deepEqual(plain(rows[3].cats), ["Ramp"]);
});

test("reads collection spreadsheets from common apps", () => {
  const { T } = loadPage();
  const mox = T.rowsToCards([["Count", "Tradelist Count", "Name", "Edition"], ["2", "0", "Sol Ring", "C21"], ["1", "0", "Rhystic Study (PCA) 23", ""]]);
  assert.deepEqual(plain(mox.cards), [{ n: "Sol Ring", q: 2 }, { n: "Rhystic Study", q: 1 }]);
  const manabox = T.rowsToCards([["Name", "Set code", "Quantity"], ["Smothering Tithe", "RNA", "3"]]);
  assert.deepEqual(plain(manabox.cards), [{ n: "Smothering Tithe", q: 3 }]);
  assert.deepEqual(plain(T.rowsToCards([["4", "Brainstorm"], ["1", "Ponder"]]).cards), [{ n: "Brainstorm", q: 4 }, { n: "Ponder", q: 1 }]);
  assert.deepEqual(plain(T.parsePasted("2x Opt\nCounterspell\n10 Island")), [{ n: "Opt", q: 2 }, { n: "Counterspell", q: 1 }, { n: "Island", q: 10 }]);
});

test("owned cards are free toward the budget", () => {
  const { T } = loadPage();
  T.loadExample();
  const before = T.spent();
  T.collAddMany([{ n: "Rhystic Study", q: 1 }, { n: "Scroll Rack", q: 1 }], "add");
  assert.ok(T.owned("rhystic study"));
  assert.ok(T.spent() < before);
});

test("bracket 2 removes Game Changers", () => {
  const { T } = loadPage();
  T.loadExample();
  T.S.bracket = 2;
  const removed = T.enforceBracket();
  assert.ok(removed > 0);
  assert.equal(T.S.cards.filter((c) => c.sel && c.f.includes("gc")).length, 0);
});

test("playtest runs and keeps the deck at 99 after applying fixes", () => {
  const { T } = loadPage();
  T.loadExample();
  T.runPlaytest();
  assert.ok(T.PT.N > 0 && T.PT.mull >= 0 && T.PT.mull <= 1);
  T.S.landTarget = 31;
  T.runPlaytest();
  const fix = T.PT.diags.find((d) => d.id === "lands+");
  assert.ok(fix, "low land count should suggest adding lands");
  const sizeBefore = T.deckCount();
  T.applyPlaytest();
  assert.equal(T.deckCount(), sizeBefore);
});

test("precons and commander search data load", () => {
  const { T } = loadPage();
  assert.ok(T.PRE.d.length >= 200);
  const i = T.preconsFor(["Giada, Font of Hope"])[0];
  assert.ok(i >= 0);
  const rows = T.parseList(T.preconText(i));
  assert.equal(rows.reduce((a, r) => a + r.q, 0), 100);
  assert.ok(T.CMDS.length > 3000);
  assert.ok(T.acMatch("yen").some((c) => c.n === "Yennett, Cryptic Sovereign"));
});

test("tolerant JSON parsing of AI answers", () => {
  const { T } = loadPage();
  assert.deepEqual(plain(T.parseLoose('```json\n{"a":1}\n```')), { a: 1 });
  assert.deepEqual(plain(T.parseLoose('Here you go: {"a":2} hope that helps')), { a: 2 });
  assert.throws(() => T.parseLoose("nope"));
  assert.deepEqual(plain(T.pipCount("{2}{W}{U/B}{B}")), { W: 1, U: 0.5, B: 1.5, R: 0, G: 0 });
});

test("gameplan descriptions fill in whatever shape the AI answers with", async () => {
  const shapes = [
    { overview: "O", plans: [{ id: "elves", name: "Elves", pitch: "Go wide with elves." }, { id: "combo", name: "Combo", pitch: "Assemble a combo." }] },
    [{ name: "Elves", description: "Go wide with elves." }, { name: "Combo", description: "Assemble a combo." }],
    [{ overview: "O", gameplans: [{ theme: "elves", summary: "Go wide with elves." }, { theme: "combo", summary: "Assemble a combo." }] }],
    { themes: [{ id: "Tribal Elves", pitch: "Go wide with elves." }, { id: "Infinite combo", pitch: "Assemble a combo." }] },
  ];
  for (const ans of shapes) {
    const { T } = loadPage();
    T.S.commanders = [{ name: "Lathril, Blade of the Elves", text: "Menace" }];
    T.S.gameplans = [{ id: "elves", name: "Elves", decks: 494 }, { id: "combo", name: "Combo", decks: 338 }];
    const fake = () => Promise.resolve({ text: "" });
    fake.json = async () => ans;
    T.setSample(fake);
    await T.describePlans();
    assert.deepEqual(plain(T.S.gameplans.map((g) => g.pitch)), ["Go wide with elves.", "Assemble a combo."], JSON.stringify(ans));
  }
});

test("a useless AI answer is reported instead of failing silently", async () => {
  const { T } = loadPage();
  T.S.commanders = [{ name: "X", text: "" }];
  T.S.gameplans = [{ id: "elves", name: "Elves" }];
  const fake = () => Promise.resolve({ text: "" });
  fake.json = async () => ({ hello: "world" });
  T.setSample(fake);
  await assert.rejects(T.describePlans(), (e) => e.code === "no_plans");
  assert.equal(T.S.plansFailed, true);
});

test("every visit starts with an empty deck; save keeps it, discard clears it", async () => {
  const first = loadPage({ storage: { "cforge.current": JSON.stringify({ cards: [{ n: "Old card" }], commanders: [{ name: "Old" }] }) } });
  assert.equal(first.T.S.cards.length, 0);
  assert.equal(first.T.S.commanders.length, 0);
  assert.equal(first.store["cforge.current"], undefined);
  assert.equal(first.T.deckCount(), 0);

  const { T, els, store } = loadPage();
  T.loadExample();
  T.S.example = false;
  T.save();
  assert.equal(T.DIRTY, true);
  els.deckName.value = "My Yennett";
  await T.saveDeck();
  assert.equal(T.DIRTY, false);
  assert.ok(JSON.parse(store["cforge.builds"])["My Yennett"].state.cards.length > 50);
  T.save();
  assert.equal(T.DIRTY, true);
  T.discardDeck();                       // first click only asks for confirmation
  assert.equal(T.S.cards.length > 0, true);
  els.discardDeck.dataset.confirm = "1";
  T.discardDeck();
  assert.equal(T.S.cards.length, 0);
  assert.equal(T.DIRTY, false);
  assert.ok(JSON.parse(store["cforge.builds"])["My Yennett"], "saved deck survives a discard");
});

test("replace and delete-all actually change the saved collection, and undo restores it", () => {
  const { T, store } = loadPage();
  T.collAddMany([{ n: "Sol Ring", q: 2 }, { n: "Island", q: 10 }], "add");
  assert.equal(T.COLL.size, 2);
  const undo = T.collAddMany([{ n: "Opt", q: 1 }], "replace");
  assert.equal(T.COLL.size, 1);
  assert.deepEqual(plain(JSON.parse(store["cforge.collection"]).map((r) => r[0])), ["Opt"]);
  undo();
  assert.equal(T.COLL.size, 2);
  T.clearCollection();
  assert.equal(T.COLL.size, 0);
  assert.equal(JSON.parse(store["cforge.collection"]).length, 0);
});

test("cards can live in named decks; owned counts every place", () => {
  const { T, store } = loadPage();
  T.collAddMany([{ n: "Sol Ring", q: 1 }, { n: "Island", q: 10 }], "add", "");
  T.collAddMany([{ n: "Sol Ring", q: 1 }, { n: "Brainstorm", q: 1 }], "add", "Vivi Storm");
  assert.equal(T.owned("Sol Ring").q, 2);
  assert.equal(T.ownedWhere(T.owned("Sol Ring")), "also in Vivi Storm");
  assert.equal(T.ownedWhere(T.owned("Brainstorm")), "in Vivi Storm");
  assert.equal(T.uniqueCards(), 3);
  assert.deepEqual(plain(T.decksList()), [{ name: "Vivi Storm", cards: 2, copies: 2 }]);
  // replacing a deck leaves the general collection alone
  T.collAddMany([{ n: "Opt", q: 1 }], "replace", "Vivi Storm");
  assert.equal(T.owned("Island").q, 10);
  assert.equal(T.owned("Brainstorm"), null);
  T.moveLocation("Vivi Storm", "");
  assert.equal(T.decksList().length, 0);
  assert.ok(T.owned("Opt"));
  const saved = JSON.parse(store["cforge.collection"]);
  assert.ok(saved.every((r) => r.length === 4));
  T.collAddMany([{ n: "Ponder", q: 1 }], "add", "Niv");
  T.deleteLocation("Niv");
  assert.equal(T.owned("Ponder"), null);
});

test("decks in the collection: commander pick, colors, write-ups that know when they're stale", async () => {
  const { T, store } = loadPage();
  T.collAddMany([{ n: "Vivi Ornitier", q: 1 }, { n: "Niv-Mizzet, Parun", q: 1 }, { n: "Brainstorm", q: 1 }, { n: "Island", q: 10 }], "add", "Izzet");
  assert.deepEqual(plain(T.commanderCandidates("Izzet")), ["Niv-Mizzet, Parun", "Vivi Ornitier"]);
  assert.deepEqual(plain(T.deckCommanders("Izzet")), []);            // two candidates: player must pick
  T.setMeta("Izzet", { commanders: ["Vivi Ornitier"] });
  assert.deepEqual(plain(T.deckCommanders("Izzet")), ["Vivi Ornitier"]);
  assert.deepEqual(plain(T.deckColors("Izzet")), ["U", "R"]);
  await new Promise((r) => setImmediate(r));   // let the page finish starting up before plugging in a fake AI
  const fake = () => Promise.resolve({ text: "" });
  fake.json = async (prompt) => prompt.includes("coach")
    ? { howToPlay: ["Sculpt with cantrips"], mulligan: "Keep 2 lands + cantrip", swaps: [{ add: "Ponder", cut: "Brainstorm", why: "x" }] }
    : [{ style: "Izzet spells", summary: "Casts spells and wins with Vivi.", phases: ["Early game: dig"], winCons: ["Vivi pings"] }];
  T.setSample(fake);
  await T.describeDeck("Izzet");
  const m = T.DECKMETA.Izzet;
  assert.equal(m.desc.summary, "Casts spells and wins with Vivi.");
  assert.equal(m.descSig, T.deckSig("Izzet"));
  assert.ok(JSON.parse(store["cforge.deckmeta"]).Izzet.desc);
  T.collAddMany([{ n: "Opt", q: 1 }], "add", "Izzet");
  assert.notEqual(m.descSig, T.deckSig("Izzet"), "adding a card marks the write-up out of date");
  await T.suggestDeck("Izzet");
  assert.ok(T.DECKMETA.Izzet.sugg, JSON.stringify(T.DECKERR));
  assert.equal(T.DECKMETA.Izzet.sugg.swaps[0].add, "Ponder");
  T.renameDeck("Izzet", "Vivi Storm");
  assert.ok(T.DECKMETA["Vivi Storm"].desc && !T.DECKMETA.Izzet);
  assert.equal(T.decksList()[0].name, "Vivi Storm");
});

test("cards you own: finds owned cards that fit, rates them, and swaps one in", async () => {
  const { T } = loadPage();
  T.loadExample(); T.S.example = false;
  await new Promise((r) => setImmediate(r));
  T.S.edh = { pool: [{ n: "Mystic Remora", inc: 40, syn: 25 }, { n: "Sol Ring", inc: 90, syn: 0 }], themes: [] };
  T.collAddMany([{ n: "Mystic Remora", q: 1 }, { n: "Sol Ring", q: 1 }, { n: "Grizzly Bears", q: 2 }], "add", "");
  const cand = T.ownedCandidates().map((x) => x.n);
  assert.ok(cand.includes("Mystic Remora"));
  assert.ok(!cand.includes("Sol Ring"), "cards already in the deck aren't suggested");
  const fake = () => Promise.resolve({ text: "" });
  fake.json = async () => ({ cards: [{ n: "Mystic Remora", verdict: "use", why: "Cheap early draw.", replace: "Night's Whisper", c: "draw" }, { n: "Grizzly Bears", verdict: "skip", why: "Off plan." }] });
  T.setSample(fake);
  await T.checkOwned();
  const items = T.S.ownCheck.items;
  assert.equal(items.find((x) => x.n === "Mystic Remora").verdict, "use");
  assert.ok(!items.some((x) => x.n === "Grizzly Bears"), "cards the AI couldn't safely judge (no color data) aren't sent or kept");
  const before = T.deckCount();
  T.useOwned("Mystic Remora", "Night's Whisper");
  assert.ok(T.S.cards.find((c) => c.n === "Mystic Remora").sel);
  assert.ok(!T.S.cards.find((c) => c.n === "Night's Whisper").sel);
  assert.equal(T.deckCount(), before);
});

test("sort by color groups cards by color identity", () => {
  const { T } = loadPage();
  T.putCard({ name: "Opt", ci: ["U"], type: "Instant", legal: "legal", mv: 1 });
  T.putCard({ name: "Lightning Helix", ci: ["R", "W"], type: "Instant", legal: "legal", mv: 2 });
  T.putCard({ name: "Sol Ring", ci: [], type: "Artifact", legal: "legal", mv: 1 });
  T.putCard({ name: "Command Tower", ci: [], type: "Land", legal: "legal", mv: 0 });
  assert.equal(T.colorGroup("Opt"), 1);
  assert.equal(T.colorGroup("Lightning Helix"), 5);
  assert.equal(T.colorGroup("Sol Ring"), 6);
  assert.equal(T.colorGroup("Command Tower"), 7);
  assert.equal(T.colorGroup("Island"), 7);
  assert.equal(T.colorGroup("Vivi Ornitier"), 5, "commanders get colors from the built-in list");
  assert.equal(T.colorGroup("Some Unknown Card"), 8);
});

test("surprise me: spins one of your commanders and drafts only owned cards", async () => {
  const { T, els } = loadPage();
  await new Promise((r) => setImmediate(r));
  T.setLive(true);
  T.putCard({ name: "Vivi Ornitier", ci: ["U", "R"], type: "Legendary Creature — Wizard", legal: "legal", mv: 2, mana: "{U}{R}", text: "Vivi text" });
  const owned = [{ n: "Vivi Ornitier", q: 1 }];
  for (let i = 0; i < 60; i++) { const n = "Spell " + i; owned.push({ n, q: 1 }); T.putCard({ name: n, ci: ["U"], type: "Instant", legal: "legal", mv: 2, usd: 1 }); }
  owned.push({ n: "Off Color", q: 1 }); T.putCard({ name: "Off Color", ci: ["G"], type: "Instant", legal: "legal", mv: 1 });
  owned.push({ n: "Spare Owned", q: 1 }); T.putCard({ name: "Spare Owned", ci: ["R"], type: "Sorcery", legal: "legal", mv: 3, usd: 2 });
  T.collAddMany(owned, "add", "");
  assert.deepEqual(plain(T.ownedCommanders()), ["Vivi Ornitier"]);
  assert.ok(!T.ownedPoolFor(["U", "R"], ["Vivi Ornitier"]).some((x) => x.n === "Off Color"));
  let prompt = "";
  const fake = (input, opts) => {
    prompt = input;
    const lines = ['{"t":"plan","name":"Blue Tide","summary":"S","steps":["Early game: a"],"lands":36,"weights":{"U":0.7,"R":0.3},"bracket":2,"bracketWhy":"No Game Changers."}'];
    for (let i = 0; i < 60; i++) lines.push(JSON.stringify({ t: "card", n: "Spell " + i, c: "engine", s: 6, w: "why" }));
    lines.push('{"t":"card","n":"Not Owned Card","c":"payoff","s":9,"w":"x"}', '{"t":"card","n":"Off Color","c":"payoff","s":9,"w":"x"}', '{"t":"basic","n":"Island","q":25}', '{"t":"basic","n":"Mountain","q":11}', '{"t":"basic","n":"Forest","q":5}');
    const text = lines.join("\n");
    opts.onText({ text, delta: text });
    return Promise.resolve({ text });
  };
  fake.json = async () => ({});
  T.setSample(fake);
  await T.spinDeck();
  assert.equal(T.SPIN.msg, "", T.SPIN.msg);
  assert.equal(T.S.commanders[0].name, "Vivi Ornitier");
  assert.ok(prompt.includes("Spell 0") && !prompt.includes("Off Color"));
  const names = T.S.cards.filter((c) => c.sel).map((c) => c.n);
  assert.ok(!names.includes("Not Owned Card") && !names.includes("Off Color"), "only owned, on-color cards");
  assert.equal(T.deckCount(), 99);
  assert.ok(!("Forest" in T.S.basics), "no off-color basics");
  assert.equal(T.S.spin.bracket, 2);
  assert.equal(T.S.gameplans[0].name, "Blue Tide");
  // "Anything you'd like to see added?" stays owned-only for a surprise deck
  let rprompt = "";
  fake.json = async (input) => { rprompt = input; return { reply: "ok", add: [{ n: "Spare Owned", c: "payoff" }, { n: "Sol Ring", c: "ramp" }, { n: "Spell 3", c: "draw" }], cut: [{ n: "Spell 5" }] }; };
  els.refineText = { value: "add more ramp", focus() {} };
  await T.refine();
  assert.ok(rprompt.includes("Spare Owned") && !rprompt.includes("Off Color") && !rprompt.includes("BUDGET"), "prompt lists only unused owned cards");
  assert.deepEqual(plain(T.S.refine.add.map((a) => a.n)), ["Spare Owned"]);
  assert.match(T.S.refine.note, /Sol Ring/);
});

test("ask about a deck: finds its precon and lists exactly what was cut and added", async () => {
  const { T } = loadPage();
  await new Promise((r) => setImmediate(r));
  const P = T.PREDATA; const i = 0; const d = P.d[i];
  const cmd = P.n[d[3][0]];
  const main = d[4].map((x) => (Array.isArray(x) ? [P.n[x[0]], x[1]] : [P.n[x], 1]));
  const nonBasic = main.filter(([n]) => !/^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/.test(n));
  const cut = nonBasic.slice(0, 3).map(([n]) => n);
  const list = [{ n: cmd, q: 1 }].concat(main.filter(([n]) => !cut.includes(n)).map(([n, q]) => ({ n, q })), [{ n: "Brand New Card", q: 1 }, { n: "Another Add", q: 1 }]);
  T.collAddMany(list, "add", "My Precon");
  T.setMeta("My Precon", { commanders: [cmd] });
  assert.equal(T.deckPrecon("My Precon"), i);
  const df = T.preconDiff("My Precon", i);
  assert.deepEqual(plain(df.cut), cut.slice().sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(plain(df.added), ["Another Add", "Brand New Card"]);
  let prompt = "";
  const fake = (input, opts) => { prompt = input; const text = "You cut:\n- " + cut.join("\n- "); opts.onText({ text, delta: text }); return Promise.resolve({ text }); };
  fake.json = async () => ({});
  T.setSample(fake);
  await T.askDeck("My Precon", "What cards from the precon did we cut?");
  assert.ok(prompt.includes("CUT FROM THE PRECON") && cut.every((n) => prompt.includes(n)) && prompt.includes(d[0]));
  const asks = T.DECKMETA["My Precon"].asks;
  assert.equal(asks.length, 1);
  assert.match(asks[0].a, new RegExp(cut[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // a deck that matches no precon says so
  T.collAddMany([{ n: "Sol Ring", q: 1 }, { n: "Arcane Signet", q: 1 }], "add", "Scratch Deck");
  assert.equal(T.deckPrecon("Scratch Deck"), null);
});

test("card type view groups cards like Archidekt", async () => {
  const { T } = loadPage();
  const put = (name, type) => T.putCard({ name, type, ci: [], legal: "legal", mv: 2 });
  put("Kitchen Finks", "Creature — Ouphe"); put("Solemn Simulacrum", "Artifact Creature — Golem"); put("Fire // Ice", "Instant // Instant");
  put("Emeria's Call // Emeria, Shattered Skyclave", "Sorcery // Land"); put("Command Tower", "Land"); put("Sol Ring", "Artifact");
  put("Rhystic Study", "Enchantment"); put("Teferi, Time Raveler", "Legendary Planeswalker — Teferi"); put("Invasion of Ikoria", "Battle — Siege");
  const g = (n, c) => ["Commander", "Planeswalkers", "Battles", "Creatures", "Instants", "Sorceries", "Artifacts", "Enchantments", "Lands", "Other", "Type not known yet"][T.typeGroup(n, c)];
  assert.equal(g("Kitchen Finks", new Set(["kitchen finks"])), "Commander");
  assert.equal(g("Solemn Simulacrum"), "Creatures");
  assert.equal(g("Fire // Ice"), "Instants");
  assert.equal(g("Emeria's Call // Emeria, Shattered Skyclave"), "Sorceries");
  assert.equal(g("Command Tower"), "Lands");
  assert.equal(g("Island"), "Lands");
  assert.equal(g("Sol Ring"), "Artifacts");
  assert.equal(g("Rhystic Study"), "Enchantments");
  assert.equal(g("Teferi, Time Raveler"), "Planeswalkers");
  assert.equal(g("Invasion of Ikoria"), "Battles");
  assert.equal(g("Never Looked Up"), "Type not known yet");
});

test("deck bracket follows the official rules", async () => {
  const { T } = loadPage();
  const fill = (loc, extra) => T.collAddMany([{ n: "Island", q: 30 }].concat(extra.map((n) => ({ n, q: 1 }))), "add", loc);
  fill("Casual", ["Opt", "Counterspell"]);
  let b = T.deckBracket("Casual"); assert.equal(b.floor, 1); assert.equal(b.level, 2);
  fill("Two GC", ["Rhystic Study", "Smothering Tithe", "Opt"]);
  b = T.deckBracket("Two GC"); assert.equal(b.level, 3); assert.equal(b.gc.length, 2);
  fill("Four GC", ["Rhystic Study", "Smothering Tithe", "Cyclonic Rift", "Demonic Tutor"]);
  assert.equal(T.deckBracket("Four GC").level, 4);
  fill("Stax", ["Armageddon"]);
  assert.equal(T.deckBracket("Stax").level, 4);
  T.putCard({ name: "Time Warp", type: "Sorcery", ci: ["U"], legal: "legal", mv: 5, text: "Target player takes an extra turn after this one." });
  fill("Turns", ["Time Warp"]);
  b = T.deckBracket("Turns"); assert.equal(b.level, 2); assert.equal(b.xt.length, 1);
  T.setMeta("Casual", { combos: { sig: T.deckSig("Casual"), list: ["Opt + Counterspell"] } });
  assert.equal(T.deckBracket("Casual").level, 3);
  T.setMeta("Two GC", { desc: { bracket: 4, summary: "x" }, descSig: T.deckSig("Two GC") });
  assert.equal(T.deckBracket("Two GC").level, 4, "AI estimate can raise it");
});

test("saving a deck opened from My collection updates that deck", async () => {
  const { T } = loadPage();
  await new Promise((r) => setImmediate(r));
  const cards = ["Sol Ring", "Arcane Signet", "Counterspell", "Opt", "Brainstorm", "Ponder", "Preordain", "Swan Song"];
  T.collAddMany([{ n: "Talrand, Sky Summoner", q: 1 }, { n: "Island", q: 30 }].concat(cards.map((n) => ({ n, q: 1 }))), "add", "Talrand Spells");
  T.setMeta("Talrand Spells", { commanders: ["Talrand, Sky Summoner"] });
  await T.openDeckInBuilder("Talrand Spells");
  assert.equal(T.S.fromDeck, "Talrand Spells");
  // unchanged save keeps the same list
  await T.saveDeck();
  const list = () => Object.fromEntries([...T.COLL.values()].filter((v) => v.loc === "Talrand Spells").map((v) => [v.n, v.q]));
  assert.equal(list()["Island"], 30);
  assert.equal(list()["Opt"], 1);
  // cut one card, add one, save
  T.S.cards.find((c) => c.n === "Opt").sel = false;
  T.S.cards.push({ id: "x1", n: "Mystic Sanctuary", c: "land", sel: true, f: [] });
  T.save(); await T.saveDeck();
  const after = list();
  assert.equal(after["Opt"], undefined, "cut card removed from the collection deck");
  assert.equal(after["Mystic Sanctuary"], 1, "added card is in the collection deck");
  assert.equal(after["Talrand, Sky Summoner"], 1);
  assert.equal(T.DIRTY, false);
  assert.ok(T.buildsAll()["Talrand Spells"], "a copy is also in Saved builds");
});

test("make suggested changes right in a collection deck", async () => {
  const { T } = loadPage();
  T.collAddMany([{ n: "Opt", q: 1 }, { n: "Ponder", q: 1 }, { n: "Divination", q: 1 }, { n: "Island", q: 30 }], "add", "Spells");
  T.collAddMany([{ n: "Brainstorm", q: 2 }], "add", "");
  T.collAddMany([{ n: "Counterspell", q: 1 }], "add", "Other Deck");
  T.setMeta("Spells", { sugg: { howToPlay: [], mulligan: "", styleShift: "", swaps: [
    { add: "Brainstorm", cut: "Opt", why: "" }, { add: "Counterspell", cut: "Ponder", why: "" }, { add: "Mystic Remora", cut: "Divination", why: "" } ] }, suggSig: T.deckSig("Spells") });
  T.SWAPOFF["Spells"] = new Set([2]);
  T.applySwaps("Spells");
  const place = (loc) => Object.fromEntries([...T.COLL.values()].filter((v) => (v.loc || "") === loc).map((v) => [v.n, v.q]));
  const deck = place("Spells"), gen = place("");
  assert.equal(deck["Brainstorm"], 1); assert.equal(deck["Counterspell"], 1);
  assert.equal(deck["Opt"], undefined); assert.equal(deck["Ponder"], undefined);
  assert.equal(deck["Divination"], 1, "unticked change is skipped"); assert.equal(deck["Mystic Remora"], undefined);
  assert.equal(gen["Brainstorm"], 1, "one copy moved out of the general collection");
  assert.equal(gen["Opt"], 1); assert.equal(gen["Ponder"], 1);
  assert.equal(place("Other Deck")["Counterspell"], 1, "a card in another deck stays there (proxy)");
  const sw = T.DECKMETA["Spells"].sugg.swaps; assert.ok(sw[0].done && sw[1].done && !sw[2].done);
  assert.equal(T.DECKMETA["Spells"].suggSig, T.deckSig("Spells"), "no 'deck changed' note after making the changes");
});

test("answers that suggest changes can be made right from Ask about this deck", async () => {
  const { T } = loadPage();
  await new Promise((r) => setImmediate(r));
  const deck = ["Heliod, Sun-Crowned", "Walking Ballista", "Aluren", "Shrieking Drake", "Whitemane Lion", "Smothering Tithe", "Sol Ring"];
  T.collAddMany(deck.map((n) => ({ n, q: 1 })).concat([{ n: "Forest", q: 30 }]), "add", "Counters");
  T.collAddMany([{ n: "Armorcraft Judge", q: 1 }], "add", "");
  // the answer from the screenshot: no CHANGES line, plain lists
  const plainAnswer = `To bring your deck into a strong, fair Bracket 3 power level, cut the combos.
Cards to remove:
- Heliod, Sun-Crowned
- Walking Ballista
- Aluren
- Shrieking Drake
- Whitemane Lion
- Smothering Tithe
Cards to add (from your owned collection and precon cuts):
- Armorcraft Judge
- Arasta of the Endless Web
- Rites of Flourishing
- Octomancer
- Jolly Gerbils
- Communal Brewing
Cutting the Heliod and Walking Ballista win condition removes the two-card infinite wins.`;
  let r = T.splitChanges(plainAnswer, "Counters");
  assert.deepEqual(plain(r.changes.cut), deck.slice(0, 6));
  assert.equal(r.changes.add.length, 6);
  assert.equal(r.changes.add[0], "Armorcraft Judge");
  // tagged form wins and is hidden from the text
  r = T.splitChanges('Cut Aluren for Rites.\n- Aluren\nCHANGES: {"cut":["aluren","Not In Deck"],"add":["Rites of Flourishing","Sol Ring"]}', "Counters");
  assert.ok(!r.text.includes("CHANGES"));
  assert.deepEqual(plain(r.changes), { cut: ["Aluren"], add: ["Rites of Flourishing"] }, "unknown cuts and cards already in the deck are dropped");
  // make them, with one add unticked
  const fake = (input, opts) => { opts.onText({ text: plainAnswer, delta: plainAnswer }); return Promise.resolve({ text: plainAnswer }); };
  fake.json = async () => ({}); T.setSample(fake);
  await T.askDeck("Counters", "bring this back down to a strong B3");
  const ask = T.DECKMETA["Counters"].asks[0];
  assert.equal(ask.changes.cut.length, 6);
  T.applyAskChanges("Counters", ask.at);
  const place = (loc) => Object.fromEntries([...T.COLL.values()].filter((v) => (v.loc || "") === loc).map((v) => [v.n, v.q]));
  const d = place("Counters");
  assert.equal(d["Aluren"], undefined); assert.equal(d["Heliod, Sun-Crowned"], undefined);
  assert.equal(d["Armorcraft Judge"], 1); assert.equal(d["Octomancer"], 1); assert.equal(d["Sol Ring"], 1);
  assert.equal(place("")["Armorcraft Judge"], undefined, "owned copy moved out of the general collection");
  assert.equal(place("")["Aluren"], 1, "cut cards go back to the general collection");
  assert.ok(T.DECKMETA["Counters"].asks[0].changes.done);
  // an answer saved before this feature still gets its changes picked out
  T.setMeta("Counters", { asks: [{ q: "old", a: "Cards to remove:\n- Sol Ring\nCards to add:\n- Arcane Signet", at: 1 }] });
  T.applyAskChanges("Counters", 1);
  assert.equal(place("Counters")["Arcane Signet"], 1); assert.equal(place("Counters")["Sol Ring"], undefined);
});

test("deck prompts carry the app's own Game Changer count", async () => {
  const { T } = loadPage();
  await new Promise((r) => setImmediate(r));
  T.collAddMany([{ n: "Yennett, Cryptic Sovereign", q: 1 }, { n: "Rhystic Study", q: 1 }, { n: "Vampiric Tutor", q: 1 }, { n: "Consecrated Sphinx", q: 1 }, { n: "Mystical Tutor", q: 1 }, { n: "Void Winnower", q: 1 }, { n: "Sol Ring", q: 1 }, { n: "Island", q: 30 }], "add", "Yennett");
  let prompt = "";
  const fake = (input, opts) => { prompt = input; opts.onText({ text: "ok", delta: "ok" }); return Promise.resolve({ text: "ok" }); };
  fake.json = async () => ({}); T.setSample(fake);
  await T.askDeck("Yennett", "list each game changer");
  assert.match(prompt, /Game Changers in this deck[^\n]*Consecrated Sphinx, Mystical Tutor, Rhystic Study, Vampiric Tutor \(4 total\)/);
  assert.match(prompt, /Rhystic Study \| .*GAME CHANGER|1 Rhystic Study \| GAME CHANGER/);
  assert.ok(!/Sol Ring[^\n]*GAME CHANGER/.test(prompt) && !/Void Winnower[^\n]*GAME CHANGER/.test(prompt));
  assert.match(prompt, /at least 4/);
});
