// ===================== PENGATURAN GAME (silakan ubah) =====================
const CONFIG = {
  backgroundImage: "assets/background.png", // gambar latar (diam, tanpa animasi)
  backgroundColor: "#ffffff", // warna dasar di bawah gambar latar (terlihat di bagian PNG yang bolong/transparan)
  // backgroundMode: "auto"    = otomatis: kalau file latar sebesar peta (atau layer) -> "map"; kalau lebih kecil -> "tile"
  //                 "map"     = SATU file latar menutupi seluruh peta (contoh 4096 x 4096), digambar sekali, tidak diulang.
  //                           Ukuran peta otomatis = ukuran file latar (kalau tidak ada layer.png).
  //                 "tile"    = diulang seperti ubin (cocok untuk gambar kecil, mis. 1024 x 1024)
  //                 "stretch" = diregangkan memenuhi peta
  backgroundMode: "auto",

  // Layer di atas latar (PNG). Bagian yang TERISI gambar = tembok/rintangan (pemain tidak bisa lewat);
  // bagian BOLONG (transparan) = bisa dilewati.
  // layerMode: "map"     = SATU file layer menutupi seluruh peta (contoh latar 1024 x 4 = 4096 x 4096),
  //                        digambar sekali dari pojok kiri-atas peta, tidak diulang. Ukuran peta otomatis = ukuran layer.
  //            "tile"    = diulang seperti ubin (ikut ukuran file layer)
  //            "stretch" = diregangkan memenuhi peta
  layerMode: "map",
  layerImage: "assets/layer.png",   // kalau file tidak ada, game jalan seperti biasa tanpa rintangan
  layerAlphaMin: 40,        // piksel dianggap terisi jika transparansinya (0-255) di atas angka ini
  layerHitWidth: 40,        // lebar kotak tabrak di kaki karakter (piksel)
  layerHitHeight: 20,       // tinggi kotak tabrak di kaki karakter (piksel)
  layerHitBottom: 4,        // jarak bawah kotak tabrak dari dasar gambar karakter (piksel)
  layerDebug: false,        // true = tampilkan kotak tabrak karakter (untuk menguji layer)

  // Layer ATAS (PNG): digambar DI ATAS karakter dan TIDAK punya tabrakan (karakter bisa lewat di bawahnya).
  // Cocok untuk tajuk pohon, atap, jembatan, kabut, dan sebagainya. Kalau file tidak ada, game jalan seperti biasa.
  // Gambarnya harus sama ukurannya dengan layer.png (mode "map"). overlayMode: "map" | "tile" | "stretch".
  overlayImage: "assets/layer-atas.png",
  overlayMode: "map",

  // Layer ANIMASI (PNG, beberapa frame): lapisan dekorasi yang bergerak, tanpa tabrakan (bisa dilewati).
  // Cocok untuk air, riak, rumput bergoyang, api, kabut. Nama file: layer-animasi1.png, layer-animasi2.png, dst.
  // Semua frame harus ada dan ukurannya sama dengan layer.png (mode "map").
  // animLayerPosition: "belakang" = di atas latar, DI BAWAH layer.png dan karakter
  //                    "tengah"   = DI ATAS layer.png, di bawah karakter
  //                    "atas"     = di atas karakter, di bawah layer-atas.png
  //                    "teratas"  = di atas karakter DAN di atas layer-atas.png (nama & chat tetap paling depan)
  animLayerPrefix: "assets/layer-animasi",
  animLayerFrameCount: 3,
  animLayerFps: 4,            // kecepatan animasi (frame per detik; makin kecil makin pelan)
  animLayerMode: "map",       // "map" | "tile" | "stretch"
  animLayerPosition: "teratas",

  worldWidth: 4096,         // ukuran peta (piksel). Saat online, ukuran dari server yang dipakai.
  worldHeight: 4096,        // (kalau ada layer.png dengan layerMode "map", ukuran peta otomatis = ukuran layer)

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
  lieFrameCount: 3,         // jumlah frame animasi baring (baring1.png sampai baring3.png)
  lieFps: 3,                // kecepatan animasi baring (makin kecil makin pelan)
  idleFrame: 0,             // dipakai hanya jika karakter TIDAK punya animasi idle (0 = frame jalan pertama)
  spriteFacesRight: true,   // true jika gambar asli menghadap KANAN

  chatDuration: 6000,       // lama pesan tampil di atas karakter (milidetik)
  chatFadeTime: 1000,       // lama memudar di akhir (milidetik)
  chatVoicePitch: 1.15,     // tinggi suara gumaman chat pemain (1 = normal; NPC: 0.72 - 1.7)
  chatMaxLength: 80,        // batas jumlah huruf per pesan
  chatMaxWidth: 190,        // lebar maksimal gelembung chat (piksel)
  chatFont: "14px system-ui, sans-serif",

  // ---- Suara ----
  bgmFile: "",              // dikosongkan: lagu diatur musik.js (daftar MUSIK_CONFIG.lagu). Dulu menunjuk file yang tidak ada (404 tiap pemuatan).
  bgmVolume: 0.35,
  footstepFile: "assets/audio/step1.wav",   // satu audio langkah, diputar LOOP selama pemain berjalan
  footstepVolume: 0.6,

  // ---- Nama karakter ----
  nameMinLength: 2,
  nameMaxLength: 16,
  nameFont: "bold 13px system-ui, sans-serif",

  // ---- Multiplayer ----
  // Alamat server. Saat tes di komputer sendiri: "ws://localhost:3000"
  // Setelah server di-hosting, ganti dengan alamatnya, contoh: "wss://nama-game.onrender.com"
  // Kosongkan ("") untuk bermain sendiri tanpa server.
  serverUrl: "wss://dod-startup-fashion-rail.trycloudflare.com",
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
const ctx = canvas.getContext("2d", { alpha: false });

let maxDpr = 2;   // batas ketajaman kanvas; perf.js menurunkannya otomatis kalau perangkat terasa berat
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);   // maksimal 2x supaya HP tidak terlalu berat
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", () => { resize(); netSendViewSoon(); });
resize();

