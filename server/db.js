// SQLite storage. One file at $DATA_DIR/commander-forge.db (Unraid: /mnt/user/appdata/commander-forge).
// Uses Node's built-in node:sqlite, so there is no database server or npm package to install.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = 1;

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, "commander-forge.db");
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collection (
      k TEXT PRIMARY KEY,          -- lower-cased card name
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      added INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS builds (
      name TEXT PRIMARY KEY,
      state TEXT NOT NULL,         -- JSON of the builder state
      count TEXT,
      updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cache (
      url TEXT PRIMARY KEY,
      status INTEGER NOT NULL,
      body TEXT NOT NULL,
      fetched INTEGER NOT NULL
    );
  `);
  const ver = db.prepare("SELECT value FROM kv WHERE key='schema_version'").get();
  if (!ver) db.prepare("INSERT INTO kv(key,value,updated) VALUES('schema_version',?,?)").run(String(SCHEMA_VERSION), Date.now());
  return wrap(db, file);
}

function wrap(db, file) {
  const q = {
    kvGet: db.prepare("SELECT value FROM kv WHERE key=?"),
    kvSet: db.prepare("INSERT INTO kv(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=excluded.updated"),
    kvDel: db.prepare("DELETE FROM kv WHERE key=?"),
    collAll: db.prepare("SELECT name, qty, added FROM collection ORDER BY name COLLATE NOCASE"),
    collClear: db.prepare("DELETE FROM collection"),
    collIns: db.prepare("INSERT INTO collection(k,name,qty,added) VALUES(?,?,?,?) ON CONFLICT(k) DO UPDATE SET name=excluded.name, qty=excluded.qty, added=excluded.added"),
    buildsAll: db.prepare("SELECT name, count, updated FROM builds ORDER BY updated DESC"),
    buildGet: db.prepare("SELECT state FROM builds WHERE name=?"),
    buildPut: db.prepare("INSERT INTO builds(name,state,count,updated) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET state=excluded.state, count=excluded.count, updated=excluded.updated"),
    buildDel: db.prepare("DELETE FROM builds WHERE name=?"),
    cacheGet: db.prepare("SELECT status, body, fetched FROM cache WHERE url=?"),
    cachePut: db.prepare("INSERT INTO cache(url,status,body,fetched) VALUES(?,?,?,?) ON CONFLICT(url) DO UPDATE SET status=excluded.status, body=excluded.body, fetched=excluded.fetched"),
    cachePrune: db.prepare("DELETE FROM cache WHERE fetched < ?"),
  };
  const tx = (fn) => { db.exec("BEGIN"); try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; } };
  return {
    file,
    close: () => db.close(),
    kvGet(key, fallback = null) { const r = q.kvGet.get(key); if (!r) return fallback; try { return JSON.parse(r.value); } catch { return fallback; } },
    kvSet(key, value) { q.kvSet.run(key, JSON.stringify(value), Date.now()); },
    kvDel(key) { q.kvDel.run(key); },
    collectionAll() { return q.collAll.all().map((r) => [r.name, r.qty, r.added]); },
    collectionReplace(items) {
      return tx(() => {
        q.collClear.run();
        let n = 0;
        for (const it of items) {
          const name = String(it[0] || "").trim().slice(0, 200);
          const qty = Math.max(1, Math.min(9999, Math.round(Number(it[1]) || 1)));
          if (!name) continue;
          q.collIns.run(name.toLowerCase().replace(/\s+/g, " "), name, qty, Math.round(Number(it[2]) || 0));
          n++;
        }
        return n;
      });
    },
    buildsList() { return q.buildsAll.all().map((r) => ({ name: r.name, count: r.count, t: r.updated })); },
    buildGet(name) { const r = q.buildGet.get(name); return r ? JSON.parse(r.state) : null; },
    buildPut(name, state, count) { q.buildPut.run(name, JSON.stringify(state), count || "", Date.now()); },
    buildDel(name) { q.buildDel.run(name); },
    cacheGet(url) { return q.cacheGet.get(url) || null; },
    cachePut(url, status, body) { q.cachePut.run(url, status, body, Date.now()); },
    cachePrune(olderThanMs) { q.cachePrune.run(Date.now() - olderThanMs); },
  };
}
