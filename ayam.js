// ===================== AYAM (tantangan kejar ayam) =====================
// Ayam muncul acak di peta. Kalau pemain terlalu dekat, ayam kabur.
// Tangkap ayam -> KARAKTER pemain memainkan animasi kemenangan (ayam langsung hilang).
// Dimuat SETELAH game.js (lihat index.html). Semua pengaturan ada di AYAM di bawah.
//
// Gambar yang dipakai:
//   assets/ayam/1.png, 2.png, 3.png   3 frame animasi lari ayam
//   assets/body/<karakter>/menang1.png, menang2.png, ... (OPSIONAL, sampai 12 frame)
//                                     animasi kemenangan khusus karakter itu (ukuran kanvas sama
//                                     dengan frame jalan). Kalau hanya ada menang.png, dipakai 1 frame.
//                                     Kalau tidak ada sama sekali, karakter melompat-lompat gembira
//                                     memakai gambar karakter itu sendiri (animasi otomatis).
// Catatan: saat ONLINE, ayam dihitung di SERVER (server/server.js) dan semua pemain melihat
// ayam yang sama; browser hanya menampilkan dan menghaluskan gerakannya.
// Saat OFFLINE (tanpa server), ayam dihitung di browser seperti semula.
const AYAM = {
  count: null,              // jumlah ayam. null = otomatis menurut luas peta
  areaPerChicken: 750000,   // mode otomatis: 1 ayam per sekian piksel persegi (peta 3000x3000 = 12 ayam)
  minCount: 3,              // batas bawah jumlah (mode otomatis)
  maxCount: 40,             // batas atas jumlah (mode otomatis)

  size: 64,                 // ukuran ayam di layar (piksel)
  speedDiff: 100,             // kecepatan kabur = CONFIG.speed - speedDiff (piksel per detik)
  fleeDistance: 180,        // jarak pemain -> ayam mulai kabur (piksel)
  calmDistance: 260,        // lebih jauh dari ini ayam berhenti kabur dan santai lagi
  catchDistance: 44,        // jarak tangkap (piksel)
  spawnMinDistance: 500,    // ayam baru tidak muncul lebih dekat dari ini ke pemain

  wanderSpeed: 35,          // kecepatan jalan santai (piksel per detik)
  fleeFps: 14,              // kecepatan animasi saat kabur
  wanderFps: 6,             // kecepatan animasi saat jalan santai

  winPause: 1.2,            // lama animasi kemenangan karakter; pemain diam selama itu (detik)
  winFps: 8,                // kecepatan animasi menang kalau pakai menang1.png, menang2.png, ...
  winHops: 2,               // animasi otomatis: jumlah lompatan gembira
  winHopHeight: 26,         // animasi otomatis: tinggi lompatan (piksel)
  maxWinFrames: 12,         // batas jumlah frame menangN.png yang dicari

  // ---- Suara (ikut tombol 🔊 Efek; file di assets/audio/) ----
  clusFiles: ["assets/audio/ayam1.wav", "assets/audio/ayam2.wav"],   // suara ayam biasa (dipilih acak)
  catchSoundFile: "assets/audio/ayam_tangkap.wav",   // ayam kaget saat tertangkap
  winSoundFile: "assets/audio/menang.wav",           // fanfare kemenangan
  clusVolume: 0.5,          // volume suara ayam (0 - 1)
  catchVolume: 0.7,         // volume ayam tertangkap
  winVolume: 0.6,           // volume fanfare menang
  hearDistance: 600,        // ayam lebih jauh dari ini tidak terdengar (piksel); makin dekat makin keras
  clusMinGap: 4,            // jarak waktu kluk santai minimal per ayam (detik)
  clusMaxGap: 10,           // jarak waktu kluk santai maksimal per ayam (detik)
  clusGlobalGap: 0.35,      // jeda minimal antar suara ayam, supaya tidak ramai bertumpuk (detik)
  showOnMinimap: true,      // tampilkan titik ayam di peta mini
  frameCount: 3             // jumlah frame lari (1.png sampai 3.png)
};

