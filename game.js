// ===================== PENGATURAN GAME (silakan ubah) =====================
const CONFIG = {
  backgroundImages: ["assets/background1.png", "assets/background2.png", "assets/background3.png"], // 3 frame animasi latar
  backgroundImage: "assets/background.png", // cadangan: dipakai kalau frame di atas tidak ada
  backgroundFps: 3,         // kecepatan animasi latar (frame per detik); 0 = tidak beranimasi
  backgroundColor: "#ffffff", // warna dasar di bawah gambar latar (terlihat di bagian PNG yang bolong/transparan)
  backgroundMode: "tile",   // "tile" = diulang seperti ubin, "stretch" = diregangkan

  worldWidth: 3000,         // ukuran peta (piksel). Saat online, ukuran dari server yang dipakai.
  worldHeight: 3000,

  playerWidth: 96,          // ukuran karakter di layar
  playerHeight: 96,
  speed: 250,               // kecepatan (piksel per detik)

  frameCount: 6,            // jumlah frame animasi tiap karakter (1.png sampai 6.png)

  // Daftar karakter dibaca OTOMATIS dari folder assets/body/ (satu folder = satu karakter).
  // Isi bodyList hanya jika ingin menentukan sendiri, contoh: ["k1", "baju-merah"]. Kosongkan = otomatis.
  bodyList: [],
  fallbackBodies: ["k1", "k2", "k3", "k4"],   // dipakai hanya jika folder gagal dibaca
  animationFps: 10,         // kecepatan animasi berjalan
  idleFrameCount: 3,        // jumlah frame animasi diam/idle (idle1.png sampai idle3.png)
  idleFps: 4,               // kecepatan animasi idle (makin kecil makin pelan)
  idleFrame: 0,             // dipakai hanya jika karakter TIDAK punya animasi idle (0 = frame jalan pertama)
  spriteFacesRight: true,   // true jika gambar asli menghadap KANAN

  chatDuration: 6000,       // lama pesan tampil di atas karakter (milidetik)
  chatFadeTime: 1000,       // lama memudar di akhir (milidetik)
  chatMaxLength: 80,        // batas jumlah huruf per pesan
  chatMaxWidth: 190,        // lebar maksimal gelembung chat (piksel)
  chatFont: "14px system-ui, sans-serif",

  // ---- Suara ----
  bgmFile: "assets/audio/bgm.wav",
  bgmVolume: 0.35,
  footstepFiles: ["assets/audio/step1.wav", "assets/audio/step2.wav"],
  footstepVolume: 0.6,
  footstepInterval: null,         // detik antar langkah; null = otomatis mengikuti animasi
  footstepPitchVariation: 0.08,

  // ---- Nama karakter ----
  nameMinLength: 2,
  nameMaxLength: 16,
  nameFont: "bold 13px system-ui, sans-serif",

  // ---- Multiplayer ----
  // Alamat server. Saat tes di komputer sendiri: "ws://localhost:3000"
  // Setelah server di-hosting, ganti dengan alamatnya, contoh: "wss://nama-game.onrender.com"
  // Kosongkan ("") untuk bermain sendiri tanpa server.
  serverUrl: "wss://wav-powell-animated-limit.trycloudflare.com",
  sendInterval: 66,         // jeda minimal kirim posisi (milidetik), sekitar 15 kali per detik
  remoteSmoothing: 14       // makin besar, gerak pemain lain makin cepat menyusul posisi terbaru
};

// ===================== KARAKTER (otomatis dari folder) =====================
// Menambah karakter TANPA mengedit kode:
//   1. Buat folder   assets/body/<nama>/
//   2. Isi dengan    1.png, 2.png, ... 6.png    (frame animasi jalan, ukuran kanvas sama)
//   3. Selesai. Game membaca daftar folder itu secara otomatis.
// Nama folder: huruf kecil, angka, - dan _ saja (maks 24 karakter), contoh: baju-merah
// Karakter yang gambarnya tidak lengkap otomatis dilewati (lihat pesan di Console).
const PARTS = {
  body: { label: "Karakter", options: [] }    // options diisi otomatis saat game dimuat
};
const MENU_ORDER = ["body"];
const DEFAULT_OUTFIT = { body: { id: "", color: "#ffffff" } };   // id awal diisi otomatis
// ==========================================================================

const STORAGE_KEY = "gamePertamaOutfit";
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function loadImage(src, quiet) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { if (!quiet) console.warn("Gagal memuat:", src); resolve(null); };
    img.src = src;
  });
}

// ---------- Pemeriksaan data ----------
const ID_RE = /^[a-z0-9_-]{1,24}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

function cleanName(str) {
  return String(str || "").replace(CONTROL_RE, "").replace(/\s+/g, " ").trim().slice(0, CONFIG.nameMaxLength);
}
function validOutfit(o) {
  if (!o || typeof o !== "object") return null;
  const out = {};
  for (const part of Object.keys(PARTS)) {
    const s = o[part];
    if (!s || typeof s.id !== "string" || !ID_RE.test(s.id) ||
        typeof s.color !== "string" || !COLOR_RE.test(s.color)) return null;
    out[part] = { id: s.id, color: s.color };
  }
  return out;
}

// ---------- Kostum: simpan / muat ----------
function cloneOutfit(o) { return JSON.parse(JSON.stringify(o)); }

function loadOutfit() {
  const result = cloneOutfit(DEFAULT_OUTFIT);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      for (const key of Object.keys(PARTS)) {
        const s = saved[key];
        if (s && typeof s.id === "string" && ID_RE.test(s.id) && COLOR_RE.test(s.color)) {
          result[key] = { id: s.id, color: s.color };
        }
      }
    }
  } catch (e) { /* storage tidak tersedia, pakai default */ }
  return result;
}
function saveOutfit() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(outfit)); } catch (e) {}
}

