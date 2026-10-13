// =====================================================================
//  Server multiplayer sederhana (Node.js + WebSocket)
//  Tugasnya: menerima data tiap pemain (nama, kostum, posisi, chat),
//  memeriksanya, lalu meneruskannya ke pemain lain.
// =====================================================================
const http = require("http");
const { WebSocketServer } = require("ws");

// ---------- Pengaturan (bisa diubah lewat environment variable) ----------
const PORT = Number(process.env.PORT) || 3000;
const WORLD_W = Number(process.env.WORLD_WIDTH) || 3000;   // harus sama dengan peta di game
const WORLD_H = Number(process.env.WORLD_HEIGHT) || 3000;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 50;
const MAX_PER_IP = Number(process.env.MAX_PER_IP) || 10;
const TICK_MS = 50;                                         // siaran posisi 20 kali per detik
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

const OUTFIT_PARTS = ["body", "hat", "shirt", "pants", "shoes"];

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
const dirty = new Set();        // id pemain yang posisinya berubah sejak siaran terakhir
const ipCount = new Map();      // alamat IP -> jumlah koneksi
let nextId = 1;

function publicInfo(p) {
  return { id: p.id, name: p.name, outfit: p.outfit, x: p.x, y: p.y, l: p.left ? 1 : 0, m: p.moving ? 1 : 0 };
}
function sendRaw(ws, text) {
  if (ws.readyState === 1) ws.send(text);
}
function sendTo(ws, obj) { sendRaw(ws, JSON.stringify(obj)); }
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

// ---------- Server HTTP (untuk cek status) ----------
const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200, { "Content-Type": "text/plain" }); res.end("ok"); return; }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(`Server game berjalan.\nPemain online: ${players.size}/${MAX_PLAYERS}\n`);
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });

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
        left: !!msg.l, moving: false
      };
      clearTimeout(joinTimer);
      const others = [...players.values()].map(publicInfo);
      players.set(me.id, me);
      sendTo(ws, { t: "welcome", id: me.id, world: { w: WORLD_W, h: WORLD_H }, players: others });
      broadcast({ t: "join", player: publicInfo(me) }, me.id);
      return;
    }

    if (!me) return;   // pesan lain hanya diterima setelah join

    switch (msg.t) {
      case "move": {
        const x = num(msg.x, 0, WORLD_W), y = num(msg.y, 0, WORLD_H);
        if (x === null || y === null) return;
        me.x = x; me.y = y; me.left = !!msg.l; me.moving = !!msg.m;
        dirty.add(me.id);
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
      dirty.delete(me.id);
      broadcast({ t: "leave", id: me.id });
    }
  });
  ws.on("error", () => {});
});

// ---------- Siaran posisi berkala ----------
setInterval(() => {
  if (!dirty.size) return;
  const list = [];
  for (const id of dirty) {
    const p = players.get(id);
    if (p) list.push([p.id, Math.round(p.x), Math.round(p.y), p.left ? 1 : 0, p.moving ? 1 : 0]);
  }
  dirty.clear();
  if (list.length) broadcast({ t: "snap", p: list });
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
  console.log(`Dunia ${WORLD_W}x${WORLD_H}, maks ${MAX_PLAYERS} pemain`);
  if (ALLOWED_ORIGINS.length) console.log("Alamat diizinkan:", ALLOWED_ORIGINS.join(", "));
});
