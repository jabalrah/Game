// =====================================================================
//  DUNIA BERSAMA: NPC & KUPU-KUPU dihitung di server, supaya semua pemain
//  melihat NPC, komentar NPC, dan kupu-kupu yang SAMA.
//
//  - NPC berjalan keliling, menghindari rintangan (memakai layer.png),
//    berhenti & berkomentar kalau ada pemain mendekat (pemain mana pun).
//  - Kupu-kupu melayang di "taman", kaget kalau ada pemain berjalan mendekat.
//  - Menangkap kupu-kupu diputuskan server: siapa cepat dia dapat.
//
//  File yang dibaca server (taruh di folder server/ ini):
//    layer.png         salinan assets/layer.png  (untuk tabrakan NPC)
//    npc-komentar.js   salinan npc-komentar.js   (kalimat & nama NPC)
//  Kalau Anda mengubah layer.png atau npc-komentar.js di game, salin juga ke sini.
//  Pengaturan di bawah harus sama dengan NPC_CONFIG (npc.js), KUPU_CONFIG (kupu.js)
//  dan tabrakan di game.js.
// =====================================================================
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ---- sama dengan CONFIG di game.js ----
const LAYER = { alphaMin: 40, hitWidth: 40, hitHeight: 20, hitBottom: 4, playerHeight: 96 };

// ---- sama dengan NPC_CONFIG di npc.js ----
const NPC = {
  count: 10, size: 96, speed: 60, walkMin: 2, walkMax: 6, lookAhead: 28,
  talkDistance: 170, talkSeconds: 5, spawnMinDistance: 400,
  variants: ["biru", "petani", "nenek", "anak"]
};

// ---- sama dengan KUPU_CONFIG di kupu.js ----
const KUPU = {
  count: 32, size: 56, kawasan: 5, kawasanRadius: 420, spawnMinDistance: 200, respawnDelay: 3,
  netReach: 46, netRadius: 62,
  netTolerance: 36,          // kelonggaran jarak tangkap karena tampilan pemain sedikit tertinggal (piksel)
  netMinInterval: 350,       // jeda minimal antar ayunan jaring dari satu pemain (milidetik)
  jenis: [
    { id: "oranye", bobot: 60, speed: 45, fleeSpeed: 110, shy: 140, startle: 0.9, alt: 34 },
    { id: "biru",   bobot: 30, speed: 55, fleeSpeed: 140, shy: 170, startle: 1.6, alt: 42 },
    { id: "emas",   bobot: 10, speed: 70, fleeSpeed: 170, shy: 210, startle: 2.6, alt: 50 }
  ]
};

const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- Memuat layer.png jadi peta tabrakan ----------
function loadMask() {
  let PNG;
  try { PNG = require("pngjs").PNG; }
  catch (e) { console.warn("[dunia] pngjs belum terpasang (jalankan: npm install). NPC akan menembus rintangan."); return null; }
  const files = [path.join(__dirname, "layer.png"), path.join(__dirname, "..", "assets", "layer.png")];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    try {
      const png = PNG.sync.read(fs.readFileSync(f));
      const w = png.width, h = png.height, d = png.data;
      const mask = new Uint8Array(w * h);
      let solid = 0;
      for (let i = 0, n = w * h; i < n; i++) if (d[i * 4 + 3] > LAYER.alphaMin) { mask[i] = 1; solid++; }
      console.log(`[dunia] layer dimuat dari ${path.basename(path.dirname(f))}/${path.basename(f)}: ${w}x${h}, ${(solid / mask.length * 100).toFixed(1)}% terisi`);
      return { mask, w, h };
    } catch (e) { console.warn("[dunia] gagal membaca " + f + ": " + e.message); }
  }
  console.warn("[dunia] layer.png tidak ditemukan di folder server/. NPC akan menembus rintangan.");
  return null;
}

// ---------- Memuat daftar komentar & nama NPC ----------
function loadTexts() {
  const files = [path.join(__dirname, "npc-komentar.js"), path.join(__dirname, "..", "npc-komentar.js")];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    try {
      const ctx = vm.createContext({});
      vm.runInContext(fs.readFileSync(f, "utf8") +
        "\n;this.__k = typeof NPC_KOMENTAR !== 'undefined' ? NPC_KOMENTAR : [];" +
        " this.__n = typeof NPC_NAMA !== 'undefined' ? NPC_NAMA : [];", ctx, { timeout: 1000 });
      const k = Array.from(ctx.__k).map(s => String(s).slice(0, 80)).filter(Boolean);
      const n = Array.from(ctx.__n).map(s => String(s).slice(0, 16)).filter(Boolean);
      console.log(`[dunia] ${k.length} komentar & ${n.length} nama NPC dimuat dari ${path.basename(f)}`);
      return { komentar: k.length ? k : ["Halo!"], nama: n };
    } catch (e) { console.warn("[dunia] gagal membaca " + f + ": " + e.message); }
  }
  console.warn("[dunia] npc-komentar.js tidak ditemukan di folder server/. NPC memakai komentar bawaan.");
  return { komentar: ["Halo!"], nama: [] };
}