let outfit = loadOutfit();
const images = { body: Object.create(null) };   // images.body[id] = { walk: [frame1 ... frame6], idle: [idle1 ... idle3] }
let composed = { walk: [], idle: [] };   // frame jadi milik pemain ini: jalan + idle
let bgFrames = [];           // frame animasi latar yang berhasil dimuat

function imagePath(part, id, n) { return `assets/${part}/${id}/${n}.png`; }
function idlePath(id, n) { return `assets/body/${id}/idle${n}.png`; }

// ---------- Membaca daftar karakter dari folder assets/body/ ----------
function prettyName(id) { return id.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

// Alamat API GitHub untuk membaca isi folder (dipakai saat game dibuka dari xxx.github.io)
function githubApiUrl(hostname, pathname) {
  const owner = hostname.split(".")[0];
  const repo = pathname.split("/")[1] || hostname;
  return `https://api.github.com/repos/${owner}/${repo}/contents/assets/body`;
}

// Membaca halaman daftar folder dari server web lokal (http-server, Live Server, dll.)
function parseDirectoryListing(html, baseUrl) {
  const base = new URL(baseUrl);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const names = [];
  for (const a of doc.querySelectorAll("a[href]")) {
    let u;
    try { u = new URL(a.getAttribute("href"), base); } catch (e) { continue; }
    if (u.origin !== base.origin || !u.pathname.startsWith(base.pathname)) continue;
    const m = /^([^/]+)\/$/.exec(u.pathname.slice(base.pathname.length));
    if (m) names.push(decodeURIComponent(m[1]));
  }
  return names;
}

const BODIES_CACHE_KEY = "gamePertamaBodies";
const BODIES_CACHE_MS = 2 * 60 * 1000;     // API GitHub dibatasi 60 permintaan per jam per IP
function readBodiesCache() {
  try {
    const c = JSON.parse(localStorage.getItem(BODIES_CACHE_KEY) || "null");
    if (c && Array.isArray(c.list)) return c;
  } catch (e) {}
  return null;
}

async function namesFromGithub() {
  const c = readBodiesCache();
  if (c && Date.now() - c.t < BODIES_CACHE_MS && c.list.length) return c.list;
  const res = await fetch(githubApiUrl(location.hostname, location.pathname));
  if (!res.ok) throw new Error("GitHub API " + res.status);
  const list = (await res.json()).filter(x => x && x.type === "dir").map(x => x.name);
  try { localStorage.setItem(BODIES_CACHE_KEY, JSON.stringify({ t: Date.now(), list })); } catch (e) {}
  return list;
}
async function namesFromDirectory() {
  const base = new URL("assets/body/", location.href);
  const res = await fetch(base, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return parseDirectoryListing(await res.text(), base.href);
}
async function namesFromManifest() {            // cadangan: assets/body/daftar.json (dibuat oleh skrip)
  const res = await fetch("assets/body/daftar.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("daftar.json " + res.status);
  const list = await res.json();
  return Array.isArray(list) ? list.filter(x => typeof x === "string") : [];
}

async function discoverBodyNames() {
  if (CONFIG.bodyList && CONFIG.bodyList.length) return CONFIG.bodyList.slice();
  const sources = [location.hostname.endsWith(".github.io") ? namesFromGithub : namesFromDirectory, namesFromManifest];
  for (const source of sources) {
    try {
      const names = await source();
      if (names && names.length) return names;
    } catch (e) { console.warn("Daftar karakter tidak bisa dibaca dari " + source.name + ":", e.message || e); }
  }
  const c = readBodiesCache();                  // terakhir: daftar tersimpan, lalu daftar bawaan
  if (c && c.list.length) return c.list;
  return CONFIG.fallbackBodies.slice();
}

// ---------- Memuat gambar karakter ----------
const bodyLoads = new Map();                    // id -> Promise<boolean>
function addBodyOption(id) {
  const opts = PARTS.body.options;
  if (opts.some(o => o.id === id)) return;
  opts.push({ id, name: prettyName(id) });
  opts.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
function loadBody(id) {
  if (bodyLoads.has(id)) return bodyLoads.get(id);
  const walkJobs = [], idleJobs = [];
  for (let n = 1; n <= CONFIG.frameCount; n++) walkJobs.push(loadImage(imagePath("body", id, n)));
  for (let n = 1; n <= CONFIG.idleFrameCount; n++) idleJobs.push(loadImage(idlePath(id, n), true));   // idle boleh tidak ada
  const p = Promise.all([Promise.all(walkJobs), Promise.all(idleJobs)]).then(([walk, idleAll]) => {
    if (!walk.every(Boolean)) {
      console.warn(`Karakter "${id}" dilewati: harus ada ${CONFIG.frameCount} gambar jalan (1.png sampai ${CONFIG.frameCount}.png).`);
      return false;
    }
    let idle = [];
    if (idleAll.every(Boolean)) idle = idleAll;
    else if (idleAll.some(Boolean)) {
      console.warn(`Animasi idle karakter "${id}" tidak dipakai: harus lengkap idle1.png sampai idle${CONFIG.idleFrameCount}.png.`);
    }
    images.body[id] = { walk, idle };
    addBodyOption(id);
    return true;
  });
  bodyLoads.set(id, p);
  return p;
}
async function loadAllBodies() {
  const names = await discoverBodyNames();
  const valid = [];
  for (const name of names) {
    if (ID_RE.test(name)) valid.push(name);
    else console.warn(`Folder "${name}" dilewati: pakai huruf kecil, angka, - atau _ saja (maks 24 karakter).`);
  }
  await Promise.all(valid.map(loadBody));
}

// Karakter pemain lain yang belum kita punya: muat sekarang, lalu perbarui tampilannya
function prepareOutfit(o) {
  if (images.body[o.body.id]) return;
  loadBody(o.body.id).then(ok => {
    if (!ok) return;
    frameCache.clear();
    for (const r of remotePlayers.values()) r.frames = composeCached(r.outfit);
    buildPanel();
  });
}

// ---------- Frame jadi ----------
// Hasilnya { walk: [frame jalan], idle: [frame diam] }. Karakter sudah berisi baju, celana, dan sepatu.
// Jika karakter yang diminta tidak ada, pakai karakter lain yang tersedia.
function composeOutfit(o) {
  const own = o.body && images.body[o.body.id];
  if (own) return own;
  const first = Object.keys(images.body)[0];
  return first ? images.body[first] : { walk: [], idle: [] };
}
function composeFrames() { composed = composeOutfit(outfit); }

const frameCache = new Map();   // kostum yang sama dipakai bersama oleh banyak pemain
function composeCached(o) {
  const key = JSON.stringify(o);
  if (!frameCache.has(key)) {
    if (frameCache.size > 100) frameCache.clear();
    frameCache.set(key, composeOutfit(o));
  }
  return frameCache.get(key);
}

// ---------- Menu kostum ----------
const panel = document.getElementById("panel");
const rowsEl = document.getElementById("rows");
const preview = document.getElementById("preview");
const pctx = preview.getContext("2d");

function refreshPreview() {
  pctx.clearRect(0, 0, preview.width, preview.height);
  const f = composed.idle[0] || composed.walk[Math.min(CONFIG.idleFrame, composed.walk.length - 1)];
  if (f) pctx.drawImage(f, 0, 0, preview.width, preview.height);
}
function applyOutfit() {
  composeFrames();
  refreshPreview();
  saveOutfit();
  netSendOutfit();
  buildPanel();
}

function buildPanel() {
  rowsEl.innerHTML = "";
  const def = PARTS.body;
  if (!def.options.length) return;
  let idx = def.options.findIndex(o => o.id === outfit.body.id);
  if (idx < 0) idx = 0;
  const opt = def.options[idx];

  const row = document.createElement("div");
  row.className = "row";
  const label = document.createElement("div");
  label.className = "label"; label.textContent = def.label;
  const step = d => {
    const n = def.options.length;
    outfit.body.id = def.options[(idx + d + n) % n].id;
    applyOutfit();
  };
  const prev = document.createElement("button"); prev.textContent = "◀"; prev.onclick = () => step(-1);
  const name = document.createElement("div"); name.className = "name"; name.textContent = opt.name;
  const next = document.createElement("button"); next.textContent = "▶"; next.onclick = () => step(1);
  row.append(label, prev, name, next);
  rowsEl.appendChild(row);
}

document.getElementById("btnCostume").onclick = () => panel.classList.toggle("open");
document.getElementById("btnReset").onclick = () => { outfit = cloneOutfit(DEFAULT_OUTFIT); applyOutfit(); };
document.getElementById("btnRandom").onclick = () => {
  const opts = PARTS.body.options;
  outfit.body.id = opts[Math.floor(Math.random() * opts.length)].id;
  applyOutfit();
};

// ---------- Suara ----------
const AUDIO_KEY = "gamePertamaAudio";
const audioPrefs = { music: true, sfx: true };
try {
  const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) || "null");
  if (saved) { audioPrefs.music = saved.music !== false; audioPrefs.sfx = saved.sfx !== false; }
} catch (e) {}
function saveAudioPrefs() {
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify(audioPrefs)); } catch (e) {}
}

