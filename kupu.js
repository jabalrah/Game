// ===================== KUPU-KUPU (game menangkap kupu-kupu) =====================
// Cara main:
//   - Kupu-kupu terbang melayang di seluruh peta (mereka bisa terbang di atas rintangan).
//   - Kalau kamu BERJALAN mendekat, kupu-kupu bisa kaget lalu terbang menjauh.
//     Kupu-kupu langka lebih mudah kaget dan terbang lebih cepat.
//   - Kalau kamu BERDIRI DIAM, kupu-kupu tidak kaget. Dekati, berhenti, lalu tangkap!
//   - Tangkap: tombol SHIFT (di HP: tombol 🦋). Karakter mengayun jaring ke depan;
//     kupu-kupu yang berada di area jaring saat ayunan mengenai sasaran akan tertangkap.
// Gambar:
//   assets/kupu/<jenis>/1.png, 2.png, 3.png      3 frame kepakan sayap (menghadap KANAN)
//   assets/body/<karakter>/tangkap1.png, tangkap2.png   (OPSIONAL) animasi menangkap
//       khusus karakter itu. Kalau tidak ada, jaring digambar otomatis di atas karakter.
// Online: kupu-kupu dihitung di SERVER (server/dunia.js) sehingga semua pemain melihat kupu-kupu
//   yang sama, dan yang menangkap lebih dulu yang mendapatkannya. Jumlah tangkapan tetap
//   disimpan di browser masing-masing. Pengaturan gerak/jenis di sini harus sama dengan server/dunia.js.
// Offline (CONFIG.serverUrl kosong): kupu-kupu dihitung di browser seperti dulu.
// Dimuat SETELAH game.js (lihat index.html). Semua pengaturan ada di KUPU_CONFIG.
const KUPU_CONFIG = {
  count: 32,                // jumlah kupu-kupu di peta (selalu dijaga segini)
  size: 56,                 // ukuran kupu-kupu di layar (piksel)
  kawasan: 5,               // jumlah "taman": kupu-kupu berkumpul di sekitar titik-titik ini, bukan menyebar rata
  kawasanRadius: 420,       // seberapa jauh kupu-kupu melayang dari pusat tamannya (piksel)
  showOnMinimap: true,      // tampilkan titik kupu-kupu di peta mini
  folder: "assets/kupu/",   // folder induk gambar kupu-kupu
  frameCount: 3,            // jumlah frame kepakan per jenis
  flapFps: 9,               // kecepatan kepakan sayap saat terbang santai
  spawnMinDistance: 200,    // kupu-kupu baru tidak muncul lebih dekat dari ini ke pemain (piksel)
  respawnDelay: 3,          // detik sebelum kupu-kupu pengganti muncul setelah tertangkap

  // ---- Jenis kupu-kupu ----
  // bobot  = peluang muncul (makin besar makin sering)
  // speed  = kecepatan terbang santai, fleeSpeed = kecepatan saat kaget (piksel/detik)
  // shy    = jarak (piksel) di mana kupu-kupu bisa kaget kalau pemain berjalan
  // startle= seberapa gampang kaget (kali per detik); 0 = tidak pernah kaget
  // alt    = tinggi terbang di atas tanah (piksel)
  jenis: [
    { id: "oranye", nama: "Kupu Oranye", bobot: 60, speed: 45, fleeSpeed: 110, shy: 140, startle: 0.9, alt: 34, warna: "#ff9a3c" },
    { id: "biru",   nama: "Kupu Biru",   bobot: 30, speed: 55, fleeSpeed: 140, shy: 170, startle: 1.6, alt: 42, warna: "#4aa3ff" },
    { id: "emas",   nama: "Kupu Emas",   bobot: 10, speed: 70, fleeSpeed: 170, shy: 210, startle: 2.6, alt: 50, warna: "#ffd23c", langka: true }
  ],

  // ---- Jaring & menangkap ----
  netReach: 46,             // pusat jaring ada sekian piksel di depan pemain
  netRadius: 62,            // kupu-kupu dalam jarak ini dari pusat jaring tertangkap (piksel)
  // Kecepatan animasi: berapa detik tiap frame ditampilkan. Makin kecil makin cepat.
  //   [frame 1, frame 2]  contoh [0.25, 0.25] = 0.25 dtk frame 1, lalu 0.25 dtk frame 2.
  //   Total = jumlah semuanya; pemain diam selama itu.
  catchFrameTimes: [0.1, 0.1],
  catchHitFrame: 2,         // jaring mengenai sasaran saat frame ini mulai tampil (2 = saat ayunan ke depan)
  catchCooldown: 0.25,      // jeda sebelum boleh mengayun lagi (detik)
  catchFrameCount: 2,       // jumlah frame tangkap1.png ... tangkapN.png
  keys: ["ShiftLeft", "ShiftRight"],  // tombol keyboard untuk menangkap (Shift kiri / kanan)

  showScore: true           // tampilkan jumlah tangkapan di kiri atas
};

