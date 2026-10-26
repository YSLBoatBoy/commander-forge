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
  const hook = "globalThis.__T={get S(){return S},parseList,rowsToCards,parsePasted,collAddMany,owned,COLL,spent,exportText,deckCount,mainSize,runPlaytest,get PT(){return PT},applyPlaytest,preconsFor,preconText,get PRE(){return PRE},acMatch,parseLoose,pipCount,blockReason,fitBudget,enforceBracket,get CMDS(){return CMDS}};\n";
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
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
    sessionStorage: { getItem: () => null, setItem() {} },
    location: { hash: "", protocol: "file:" },
    window: {}, navigator: {},
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
  assert.deepEqual(plain(T.parsePasted("2x Opt\nCounterspell\n10 Island")), [{ n: "Opt", q: 2 }, { n: "Counterspell", q: 1 }]);
});

test("owned cards are free toward the budget", () => {
  const { T } = loadPage();
  const before = T.spent();
  T.collAddMany([{ n: "Rhystic Study", q: 1 }, { n: "Scroll Rack", q: 1 }], "add");
  assert.ok(T.owned("rhystic study"));
  assert.ok(T.spent() < before);
});

test("bracket 2 removes Game Changers", () => {
  const { T } = loadPage();
  T.S.bracket = 2;
  const removed = T.enforceBracket();
  assert.ok(removed > 0);
  assert.equal(T.S.cards.filter((c) => c.sel && c.f.includes("gc")).length, 0);
});

test("playtest runs and keeps the deck at 99 after applying fixes", () => {
  const { T } = loadPage();
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