const bgm = new Audio(CONFIG.bgmFile);
bgm.loop = true;
bgm.volume = CONFIG.bgmVolume;
bgm.preload = "auto";

const stepSounds = CONFIG.footstepFiles.map(f => {
  const a = new Audio(f);
  a.preload = "auto";
  a.volume = CONFIG.footstepVolume;
  a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false;
  return a;
});
let stepIndex = 0;
let stepTimer = 0;
let audioStarted = false;

const btnMusic = document.getElementById("btnMusic");
const btnSfx = document.getElementById("btnSfx");
const audioHint = document.getElementById("audioHint");

function refreshAudioButtons() {
  btnMusic.classList.toggle("off", !audioPrefs.music);
  btnSfx.classList.toggle("off", !audioPrefs.sfx);
}

// Browser memblokir suara sebelum ada interaksi, jadi musik dimulai saat klik/tekan pertama.
function startAudio() {
  if (audioStarted) return;
  if (!audioPrefs.music) {
    audioStarted = true; audioHint.style.display = "none"; removeGestureListeners(); return;
  }
  const p = bgm.play();
  if (p && p.then) {
    p.then(() => { audioStarted = true; audioHint.style.display = "none"; removeGestureListeners(); })
     .catch(() => { /* masih diblokir, coba lagi saat interaksi berikutnya */ });
  } else {
    audioStarted = true; audioHint.style.display = "none"; removeGestureListeners();
  }
}
const GESTURES = ["pointerdown", "keydown", "touchend"];
function removeGestureListeners() { GESTURES.forEach(g => window.removeEventListener(g, startAudio)); }
GESTURES.forEach(g => window.addEventListener(g, startAudio));

btnMusic.onclick = () => {
  audioPrefs.music = !audioPrefs.music;
  if (audioPrefs.music) bgm.play().catch(() => {}); else bgm.pause();
  if (audioPrefs.music) { audioStarted = true; audioHint.style.display = "none"; }
  saveAudioPrefs(); refreshAudioButtons();
};
btnSfx.onclick = () => {
  audioPrefs.sfx = !audioPrefs.sfx;
  saveAudioPrefs(); refreshAudioButtons();
};
refreshAudioButtons();
if (!audioPrefs.music) audioHint.textContent = "🔇 Musik mati (klik 🎵 Musik untuk menyalakan)";