function loadImage(src, quiet) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      // dekode sekarang, bukan saat pertama digambar (gambar 4096x4096 bisa membuat game tersendat sesaat)
      if (img.decode) img.decode().then(() => resolve(img), () => resolve(img)); else resolve(img);
    };
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
let composed = { walk: [], idle: [], lie: [] };   // frame jadi milik pemain ini: jalan + idle
let bgMode = "tile";         // cara menggambar latar yang dipakai (hasil dari CONFIG.backgroundMode)
let bgFrames = [];           // gambar latar yang berhasil dimuat

function imagePath(part, id, n) { return `assets/${part}/${id}/${n}.png`; }
function idlePath(id, n) { return `assets/body/${id}/idle${n}.png`; }
function liePath(id, n) { return `assets/body/${id}/baring${n}.png`; }

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
  const walkJobs = [], idleJobs = [], lieJobs = [];
  for (let n = 1; n <= CONFIG.frameCount; n++) walkJobs.push(loadImage(imagePath("body", id, n)));
  for (let n = 1; n <= CONFIG.idleFrameCount; n++) idleJobs.push(loadImage(idlePath(id, n), true));   // idle boleh tidak ada
  for (let n = 1; n <= CONFIG.lieFrameCount; n++) lieJobs.push(loadImage(liePath(id, n), true));      // baring boleh tidak ada
  const p = Promise.all([Promise.all(walkJobs), Promise.all(idleJobs), Promise.all(lieJobs)]).then(([walk, idleAll, lieAll]) => {
    if (!walk.every(Boolean)) {
      console.warn(`Karakter "${id}" dilewati: harus ada ${CONFIG.frameCount} gambar jalan (1.png sampai ${CONFIG.frameCount}.png).`);
      return false;
    }
    let idle = [];
    if (idleAll.every(Boolean)) idle = idleAll;
    else if (idleAll.some(Boolean)) {
      console.warn(`Animasi idle karakter "${id}" tidak dipakai: harus lengkap idle1.png sampai idle${CONFIG.idleFrameCount}.png.`);
    }
    let lie = [];
    if (lieAll.every(Boolean)) lie = lieAll;
    else if (lieAll.some(Boolean)) {
      console.warn(`Animasi baring karakter "${id}" tidak dipakai: harus lengkap baring1.png sampai baring${CONFIG.lieFrameCount}.png.`);
    }
    images.body[id] = { walk, idle, lie };
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
  return first ? images.body[first] : { walk: [], idle: [], lie: [] };
}
function composeFrames() { composed = composeOutfit(outfit); if (player.lying && !(composed.lie && composed.lie.length)) setLying(false); }

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

const bgm = new Audio();
if (CONFIG.bgmFile) bgm.src = CONFIG.bgmFile;
bgm.loop = true;
bgm.volume = CONFIG.bgmVolume;
bgm.preload = "metadata";   // lagu diunduh penuh saat diputar, bukan saat game dibuka

const stepSound = new Audio(CONFIG.footstepFile);   // satu audio langkah, loop
stepSound.preload = "auto";
stepSound.loop = true;
stepSound.volume = CONFIG.footstepVolume;
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
  if (document.hidden) { bgm.pause(); stepSound.pause(); }
  else if (audioStarted && audioPrefs.music) bgm.play().catch(() => {});
  netSend({ t: "vis", v: document.hidden ? 0 : 1 });   // tab tersembunyi: server berhenti mengirim posisi (hemat bandwidth)
});

