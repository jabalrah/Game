// ===================== PENGATURAN GAME (silakan ubah) =====================
const CONFIG = {
  backgroundImage: "assets/background.png", // ganti dengan gambar latar Anda
  backgroundMode: "tile",   // "tile" = diulang seperti ubin, "stretch" = diregangkan

  worldWidth: 3000,         // ukuran peta (piksel). Saat online, ukuran dari server yang dipakai.
  worldHeight: 3000,

  playerWidth: 96,          // ukuran karakter di layar
  playerHeight: 96,
  speed: 250,               // kecepatan (piksel per detik)

  frameCount: 5,            // jumlah frame animasi per bagian
  animationFps: 10,         // kecepatan animasi
  idleFrame: 0,             // frame saat diam (0 = frame pertama)
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
  serverUrl: "ws://localhost:3000",
  sendInterval: 66,         // jeda minimal kirim posisi (milidetik), sekitar 15 kali per detik
  remoteSmoothing: 14       // makin besar, gerak pemain lain makin cepat menyusul posisi terbaru
};

// ===================== DAFTAR KOSTUM (tambah kostum baru di sini) =====================
// Lokasi file:  assets/<bagian>/<id>/1.png ... 5.png     (khusus kulit: assets/body/1.png ... 5.png)
// tint: true  -> gambar digambar abu-abu/putih lalu diwarnai oleh game (ada pemilih warna)
// tint: false -> gambar dipakai apa adanya (tanpa pemilih warna)
// id hanya boleh huruf kecil, angka, - dan _ (maks 24 karakter) agar diterima server.
const PARTS = {
  body:  { label: "Kulit", flat: true,
           options: [{ id: "default", name: "Badan", tint: true }] },
  hat:   { label: "Topi",
           options: [{ id: "none", name: "Tanpa" },
                     { id: "cap", name: "Topi Baseball", tint: true },
                     { id: "beanie", name: "Kupluk", tint: true }] },
  shirt: { label: "Baju",
           options: [{ id: "none", name: "Tanpa" },
                     { id: "tshirt", name: "Kaos", tint: true },
                     { id: "hoodie", name: "Hoodie", tint: true }] },
  pants: { label: "Celana",
           options: [{ id: "none", name: "Tanpa" },
                     { id: "jeans", name: "Celana Panjang", tint: true },
                     { id: "shorts", name: "Celana Pendek", tint: true }] },
  shoes: { label: "Sepatu",
           options: [{ id: "none", name: "Tanpa" },
                     { id: "sneakers", name: "Sneakers", tint: true },
                     { id: "boots", name: "Boots", tint: true }] }
};
const DRAW_ORDER = ["body", "pants", "shoes", "shirt", "hat"]; // dari belakang ke depan
const MENU_ORDER = ["body", "hat", "shirt", "pants", "shoes"];
const SKIN_PRESETS = ["#ffdbac", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"];

const DEFAULT_OUTFIT = {
  body:  { id: "default",  color: "#f1c27d" },
  hat:   { id: "cap",      color: "#dd3333" },
  shirt: { id: "hoodie",   color: "#3b82f6" },
  pants: { id: "jeans",    color: "#3b4a7a" },
  shoes: { id: "boots",    color: "#8b5a2b" }
};
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

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn("Gagal memuat:", src); resolve(null); };
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
        if (s && PARTS[key].options.some(o => o.id === s.id) && COLOR_RE.test(s.color)) {
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
const images = {};       // images[bagian][id] = [frame1..frame5]
let composed = [];       // frame jadi milik pemain ini (semua layer sudah digabung)
let bgImg = null;

function imagePath(part, id, n) {
  return PARTS[part].flat ? `assets/${part}/${n}.png` : `assets/${part}/${id}/${n}.png`;
}

function loadAllCostumeImages() {
  const jobs = [];
  for (const part of Object.keys(PARTS)) {
    images[part] = Object.create(null);
    for (const opt of PARTS[part].options) {
      if (opt.id === "none") continue;
      images[part][opt.id] = [];
      for (let n = 1; n <= CONFIG.frameCount; n++) {
        jobs.push(loadImage(imagePath(part, opt.id, n)).then(img => { images[part][opt.id][n - 1] = img; }));
      }
    }
  }
  return Promise.all(jobs);
}

// ---------- Mewarnai (tinting) ----------
function tintImage(img, color) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in"; // buang area di luar bentuk asli
  g.drawImage(img, 0, 0);
  return c;
}