document.addEventListener("visibilitychange", () => {
  if (document.hidden) bgm.pause();
  else if (audioStarted && audioPrefs.music) bgm.play().catch(() => {});
});

function playStep() {
  if (!audioPrefs.sfx || !audioStarted || !stepSounds.length) return;
  const a = stepSounds[stepIndex];
  stepIndex = (stepIndex + 1) % stepSounds.length;
  const v = CONFIG.footstepPitchVariation;
  a.playbackRate = 1 + (Math.random() * 2 - 1) * v;
  a.volume = CONFIG.footstepVolume * (0.85 + Math.random() * 0.15);
  a.currentTime = 0;
  a.play().catch(() => {});
}
function footstepInterval() {
  return CONFIG.footstepInterval || (CONFIG.frameCount / CONFIG.animationFps) / 2;
}

// ---------- Gambar nama & gelembung chat ----------
const NAME_TAG_HEIGHT = 18;

function roundedRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function nameTagTop(py) {
  return py - CONFIG.playerHeight / 2 + 2 - NAME_TAG_HEIGHT;   // tepat di atas kepala
}
function drawNameTag(px, py, name) {
  if (!name) return;
  ctx.save();
  ctx.font = CONFIG.nameFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const boxW = ctx.measureText(name).width + 16;
  const top = nameTagTop(py);
  roundedRectPath(px - boxW / 2, top, boxW, NAME_TAG_HEIGHT, NAME_TAG_HEIGHT / 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(name, px, top + NAME_TAG_HEIGHT / 2 + 1);
  ctx.restore();
}

function wrapText(text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    let w = word;
    while (ctx.measureText(w).width > maxWidth) {          // kata sangat panjang dipotong
      let cut = w.length;
      while (cut > 1 && ctx.measureText(w.slice(0, cut)).width > maxWidth) cut--;
      if (line) { lines.push(line); line = ""; }
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const test = line ? line + " " + w : w;
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawChatBubble(px, py, viewW, name, msg) {
  if (!msg) return;
  const age = performance.now() - msg.time;
  if (age > CONFIG.chatDuration) return;
  const remaining = CONFIG.chatDuration - age;
  const alpha = remaining < CONFIG.chatFadeTime ? remaining / CONFIG.chatFadeTime : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = CONFIG.chatFont;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const pad = 8, lineH = 18, tail = 8;
  const lines = wrapText(msg.text, CONFIG.chatMaxWidth);
  const textW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const boxW = textW + pad * 2;
  const boxH = lines.length * lineH + pad * 2;

  const tipY = name ? nameTagTop(py) - 4 : py - CONFIG.playerHeight / 2 + 2;
  let boxX = px - boxW / 2;
  boxX = Math.max(8, Math.min(viewW - boxW - 8, boxX));     // jangan keluar layar
  const boxY = Math.max(8, tipY - tail - boxH);
  const tailX = Math.max(boxX + 14, Math.min(boxX + boxW - 14, px));

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  roundedRectPath(boxX, boxY, boxW, boxH, 10);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tailX - 6, boxY + boxH - 1);
  ctx.lineTo(tailX, boxY + boxH + tail);
  ctx.lineTo(tailX + 6, boxY + boxH - 1);
  ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tailX - 6, boxY + boxH);
  ctx.lineTo(tailX, boxY + boxH + tail);
  ctx.lineTo(tailX + 6, boxY + boxH);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(tailX - 5, boxY + boxH - 2, 10, 3);

  ctx.fillStyle = "#222";
  lines.forEach((l, i) => ctx.fillText(l, boxX + pad, boxY + pad + lineH * i + lineH / 2));
  ctx.restore();
}

// ---------- Chat (input) ----------
const chatForm = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
chatInput.maxLength = CONFIG.chatMaxLength;
let chatMessage = null;   // { text, time }

chatInput.addEventListener("focus", () => { for (const k in keys) keys[k] = false; });
chatInput.addEventListener("keydown", e => {
  if (e.code === "Escape") chatInput.blur();
});
chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const text = chatInput.value.trim().slice(0, CONFIG.chatMaxLength);
  if (text) {
    chatMessage = { text, time: performance.now() };
    netSend({ t: "chat", text });
  }
  chatInput.value = "";
  chatInput.blur();       // kembali ke mode gerak
});

// ---------- Nama karakter ----------
const NAME_KEY = "gamePertamaName";
const nameMenu = document.getElementById("nameMenu");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const nameError = document.getElementById("nameError");
const nameCancel = document.getElementById("nameCancel");
nameInput.maxLength = CONFIG.nameMaxLength;

let playerName = "";
try { playerName = cleanName(localStorage.getItem(NAME_KEY)); } catch (e) {}
let nameMenuOpen = false;

function openNameMenu(errorText) {
  nameMenuOpen = true;
  for (const k in keys) keys[k] = false;
  nameInput.value = playerName;
  nameError.textContent = errorText || "";
  nameCancel.style.display = playerName && !errorText ? "block" : "none";
  nameMenu.classList.add("open");
  setTimeout(() => { nameInput.focus(); nameInput.select(); }, 0);
}
function closeNameMenu() {
  nameMenuOpen = false;
  nameMenu.classList.remove("open");
  nameInput.blur();
  for (const k in keys) keys[k] = false;
}
nameForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = cleanName(nameInput.value);
  if (name.length < CONFIG.nameMinLength) {
    nameError.textContent = `Nama minimal ${CONFIG.nameMinLength} huruf`;
    return;
  }
  const changed = name !== playerName;
  playerName = name;
  try { localStorage.setItem(NAME_KEY, playerName); } catch (err) {}
  closeNameMenu();
  if (netReady) { if (changed) netSend({ t: "name", name: playerName }); }
  else { netBlocked = false; netConnect(); }
});
nameCancel.addEventListener("click", closeNameMenu);
nameInput.addEventListener("input", () => { nameError.textContent = ""; });
nameInput.addEventListener("keydown", e => {
  if (e.code === "Escape" && playerName && nameCancel.style.display !== "none") closeNameMenu();
});
document.getElementById("btnName").onclick = () => openNameMenu();

