// =====================================================================
//  Server multiplayer sederhana (Node.js + WebSocket)
//  Tugasnya: menerima data tiap pemain (nama, kostum, posisi, chat),
//  memeriksanya, lalu meneruskannya ke pemain lain.
// =====================================================================
const http = require("http");
const { WebSocketServer } = require("ws");
const { createDunia } = require("./dunia");   // NPC & kupu-kupu bersama (lihat dunia.js)

// ---------- Pengaturan (bisa diubah lewat environment variable) ----------
const PORT = Number(process.env.PORT) || 3000;
const WORLD_W = Number(process.env.WORLD_WIDTH) || 4096;   // harus sama dengan peta di game
const WORLD_H = Number(process.env.WORLD_HEIGHT) || 4096;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 50;
const MAX_PER_IP = Number(process.env.MAX_PER_IP) || 10;
const TICK_MS = 50;
// ---- Pembaruan posisi bertingkat (hemat bandwidth) ----
// Tiap pemain hanya menerima posisi pemain lain yang DEKAT (di dalam/dekat layarnya) 20 kali per detik.
// Pemain yang jauh (hanya terlihat di peta mini) dikirim 2 kali per detik. Radius mengikuti ukuran layar
// pemain (dikirim klien); nilai di bawah dipakai jika klien tidak mengirim ukuran layar.
const DEFAULT_VIEW_RADIUS = Number(process.env.NEAR_RADIUS) || 1500;   // piksel
const FAR_EVERY = 10;             // pemain jauh: tiap 10 tick = 2 kali per detik
const FAR_BAND = 250;             // tumpang tindih zona (piksel) supaya posisi akhir pemain yang berhenti tidak terlewat
const CROWD_AT = Number(process.env.CROWD_AT) || 24;   // lebih dari ini pemain: posisi dekat dikirim 10x/detik, bukan 20x
// ---- Pelindung koneksi lambat ----
const CONGEST_BYTES = 128 * 1024; // antrean kirim > ini: lewati pembaruan (pemain itu disinkronkan penuh nanti)
const KILL_BYTES = 2 * 1024 * 1024; // antrean > ini: koneksi diputus (macet total)
// ---- Ayam (dihitung di server supaya semua pemain melihat ayam yang sama) ----
// OPTIMASI: klien saat ini TIDAK punya kode ayam (ayam.js tidak dimuat index.html), jadi data ayam
// hanya membuang bandwidth & CPU. Default 0 = mati. Kalau fitur ayam dipakai lagi, set CHICKEN_COUNT
// (contoh rumus lama: Math.round(WORLD_W * WORLD_H / 750000) = 22 ayam untuk peta 4096x4096).
const CHICKEN_COUNT = Number(process.env.CHICKEN_COUNT) || 0;
const CK = {
  size: 64,            // ukuran ayam (dipakai untuk batas dinding)
  wanderSpeed: 35,     // kecepatan jalan santai (piksel/detik)
  fleeSpeed: 150,      // kecepatan kabur (piksel/detik) = kecepatan pemain 250 - 100
  fleeDist: 180,       // pemain lebih dekat dari ini -> ayam kabur
  calmDist: 260,       // lebih jauh dari ini -> ayam santai lagi
  catchDist: 44,       // jarak tangkap
  spawnMin: 500,       // ayam baru tidak muncul lebih dekat dari ini ke pemain mana pun
  freezeMs: 1400,      // setelah menangkap, pemain itu tidak bisa menangkap lagi selama ini
  sendEvery: 2         // kirim posisi ayam tiap 2 tick (10 kali per detik)
};                                         // siaran posisi 20 kali per detik
const CHAT_MIN_INTERVAL_MS = 700;                           // jeda minimal antar chat
const MAX_CHAT_LENGTH = 80;
const MAX_NAME_LENGTH = 16;
const MIN_NAME_LENGTH = 2;

// Daftar alamat web yang boleh terhubung, dipisah koma. Kosong = semua boleh.
// Contoh: ALLOWED_ORIGINS=https://akunanda.github.io
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