// Suara langkah: satu audio yang berputar (loop) selama pemain berjalan,
// berhenti saat pemain berhenti, dan mulai dari awal lagi saat berjalan kembali.
function setStepSound(walking) {
  const shouldPlay = walking && audioPrefs.sfx && audioStarted;
  if (shouldPlay) {
    if (stepSound.paused) { stepSound.currentTime = 0; stepSound.play().catch(() => {}); }
  } else if (!stepSound.paused) {
    stepSound.pause();
    stepSound.currentTime = 0;
  }
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
const nameWidthCache = new Map();   // measureText mahal; lebar nama hampir tidak pernah berubah
function nameWidth(name) {
  let w = nameWidthCache.get(name);
  if (w === undefined) {
    if (nameWidthCache.size > 300) nameWidthCache.clear();
    w = ctx.measureText(name).width;
    nameWidthCache.set(name, w);
  }
  return w;
}
function drawNameTag(px, py, name) {
  if (!name) return;
  ctx.save();
  ctx.font = CONFIG.nameFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const boxW = nameWidth(name) + 16;
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
  if (!msg.lines) {                                  // hitung pemecahan baris sekali per pesan, bukan tiap frame
    msg.lines = wrapText(msg.text, CONFIG.chatMaxWidth);
    msg.textW = Math.max(...msg.lines.map(l => ctx.measureText(l).width));
  }
  const lines = msg.lines, textW = msg.textW;
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
    if (typeof Suara !== "undefined") Suara.talk(player.x, player.y, text, CONFIG.chatVoicePitch);   // suara gumaman seperti NPC (suara.js)
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
  if (e.code === "KeyB" && !e.repeat) { toggleLie(); return; }
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
  facingLeft: false, moving: false, lying: false
};
let animTime = 0;

// ---------- Baring ----------
// Tekan B atau tombol "Baring" di menu Setting untuk berbaring / bangun.
// Bergerak (jalan) otomatis membuat karakter bangun. Hanya bisa jika karakter punya baring1-3.png.
let lieWarned = false;
function setLying(on) {
  if (on === player.lying) return;
  if (on && !(composed.lie && composed.lie.length)) {
    if (!lieWarned) { console.warn("Karakter ini belum punya animasi baring (baring1.png sampai baring" + CONFIG.lieFrameCount + ".png)."); lieWarned = true; }
    return;
  }
  player.lying = on;
  animTime = 0;
  const b = document.getElementById("btnLie");
  if (b) b.classList.toggle("lieOn", on);
}
function toggleLie() { setLying(!player.lying); }
{
  const lieBtn = document.getElementById("btnLie");
  if (lieBtn) lieBtn.addEventListener("click", () => {
    toggleLie();
    const m = document.getElementById("settingsMenu");
    if (m) m.classList.remove("open");
  });
}

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
// Server hanya mengirim posisi pemain/kupu-kupu yang dekat layar kita, jadi server perlu tahu ukuran layar.
function viewRadius() { return Math.hypot(window.innerWidth, window.innerHeight) / 2; }
let viewTimer = null;
function netSendViewSoon() {
  if (viewTimer) return;
  viewTimer = setTimeout(() => { viewTimer = null; netSend({ t: "view", r: Math.round(viewRadius()) }); }, 500);
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
  const wait = reconnectDelay * (0.6 + Math.random() * 0.8);   // acak +-40%: pemain tidak menyambung serentak setelah server hidup lagi
  reconnectTimer = setTimeout(() => { reconnectTimer = null; netConnect(); }, wait);
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
      x: Math.round(player.x), y: Math.round(player.y), l: player.facingLeft ? 1 : 0,
      vr: viewRadius()
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
    if (typeof Npc !== "undefined") Npc.netLost();
    if (typeof Kupu !== "undefined") Kupu.netLost();
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
    x, y, tx: x, ty: y, left: !!p.l, moving: !!p.m, lying: !!p.z, wasLying: !!p.z, wasMoving: !!p.m, animTime: 0, chat: null,
  });
}