// ---------- Input gerak ----------
const keys = {};
const touch = { up: false, down: false, left: false, right: false };
function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
}
window.addEventListener("keydown", e => {
  if (nameMenuOpen) {                      // menu nama terbuka: karakter tidak bergerak
    if (!isTyping(e) && e.code === "Enter") { e.preventDefault(); nameInput.focus(); }
    return;
  }
  if (isTyping(e)) return;                 // sedang mengetik: jangan gerakkan karakter
  if (e.code === "Enter") {                // Enter = mulai mengetik chat
    e.preventDefault();
    chatInput.focus();
    return;
  }
  keys[e.code] = true;
  if (e.code.startsWith("Arrow")) e.preventDefault();
});
window.addEventListener("keyup", e => { keys[e.code] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

document.querySelectorAll("#dpad button").forEach(btn => {
  const dir = btn.dataset.dir;
  const on = e => { e.preventDefault(); touch[dir] = true; };
  const off = e => { e.preventDefault(); touch[dir] = false; };
  btn.addEventListener("pointerdown", on);
  btn.addEventListener("pointerup", off);
  btn.addEventListener("pointerleave", off);
  btn.addEventListener("pointercancel", off);
});

// ---------- State pemain ----------
const player = {
  x: CONFIG.worldWidth / 2 + (Math.random() * 400 - 200),   // muncul acak di sekitar tengah
  y: CONFIG.worldHeight / 2 + (Math.random() * 400 - 200),
  facingLeft: false, moving: false
};
let animTime = 0;

// ---------- Multiplayer ----------
const remotePlayers = new Map();   // id -> pemain lain
const netStatusEl = document.getElementById("netStatus");
let socket = null;
let netReady = false;              // true setelah server menyambut kita
let netBlocked = false;            // true jika server menolak permanen (misal: nama tidak valid)
let netNote = "";                  // pesan terakhir dari server untuk ditampilkan di status
let myId = null;
let reconnectDelay = 1000;
let reconnectTimer = null;
let lastSent = null;
let sendTimer = 0;
let outfitSendTimer = null;

// ---------- Papan skor (semua pemain online) ----------
// jumlah baris papan skor menyesuaikan ukuran layar
function boardMaxRows() {
  if (window.innerHeight <= 500) return 3;
  if (window.innerWidth <= 600) return 5;
  return 10;
}
const boardStyle = document.createElement("style");
boardStyle.textContent = `
#scoreBoard{position:fixed;left:calc(8px + env(safe-area-inset-left,0px));width:210px;box-sizing:border-box;background:rgba(0,0,0,.55);color:#fff;
  border-radius:10px;padding:8px 10px;font-size:13px;pointer-events:none;z-index:5;display:none}
#scoreBoard .sbTitle{font-weight:700;margin-bottom:4px}
#scoreBoard .sbRow{display:grid;grid-template-columns:28px 1fr auto;gap:6px;padding:2px 4px;border-radius:6px;align-items:center}
#scoreBoard .sbRow.me{background:rgba(59,130,246,.6);font-weight:700}
#scoreBoard .sbRank{text-align:center}
#scoreBoard .sbRow.r1{font-size:15px;color:#ffd54a}
#scoreBoard .sbRow.r2{color:#e0e0e0}
#scoreBoard .sbRow.r3{color:#e8a56a}
#scoreBoard .sbName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#scoreBoard .sbMore{opacity:.7;padding:2px 4px}
@media (max-width:600px){#scoreBoard{width:158px;font-size:12px;padding:6px 8px}
  #scoreBoard .sbRow{grid-template-columns:24px 1fr auto;gap:4px}}
@media (max-height:500px){#scoreBoard{font-size:11px;padding:5px 7px}}`;
document.head.appendChild(boardStyle);
const boardEl = document.createElement("div");
boardEl.id = "scoreBoard";
document.body.appendChild(boardEl);
let boardKey = "";

function renderBoard() {
  if (!netReady) { boardEl.style.display = "none"; boardKey = ""; return; }
  const infoEl = document.getElementById("info");
  boardEl.style.top = ((infoEl ? infoEl.getBoundingClientRect().bottom : 0) + 6) + "px";
  boardEl.style.display = "block";

  const all = [{ id: myId, name: playerName, score: typeof Ayam !== "undefined" ? Ayam.caught : 0, me: true }];
  remotePlayers.forEach(r => all.push({ id: r.id, name: r.name, score: r.score || 0, me: false }));
  all.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id - b.id);
  let rank = 0, prev = null;                       // skor sama = peringkat sama
  all.forEach((p, i) => { if (p.score !== prev) { rank = i + 1; prev = p.score; } p.rank = rank; });

  const maxRows = boardMaxRows();
  let shown = all.slice(0, maxRows);
  if (all.length > maxRows && !shown.some(p => p.me)) {   // pastikan baris saya selalu terlihat
    shown = all.slice(0, maxRows - 1);
    shown.push(all.find(p => p.me));
  }
  const hidden = all.length - shown.length;
  const key = JSON.stringify([shown.map(p => [p.rank, p.name, p.score, p.me]), hidden]);
  if (key === boardKey) return;                    // tidak ada perubahan
  boardKey = key;

  boardEl.textContent = "";
  const title = document.createElement("div");
  title.className = "sbTitle";
  title.textContent = "🏆 Papan Skor";
  boardEl.appendChild(title);
  const medals = ["🥇", "🥈", "🥉"];
  for (const p of shown) {
    const row = document.createElement("div");
    row.className = "sbRow" + (p.me ? " me" : "") + (p.score > 0 && p.rank <= 3 ? " r" + p.rank : "");
    const r = document.createElement("span");
    r.className = "sbRank";
    r.textContent = p.score > 0 && p.rank <= 3 ? medals[p.rank - 1] : p.rank + ".";
    const n = document.createElement("span");
    n.className = "sbName";
    n.textContent = p.name + (p.me ? " (Anda)" : "");
    const s = document.createElement("span");
    s.textContent = "🐔 " + p.score;
    row.append(r, n, s);
    boardEl.appendChild(row);
  }
  if (hidden > 0) {
    const more = document.createElement("div");
    more.className = "sbMore";
    more.textContent = "… dan " + hidden + " pemain lain";
    boardEl.appendChild(more);
  }
}
setInterval(renderBoard, 300);

function updateNetStatus() {
  let text;
  if (!CONFIG.serverUrl) text = "👤 Mode sendiri (offline)";
  else if (netReady) text = `🟢 Online: ${remotePlayers.size + 1} pemain` + (netNote ? ` — ${netNote}` : "");
  else if (netNote) text = "🔴 " + netNote;
  else text = "🟡 Menghubungkan…";
  netStatusEl.textContent = text;
}

function netSend(obj) {
  if (socket && socket.readyState === 1 && netReady) socket.send(JSON.stringify(obj));
}
function netSendOutfit() {            // ditunda sebentar agar tidak mengirim ratusan kali saat geser warna
  if (!CONFIG.serverUrl || outfitSendTimer) return;
  outfitSendTimer = setTimeout(() => {
    outfitSendTimer = null;
    netSend({ t: "outfit", outfit });
  }, 150);
}

function scheduleReconnect() {
  if (reconnectTimer || netBlocked || !CONFIG.serverUrl) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; netConnect(); }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 10000);
}

