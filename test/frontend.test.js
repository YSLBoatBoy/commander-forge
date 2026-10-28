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
  const hook = "globalThis.__T={get S(){return S},parseList,rowsToCards,parsePasted,collAddMany,owned,COLL,spent,exportText,deckCount,mainSize,runPlaytest,get PT(){return PT},applyPlaytest,preconsFor,preconText,get PRE(){return PRE},acMatch,parseLoose,pipCount,blockReason,fitBudget,enforceBracket,get CMDS(){return CMDS},describePlans,readPlansAnswer,setSample:(f)=>{sample=f;},loadExample,saveDeck,discardDeck,clearCollection,collSet,deleteLocation,moveLocation,decksList,ownedWhere,uniqueCards,commanderCandidates,deckCommanders,deckColors,deckSig,setMeta,describeDeck,suggestDeck,renameDeck,get DECKMETA(){return DECKMETA},get DECKERR(){return DECKERR},save,buildsAll,get DIRTY(){return DIRTY}};\n";
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
    console, Math, Date, JSON, Promise, URL, TextDecoder, TextEncoder, Blob: class {},
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

test("every visit starts with an empty deck; save keeps it, discard clears it", () => {
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
  T.saveDeck();
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