// Kata yang disensor/ditolak, dipisah koma. Contoh: BLOCKED_WORDS=kata1,kata2
const BLOCKED_WORDS = (process.env.BLOCKED_WORDS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const OUTFIT_PARTS = ["body"];   // hanya karakter (id = nama folder di assets/body/)

// ---------- Fungsi pembersih & pemeriksa data ----------
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

function cleanText(str, maxLen) {
  if (typeof str !== "string") return "";
  return str.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}
function containsBlocked(text) {
  const low = text.toLowerCase();
  return BLOCKED_WORDS.some(w => low.includes(w));
}
function censor(text) {
  let out = text;
  for (const w of BLOCKED_WORDS) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, m => "*".repeat(m.length));
  }
  return out;
}
function validOutfit(o) {
  if (!o || typeof o !== "object") return null;
  const out = {};
  for (const part of OUTFIT_PARTS) {
    const s = o[part];
    if (!s || typeof s !== "object") return null;
    if (typeof s.id !== "string" || !/^[a-z0-9_-]{1,24}$/.test(s.id)) return null;
    if (typeof s.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(s.color)) return null;
    out[part] = { id: s.id, color: s.color.toLowerCase() };
  }
  return out;
}
function num(v, min, max) {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : null;
}

// ---------- State ----------
const players = new Map();      // id -> pemain yang sudah join
const dirty1 = new Set();       // id pemain yang posisinya berubah sejak tick terakhir
const dirty2 = new Set();       // ... sejak 2 tick terakhir (untuk mode ramai)
const dirty10 = new Set();      // ... sejak 10 tick terakhir (untuk pemain jauh)
function markDirty(id) { dirty1.add(id); dirty2.add(id); dirty10.add(id); }
function unmarkDirty(id) { dirty1.delete(id); dirty2.delete(id); dirty10.delete(id); }
const ipCount = new Map();      // alamat IP -> jumlah koneksi
let nextId = 1;

// ---------- Ayam ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const chickens = [];
let nextChickenId = 1;
const chickenInfo = c => [c.id, Math.round(c.x), Math.round(c.y), c.left ? 1 : 0, c.moving ? 1 : 0, c.fleeing ? 1 : 0];

function newWander(c) {
  if (Math.random() < 0.4) { c.moving = false; c.dx = c.dy = 0; }
  else {
    const a = Math.random() * Math.PI * 2;
    c.dx = Math.cos(a); c.dy = Math.sin(a); c.moving = true;
    c.left = c.dx < 0;
  }
  c.timer = rnd(1, 3.5);
}
function spawnChicken() {
  const half = CK.size / 2;
  let x = 0, y = 0;
  for (let i = 0; i < 40; i++) {
    x = rnd(half, WORLD_W - half); y = rnd(half, WORLD_H - half);
    let ok = true;
    for (const p of players.values()) if (Math.hypot(x - p.x, y - p.y) < CK.spawnMin) { ok = false; break; }
    if (ok) break;
  }
  const c = { id: nextChickenId++, x, y, dx: 0, dy: 0, left: Math.random() < 0.5, moving: false, fleeing: false, timer: 0, changed: true };
  newWander(c);
  chickens.push(c);
  return c;
}
for (let i = 0; i < CHICKEN_COUNT; i++) spawnChicken();

function updateChickens(dt, now) {
  const half = CK.size / 2;
  for (const c of chickens) {
    // pemain terdekat
    let near = null, nd = Infinity;
    for (const p of players.values()) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < nd) { nd = d; near = p; }
    }
    const wasFleeing = c.fleeing;
    if (near && nd < CK.fleeDist) c.fleeing = true;
    else if (!near || nd > CK.calmDist) { if (c.fleeing) { c.fleeing = false; newWander(c); } }

    let vx = 0, vy = 0, speed = 0;
    if (c.fleeing) {
      if (nd > 0.001) { vx = (c.x - near.x) / nd; vy = (c.y - near.y) / nd; }
      else { const a = Math.random() * Math.PI * 2; vx = Math.cos(a); vy = Math.sin(a); }
      speed = CK.fleeSpeed; c.moving = true;
    } else {
      c.timer -= dt;
      if (c.timer <= 0) newWander(c);
      vx = c.dx; vy = c.dy; speed = CK.wanderSpeed;
    }
    const ox = c.x, oy = c.y, wasMoving = c.moving, wasLeft = c.left;
    c.x = Math.max(half, Math.min(WORLD_W - half, c.x + vx * speed * dt));
    c.y = Math.max(half, Math.min(WORLD_H - half, c.y + vy * speed * dt));
    if (!c.fleeing && c.moving && c.x === ox && c.y === oy) newWander(c);   // buntu: ganti arah
    if (vx !== 0 && c.x !== ox) c.left = vx < 0;
    if (c.x !== ox || c.y !== oy || c.moving !== wasMoving || c.left !== wasLeft || c.fleeing !== wasFleeing) c.changed = true;
  }
  // tangkapan: server yang memutuskan siapa yang dapat
  for (const p of players.values()) {
    if ((p.freezeUntil || 0) > now) continue;
    for (let i = 0; i < chickens.length; i++) {
      const c = chickens[i];
      if (Math.hypot(c.x - p.x, c.y - p.y) <= CK.catchDist) {
        chickens.splice(i, 1);
        const n = spawnChicken();              // ayam baru supaya jumlah tetap
        p.freezeUntil = now + CK.freezeMs;
        p.score = (p.score || 0) + 1;          // skor dihitung di server
        broadcast({ t: "caught", id: c.id, by: p.id, score: p.score, n: chickenInfo(n) });
        n.changed = false;
        break;
      }
    }
  }
}