function netConnect() {
  if (!CONFIG.serverUrl || !playerName || socket || netBlocked) { updateNetStatus(); return; }
  let ws;
  try { ws = new WebSocket(CONFIG.serverUrl); }
  catch (e) { netNote = "Alamat server tidak valid"; updateNetStatus(); return; }
  socket = ws;

  ws.onopen = () => {
    ws.send(JSON.stringify({
      t: "join", name: playerName, outfit,
      x: Math.round(player.x), y: Math.round(player.y), l: player.facingLeft ? 1 : 0
    }));
  };
  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg && typeof msg.t === "string") handleNetMessage(msg);
  };
  ws.onclose = () => {
    if (socket === ws) socket = null;
    netReady = false;
    myId = null;
    remotePlayers.clear();
    if (typeof Ayam !== "undefined") Ayam.leaveServer();
    if (!netNote) netNote = "Tidak terhubung ke server";
    updateNetStatus();
    scheduleReconnect();
  };
  ws.onerror = () => {};              // onclose akan menyusul
}

function addRemote(p) {
  if (!p || typeof p.id !== "number") return;
  const o = validOutfit(p.outfit);
  const name = cleanName(p.name);
  if (!o || !name) return;
  prepareOutfit(o);
  const x = Number.isFinite(p.x) ? p.x : 0, y = Number.isFinite(p.y) ? p.y : 0;
  remotePlayers.set(p.id, {
    id: p.id, name, outfit: o, frames: composeCached(o),
    x, y, tx: x, ty: y, left: !!p.l, moving: !!p.m, wasMoving: !!p.m, animTime: 0, chat: null,
    score: Number.isFinite(p.s) ? p.s : 0
  });
}

function handleNetMessage(msg) {
  switch (msg.t) {
    case "welcome": {
      myId = msg.id;
      const w = msg.world;
      if (w && w.w > 0 && w.w <= 20000 && w.h > 0 && w.h <= 20000) {
        CONFIG.worldWidth = w.w; CONFIG.worldHeight = w.h;
        player.x = Math.max(0, Math.min(w.w, player.x));
        player.y = Math.max(0, Math.min(w.h, player.y));
      }
      remotePlayers.clear();
      if (Array.isArray(msg.players)) msg.players.forEach(addRemote);
      if (typeof Ayam !== "undefined") Ayam.setFromServer(msg.chickens);   // ayam dari server (ayam.js)
      netReady = true;
      netNote = "";
      reconnectDelay = 1000;
      lastSent = null;
      updateNetStatus();
      break;
    }
    case "ck": if (typeof Ayam !== "undefined") Ayam.applyServer(msg.c); break;
    case "caught": {
      if (msg.by !== myId) {                                  // pemain lain menangkap: catat skornya
        const r = remotePlayers.get(msg.by);
        if (r && Number.isFinite(msg.score)) r.score = msg.score;
      }
      if (typeof Ayam !== "undefined") Ayam.onCaught(msg, myId);
      break;
    }
    case "join": addRemote(msg.player); updateNetStatus(); break;
    case "leave": remotePlayers.delete(msg.id); updateNetStatus(); break;
    case "snap":
      if (Array.isArray(msg.p)) {
        for (const e of msg.p) {
          if (!Array.isArray(e) || e[0] === myId) continue;
          const r = remotePlayers.get(e[0]);
          if (!r || !Number.isFinite(e[1]) || !Number.isFinite(e[2])) continue;
          r.tx = e[1]; r.ty = e[2]; r.left = !!e[3]; r.moving = !!e[4];
        }
      }
      break;
    case "chat": {
      const r = remotePlayers.get(msg.id);
      if (r && typeof msg.text === "string") r.chat = { text: msg.text.slice(0, CONFIG.chatMaxLength), time: performance.now() };
      break;
    }
    case "outfit": {
      const r = remotePlayers.get(msg.id), o = validOutfit(msg.outfit);
      if (r && o) { prepareOutfit(o); r.outfit = o; r.frames = composeCached(o); }
      break;
    }
    case "name": {
      const r = remotePlayers.get(msg.id), n = cleanName(msg.name);
      if (r && n) r.name = n;
      break;
    }
    case "error":
      netNote = String(msg.msg || "Kesalahan dari server").slice(0, 80);
      updateNetStatus();
      if (netReady) setTimeout(() => { netNote = ""; updateNetStatus(); }, 4000);   // pesan sementara
      if (msg.fatal) {
        netBlocked = true;
        if (msg.reason === "name") openNameMenu(netNote);
      }
      break;
  }
}