function handleNetMessage(msg) {
  switch (msg.t) {
    case "welcome": {
      myId = msg.id;
      const w = msg.world;
      if (w && w.w > 0 && w.w <= 20000 && w.h > 0 && w.h <= 20000) {
        const mw = layerImg && CONFIG.layerMode === "map" ? layerW : (bgFrames[0] && bgMode === "map" ? bgFrames[0].width : 0);
        const mh = layerImg && CONFIG.layerMode === "map" ? layerH : (bgFrames[0] && bgMode === "map" ? bgFrames[0].height : 0);
        if (mw && (w.w !== mw || w.h !== mh))
          console.warn(`Ukuran peta server (${w.w}x${w.h}) beda dengan gambar (${mw}x${mh}). Game memakai ukuran gambar. Atur WORLD_WIDTH/WORLD_HEIGHT di server = ukuran gambar (atau update server.js lalu jalankan ulang).`);
        if (!mw) { CONFIG.worldWidth = w.w; CONFIG.worldHeight = w.h; }   // ada gambar peta: ukuran gambar yang dipakai, bukan ukuran dari server
        else { CONFIG.worldWidth = mw; CONFIG.worldHeight = mh; }
        player.x = Math.max(0, Math.min(CONFIG.worldWidth, player.x));
        player.y = Math.max(0, Math.min(CONFIG.worldHeight, player.y));
      }
      remotePlayers.clear();
      if (Array.isArray(msg.players)) msg.players.forEach(addRemote);
      if (typeof Npc !== "undefined") Npc.netWelcome(msg.npcs);      // NPC dari server (sama untuk semua pemain)
      if (typeof Kupu !== "undefined") Kupu.netWelcome(msg.kupu);    // kupu-kupu dari server
      netReady = true;
      netNote = "";
      reconnectDelay = 1000;
      lastSent = null;
      if (document.hidden) netSend({ t: "vis", v: 0 });
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
          r.tx = e[1]; r.ty = e[2]; r.left = !!e[3]; r.moving = !!e[4]; r.lying = !!e[5];
        }
      }
      break;
    case "chat": {
      const r = remotePlayers.get(msg.id);
      if (r && typeof msg.text === "string") {
        r.chat = { text: msg.text.slice(0, CONFIG.chatMaxLength), time: performance.now() };
        if (typeof Suara !== "undefined") {           // pemain lain: suara makin pelan kalau makin jauh; tinggi suara tetap per pemain
          let h = 0; for (const c of String(msg.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
          Suara.talk(r.x, r.y, r.chat.text, 0.8 + (h % 9) * 0.1);
        }
      }
      break;
    }
    case "npc": case "npcsay": if (typeof Npc !== "undefined") Npc.net(msg); break;
    case "kp": case "kc": case "km": case "kz": if (typeof Kupu !== "undefined") Kupu.net(msg); break;
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
// ---------- Layer rintangan (collision dari PNG) ----------
let layerImg = null;        // gambar layer
let layerMask = null;       // Uint8Array: 1 = terisi (tabrakan), 0 = bolong
let layerW = 0, layerH = 0;

function buildLayerMask(img) {
  layerImg = img; layerW = img.width; layerH = img.height;
  try {
    const band = 256;                                 // dibaca per potongan supaya hemat memori (layer besar)
    const c = document.createElement("canvas");
    c.width = layerW; c.height = Math.min(band, layerH);
    const g = c.getContext("2d", { willReadFrequently: true });
    const mask = new Uint8Array(layerW * layerH);
    let solid = 0;
    for (let y0 = 0; y0 < layerH; y0 += band) {
      const hh = Math.min(band, layerH - y0);
      g.clearRect(0, 0, layerW, c.height);
      g.drawImage(img, 0, y0, layerW, hh, 0, 0, layerW, hh);
      const d = g.getImageData(0, 0, layerW, hh).data;
      for (let i = 0, n = layerW * hh; i < n; i++) {
        const v = d[i * 4 + 3] > CONFIG.layerAlphaMin ? 1 : 0;
        mask[y0 * layerW + i] = v; solid += v;
      }
    }
    layerMask = mask;
    console.info(`Layer dimuat: ${layerW}x${layerH}, ${(solid / mask.length * 100).toFixed(1)}% terisi (tabrakan aktif)`);
    if (solid === 0) console.warn("Layer tidak punya bagian terisi (semuanya transparan), jadi tidak ada tabrakan.");
  } catch (e) {
    layerMask = null;       // biasanya karena game dibuka langsung dari file (bukan lewat server)
    console.warn("Layer tidak bisa dipakai untuk tabrakan (buka game lewat server/localhost):", e.message || e);
  }
}

function layerSolidAt(x, y) {       // titik dunia (x, y) menabrak bagian terisi?
  if (!layerMask) return false;
  let u, v;
  if (CONFIG.layerMode === "map") {
    u = Math.floor(x); v = Math.floor(y);
    if (u < 0 || v < 0 || u >= layerW || v >= layerH) return false;
  } else if (CONFIG.layerMode === "stretch") {
    u = Math.floor(x / CONFIG.worldWidth * layerW);
    v = Math.floor(y / CONFIG.worldHeight * layerH);
    if (u < 0 || v < 0 || u >= layerW || v >= layerH) return false;
  } else {
    u = ((Math.floor(x) % layerW) + layerW) % layerW;
    v = ((Math.floor(y) % layerH) + layerH) % layerH;
  }
  return layerMask[v * layerW + u] === 1;
}

// kotak tabrak ada di kaki karakter; (px, py) = titik tengah karakter
function hitBox(px, py) {
  const hw = CONFIG.layerHitWidth / 2, hh = CONFIG.layerHitHeight;
  const bottom = py + CONFIG.playerHeight / 2 - CONFIG.layerHitBottom;
  return { l: px - hw, r: px + hw, t: bottom - hh, b: bottom };
}
function blockedAt(px, py) {
  if (!layerMask) return false;
  const bx = hitBox(px, py), step = 8;
  for (let y = bx.t; ; y += step) {
    const yy = Math.min(y, bx.b);
    for (let x = bx.l; ; x += step) {
      const xx = Math.min(x, bx.r);
      if (layerSolidAt(xx, yy)) return true;
      if (xx >= bx.r) break;
    }
    if (yy >= bx.b) break;
  }
  return false;
}
// gerakkan pemain; berhenti/menyusur kalau menabrak bagian terisi pada layer
function moveWithCollision(mx, my) {
  if (!layerMask) { player.x += mx; player.y += my; return; }
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 4));
  const sx = mx / n, sy = my / n;
  const halfW = CONFIG.playerWidth / 2, halfH = CONFIG.playerHeight / 2;
  for (let i = 0; i < n; i++) {
    const stuck = blockedAt(player.x, player.y);     // sudah terjebak di dalam rintangan: boleh keluar bebas
    const nx = Math.max(halfW, Math.min(CONFIG.worldWidth - halfW, player.x + sx));
    if (stuck || !blockedAt(nx, player.y)) player.x = nx;
    const ny = Math.max(halfH, Math.min(CONFIG.worldHeight - halfH, player.y + sy));
    if (stuck || !blockedAt(player.x, ny)) player.y = ny;
  }
}

// kalau titik muncul tepat di dalam tembok, geser ke tempat kosong terdekat (spiral)
function placeOnFreeSpot() {
  if (!layerMask || !blockedAt(player.x, player.y)) return;
  const ox = player.x, oy = player.y;
  for (let r = 16; r <= 1200; r += 16) {
    for (let a = 0; a < 360; a += 15) {
      const x = ox + Math.cos(a * Math.PI / 180) * r, y = oy + Math.sin(a * Math.PI / 180) * r;
      if (x < 48 || y < 48 || x > CONFIG.worldWidth - 48 || y > CONFIG.worldHeight - 48) continue;
      if (!blockedAt(x, y)) { player.x = x; player.y = y; return; }
    }
  }
}

function update(dt) {
  let dx = 0, dy = 0;
  if (keys.ArrowLeft || keys.KeyA || touch.left) dx -= 1;
  if (keys.ArrowRight || keys.KeyD || touch.right) dx += 1;
  if (keys.ArrowUp || keys.KeyW || touch.up) dy -= 1;
  if (keys.ArrowDown || keys.KeyS || touch.down) dy += 1;
  if (typeof Kupu !== "undefined" && Kupu.frozen) { dx = 0; dy = 0; }   // sedang mengayun jaring: diam

  if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  if (dx < 0) player.facingLeft = true;
  if (dx > 0) player.facingLeft = false;

  if ((dx !== 0 || dy !== 0) && player.lying) { player.lying = false; animTime = 0;
    const lb = document.getElementById("btnLie"); if (lb) lb.classList.remove("lieOn"); }   // jalan = bangun
  const wasMoving = player.moving;
  player.moving = (dx !== 0 || dy !== 0);
  if (player.moving !== wasMoving) animTime = 0;   // ganti dari diam ke jalan (atau sebaliknya): animasi mulai dari awal
  animTime += dt;

  const oldX = player.x, oldY = player.y;
  moveWithCollision(dx * CONFIG.speed * dt, dy * CONFIG.speed * dt);

  const halfW = CONFIG.playerWidth / 2, halfH = CONFIG.playerHeight / 2;
  player.x = Math.max(halfW, Math.min(CONFIG.worldWidth - halfW, player.x));
  player.y = Math.max(halfH, Math.min(CONFIG.worldHeight - halfH, player.y));

  // suara langkah: loop selama benar-benar berpindah, berhenti saat diam
  const moved = player.x !== oldX || player.y !== oldY;
  setStepSound(moved);

  // kirim posisi ke server (hanya jika berubah, dan tidak lebih sering dari sendInterval)
  sendTimer += dt * 1000;
  if (netReady) {
    const st = { x: Math.round(player.x), y: Math.round(player.y), l: player.facingLeft ? 1 : 0, m: player.moving ? 1 : 0, z: player.lying ? 1 : 0 };
    const changed = !lastSent || st.x !== lastSent.x || st.y !== lastSent.y || st.l !== lastSent.l || st.m !== lastSent.m || st.z !== lastSent.z;
    if (changed && sendTimer >= CONFIG.sendInterval) {
      netSend({ t: "move", x: st.x, y: st.y, l: st.l, m: st.m, z: st.z });
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
    if (r.lying !== r.wasLying) { r.animTime = 0; r.wasLying = r.lying; }
    r.animTime += dt;
  }

}

// ---------- Gambar ----------
function currentBg() {
  return bgFrames[0] || null;
}
function drawOnce(img, camX, camY, viewW, viewH) {   // satu file menutupi peta; gambar hanya bagian yang terlihat
  const sx = Math.max(0, Math.floor(camX)), sy = Math.max(0, Math.floor(camY));
  const sw = Math.min(img.width - sx, Math.ceil(viewW) + 2), sh = Math.min(img.height - sy, Math.ceil(viewH) + 2);
  if (sw > 0 && sh > 0) ctx.drawImage(img, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);
}
function drawLayer(camX, camY, viewW, viewH) {
  if (CONFIG.layerMode === "map") drawOnce(layerImg, camX, camY, viewW, viewH);
  else drawTiled(layerImg, camX, camY, viewW, viewH, CONFIG.layerMode);
}
let overlayImg = null;       // layer atas (di atas karakter, tanpa tabrakan)
let animLayerFrames = [];    // layer animasi (dekorasi bergerak, tanpa tabrakan)
// Tombol "Animasi" di menu Setting: hidupkan / matikan layer animasi (pilihan diingat)
const ANIM_KEY = "gamePertamaAnimLayer";
let animLayerOn = true;
try { if (localStorage.getItem(ANIM_KEY) === "0") animLayerOn = false; } catch (e) {}
(function () {
  const menu = document.getElementById("settingsMenu");
  if (!menu) return;
  const btn = document.createElement("button");
  btn.id = "btnAnimLayer";
  btn.title = "Layer animasi (air, rumput, dll.)";
  btn.innerHTML = '<span>🌊</span><span class="tx"> Animasi</span>';
  menu.insertBefore(btn, document.getElementById("btnName") || null);
  const refresh = () => btn.classList.toggle("off", !animLayerOn);
  btn.addEventListener("click", () => {
    animLayerOn = !animLayerOn;
    try { localStorage.setItem(ANIM_KEY, animLayerOn ? "1" : "0"); } catch (e) {}
    refresh();
  });
  refresh();
})();
function drawAnimLayer(camX, camY, viewW, viewH) {
  const n = animLayerFrames.length;
  if (!n || !animLayerOn) return;
  const img = animLayerFrames[Math.floor(performance.now() / 1000 * CONFIG.animLayerFps) % n];
  if (img.tiles) {                                  // layer sudah dipotong jadi kotak kecil: gambar yang terlihat saja
    const cx = Math.round(camX), cy = Math.round(camY);
    for (const t of img.tiles) {
      const w = t.c.width, h = t.c.height;
      if (t.x + w < cx || t.x > cx + viewW || t.y + h < cy || t.y > cy + viewH) continue;
      ctx.drawImage(t.c, t.x - cx, t.y - cy);
    }
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camX, -camY, CONFIG.worldWidth, CONFIG.worldHeight);
  ctx.clip();
  if (CONFIG.animLayerMode === "map") drawOnce(img, camX, camY, viewW, viewH);
  else drawTiled(img, camX, camY, viewW, viewH, CONFIG.animLayerMode);
  ctx.restore();
}
// Memotong gambar besar jadi kotak 256x256 dan hanya menyimpan kotak yang ada isinya.
// Hasilnya jauh lebih ringan di memori/GPU, dan pergantian frame tidak membuat game tersendat.
async function tileFrame(img) {
  const T = 256, W = img.width, H = img.height;
  const band = document.createElement("canvas");
  band.width = W; band.height = T;
  const g = band.getContext("2d", { willReadFrequently: true });
  const tiles = [];
  for (let y0 = 0; y0 < H; y0 += T) {
    const hh = Math.min(T, H - y0);
    g.clearRect(0, 0, W, T);
    g.drawImage(img, 0, y0, W, hh, 0, 0, W, hh);
    const d = g.getImageData(0, 0, W, hh).data;
    for (let x0 = 0; x0 < W; x0 += T) {
      const ww = Math.min(T, W - x0);
      let any = false;
      for (let yy = 0; yy < hh && !any; yy++) {
        let i = (yy * W + x0) * 4 + 3;
        for (let xx = 0; xx < ww; xx++, i += 4) if (d[i]) { any = true; break; }
      }
      if (!any) continue;
      const c = document.createElement("canvas");
      c.width = ww; c.height = hh;
      c.getContext("2d").drawImage(band, x0, 0, ww, hh, 0, 0, ww, hh);
      tiles.push({ x: x0, y: y0, c });
    }
    await new Promise(r => setTimeout(r));
  }
  return { width: W, height: H, tiles };
}
async function loadAnimLayer() {
  const jobs = [];
  for (let n = 1; n <= CONFIG.animLayerFrameCount; n++) jobs.push(loadImage(`${CONFIG.animLayerPrefix}${n}.png`, true));
  const all = await Promise.all(jobs);
  if (all.every(Boolean)) {
    if (CONFIG.animLayerMode !== "map") return all;
    try {
      const out = [];
      for (const img of all) out.push(await tileFrame(img));
      console.info("Layer animasi dipotong: " + out.map(f => f.tiles.length + " kotak").join(", "));
      return out;
    } catch (e) {
      console.warn("Gagal memotong layer animasi, pakai gambar utuh:", e.message || e);
      return all;
    }
  }
  if (all.some(Boolean))
    console.warn(`Layer animasi tidak dipakai: harus lengkap ${CONFIG.animLayerPrefix}1.png sampai ${CONFIG.animLayerPrefix}${CONFIG.animLayerFrameCount}.png.`);
  return [];
}
function drawOverlay(camX, camY, viewW, viewH) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camX, -camY, CONFIG.worldWidth, CONFIG.worldHeight);
  ctx.clip();
  if (CONFIG.overlayMode === "map") drawOnce(overlayImg, camX, camY, viewW, viewH);
  else drawTiled(overlayImg, camX, camY, viewW, viewH, CONFIG.overlayMode);
  ctx.restore();
}
function drawTiled(img, camX, camY, viewW, viewH, mode) {
  if ((mode || bgMode) === "stretch") {
    ctx.drawImage(img, -camX, -camY, CONFIG.worldWidth, CONFIG.worldHeight);
    return;
  }
  const w = img.width, h = img.height;
  const startX = -((camX % w) + w) % w;
  const startY = -((camY % h) + h) % h;
  for (let x = startX; x < viewW; x += w)
    for (let y = startY; y < viewH; y += h)
      ctx.drawImage(img, Math.floor(x), Math.floor(y), w, h);
}
function drawBackground(camX, camY, viewW, viewH) {
  const bgImg = currentBg();
  if (!bgImg) { ctx.fillStyle = "#5a8f55"; ctx.fillRect(0, 0, viewW, viewH); }
  else {
    ctx.fillStyle = CONFIG.backgroundColor;      // warna dasar: terlihat di bagian gambar yang transparan
    ctx.fillRect(0, 0, viewW, viewH);
    if (bgMode === "map") drawOnce(bgImg, camX, camY, viewW, viewH);
    else drawTiled(bgImg, camX, camY, viewW, viewH);
  }
  const animPos = CONFIG.animLayerPosition;
  if (animLayerFrames.length && animPos === "belakang") drawAnimLayer(camX, camY, viewW, viewH);   // animasi di bawah layer.png
  if (layerImg) drawLayer(camX, camY, viewW, viewH);   // layer rintangan di atas latar
  if (animLayerFrames.length && animPos === "tengah") drawAnimLayer(camX, camY, viewW, viewH);     // animasi di atas layer.png, di bawah karakter
}