function publicInfo(p) {
  return { id: p.id, name: p.name, outfit: p.outfit, x: p.x, y: p.y, l: p.left ? 1 : 0, m: p.moving ? 1 : 0, z: p.lying ? 1 : 0, s: p.score || 0 };
}
function sendRaw(ws, text) {
  if (ws.readyState === 1) ws.send(text);
}
function sendTo(ws, obj) { sendRaw(ws, JSON.stringify(obj)); }
// Kirim data "keadaan" (posisi, NPC, kupu-kupu) ke satu pemain dengan pelindung:
//  - tab pemain sedang disembunyikan -> tidak dikirim (nanti disinkronkan penuh saat kembali)
//  - antrean kirim menumpuk (koneksi lambat) -> dilewati; kalau resyncKey diberikan, pemain itu ditandai
//    supaya menerima keadaan LENGKAP saat lancar lagi; antrean sangat besar -> koneksi diputus.
function sendState(p, text, resyncKey) {
  const ws = p.ws;
  if (ws.readyState !== 1) return false;
  if (p.hidden) { if (resyncKey) p[resyncKey] = true; return false; }
  const b = ws.bufferedAmount;
  if (b > KILL_BYTES) { ws.terminate(); return false; }
  if (b > CONGEST_BYTES) { if (resyncKey) p[resyncKey] = true; return false; }
  ws.send(text);
  return true;
}
function setView(p, vr) {   // radius pandang pemain = setengah diagonal layar + cadangan
  const r = typeof vr === "number" && Number.isFinite(vr) ? Math.max(500, Math.min(3200, Math.round(vr) + 250)) : DEFAULT_VIEW_RADIUS;
  p.nr2 = r * r;
  const f = Math.max(0, r - FAR_BAND);
  p.fr2 = f * f;
}
function broadcast(obj, exceptId = null) {
  const text = JSON.stringify(obj);
  for (const p of players.values()) {
    if (p.id !== exceptId) sendRaw(p.ws, text);
  }
}
function ipOf(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

// ---------- NPC & kupu-kupu (dihitung di server, sama untuk semua pemain) ----------
const dunia = createDunia({ W: WORLD_W, H: WORLD_H, players, broadcast, sendTo, sendState });

// ---------- Server HTTP (untuk cek status) ----------
const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200, { "Content-Type": "text/plain" }); res.end("ok"); return; }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(`Server game berjalan.\nPemain online: ${players.size}/${MAX_PLAYERS}\n`);
});

// Kompresi WebSocket (permessage-deflate): browser menegosiasikannya otomatis. Menghemat bandwidth upload
// (yang biasanya paling sempit di PC/hosting kecil) dengan sedikit tambahan CPU. Matikan: WS_DEFLATE=0
const WS_DEFLATE = process.env.WS_DEFLATE !== "0";
const wss = new WebSocketServer({
  server, maxPayload: 4096,
  perMessageDeflate: WS_DEFLATE ? { threshold: 200, zlibDeflateOptions: { level: 3 }, concurrencyLimit: 10 } : false
});