// ---------- Update ----------
function update(dt) {
  let dx = 0, dy = 0;
  if (keys.ArrowLeft || keys.KeyA || touch.left) dx -= 1;
  if (keys.ArrowRight || keys.KeyD || touch.right) dx += 1;
  if (keys.ArrowUp || keys.KeyW || touch.up) dy -= 1;
  if (keys.ArrowDown || keys.KeyS || touch.down) dy += 1;
  if (typeof Ayam !== "undefined" && Ayam.frozen) { dx = 0; dy = 0; }   // jeda setelah menangkap ayam (ayam.js)

  if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  if (dx < 0) player.facingLeft = true;
  if (dx > 0) player.facingLeft = false;

  const wasMoving = player.moving;
  player.moving = (dx !== 0 || dy !== 0);
  if (player.moving !== wasMoving) animTime = 0;   // ganti dari diam ke jalan (atau sebaliknya): animasi mulai dari awal
  animTime += dt;

  const oldX = player.x, oldY = player.y;
  player.x += dx * CONFIG.speed * dt;
  player.y += dy * CONFIG.speed * dt;

  const halfW = CONFIG.playerWidth / 2, halfH = CONFIG.playerHeight / 2;
  player.x = Math.max(halfW, Math.min(CONFIG.worldWidth - halfW, player.x));
  player.y = Math.max(halfH, Math.min(CONFIG.worldHeight - halfH, player.y));

  // suara langkah: hanya saat benar-benar berpindah
  const moved = player.x !== oldX || player.y !== oldY;
  if (moved) {
    stepTimer -= dt;
    if (stepTimer <= 0) { playStep(); stepTimer = footstepInterval(); }
  } else {
    stepTimer = 0;
  }

  // kirim posisi ke server (hanya jika berubah, dan tidak lebih sering dari sendInterval)
  sendTimer += dt * 1000;
  if (netReady) {
    const st = { x: Math.round(player.x), y: Math.round(player.y), l: player.facingLeft ? 1 : 0, m: player.moving ? 1 : 0 };
    const changed = !lastSent || st.x !== lastSent.x || st.y !== lastSent.y || st.l !== lastSent.l || st.m !== lastSent.m;
    if (changed && sendTimer >= CONFIG.sendInterval) {
      netSend({ t: "move", x: st.x, y: st.y, l: st.l, m: st.m });
      lastSent = st;
      sendTimer = 0;
    }
  }

  // gerakkan pemain lain secara halus menuju posisi terbaru dari server
  const a = 1 - Math.exp(-CONFIG.remoteSmoothing * dt);
  for (const r of remotePlayers.values()) {
    if (Math.abs(r.tx - r.x) > 400 || Math.abs(r.ty - r.y) > 400) { r.x = r.tx; r.y = r.ty; }
    else { r.x += (r.tx - r.x) * a; r.y += (r.ty - r.y) * a; }
    if (r.moving !== r.wasMoving) { r.animTime = 0; r.wasMoving = r.moving; }
    r.animTime += dt;
  }

  if (typeof Ayam !== "undefined") Ayam.update(dt);   // gerakkan ayam & cek tangkapan (ayam.js)
}

// ---------- Gambar ----------
function currentBg() {
  const n = bgFrames.length;
  if (!n) return null;
  if (n === 1 || !CONFIG.backgroundFps) return bgFrames[0];
  return bgFrames[Math.floor(performance.now() / 1000 * CONFIG.backgroundFps) % n];
}
function drawBackground(camX, camY, viewW, viewH) {
  const bgImg = currentBg();
  if (!bgImg) { ctx.fillStyle = "#5a8f55"; ctx.fillRect(0, 0, viewW, viewH); return; }
  ctx.fillStyle = CONFIG.backgroundColor;      // warna dasar: terlihat di bagian gambar yang transparan
  ctx.fillRect(0, 0, viewW, viewH);
  if (CONFIG.backgroundMode === "stretch") {
    ctx.drawImage(bgImg, -camX, -camY, CONFIG.worldWidth, CONFIG.worldHeight);
    return;
  }
  const w = bgImg.width, h = bgImg.height;
  const startX = -((camX % w) + w) % w;
  const startY = -((camY % h) + h) % h;
  for (let x = startX; x < viewW; x += w)
    for (let y = startY; y < viewH; y += h)
      ctx.drawImage(bgImg, Math.floor(x), Math.floor(y), w, h);
}