const Ayam = (function () {
  const list = [];                 // ayam yang sedang ada
  let frames = [];                 // 3 frame lari
  const winAnim = Object.create(null);   // id karakter -> daftar frame menang (array, kosong = animasi otomatis)
  let ready = false;
  let caught = 0;                  // jumlah ayam yang sudah ditangkap
  let winTimer = 0;                // sisa jeda (detik)
  let winLeft = false;             // arah hadap saat menang
  let worldW = 0, worldH = 0;      // ukuran peta saat ayam dibuat
  let serverMode = false;          // true = ayam diatur server (online)

  // ---- HUD skor ----
  const scoreEl = document.createElement("div");
  scoreEl.id = "ayamScore";
  const info = document.getElementById("info");
  if (info) info.appendChild(scoreEl);
  function showScore() { scoreEl.textContent = "🐔 Ayam ditangkap: " + caught; }
  showScore();

  // ---- Memuat gambar ----
  function loadImg(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { console.warn("Gagal memuat:", src); resolve(null); };
      img.src = src;
    });
  }
  Promise.all(Array.from({ length: AYAM.frameCount }, (_, i) => loadImg(`assets/ayam/${i + 1}.png`)))
    .then(f => {
      frames = f.every(Boolean) ? f : [];   // kalau gambar tidak lengkap, ayam digambar bentuk sederhana
      ready = true;
    });

  // animasi kemenangan khusus karakter (opsional), dimuat sekali per karakter.
  // Mencari menang1.png, menang2.png, ... sampai ada yang tidak ketemu; kalau tidak ada, coba menang.png.
  function winFramesFor(id) {
    if (!(id in winAnim)) {
      const out = winAnim[id] = [];
      (async () => {
        const got = [];
        for (let n = 1; n <= AYAM.maxWinFrames; n++) {
          const img = await loadQuiet(`assets/body/${id}/menang${n}.png`);
          if (!img) break;
          got.push(img);
        }
        if (!got.length) { const one = await loadQuiet(`assets/body/${id}/menang.png`); if (one) got.push(one); }
        out.push(...got);
      })();
    }
    return winAnim[id];
  }
  function loadQuiet(src) {            // seperti loadImg, tapi tanpa peringatan kalau file tidak ada
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // ---- Suara ----
  const sfxCache = Object.create(null);     // file -> kumpulan Audio (supaya bisa bunyi bertumpuk)
  function sfxPlay(file, volume, rate) {
    // memakai pengaturan suara dari game.js: tombol Efek & browser sudah boleh bunyi
    if (typeof audioPrefs === "undefined" || !audioPrefs.sfx || !audioStarted) return;
    if (volume <= 0.01) return;
    const pool = sfxCache[file] || (sfxCache[file] = []);
    let a = pool.find(x => x.paused || x.ended);
    if (!a) {
      if (pool.length >= 4) return;
      a = new Audio(file);
      a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false;
      pool.push(a);
    }
    a.volume = Math.max(0, Math.min(1, volume));
    a.playbackRate = rate || 1;
    a.currentTime = 0;
    a.play().catch(() => {});
  }
  let clusGlobalTimer = 0;                  // sisa jeda antar suara ayam
  function cluck(c, big) {                  // suara kluk, makin dekat makin keras
    if (clusGlobalTimer > 0) return;
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    const v = AYAM.clusVolume * (1 - d / AYAM.hearDistance);
    if (v <= 0.02) return;
    const f = AYAM.clusFiles[Math.floor(Math.random() * AYAM.clusFiles.length)];
    sfxPlay(f, v * (big ? 1.2 : 1), 0.9 + Math.random() * 0.35);
    clusGlobalTimer = AYAM.clusGlobalGap;
  }
  function preloadSounds() {
    [...AYAM.clusFiles, AYAM.catchSoundFile, AYAM.winSoundFile].forEach(f => {
      const a = new Audio(f); a.preload = "auto"; sfxCache[f] = [a];
    });
  }
  preloadSounds();

  // ---- Bantu ----
  function chickenCount() {
    if (AYAM.count != null) return Math.max(0, Math.floor(AYAM.count));
    const n = Math.round((CONFIG.worldWidth * CONFIG.worldHeight) / AYAM.areaPerChicken);
    return Math.max(AYAM.minCount, Math.min(AYAM.maxCount, n));
  }
  function fleeSpeed() { return Math.max(0, CONFIG.speed - AYAM.speedDiff); }

  function newWander(c) {
    if (Math.random() < 0.4) { c.moving = false; c.dx = c.dy = 0; }
    else {
      const a = Math.random() * Math.PI * 2;
      c.dx = Math.cos(a); c.dy = Math.sin(a); c.moving = true;
      if (c.dx !== 0) c.left = c.dx < 0;
    }
    c.timer = 1 + Math.random() * 2.5;
  }

  function spawnOne() {
    const half = AYAM.size / 2;
    const w = CONFIG.worldWidth, h = CONFIG.worldHeight;
    let x = 0, y = 0;
    for (let i = 0; i < 40; i++) {
      x = half + Math.random() * Math.max(0, w - AYAM.size);
      y = half + Math.random() * Math.max(0, h - AYAM.size);
      if (Math.hypot(x - player.x, y - player.y) >= AYAM.spawnMinDistance) break;
    }
    const c = {
      x, y, dx: 0, dy: 0, left: Math.random() < 0.5, moving: false,
      fleeing: false, timer: 0, animTime: Math.random() * 3,
      clusTimer: AYAM.clusMinGap + Math.random() * (AYAM.clusMaxGap - AYAM.clusMinGap),
      customDraw(px, py) { drawChicken(this, px, py); }
    };
    newWander(c);
    list.push(c);
  }

  function respawnAll() {
    list.length = 0;
    worldW = CONFIG.worldWidth; worldH = CONFIG.worldHeight;
    const n = chickenCount();
    for (let i = 0; i < n; i++) spawnOne();
  }

  // ---- Mode online: data ayam dari server ----
  // bentuk data dari server: [id, x, y, kiri(0/1), bergerak(0/1), kabur(0/1)]
  function fromServer(e) {
    return {
      id: e[0], x: e[1], y: e[2], tx: e[1], ty: e[2],
      left: !!e[3], moving: !!e[4], fleeing: !!e[5], animTime: Math.random() * 3,
      clusTimer: AYAM.clusMinGap + Math.random() * (AYAM.clusMaxGap - AYAM.clusMinGap),
      customDraw(px, py) { drawChicken(this, px, py); }
    };
  }
  function validEntry(e) {
    return Array.isArray(e) && e.length >= 5 && Number.isFinite(e[0]) && Number.isFinite(e[1]) && Number.isFinite(e[2]);
  }
  function setFromServer(arr) {            // dipanggil saat welcome
    if (!Array.isArray(arr)) return;
    serverMode = true;
    caught = 0; showScore();               // skor baru dimulai dari 0 di server
    list.length = 0;
    arr.filter(validEntry).forEach(e => list.push(fromServer(e)));
  }
  function applyServer(arr) {              // dipanggil tiap pesan "ck"
    if (!serverMode || !Array.isArray(arr)) return;
    for (const e of arr) {
      if (!validEntry(e)) continue;
      const c = list.find(x => x.id === e[0]);
      if (!c) { list.push(fromServer(e)); continue; }
      c.tx = e[1]; c.ty = e[2]; c.left = !!e[3]; c.moving = !!e[4];
      if (!c.fleeing && e[5]) cluck(c, true);          // baru kaget melihat pemain
      c.fleeing = !!e[5];
    }
  }
  function onCaught(msg, myId) {           // server memberi tahu ada ayam tertangkap
    if (!serverMode) return;
    const i = list.findIndex(c => c.id === msg.id);
    if (i >= 0) list.splice(i, 1);
    if (validEntry(msg.n)) list.push(fromServer(msg.n));
    if (msg.by === myId) {                 // aku yang menangkap
      caught = Number.isFinite(msg.score) ? msg.score : caught + 1;   // skor resmi dari server
      showScore();
      winTimer = AYAM.winPause;
      sfxPlay(AYAM.catchSoundFile, AYAM.catchVolume, 1);
      sfxPlay(AYAM.winSoundFile, AYAM.winVolume, 1);
      clusGlobalTimer = 0.6;
      winLeft = player.facingLeft;
    }
  }
  function leaveServer() {                 // koneksi putus: kembali ke ayam lokal
    if (!serverMode) return;
    serverMode = false;
    list.length = 0;
    worldW = 0;                            // memicu respawnAll() di update()
  }
  function updateOnline(dt) {
    if (winTimer > 0) winTimer = Math.max(0, winTimer - dt);
    if (clusGlobalTimer > 0) clusGlobalTimer -= dt;
    const a = 1 - Math.exp(-12 * dt);      // haluskan gerakan antar kiriman server
    for (const c of list) {
      if (Math.abs(c.tx - c.x) > 300 || Math.abs(c.ty - c.y) > 300) { c.x = c.tx; c.y = c.ty; }
      else { c.x += (c.tx - c.x) * a; c.y += (c.ty - c.y) * a; }
      c.animTime += dt;
      if (!c.fleeing) {                    // sesekali berkokok santai
        c.clusTimer -= dt;
        if (c.clusTimer <= 0) {
          cluck(c, false);
          c.clusTimer = AYAM.clusMinGap + Math.random() * (AYAM.clusMaxGap - AYAM.clusMinGap);
        }
      }
    }
  }

  // ---- Update ----
  function updateChicken(c, dt) {
    const half = AYAM.size / 2;
    const dxp = c.x - player.x, dyp = c.y - player.y;
    const dist = Math.hypot(dxp, dyp);

    // mulai kabur kalau terlalu dekat; berhenti kalau sudah cukup jauh
    if (dist < AYAM.fleeDistance) {
      if (!c.fleeing) cluck(c, true);            // baru kaget melihat pemain: kluk keras
      c.fleeing = true;
    } else if (dist > AYAM.calmDistance) { if (c.fleeing) { c.fleeing = false; newWander(c); } }

    let vx = 0, vy = 0, speed = 0;
    if (c.fleeing) {
      if (dist > 0.001) { vx = dxp / dist; vy = dyp / dist; }
      else { const a = Math.random() * Math.PI * 2; vx = Math.cos(a); vy = Math.sin(a); }
      speed = fleeSpeed();
      c.moving = true;
    } else {
      c.timer -= dt;
      if (c.timer <= 0) newWander(c);
      c.clusTimer -= dt;                         // sesekali berkokok santai
      if (c.clusTimer <= 0) {
        cluck(c, false);
        c.clusTimer = AYAM.clusMinGap + Math.random() * (AYAM.clusMaxGap - AYAM.clusMinGap);
      }
      vx = c.dx; vy = c.dy; speed = AYAM.wanderSpeed;
    }

    const ox = c.x, oy = c.y;
    // tiap sumbu dibatasi sendiri: ayam yang menabrak dinding "menyusur" dinding (jadi melambat),
    // dan ayam yang terpojok di sudut tidak bisa lari lagi.
    c.x = Math.max(half, Math.min(CONFIG.worldWidth - half, c.x + vx * speed * dt));
    c.y = Math.max(half, Math.min(CONFIG.worldHeight - half, c.y + vy * speed * dt));
    if (!c.fleeing && c.moving && c.x === ox && c.y === oy) newWander(c);   // buntu saat santai: ganti arah
    if (vx !== 0 && c.x !== ox) c.left = vx < 0;
    c.animTime += dt;
  }

  function update(dt) {
    if (!ready) return;
    if (serverMode) { updateOnline(dt); return; }   // online: server yang mengatur ayam & tangkapan
    if (worldW !== CONFIG.worldWidth || worldH !== CONFIG.worldHeight) respawnAll();   // ukuran peta berubah (dari server)

    if (winTimer > 0) winTimer = Math.max(0, winTimer - dt);
    if (clusGlobalTimer > 0) clusGlobalTimer -= dt;

    for (const c of list) updateChicken(c, dt);

    // tangkap ayam (tidak bisa saat masih jeda)
    if (winTimer <= 0) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (Math.hypot(c.x - player.x, c.y - player.y) <= AYAM.catchDistance) {
          list.splice(i, 1);
          caught++;
          showScore();
          winTimer = AYAM.winPause;
          sfxPlay(AYAM.catchSoundFile, AYAM.catchVolume, 1);   // ayam kaget
          sfxPlay(AYAM.winSoundFile, AYAM.winVolume, 1);        // fanfare menang
          clusGlobalTimer = 0.6;
          winLeft = player.facingLeft;
          spawnOne();               // ayam baru muncul di tempat lain supaya jumlahnya tetap
          break;
        }
      }
    }
  }

  // ---- Gambar ----
  function drawChicken(c, px, py) {
    const s = AYAM.size;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";            // bayangan
    ctx.beginPath();
    ctx.ellipse(px, py + s * 0.38, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(px, py);
    if (c.left) ctx.scale(-1, 1);                   // gambar ayam menghadap kanan
    if (frames.length) {
      const fps = c.fleeing ? AYAM.fleeFps : AYAM.wanderFps;
      const f = c.moving ? frames[Math.floor(c.animTime * fps) % frames.length] : frames[0];
      ctx.drawImage(f, -s / 2, -s / 2, s, s);
    } else {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function sparkle(x, y, r) {                       // bintang kecil 4 sudut
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y - r * 0.3);
    ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.3, y + r * 0.3);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y + r * 0.3);
    ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r * 0.3);
    ctx.closePath(); ctx.fill();
  }

  // Animasi kemenangan KARAKTER pemain (ayam sudah hilang).
  // - Ada menang1.png, menang2.png, ... di folder karakter -> frame itu diputar.
  // - Kalau tidak ada -> karakter melompat gembira (naik-turun, memanjang/memipih, bergoyang).
  function drawWin(px, py) {
    const w = CONFIG.playerWidth, h = CONFIG.playerHeight;
    const t = Math.min(1, Math.max(0, 1 - winTimer / AYAM.winPause));   // 0 -> 1 selama animasi
    const own = winFramesFor(outfit.body.id);
    const flip = CONFIG.spriteFacesRight ? winLeft : !winLeft;

    ctx.save();
    ctx.translate(px, py);

    if (own.length) {                                  // animasi buatan sendiri
      const f = own[Math.min(own.length - 1, Math.floor(t * AYAM.winFps * AYAM.winPause)) % own.length];
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(f, -w / 2, -h / 2, w, h);
      ctx.restore();
      return;
    }

    // animasi otomatis dari gambar karakter itu sendiri
    const body = composed.idle[0] || composed.walk[Math.min(CONFIG.idleFrame, composed.walk.length - 1)];
    const phase = t * AYAM.winHops * Math.PI;
    const hop = Math.abs(Math.sin(phase));             // 0 = di tanah, 1 = puncak lompatan
    const air = hop;
    const land = hop < 0.2 ? 1 - hop / 0.2 : 0;        // 1 tepat saat mendarat
    const sx = 1 + 0.12 * land - 0.08 * air;           // memipih saat mendarat
    const sy = 1 - 0.12 * land + 0.10 * air;           // memanjang saat melompat
    const tilt = Math.sin(phase * 2) * 0.12 * (flip ? -1 : 1);             // goyang kiri-kanan

    ctx.fillStyle = "rgba(0,0,0,0.18)";                // bayangan mengecil saat melompat
    ctx.beginPath();
    ctx.ellipse(0, h * 0.5 - 4, w * 0.32 * (1 - 0.35 * air), 5 * (1 - 0.35 * air), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, h / 2 - AYAM.winHopHeight * hop);  // pusat putar di kaki
    ctx.rotate(tilt);
    ctx.scale(flip ? -sx : sx, sy);
    if (body) ctx.drawImage(body, -w / 2, -h, w, h);
    ctx.restore();

    // kilauan bintang di sekitar karakter
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = "#ffd93d";
    const pulse = 0.6 + 0.4 * Math.sin(t * 20);
    sparkle(-w * 0.55, -h * 0.35 - AYAM.winHopHeight * hop, 6 * pulse);
    sparkle(w * 0.6, -h * 0.55 - AYAM.winHopHeight * hop, 8 * (1.2 - pulse * 0.4));
    sparkle(-w * 0.2, -h * 0.75 - AYAM.winHopHeight * hop, 5 * pulse);
    ctx.restore();
  }

  // Dipakai game.js: tambahkan ayam ke daftar gambar & ganti gambar pemain saat menang.
  function addToDrawList(drawList) {
    if (winTimer > 0 && drawList.length) drawList[0].customDraw = (px, py) => drawWin(px, py);
    for (const c of list) drawList.push(c);
  }

  return {
    update, addToDrawList, list,
    setFromServer, applyServer, onCaught, leaveServer,
    get frozen() { return winTimer > 0; },
    get caught() { return caught; },
    get showOnMinimap() { return AYAM.showOnMinimap; }
  };
})();