function drawSprite(c, px, py) {
  const w = CONFIG.playerWidth, h = CONFIG.playerHeight;
  const set = c.frames, n = set.walk.length;
  if (!n) { ctx.fillStyle = "#e33"; ctx.fillRect(px - w / 2, py - h / 2, w, h); return; }
  let frame;
  if (c.lying && set.lie && set.lie.length) frame = set.lie[Math.floor(c.animTime * CONFIG.lieFps) % set.lie.length];
  else if (c.moving) frame = set.walk[Math.floor(c.animTime * CONFIG.animationFps) % n];
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
                  moving: player.moving, lying: player.lying, animTime, name: playerName, chat: chatMessage }];
  for (const r of remotePlayers.values()) list.push(r);
  if (typeof Npc !== "undefined") Npc.addToDrawList(list);  // NPC ikut diurutkan & digambar
  if (typeof Kupu !== "undefined") Kupu.addToDrawList(list);   // kupu-kupu & animasi menangkap
  list.sort((a, b) => a.y - b.y);

  const margin = 120, visible = [];
  for (const c of list) {
    const px = c.x - camX, py = c.y - camY;
    if (px < -margin || px > viewW + margin || py < -margin || py > viewH + margin) continue;
    if (c.customDraw) c.customDraw(px, py); else drawSprite(c, px, py);
    visible.push({ c, px, py });
  }
  if (CONFIG.layerDebug) {                                                        // kotak tabrak (uji layer)
    const bx = hitBox(player.x, player.y);
    ctx.strokeStyle = "red"; ctx.lineWidth = 2;
    ctx.strokeRect(bx.l - camX, bx.t - camY, bx.r - bx.l, bx.b - bx.t);
  }
  if (animLayerFrames.length && CONFIG.animLayerPosition === "atas") drawAnimLayer(camX, camY, viewW, viewH);   // layer animasi (di atas karakter)
  if (overlayImg) drawOverlay(camX, camY, viewW, viewH);                          // layer atas: di atas karakter, tanpa tabrakan
  if (animLayerFrames.length && CONFIG.animLayerPosition === "teratas") drawAnimLayer(camX, camY, viewW, viewH);   // layer animasi (di atas layer-atas.png)
  for (const v of visible) drawNameTag(v.px, v.py, v.c.name);                     // nama di atas semua karakter
  for (const v of visible) drawChatBubble(v.px, v.py, viewW, v.c.name, v.c.chat); // lalu gelembung chat
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  if (typeof Npc !== "undefined") Npc.update(dt);          // NPC (npc.js)
  if (typeof Kupu !== "undefined") Kupu.update(dt);        // kupu-kupu (kupu.js)
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
  const img = await loadImage(CONFIG.backgroundImage, true);
  return img ? [img] : [];
}