wss.on("connection", (ws, req) => {
  const ip = ipOf(req);
  const origin = req.headers.origin || "";

  // --- pemeriksaan awal ---
  if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
    sendTo(ws, { t: "error", msg: "Alamat web ini tidak diizinkan", fatal: true });
    ws.close(1008); return;
  }
  if (players.size >= MAX_PLAYERS) {
    sendTo(ws, { t: "error", msg: "Server penuh, coba lagi sebentar lagi" });
    ws.close(1013); return;
  }
  if ((ipCount.get(ip) || 0) >= MAX_PER_IP) {
    sendTo(ws, { t: "error", msg: "Terlalu banyak koneksi dari jaringan Anda" });
    ws.close(1013); return;
  }
  ipCount.set(ip, (ipCount.get(ip) || 0) + 1);

  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  let me = null;                              // data pemain setelah join
  let tokens = 60, lastRefill = Date.now();   // pembatas kecepatan pesan
  let violations = 0;
  let lastChat = 0;

  const joinTimer = setTimeout(() => { if (!me) ws.close(1008); }, 10000);

  ws.on("message", (data, isBinary) => {
    if (isBinary) return;

    // pembatas kecepatan: maks ~40 pesan per detik
    const now = Date.now();
    tokens = Math.min(60, tokens + ((now - lastRefill) / 1000) * 40);
    lastRefill = now;
    if (tokens < 1) { if (++violations > 200) ws.close(1008); return; }
    tokens -= 1;

    let msg;
    try { msg = JSON.parse(data.toString()); } catch (e) { return; }
    if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;

    // ---------- join ----------
    if (msg.t === "join") {
      if (me) return;
      const name = cleanText(msg.name, MAX_NAME_LENGTH);
      const outfit = validOutfit(msg.outfit);
      if (name.length < MIN_NAME_LENGTH || containsBlocked(name)) {
        sendTo(ws, { t: "error", msg: "Nama tidak valid atau tidak diperbolehkan", fatal: true, reason: "name" });
        ws.close(1008); return;
      }
      if (!outfit) {
        sendTo(ws, { t: "error", msg: "Data kostum tidak valid", fatal: true });
        ws.close(1008); return;
      }
      me = {
        id: nextId++, ws, name, outfit,
        x: num(msg.x, 0, WORLD_W) ?? WORLD_W / 2,
        y: num(msg.y, 0, WORLD_H) ?? WORLD_H / 2,
        left: !!msg.l, moving: false, lying: false, score: 0,
        hidden: false, resyncSnap: false, resyncNpc: false
      };
      setView(me, msg.vr);
      me.row = [me.id, Math.round(me.x), Math.round(me.y), me.left ? 1 : 0, 0, 0];
      clearTimeout(joinTimer);
      const others = [...players.values()].map(publicInfo);
      players.set(me.id, me);
      sendTo(ws, { t: "welcome", id: me.id, world: { w: WORLD_W, h: WORLD_H }, players: others, chickens: chickens.map(chickenInfo), ...dunia.welcome() });
      broadcast({ t: "join", player: publicInfo(me) }, me.id);
      return;
    }

    if (!me) return;   // pesan lain hanya diterima setelah join

    switch (msg.t) {
      case "move": {
        const x = num(msg.x, 0, WORLD_W), y = num(msg.y, 0, WORLD_H);
        if (x === null || y === null) return;
        me.x = x; me.y = y; me.left = !!msg.l; me.moving = !!msg.m; me.lying = !!msg.z && !msg.m;
        me.row = [me.id, Math.round(x), Math.round(y), me.left ? 1 : 0, me.moving ? 1 : 0, me.lying ? 1 : 0];
        markDirty(me.id);
        break;
      }
      case "view": {                   // ukuran layar berubah
        setView(me, msg.r);
        break;
      }
      case "vis": {                    // tab disembunyikan / ditampilkan lagi
        me.hidden = !msg.v;
        me.resyncSnap = true; me.resyncNpc = true;   // saat kembali tampil: kirim keadaan lengkap
        break;
      }
      case "chat": {
        if (now - lastChat < CHAT_MIN_INTERVAL_MS) {
          sendTo(ws, { t: "error", msg: "Pelan-pelan, jangan terlalu cepat mengirim chat" });
          return;
        }
        const text = censor(cleanText(msg.text, MAX_CHAT_LENGTH));
        if (!text) return;
        lastChat = now;
        broadcast({ t: "chat", id: me.id, text }, me.id);
        break;
      }
      case "net": {                         // mengayun jaring kupu-kupu
        dunia.handleNet(me, ws, msg, now);
        break;
      }
      case "outfit": {
        const outfit = validOutfit(msg.outfit);
        if (!outfit) return;
        me.outfit = outfit;
        broadcast({ t: "outfit", id: me.id, outfit }, me.id);
        break;
      }
      case "name": {
        const name = cleanText(msg.name, MAX_NAME_LENGTH);
        if (name.length < MIN_NAME_LENGTH || containsBlocked(name)) {
          sendTo(ws, { t: "error", msg: "Nama tidak valid atau tidak diperbolehkan" });
          return;
        }
        me.name = name;
        broadcast({ t: "name", id: me.id, name }, me.id);
        break;
      }
    }
  });

  ws.on("close", () => {
    clearTimeout(joinTimer);
    const c = (ipCount.get(ip) || 1) - 1;
    if (c <= 0) ipCount.delete(ip); else ipCount.set(ip, c);
    if (me && players.get(me.id) === me) {
      players.delete(me.id);
      unmarkDirty(me.id);
      broadcast({ t: "leave", id: me.id });
    }
  });
  ws.on("error", () => {});
});