function createDunia(opt) {
  const W = opt.W, H = opt.H, players = opt.players, broadcast = opt.broadcast, sendTo = opt.sendTo, sendState = opt.sendState;
  const DEFAULT_NEAR_R2 = 1500 * 1500;   // dipakai jika pemain belum mengirim ukuran layar (lihat setView di server.js)
  const M = loadMask();
  const T = loadTexts();
  if (M && (M.w !== W || M.h !== H)) console.warn(`[dunia] ukuran layer (${M.w}x${M.h}) beda dengan dunia (${W}x${H}); atur WORLD_WIDTH/WORLD_HEIGHT sama dengan layer.`);

  // ---- tabrakan: sama persis dengan blockedAt() di game.js (mode "map") ----
  function solidAt(x, y) {
    if (!M) return false;
    const u = Math.floor(x), v = Math.floor(y);
    if (u < 0 || v < 0 || u >= M.w || v >= M.h) return false;
    return M.mask[v * M.w + u] === 1;
  }
  function blockedAt(px, py) {
    if (!M) return false;
    const hw = LAYER.hitWidth / 2, hh = LAYER.hitHeight;
    const bottom = py + LAYER.playerHeight / 2 - LAYER.hitBottom;
    const l = px - hw, r = px + hw, t = bottom - hh, step = 8;
    for (let y = t; ; y += step) {
      const yy = Math.min(y, bottom);
      for (let x = l; ; x += step) {
        const xx = Math.min(x, r);
        if (solidAt(xx, yy)) return true;
        if (xx >= r) break;
      }
      if (yy >= bottom) break;
    }
    return false;
  }

  // =================== NPC ===================
  const npcs = [];
  const npcBlocked = (x, y) => blockedAt(x, y + (LAYER.playerHeight - NPC.size) / 2);
  const npcOut = (x, y) => { const h = NPC.size / 2; return x < h || y < h || x > W - h || y > H - h; };

  function newHeading(n) { n.heading = Math.random() * Math.PI * 2; n.walkTimer = rnd(NPC.walkMin, NPC.walkMax); }
  function spawnNpc(i) {
    const h = NPC.size / 2;
    let x = 0, y = 0;
    for (let k = 0; k < 80; k++) {
      x = h + Math.random() * Math.max(1, W - NPC.size);
      y = h + Math.random() * Math.max(1, H - NPC.size);
      if (npcBlocked(x, y)) continue;
      let ok = true;
      for (const p of players.values()) if (Math.hypot(x - p.x, y - p.y) < NPC.spawnMinDistance) { ok = false; break; }
      if (ok) break;
    }
    const n = {
      id: i + 1, x, y, left: Math.random() < 0.5, moving: true, state: "walk",
      variant: NPC.variants[i % NPC.variants.length],
      name: T.nama.length ? T.nama[Math.floor(Math.random() * T.nama.length)] : "",
      heading: 0, walkTimer: 0, talkTimer: 0, lastComment: -1, changed: true
    };
    newHeading(n);
    npcs.push(n);
  }
  for (let i = 0; i < NPC.count; i++) spawnNpc(i);

  function steer(n) {
    const la = NPC.lookAhead;
    const clear = a => { const x = n.x + Math.cos(a) * la, y = n.y + Math.sin(a) * la; return !npcOut(x, y) && !npcBlocked(x, y); };
    if (clear(n.heading)) return;
    const sign = Math.random() < 0.5 ? 1 : -1;
    for (const off of [0.6, 1.2, 1.9, 2.6, Math.PI]) {
      if (clear(n.heading + sign * off)) { n.heading += sign * off; return; }
      if (clear(n.heading - sign * off)) { n.heading -= sign * off; return; }
    }
    newHeading(n);
  }
  function walk(n, dt) {
    n.walkTimer -= dt;
    if (n.walkTimer <= 0) newHeading(n);
    steer(n);
    const dx = Math.cos(n.heading), dy = Math.sin(n.heading), step = NPC.speed * dt;
    const stuck = npcBlocked(n.x, n.y);
    const nx = n.x + dx * step, ny = n.y + dy * step;
    let moved = false;
    if (!npcOut(nx, ny) && (stuck || !npcBlocked(nx, ny))) { n.x = nx; n.y = ny; moved = true; }
    else if (!npcOut(nx, n.y) && (stuck || !npcBlocked(nx, n.y))) { n.x = nx; moved = true; }
    else if (!npcOut(n.x, ny) && (stuck || !npcBlocked(n.x, ny))) { n.y = ny; moved = true; }
    if (!moved) newHeading(n);
    n.moving = true;
    if (Math.abs(dx) > 0.05) n.left = dx < 0;
  }
  function say(n) {
    const c = T.komentar;
    let i = Math.floor(Math.random() * c.length);
    if (c.length > 1 && i === n.lastComment) i = (i + 1 + Math.floor(Math.random() * (c.length - 1))) % c.length;
    n.lastComment = i;
    n.talkTimer = NPC.talkSeconds;
    broadcast({ t: "npcsay", id: n.id, text: c[i] });
  }
  function nearestPlayer(x, y) {
    let best = null, bd = Infinity;
    for (const p of players.values()) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    return { p: best, d: bd };
  }
  function updateNpcs(dt) {
    for (const n of npcs) {
      const ox = n.x, oy = n.y, om = n.moving, ol = n.left;
      const { p, d } = nearestPlayer(n.x, n.y);
      if (n.state === "walk") {
        walk(n, dt);
        if (p && d <= NPC.talkDistance) { n.state = "talk"; n.moving = false; say(n); }
      } else {
        n.moving = false;
        if (p) n.left = p.x < n.x;
        n.talkTimer -= dt;
        if (n.talkTimer <= 0) {
          if (!p || d > NPC.talkDistance) { n.state = "walk"; newHeading(n); }
          else say(n);
        }
      }
      if (n.x !== ox || n.y !== oy || n.moving !== om || n.left !== ol) n.changed = true;
    }
  }
  const npcRow = n => [n.id, Math.round(n.x), Math.round(n.y), n.left ? 1 : 0, n.moving ? 1 : 0];

  // =================== KUPU-KUPU ===================
  const kupus = [];
  const patches = [];
  const pending = [];
  let nextKupuId = 1;
  const kindIdx = {}; KUPU.jenis.forEach((j, i) => { kindIdx[j.id] = i; });
  {
    const m = KUPU.kawasanRadius * 0.6;
    for (let i = 0; i < KUPU.kawasan; i++) patches.push({ x: rnd(m, Math.max(m + 1, W - m)), y: rnd(m, Math.max(m + 1, H - m)) });
  }
  function pickKind() {
    let r = Math.random() * KUPU.jenis.reduce((s, j) => s + j.bobot, 0);
    for (const j of KUPU.jenis) { r -= j.bobot; if (r <= 0) return j; }
    return KUPU.jenis[0];
  }
  function spawnKupu() {
    const k = pickKind(), half = KUPU.size / 2;
    let x = 0, y = 0, home = patches[0];
    for (let i = 0; i < 40; i++) {
      home = patches[Math.floor(Math.random() * patches.length)];
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * KUPU.kawasanRadius;
      x = Math.max(half, Math.min(W - half, home.x + Math.cos(a) * r));
      y = Math.max(half, Math.min(H - half, home.y + Math.sin(a) * r));
      let ok = true;
      for (const p of players.values()) if (Math.hypot(x - p.x, y - p.y) < KUPU.spawnMinDistance) { ok = false; break; }
      if (ok) break;
    }
    kupus.push({ id: nextKupuId++, kind: k, x, y, home, heading: Math.random() * Math.PI * 2, turn: 0, startled: 0,
                 t: Math.random() * 10, phase: Math.random() * 6.28, left: Math.random() < 0.5 });
  }
  for (let i = 0; i < KUPU.count; i++) spawnKupu();

  function updateKupu(b, dt) {
    const k = b.kind;
    b.t += dt;
    if (b.startled > 0) b.startled -= dt;
    if (b.startled <= 0) {                                   // pemain mana pun yang berjalan mendekat bisa mengagetkan
      for (const p of players.values()) {
        if (!p.moving) continue;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < k.shy && Math.random() < k.startle * dt) {
          b.startled = rnd(0.8, 1.3);
          b.heading = Math.atan2(b.y - p.y, b.x - p.x) + rnd(-0.6, 0.6);
          b.turn = 0;
          break;
        }
      }
    }
    let speed;
    if (b.startled > 0) speed = k.fleeSpeed;
    else {
      b.turn += (Math.random() - 0.5) * dt * 9;
      b.turn = Math.max(-1.8, Math.min(1.8, b.turn)) * (1 - 0.7 * dt);
      b.heading += b.turn * dt;
      speed = k.speed * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(b.t * 1.3 + b.phase)));
      if (b.home && Math.hypot(b.home.x - b.x, b.home.y - b.y) > KUPU.kawasanRadius) {
        const want = Math.atan2(b.home.y - b.y, b.home.x - b.x);
        let diff = want - b.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        b.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      }
    }
    const dx = Math.cos(b.heading), dy = Math.sin(b.heading);
    b.x += dx * speed * dt; b.y += dy * speed * dt;
    const m = KUPU.size / 2;
    if (b.x < m || b.x > W - m || b.y < m || b.y > H - m) {
      b.x = Math.max(m, Math.min(W - m, b.x));
      b.y = Math.max(m, Math.min(H - m, b.y));
      b.heading = Math.atan2(H / 2 - b.y, W / 2 - b.x) + rnd(-0.8, 0.8);
      b.startled = 0;
    }
    if (Math.abs(dx) > 0.2) b.left = dx < 0;
  }
  const kupuRow = b => [b.id, kindIdx[b.kind.id], Math.round(b.x), Math.round(b.y), b.left ? 1 : 0, b.startled > 0 ? 1 : 0];

  // pemain mengayunkan jaring di titik (x, y): server menentukan kupu-kupu mana yang tertangkap
  function handleNet(me, ws, msg, now) {
    if (now - (me.lastNet || 0) < KUPU.netMinInterval) return;
    me.lastNet = now;
    const x = typeof msg.x === "number" && Number.isFinite(msg.x) ? msg.x : null;
    const y = typeof msg.y === "number" && Number.isFinite(msg.y) ? msg.y : null;
    if (x === null || y === null || Math.hypot(x - me.x, y - me.y) > KUPU.netReach + 90) { sendTo(ws, { t: "km" }); return; }
    let best = -1, bd = KUPU.netRadius + KUPU.netTolerance;
    for (let i = 0; i < kupus.length; i++) {
      const d = Math.hypot(kupus[i].x - x, kupus[i].y - y);
      if (d <= bd) { bd = d; best = i; }
    }
    if (best < 0) { sendTo(ws, { t: "km" }); return; }
    const b = kupus.splice(best, 1)[0];
    pending.push(KUPU.respawnDelay);
    broadcast({ t: "kc", id: b.id, by: me.id, k: b.kind.id, x: Math.round(b.x), y: Math.round(b.y) });
  }

  // =================== Dipanggil server.js ===================
  function welcome() {
    return {
      npcs: npcs.map(n => [n.id, n.variant, n.name, Math.round(n.x), Math.round(n.y), n.left ? 1 : 0, n.moving ? 1 : 0]),
      kupu: { kinds: KUPU.jenis.map(j => j.id), list: kupus.map(kupuRow) }
    };
  }
  let sendCount = 0;
  function tick(dt, now, send) {
    updateNpcs(dt);
    for (const b of kupus) updateKupu(b, dt);
    for (let i = pending.length - 1; i >= 0; i--) {
      pending[i] -= dt;
      if (pending[i] <= 0) { pending.splice(i, 1); spawnKupu(); }
    }
    if (!send) return;
    sendCount++;

    // --- NPC: hanya yang berubah; pemain yang baru kembali / tersendat menerima semua NPC ---
    const moved = npcs.filter(n => n.changed);
    let movedText = null, allText = null;
    for (const p of players.values()) {
      if (p.hidden) continue;
      if (p.resyncNpc) {
        if (!allText) allText = JSON.stringify({ t: "npc", n: npcs.map(npcRow) });
        if (sendState(p, allText, "resyncNpc")) p.resyncNpc = false;
      } else if (moved.length) {
        if (!movedText) movedText = JSON.stringify({ t: "npc", n: moved.map(npcRow) });
        sendState(p, movedText, "resyncNpc");
      }
    }
    moved.forEach(n => { n.changed = false; });

    // --- Kupu-kupu: tiap pemain hanya menerima yang dekat dengan layarnya (10x/detik). ---
    // Daftar ini LENGKAP untuk area itu: kupu yang tidak ada di daftar = jauh atau sudah tertangkap.
    const rows = kupus.map(kupuRow);
    for (const p of players.values()) {
      if (p.hidden) { p.kpEmpty = false; continue; }
      const r2 = p.nr2 || DEFAULT_NEAR_R2;
      const list = [];
      for (const r of rows) {
        const dx = r[2] - p.x, dy = r[3] - p.y;
        if (dx * dx + dy * dy < r2) list.push(r);
      }
      if (!list.length && p.kpEmpty) continue;                // tidak ada yang dekat, dan klien sudah tahu
      if (sendState(p, JSON.stringify({ t: "kp", k: list }), null)) p.kpEmpty = list.length === 0;
    }

    // --- Posisi SEMUA kupu-kupu untuk peta mini: 2x/detik, sangat ringkas ---
    if (sendCount % 5 === 0) {
      const zt = JSON.stringify({ t: "kz", z: kupus.map(b => [kindIdx[b.kind.id], Math.round(b.x), Math.round(b.y)]) });
      for (const p of players.values()) sendState(p, zt, null);
    }
  }
  return { welcome, tick, handleNet };
}

module.exports = { createDunia };