// ---------- Gabungkan semua layer menjadi frame jadi ----------
function composeOutfit(o) {
  const base = (images.body.default || []).find(Boolean);
  if (!base) return [];
  const out = [];
  for (let i = 0; i < CONFIG.frameCount; i++) {
    const c = document.createElement("canvas");
    c.width = base.width; c.height = base.height;
    const g = c.getContext("2d");
    for (const part of DRAW_ORDER) {
      const sel = o[part];
      if (!sel || sel.id === "none") continue;
      const set = images[part] && images[part][sel.id];
      const img = set && set[i];
      if (!img) continue;                       // kostum tidak dikenal: dilewati
      const opt = PARTS[part].options.find(x => x.id === sel.id);
      g.drawImage(!opt || opt.tint !== false ? tintImage(img, sel.color) : img, 0, 0);
    }
    out.push(c);
  }
  return out;
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
  if (composed[0]) pctx.drawImage(composed[0], 0, 0, preview.width, preview.height);
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
  for (const part of MENU_ORDER) {
    const def = PARTS[part];
    const sel = outfit[part];
    const opt = def.options.find(o => o.id === sel.id);
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("div");
    label.className = "label"; label.textContent = def.label;
    row.appendChild(label);

    if (part === "body") {
      const sw = document.createElement("div");
      sw.className = "swatches";
      for (const col of SKIN_PRESETS) {
        const s = document.createElement("span");
        s.style.background = col;
        s.title = col;
        s.onclick = () => { outfit.body.color = col; applyOutfit(); };
        sw.appendChild(s);
      }
      row.appendChild(sw);
    } else {
      const idx = def.options.indexOf(opt);
      const step = d => {
        const n = def.options.length;
        outfit[part].id = def.options[(idx + d + n) % n].id;
        applyOutfit();
      };
      const prev = document.createElement("button"); prev.textContent = "◀"; prev.onclick = () => step(-1);
      const name = document.createElement("div"); name.className = "name"; name.textContent = opt.name;
      const next = document.createElement("button"); next.textContent = "▶"; next.onclick = () => step(1);
      row.append(prev, name, next);
    }

    if (opt.id !== "none" && opt.tint !== false) {
      const input = document.createElement("input");
      input.type = "color"; input.value = sel.color;
      input.oninput = () => {            // ubah warna langsung terlihat, tanpa membangun ulang menu
        outfit[part].color = input.value;
        composeFrames(); refreshPreview(); saveOutfit(); netSendOutfit();
      };
      row.appendChild(input);
    }
    rowsEl.appendChild(row);
  }
}

document.getElementById("btnCostume").onclick = () => panel.classList.toggle("open");
document.getElementById("btnReset").onclick = () => { outfit = cloneOutfit(DEFAULT_OUTFIT); applyOutfit(); };
document.getElementById("btnRandom").onclick = () => {
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const rndColor = () => "#" + [0, 0, 0].map(() => Math.floor(Math.random() * 200 + 40).toString(16).padStart(2, "0")).join("");
  for (const part of MENU_ORDER) {
    if (part !== "body") outfit[part].id = rnd(PARTS[part].options).id;
    outfit[part].color = part === "body" ? rnd(SKIN_PRESETS) : rndColor();
  }
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
  const x = Number.isFinite(p.x) ? p.x : 0, y = Number.isFinite(p.y) ? p.y : 0;
  remotePlayers.set(p.id, {
    id: p.id, name, outfit: o, frames: composeCached(o),
    x, y, tx: x, ty: y, left: !!p.l, moving: !!p.m, animTime: 0, chat: null
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
      netReady = true;
      netNote = "";
      reconnectDelay = 1000;
      lastSent = null;
      updateNetStatus();
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
      if (r && o) { r.outfit = o; r.frames = composeCached(o); }
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

  if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  if (dx < 0) player.facingLeft = true;
  if (dx > 0) player.facingLeft = false;

  player.moving = (dx !== 0 || dy !== 0);
  if (player.moving) animTime += dt; else animTime = 0;

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
    if (r.moving) r.animTime += dt; else r.animTime = 0;
  }
}

// ---------- Gambar ----------
function drawBackground(camX, camY, viewW, viewH) {
  if (!bgImg) { ctx.fillStyle = "#5a8f55"; ctx.fillRect(0, 0, viewW, viewH); return; }
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
  const n = c.frames.length;
  if (!n) { ctx.fillStyle = "#e33"; ctx.fillRect(px - w / 2, py - h / 2, w, h); return; }
  const frame = c.frames[c.moving
      ? Math.floor(c.animTime * CONFIG.animationFps) % n
      : Math.min(CONFIG.idleFrame, n - 1)];
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
  list.sort((a, b) => a.y - b.y);

  const margin = 120, visible = [];
  for (const c of list) {
    const px = c.x - camX, py = c.y - camY;
    if (px < -margin || px > viewW + margin || py < -margin || py > viewH + margin) continue;
    drawSprite(c, px, py);
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

Promise.all([loadAllCostumeImages(), loadImage(CONFIG.backgroundImage)]).then(([, b]) => {
  bgImg = b;
  composeFrames();
  refreshPreview();
  buildPanel();
  updateNetStatus();
  if (!playerName) openNameMenu();     // pengunjung baru: minta nama dulu
  else netConnect();                   // sudah punya nama: langsung masuk ke server
  requestAnimationFrame(loop);
});