// ---------- Siaran posisi berkala (pemain, ayam, NPC, kupu-kupu) ----------
// Posisi pemain dikirim per penerima, bertingkat menurut jarak (lihat DEFAULT_VIEW_RADIUS di atas):
//   dekat  -> tiap tick (20x/detik), atau tiap 2 tick (10x/detik) kalau pemain ramai
//   jauh   -> tiap 10 tick (2x/detik)
// Perubahan dikumpulkan (dirty1/2/10) sehingga tidak ada pembaruan yang hilang di antara pengiriman.
function flushSnaps(tickNo) {
  const nearPeriod = players.size > CROWD_AT ? 2 : 1;
  const nearSet = nearPeriod === 1 ? dirty1 : dirty2;
  const doNear = tickNo % nearPeriod === 0 && nearSet.size > 0;
  const doFar = tickNo % FAR_EVERY === 0 && dirty10.size > 0;
  for (const r of players.values()) {
    if (r.hidden) continue;
    let list;
    if (r.resyncSnap) {                         // keadaan lengkap: semua pemain lain
      list = [];
      for (const p of players.values()) if (p !== r && p.row) list.push(p.row);
      if (sendState(r, JSON.stringify({ t: "snap", p: list }), "resyncSnap")) r.resyncSnap = false;
      continue;
    }
    if (!doNear && !doFar) continue;
    list = [];
    if (doNear) {
      for (const id of nearSet) {
        const p = players.get(id);
        if (!p || p === r) continue;
        const dx = p.x - r.x, dy = p.y - r.y;
        if (dx * dx + dy * dy < r.nr2) list.push(p.row);
      }
    }
    if (doFar) {
      for (const id of dirty10) {
        const p = players.get(id);
        if (!p || p === r) continue;
        const dx = p.x - r.x, dy = p.y - r.y, d2 = dx * dx + dy * dy;
        if (d2 >= r.fr2 && !(doNear && d2 < r.nr2 && nearSet.has(id))) list.push(p.row);
      }
    }
    if (list.length) sendState(r, JSON.stringify({ t: "snap", p: list }), "resyncSnap");
  }
  dirty1.clear();
  if (tickNo % 2 === 0) dirty2.clear();
  if (tickNo % FAR_EVERY === 0) dirty10.clear();
}

let tickNo = 0, lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  if (!players.size) return;                   // tidak ada pemain = dunia diam (hemat CPU)
  tickNo++;
  if (chickens.length) updateChickens(dt, now);
  const sendNow = tickNo % CK.sendEvery === 0;
  dunia.tick(dt, now, sendNow);
  if (sendNow && chickens.length) {
    const moved = chickens.filter(c => c.changed);
    if (moved.length) {
      const text = JSON.stringify({ t: "ck", c: moved.map(chickenInfo) });
      for (const p of players.values()) sendState(p, text, null);
      moved.forEach(c => { c.changed = false; });
    }
  }
  flushSnaps(tickNo);
}, TICK_MS);

// ---------- Cek koneksi mati ----------
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`Dunia ${WORLD_W}x${WORLD_H}, maks ${MAX_PLAYERS} pemain, ${CHICKEN_COUNT} ayam`);
  if (ALLOWED_ORIGINS.length) console.log("Alamat diizinkan:", ALLOWED_ORIGINS.join(", "));
});