Promise.all([loadAllBodies(), loadBackgrounds(), loadImage(CONFIG.layerImage, true), loadImage(CONFIG.overlayImage, true), loadAnimLayer()]).then(([, bgs, layer, overlay, animFrames]) => {
  bgFrames = bgs;
  animLayerFrames = animFrames || [];
  if (animLayerFrames.length) {
    console.info(`Layer animasi dimuat: ${animLayerFrames.length} frame, ${animLayerFrames[0].width}x${animLayerFrames[0].height}`);
    const a = animLayerFrames[0];
    if (layer && CONFIG.layerMode === "map" && CONFIG.animLayerMode === "map" && (a.width !== layer.width || a.height !== layer.height))
      console.warn(`Ukuran layer animasi (${a.width}x${a.height}) beda dengan layer (${layer.width}x${layer.height}). Samakan semuanya supaya posisinya pas.`);
    if (animLayerFrames.some(f => f.width !== a.width || f.height !== a.height))
      console.warn("Frame layer animasi tidak sama ukurannya. Samakan semua frame.");
  }
  overlayImg = overlay || null;
  if (overlay) {
    console.info(`Layer atas dimuat: ${overlay.width}x${overlay.height} (di atas karakter, tanpa tabrakan)`);
    if (layer && CONFIG.layerMode === "map" && CONFIG.overlayMode === "map" && (overlay.width !== layer.width || overlay.height !== layer.height))
      console.warn(`Ukuran layer atas (${overlay.width}x${overlay.height}) beda dengan layer (${layer.width}x${layer.height}). Samakan keduanya supaya posisinya pas.`);
  } else console.info("Layer atas tidak ada (" + CONFIG.overlayImage + "), dilewati.");
  // ukuran peta otomatis: dari layer (mode "map"), kalau tidak ada dari latar (mode "map")
  let mapSize = null;
  const bg0 = bgFrames[0];
  bgMode = CONFIG.backgroundMode;
  if (bgMode === "auto") {                                // latar sebesar peta/layer -> satu file penuh, selain itu diulang
    const refW = layer && CONFIG.layerMode === "map" ? layer.width : CONFIG.worldWidth;
    const refH = layer && CONFIG.layerMode === "map" ? layer.height : CONFIG.worldHeight;
    bgMode = bg0 && bg0.width >= refW && bg0.height >= refH ? "map" : "tile";
  }
  if (bg0) console.info(`Latar: ${bg0.width}x${bg0.height}, mode "${bgMode}"`);
  if (bg0 && bgMode === "map") mapSize = { w: bg0.width, h: bg0.height };
  if (layer && CONFIG.layerMode === "map") {
    if (mapSize && (mapSize.w !== layer.width || mapSize.h !== layer.height))
      console.warn(`Ukuran latar (${mapSize.w}x${mapSize.h}) beda dengan layer (${layer.width}x${layer.height}). Samakan keduanya; ukuran layer yang dipakai.`);
    mapSize = { w: layer.width, h: layer.height };
  }
  if (mapSize) {                                          // peta = ukuran gambar; muncul di sekitar tengah
    CONFIG.worldWidth = mapSize.w; CONFIG.worldHeight = mapSize.h;
    player.x = CONFIG.worldWidth / 2 + (Math.random() * 400 - 200);
    player.y = CONFIG.worldHeight / 2 + (Math.random() * 400 - 200);
  }
  if (layer) {
    buildLayerMask(layer);
    placeOnFreeSpot();
  }
  else console.warn("File layer tidak ditemukan: " + CONFIG.layerImage + " (nama harus persis, huruf besar/kecil berpengaruh)");
  if (!bgFrames.length) console.warn("Gambar latar tidak ditemukan (assets/background.png)");
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