function drawSprite(c, px, py) {
  const w = CONFIG.playerWidth, h = CONFIG.playerHeight;
  const set = c.frames, n = set.walk.length;
  if (!n) { ctx.fillStyle = "#e33"; ctx.fillRect(px - w / 2, py - h / 2, w, h); return; }
  let frame;
  if (c.moving) frame = set.walk[Math.floor(c.animTime * CONFIG.animationFps) % n];
  else if (set.idle.length) frame = set.idle[Math.floor(c.animTime * CONFIG.idleFps) % set.idle.length];
  else frame = set.walk[Math.min(CONFIG.idleFrame, n - 1)];
  ctx.save();
  ctx.translate(px, py);
  const needFlip = CONFIG.spriteFacesRight ? c.left : !c.left;
  if (needFlip) ctx.scale(-1, 1);
  ctx.drawImage(frame, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function draw() {
  const viewW = window.innerWidth, viewH = window.innerHeight;
  let camX = player.x - viewW / 2, camY = player.y - viewH / 2;
  camX = Math.max(0, Math.min(CONFIG.worldWidth - viewW, camX));
  camY = Math.max(0, Math.min(CONFIG.worldHeight - viewH, camY));
  if (CONFIG.worldWidth < viewW) camX = (CONFIG.worldWidth - viewW) / 2;
  if (CONFIG.worldHeight < viewH) camY = (CONFIG.worldHeight - viewH) / 2;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camX, -camY, CONFIG.worldWidth, CONFIG.worldHeight);
  ctx.clip();
  drawBackground(camX, camY, viewW, viewH);
  ctx.restore();

  // semua karakter (saya + pemain lain), diurutkan berdasarkan posisi vertikal:
  // yang lebih bawah digambar belakangan sehingga tampil di depan.
  const list = [{ x: player.x, y: player.y, frames: composed, left: player.facingLeft,
                  moving: player.moving, animTime, name: playerName, chat: chatMessage }];
  for (const r of remotePlayers.values()) list.push(r);
  if (typeof Ayam !== "undefined") Ayam.addToDrawList(list);   // ayam + pose menang (ayam.js)
  list.sort((a, b) => a.y - b.y);

  const margin = 120, visible = [];
  for (const c of list) {
    const px = c.x - camX, py = c.y - camY;
    if (px < -margin || px > viewW + margin || py < -margin || py > viewH + margin) continue;
    if (c.customDraw) c.customDraw(px, py); else drawSprite(c, px, py);
    visible.push({ c, px, py });
  }
  for (const v of visible) drawNameTag(v.px, v.py, v.c.name);                     // nama di atas semua karakter
  for (const v of visible) drawChatBubble(v.px, v.py, viewW, v.c.name, v.c.chat); // lalu gelembung chat
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function showNoCharacters() {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
    "text-align:center;padding:24px;background:#222;color:#fff;font:16px system-ui,sans-serif;z-index:200";
  d.textContent = "Tidak ada karakter. Buat folder assets/body/<nama>/ berisi 1.png sampai " +
    CONFIG.frameCount + ".png, lalu muat ulang.";
  document.body.appendChild(d);
}

async function loadBackgrounds() {
  const imgs = (await Promise.all(CONFIG.backgroundImages.map(src => loadImage(src, true)))).filter(Boolean);
  if (imgs.length) return imgs;
  const single = await loadImage(CONFIG.backgroundImage, true);   // cadangan: satu gambar latar
  return single ? [single] : [];
}

Promise.all([loadAllBodies(), loadBackgrounds()]).then(([, bgs]) => {
  bgFrames = bgs;
  if (!bgFrames.length) console.warn("Gambar latar tidak ditemukan (assets/background1.png ... 3.png atau assets/background.png)");
  const opts = PARTS.body.options;
  if (!opts.length) { showNoCharacters(); return; }
  DEFAULT_OUTFIT.body.id = opts[0].id;
  if (!opts.some(o => o.id === outfit.body.id)) {       // pilihan tersimpan sudah tidak ada
    outfit.body = { id: opts[0].id, color: "#ffffff" };
    saveOutfit();
  }
  composeFrames();
  refreshPreview();
  buildPanel();
  updateNetStatus();
  if (!playerName) openNameMenu();     // pengunjung baru: minta nama dulu
  else netConnect();                   // sudah punya nama: langsung masuk ke server
  requestAnimationFrame(loop);
});

// ---------- Menu Setting (Musik, Efek, Nama, Kostum dikumpulkan di satu menu) ----------
// Menu Setting dan panel Kostum menutup sendiri saat klik di luar, karakter bergerak, atau Esc.
(function () {
  const btn = document.getElementById("btnSettings");
  const menu = document.getElementById("settingsMenu");
  const costumePanel = document.getElementById("panel");
  if (!btn || !menu) return;
  const close = () => menu.classList.remove("open");
  const closePanel = () => { if (costumePanel) costumePanel.classList.remove("open"); };
  btn.addEventListener("click", () => menu.classList.toggle("open"));
  menu.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b && (b.id === "btnName" || b.id === "btnCostume")) close();   // membuka panel lain: tutup menu
  });
  // klik/sentuh di luar menu (termasuk tombol arah di layar) -> menu tutup
  document.addEventListener("pointerdown", e => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    if (costumePanel && !costumePanel.contains(e.target)) closePanel();   // klik di luar panel Kostum
  }, true);
  window.addEventListener("keydown", e => { if (e.key === "Escape") { close(); closePanel(); } });

  // Tombol chat 💬 (khusus HP): membuka kotak chat di bagian atas layar
  // (di atas, supaya tidak tertutup keyboard HP). Menutup lagi setelah selesai mengetik.
  const btnChat = document.getElementById("btnChat");
  if (btnChat) {
    btnChat.addEventListener("click", () => {
      document.body.classList.add("chatOpen");
      chatInput.focus();
    });
    chatInput.addEventListener("blur", () => setTimeout(() => {
      if (document.activeElement !== chatInput) document.body.classList.remove("chatOpen");
    }, 300));
  }
  // karakter bergerak (keyboard maupun tombol layar) -> menu tutup
  setInterval(() => {
    if (!player.moving) return;
    if (menu.classList.contains("open")) close();
    if (costumePanel && costumePanel.classList.contains("open")) closePanel();
  }, 100);
})();