const Kupu = (function () {
  const C = KUPU_CONFIG;
  const SAVE_KEY = "gamePertamaKupu";
  const list = [];                         // kupu-kupu yang sedang terbang
  const kinds = {};                        // id jenis -> { cfg, frames }
  const patches = [];                      // pusat "taman" tempat kupu-kupu berkumpul
  const pending = [];                      // detik tersisa untuk kupu-kupu pengganti
  const popups = [];                       // teks & kilauan setelah menangkap
  const catchSets = Object.create(null);   // id karakter -> frame tangkap (array) atau null
  const WING_SEQ = [0, 1, 2, 1];           // urutan kepakan (naik-turun)
  let ready = false;
  let spawnW = 0, spawnH = 0;
  // mode: "local" = dihitung di browser; "server" = dari server (online); "wait" = menunggu tersambung
  let mode = (CONFIG.serverUrl) ? "wait" : "local";
  let serverKinds = [];                    // daftar id jenis dari server (urutan = nomor jenis di data server)
  const byId = new Map();                  // id kupu-kupu dari server -> objeknya
  let catching = null;                     // { t, hit, left } saat sedang mengayun
  let cooldown = 0;
  let counts = {};
  try { counts = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch (e) { counts = {}; }

  const rand = (a, b) => a + Math.random() * (b - a);
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(counts)); } catch (e) {} }
  function total() { return C.jenis.reduce((s, j) => s + (counts[j.id] || 0), 0); }

  // ---- HUD jumlah tangkapan ----
  const scoreEl = document.createElement("div");
  scoreEl.id = "kupuScore";
  const info = document.getElementById("info");
  if (info && C.showScore) info.appendChild(scoreEl);
  function showScore() {
    const parts = C.jenis.map(j => (j.langka ? "✨" : "•") + " " + j.nama.replace("Kupu ", "") + " " + (counts[j.id] || 0));
    scoreEl.textContent = "🦋 Kupu-kupu: " + total() + "  (" + parts.join("  ") + ")";
  }
  showScore();

  // ---- Memuat gambar ----
  function loadImg(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  (async function () {
    for (const j of C.jenis) {
      const imgs = await Promise.all(Array.from({ length: C.frameCount }, (_, i) => loadImg(C.folder + j.id + "/" + (i + 1) + ".png")));
      if (imgs.every(Boolean)) kinds[j.id] = { cfg: j, frames: imgs };
      else console.warn("Kupu: gambar jenis '" + j.id + "' tidak lengkap (" + C.folder + j.id + "/1.png sampai " + C.frameCount + ".png), jenis ini dilewati.");
    }
    ready = true;
    if (!Object.keys(kinds).length) console.warn("Kupu: tidak ada gambar yang termuat, jadi tidak ada kupu-kupu. Pastikan folder assets/kupu/ ikut terunggah.");
  })();

  // Animasi menangkap per karakter (opsional): assets/body/<id>/tangkap1.png ...
  function catchFramesFor(id) {
    if (!id) return null;
    if (!(id in catchSets)) {
      catchSets[id] = null;
      Promise.all(Array.from({ length: C.catchFrameCount }, (_, i) => loadImg("assets/body/" + id + "/tangkap" + (i + 1) + ".png")))
        .then(all => { catchSets[id] = all.every(Boolean) ? all : null; });
    }
    return catchSets[id];
  }
  const myBodyId = () => (typeof outfit !== "undefined" && outfit && outfit.body) ? outfit.body.id : null;

  // ---- Memunculkan kupu-kupu ----
  function pickKind() {
    const ok = C.jenis.filter(j => kinds[j.id]);
    if (!ok.length) return null;
    let r = Math.random() * ok.reduce((s, j) => s + j.bobot, 0);
    for (const j of ok) { r -= j.bobot; if (r <= 0) return j; }
    return ok[0];
  }
  function spawnOne() {
    const k = pickKind();
    if (!k) return;
    const half = C.size / 2;
    let x = 0, y = 0, home = patches[0];
    for (let i = 0; i < 40; i++) {
      home = patches[Math.floor(Math.random() * patches.length)];
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * C.kawasanRadius;   // sebaran merata di dalam taman
      x = Math.max(half, Math.min(CONFIG.worldWidth - half, home.x + Math.cos(a) * r));
      y = Math.max(half, Math.min(CONFIG.worldHeight - half, home.y + Math.sin(a) * r));
      if (Math.hypot(x - player.x, y - player.y) >= C.spawnMinDistance) break;
    }
    list.push({
      kind: k, x, y, home, heading: Math.random() * Math.PI * 2, turn: 0, startled: 0,
      t: Math.random() * 10, phase: Math.random() * 6.28, left: Math.random() < 0.5,
      customDraw(px, py) { drawButterfly(this, px, py); }
    });
  }
  function respawnAll() {
    list.length = 0; pending.length = 0; patches.length = 0;
    spawnW = CONFIG.worldWidth; spawnH = CONFIG.worldHeight;
    const m = C.kawasanRadius * 0.6;
    // taman pertama selalu dekat pemain supaya kupu-kupu langsung terlihat di awal permainan
    const a0 = Math.random() * Math.PI * 2, d0 = rand(350, 650);
    patches.push({ x: Math.max(m, Math.min(CONFIG.worldWidth - m, player.x + Math.cos(a0) * d0)),
                   y: Math.max(m, Math.min(CONFIG.worldHeight - m, player.y + Math.sin(a0) * d0)) });
    for (let i = 1; i < C.kawasan; i++)
      patches.push({ x: rand(m, Math.max(m + 1, CONFIG.worldWidth - m)), y: rand(m, Math.max(m + 1, CONFIG.worldHeight - m)) });
    for (let i = 0; i < C.count; i++) spawnOne();
    console.info("Kupu: " + list.length + " kupu-kupu muncul di " + patches.length + " taman.");
  }

  // ---- Gerak kupu-kupu ----
  function updateButterfly(b, dt) {
    const k = b.kind;
    b.t += dt;
    const d = Math.hypot(player.x - b.x, player.y - b.y);
    if (b.startled > 0) b.startled -= dt;
    // pemain berjalan mendekat -> bisa kaget; kalau pemain diam, kupu-kupu tenang
    if (b.startled <= 0 && player.moving && d < k.shy && Math.random() < k.startle * dt) {
      b.startled = rand(0.8, 1.3);
      b.heading = Math.atan2(b.y - player.y, b.x - player.x) + rand(-0.6, 0.6);
      b.turn = 0;
    }
    let speed;
    if (b.startled > 0) speed = k.fleeSpeed;
    else {
      b.turn += (Math.random() - 0.5) * dt * 9;                 // melayang tak beraturan
      b.turn = Math.max(-1.8, Math.min(1.8, b.turn)) * (1 - 0.7 * dt);
      b.heading += b.turn * dt;
      speed = k.speed * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(b.t * 1.3 + b.phase)));   // kadang melambat
      if (b.home && Math.hypot(b.home.x - b.x, b.home.y - b.y) > C.kawasanRadius) {     // terlalu jauh dari taman: melayang pulang
        const want = Math.atan2(b.home.y - b.y, b.home.x - b.x);
        let diff = want - b.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        b.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      }
    }
    const dx = Math.cos(b.heading), dy = Math.sin(b.heading);
    b.x += dx * speed * dt; b.y += dy * speed * dt;
    const m = C.size / 2;
    if (b.x < m || b.x > CONFIG.worldWidth - m || b.y < m || b.y > CONFIG.worldHeight - m) {   // tepi peta: putar balik
      b.x = Math.max(m, Math.min(CONFIG.worldWidth - m, b.x));
      b.y = Math.max(m, Math.min(CONFIG.worldHeight - m, b.y));
      b.heading = Math.atan2(CONFIG.worldHeight / 2 - b.y, CONFIG.worldWidth / 2 - b.x) + rand(-0.8, 0.8);
      b.startled = 0;
    }
    if (Math.abs(dx) > 0.2) b.left = dx < 0;
  }

  // ---- Pengaturan waktu animasi menangkap (dari catchFrameTimes) ----
  function frameTime(i) {
    const a = C.catchFrameTimes;
    return Math.max(0.01, a[Math.min(i, a.length - 1)]);
  }
  function catchTotal() { let t = 0; for (let i = 0; i < C.catchFrameCount; i++) t += frameTime(i); return t; }
  function catchHitTime() { let t = 0; for (let i = 0; i < Math.min(C.catchHitFrame, C.catchFrameCount) - 1; i++) t += frameTime(i); return t; }
  function catchFrameAt(t) {
    let acc = 0;
    for (let i = 0; i < C.catchFrameCount; i++) { acc += frameTime(i); if (t < acc) return i; }
    return C.catchFrameCount - 1;
  }

  // ---- Menangkap ----
  function tryCatch() {
    if (!ready || catching || cooldown > 0) return;
    if (typeof nameMenuOpen !== "undefined" && nameMenuOpen) return;
    if (player.lying && typeof setLying === "function") setLying(false);
    catching = { t: 0, hit: false, left: player.facingLeft };
    catchFramesFor(myBodyId());
  }
  function netCenter(left) {
    return { x: player.x + (left ? -1 : 1) * C.netReach, y: player.y + 10 };
  }
  function resolveHit() {
    const n = netCenter(catching.left);
    if (mode === "server") {                              // online: server yang memutuskan hasilnya (lihat net())
      netSend({ t: "net", x: Math.round(n.x), y: Math.round(n.y) });
      return;
    }
    let best = null, bd = C.netRadius;
    for (const b of list) {
      const d = Math.hypot(b.x - n.x, b.y - n.y);
      if (d <= bd) { bd = d; best = b; }
    }
    const spot = { x: n.x, y: n.y };
    if (best) {
      list.splice(list.indexOf(best), 1);
      counts[best.kind.id] = (counts[best.kind.id] || 0) + 1;
      save(); showScore();
      if (typeof Suara !== "undefined") Suara.catchSuccess(!!best.kind.langka);   // suara berhasil menangkap (suara.js)
      pending.push(C.respawnDelay);
      popups.push({ born: performance.now(), px: player.x, py: player.y, sx: best.x, sy: best.y - best.kind.alt,
                    text: "🦋 " + best.kind.nama + (best.kind.langka ? " (langka!)" : " +1"), color: best.kind.langka ? "#ffd23c" : "#ffffff", spark: true });
    } else {
      popups.push({ born: performance.now(), px: player.x, py: player.y, text: "Meleset…", color: "#d0d0d0", spark: false });
    }
  }

  function update(dt) {
    if (!ready) return;
    if (mode === "local" && (!list.length && !pending.length || spawnW !== CONFIG.worldWidth || spawnH !== CONFIG.worldHeight)) respawnAll();
    catchFramesFor(myBodyId());
    if (cooldown > 0) cooldown -= dt;
    if (catching) {
      catching.t += dt;
      if (!catching.hit && catching.t >= catchHitTime()) { catching.hit = true; resolveHit(); }
      if (catching.t >= catchTotal()) { catching = null; cooldown = C.catchCooldown; }
    }
    if (mode === "server") {
      const a = 1 - Math.exp(-CONFIG.remoteSmoothing * dt);
      for (const b of list) {
        b.t += dt;
        if (Math.abs(b.tx - b.x) > 400 || Math.abs(b.ty - b.y) > 400) { b.x = b.tx; b.y = b.ty; }
        else { b.x += (b.tx - b.x) * a; b.y += (b.ty - b.y) * a; }
      }
    } else if (mode === "local") for (const b of list) updateButterfly(b, dt);
    for (let i = pending.length - 1; i >= 0; i--) {
      pending[i] -= dt;
      if (pending[i] <= 0) { pending.splice(i, 1); spawnOne(); }
    }
    if (typeof remotePlayers !== "undefined") {            // animasi menangkap pemain lain
      for (const r of remotePlayers.values()) {
        if (!r.catching) continue;
        r.catching.t += dt;
        if (r.catching.t >= catchTotal()) { r.catching = null; r.customDraw = null; }
      }
    }
    const now = performance.now();
    for (let i = popups.length - 1; i >= 0; i--) if (now - popups[i].born > 1800) popups.splice(i, 1);
  }
  // mulai animasi menangkap pemain lain; mulai dari frame saat jaring mengenai sasaran (server baru memberi tahu di saat itu)
  function startRemoteCatch(r, left) {
    if (!r) return;
    const id = r.outfit && r.outfit.body && r.outfit.body.id;
    catchFramesFor(id);
    r.catching = { t: catchHitTime(), left: left === undefined ? !!r.left : !!left };
  }

  // ---- Menggambar ----
  function drawButterfly(b, px, py) {
    const k = b.kind, frames = kinds[k.id].frames;
    const fps = C.flapFps * (b.startled > 0 ? 1.7 : 1);
    const frame = frames[WING_SEQ[Math.floor(b.t * fps) % WING_SEQ.length] % frames.length];
    const alt = k.alt + Math.sin(b.t * 2.1 + b.phase) * 8;             // naik-turun saat terbang
    const s = C.size;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0," + (0.2 - Math.min(0.1, alt / 700)) + ")";   // bayangan di tanah
    ctx.beginPath();
    ctx.ellipse(px, py + 2, 9 - alt / 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(px, py - alt);
    if (b.left) ctx.scale(-1, 1);
    ctx.rotate(Math.sin(b.t * 3 + b.phase) * 0.12);
    ctx.drawImage(frame, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  // jaring otomatis (dipakai kalau karakter belum punya tangkap1-4.png); koordinat ruang 128x128
  const NET = { pivot: [78, 72], len: 26, r: 10, angles: [-100, 15] };
  function drawNetOverlay(i) {
    const a = NET.angles[Math.min(i, NET.angles.length - 1)] * Math.PI / 180;
    const [px, py] = NET.pivot;
    const tx = px + Math.cos(a) * NET.len, ty = py + Math.sin(a) * NET.len;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#8b5e34"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
    const cx = tx + Math.cos(a) * NET.r * 0.8, cy = ty + Math.sin(a) * NET.r * 0.8;
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.strokeStyle = "#3c3c46"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, NET.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  function drawCatcher(px, py) { drawCatchAnim(catching, myBodyId(), composed, px, py); }
  // gambar animasi menangkap: dipakai untuk pemain sendiri dan pemain lain (ct = { t, left })
  function drawCatchAnim(ct, bodyId, frames, px, py) {
    const w = CONFIG.playerWidth, h = CONFIG.playerHeight;
    const i = catchFrameAt(ct.t);
    const set = catchSets[bodyId];
    const flip = CONFIG.spriteFacesRight ? ct.left : !ct.left;
    if (set) {                                           // animasi buatan sendiri: tangkap1-2.png
      ctx.save(); ctx.translate(px, py);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(set[i], -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {                                             // otomatis: karakter diam + jaring
      drawSprite({ frames, left: ct.left, moving: false, lying: false, animTime: 0 }, px, py);
      ctx.save(); ctx.translate(px, py);
      if (flip) ctx.scale(-1, 1);
      ctx.scale(w / 128, h / 128); ctx.translate(-64, -64);
      drawNetOverlay(i);
      ctx.restore();
    }
  }
  function drawPopup(p, px, py) {                        // px, py = posisi pemain saat menangkap (di layar)
    const age = (performance.now() - p.born) / 1000;
    const a = Math.max(0, Math.min(1, (1.8 - age) / 0.6));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ty = py - CONFIG.playerHeight / 2 - 34 - age * 26;
    const tw = ctx.measureText(p.text).width + 16;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - tw / 2, ty - 12, tw, 24, 12) : ctx.rect(px - tw / 2, ty - 12, tw, 24); ctx.fill();
    ctx.fillStyle = p.color; ctx.fillText(p.text, px, ty + 1);
    if (p.spark && age < 0.7) {                          // kilauan di tempat kupu-kupu tertangkap
      const sx = px + (p.sx - p.px), sy = py + (p.sy - p.py);
      ctx.fillStyle = "#fff3a0";
      for (let k = 0; k < 6; k++) {
        const ang = k * 1.047 + age * 3, r = 6 + age * 38;
        ctx.globalAlpha = a * (1 - age / 0.7);
        ctx.beginPath(); ctx.arc(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r, 3 - age * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function addToDrawList(drawList) {
    if (catching && drawList.length) drawList[0].customDraw = (px, py) => drawCatcher(px, py);
    if (typeof remotePlayers !== "undefined") {            // pemain lain yang sedang mengayun jaring
      for (const r of remotePlayers.values()) {
        const ct = r.catching;
        if (ct && r.frames) r.customDraw = (px, py) => drawCatchAnim(ct, r.outfit && r.outfit.body && r.outfit.body.id, r.frames, px, py);
        else if (r.customDraw) r.customDraw = null;
      }
    }
    for (const b of list) drawList.push(b);
    for (const p of popups) drawList.push({ x: p.px, y: p.py + 90, customDraw: (px, py) => drawPopup(p, px, py - 90) });
  }

  // ---- Mode online: data kupu-kupu dari server ----
  // Server hanya mengirim kupu-kupu yang DEKAT layar kita (10x/detik, pesan "kp"). Posisi semua kupu-kupu
  // untuk peta mini datang terpisah 2x/detik (pesan "kz"): [jenis, x, y] per kupu.
  let farDots = null;
  function setFarDots(rows, xi, yi, ki) {
    const out = [];
    for (const e of rows) {
      if (!Array.isArray(e) || !Number.isFinite(e[xi]) || !Number.isFinite(e[yi])) continue;
      const k = kinds[serverKinds[e[ki]]];
      out.push({ x: e[xi], y: e[yi], c: (k && k.cfg.warna) || "#fff" });
    }
    farDots = out;
  }
  function minimapDots() {                     // [{x, y, c}] untuk peta mini
    if (mode === "server" && farDots) return farDots;
    return list.map(b => ({ x: b.x, y: b.y, c: b.kind.warna || "#fff" }));
  }
  function netWelcome(data) {
    list.length = 0; byId.clear(); pending.length = 0; farDots = null;
    if (!data || !Array.isArray(data.kinds) || !Array.isArray(data.list)) { mode = "local"; spawnW = 0; return; }   // server lama
    mode = "server";
    serverKinds = data.kinds.map(String);
    setFarDots(data.list, 2, 3, 1);            // baris welcome: [id, jenis, x, y, kiri, kaget]
    netList(data.list);
  }
  function netLost() {
    list.length = 0; byId.clear(); pending.length = 0; spawnW = 0; farDots = null;
    mode = CONFIG.serverUrl ? "wait" : "local";
  }
  function netList(rows) {                    // daftar LENGKAP: [id, jenis, x, y, kiri, kaget]
    if (!ready || !Array.isArray(rows)) return;
    const seen = new Set();
    for (const e of rows) {
      if (!Array.isArray(e) || !Number.isFinite(e[2]) || !Number.isFinite(e[3])) continue;
      const k = kinds[serverKinds[e[1]]];
      if (!k) continue;
      seen.add(e[0]);
      let b = byId.get(e[0]);
      if (!b) {
        b = { id: e[0], kind: k.cfg, x: e[2], y: e[3], tx: e[2], ty: e[3], heading: 0, turn: 0, startled: 0,
              t: Math.random() * 10, phase: Math.random() * 6.28, left: !!e[4],
              customDraw(px, py) { drawButterfly(this, px, py); } };
        byId.set(e[0], b); list.push(b);
      }
      b.tx = e[2]; b.ty = e[3]; b.left = !!e[4]; b.startled = e[5] ? 1 : 0;
    }
    for (let i = list.length - 1; i >= 0; i--) {   // yang tidak ada di daftar = sudah tertangkap
      if (!seen.has(list[i].id)) { byId.delete(list[i].id); list.splice(i, 1); }
    }
  }
  function net(msg) {
    if (mode !== "server") return;
    if (msg.t === "kp") netList(msg.k);
    else if (msg.t === "kz") { if (Array.isArray(msg.z)) setFarDots(msg.z, 1, 2, 0); }
    else if (msg.t === "ks") {                // pemain lain mengayun jaring
      startRemoteCatch(typeof remotePlayers !== "undefined" ? remotePlayers.get(msg.id) : null, !!msg.l);
    } else if (msg.t === "km") {                // jaring saya meleset
      popups.push({ born: performance.now(), px: player.x, py: player.y, text: "Meleset…", color: "#d0d0d0", spark: false });
    } else if (msg.t === "kc") {              // seseorang menangkap kupu-kupu
      const b = byId.get(msg.id);
      if (b) { byId.delete(msg.id); const i = list.indexOf(b); if (i >= 0) list.splice(i, 1); }
      const k = kinds[msg.k] && kinds[msg.k].cfg;
      if (!k) return;
      if (msg.by !== myId) {                  // pemain lain yang dapat: tampilkan animasi (jika belum) dan notifikasi poinnya
        const r = typeof remotePlayers !== "undefined" ? remotePlayers.get(msg.by) : null;
        if (!r) return;
        if (!r.catching) startRemoteCatch(r);   // cadangan untuk server lama yang belum mengirim "ks"
        popups.push({ born: performance.now(), px: r.x, py: r.y, sx: msg.x, sy: msg.y - k.alt,
                      text: "🦋 " + r.name + " +1 " + k.nama + (k.langka ? " (langka!)" : ""), color: k.langka ? "#ffd23c" : "#bfe6ff", spark: true });
        return;
      }
      counts[k.id] = (counts[k.id] || 0) + 1;
      save(); showScore();
      if (typeof Suara !== "undefined") Suara.catchSuccess(!!k.langka);
      popups.push({ born: performance.now(), px: player.x, py: player.y, sx: msg.x, sy: msg.y - k.alt,
                    text: "🦋 " + k.nama + (k.langka ? " (langka!)" : " +1"), color: k.langka ? "#ffd23c" : "#ffffff", spark: true });
    }
  }

  // ---- Kontrol: tombol keyboard & tombol layar ----
  window.addEventListener("keydown", e => {
    if (!C.keys.includes(e.code) || e.repeat) return;
    if (typeof isTyping === "function" && isTyping(e)) return;
    if (typeof nameMenuOpen !== "undefined" && nameMenuOpen) return;
    e.preventDefault();
    tryCatch();
  });
  const btn = document.createElement("button");
  btn.id = "btnCatch"; btn.type = "button"; btn.title = "Tangkap kupu-kupu (Shift)"; btn.textContent = "🦋";
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  Object.assign(btn.style, {
    position: "fixed", right: "calc(14px + env(safe-area-inset-right, 0px))",
    bottom: coarse ? "calc(86px + env(safe-area-inset-bottom, 0px))" : "calc(14px + env(safe-area-inset-bottom, 0px))",
    width: "60px", height: "60px", border: "0", borderRadius: "50%", background: "#f59e0b", color: "#fff",
    fontSize: "28px", boxShadow: "0 4px 14px rgba(0,0,0,.45)", zIndex: "5", touchAction: "manipulation", cursor: "pointer"
  });
  btn.addEventListener("pointerdown", e => { e.preventDefault(); tryCatch(); });
  document.body.appendChild(btn);

  return {
    update, addToDrawList, list, tryCatch, netWelcome, netLost, net,
    get showOnMinimap() { return C.showOnMinimap; },
    get minimapDots() { return minimapDots(); },
    get frozen() { return !!catching; },
    get total() { return total(); },
    get counts() { return counts; }
  };
})();
