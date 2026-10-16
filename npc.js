// ===================== NPC (warga yang berjalan keliling peta) =====================
// - NPC muncul acak di peta dan terus berjalan acak; mereka menghindari rintangan layer.png.
// - Kalau pemain mendekat, NPC berhenti, menghadap pemain, lalu berkomentar (gelembung chat).
// - Setelah talkSeconds detik: kalau pemain sudah menjauh -> NPC jalan lagi;
//   kalau pemain masih dekat -> NPC berkomentar lagi (kalimat lain), begitu seterusnya.
// Gambar: tiap karakter punya folder sendiri berisi 5 frame animasi jalan, contoh:
//   assets/npc/biru/1.png ... 5.png,  assets/npc/petani/1.png ... 5.png, dst.
// (ukuran bebas, menghadap KANAN kalau CONFIG.spriteFacesRight = true).
// Daftar karakter ada di NPC_CONFIG.variants; tiap NPC memakai salah satunya, dibagi merata.
// Untuk menambah karakter baru: buat folder baru berisi 1.png-5.png lalu tambahkan namanya di variants.
// Isi komentar ada di npc-komentar.js.
// Online: NPC dihitung di SERVER (server/dunia.js) sehingga semua pemain melihat NPC, posisi, dan
//   komentar yang sama. Browser hanya menggambar & menghaluskan gerakan. Pengaturan gerak NPC
//   (speed, talkDistance, dst) harus sama dengan yang di server/dunia.js.
// Offline (CONFIG.serverUrl kosong): NPC dihitung di browser seperti dulu.
// Dimuat SETELAH game.js dan npc-komentar.js (lihat index.html).
const NPC_CONFIG = {
  count: 10,               // jumlah NPC
  size: 96,                // ukuran NPC di layar (piksel)
  folder: "assets/npc/",   // folder induk gambar NPC
  variants: ["biru", "petani", "nenek", "anak"],   // nama folder tiap karakter (assets/npc/<nama>/1.png ...)
  frameCount: 5,           // jumlah frame animasi per karakter
  fps: 8,                  // kecepatan animasi jalan
  idleFrame: 1,            // frame yang dipakai saat NPC diam (1 = frame pertama)
  speed: 60,               // kecepatan jalan (piksel per detik)
  walkMin: 2, walkMax: 6,  // lama berjalan lurus sebelum ganti arah acak (detik)
  lookAhead: 28,           // NPC mulai membelok kalau ada rintangan sejauh ini di depannya (piksel)
  talkDistance: 170,       // pemain lebih dekat dari ini -> NPC berhenti & berkomentar (piksel)
  talkSeconds: 5,          // jeda antar komentar; setelah itu cek: pemain masih dekat? (detik)
  spawnMinDistance: 400,   // NPC tidak muncul lebih dekat dari ini ke pemain (piksel)
  showName: true,          // tampilkan nama di atas kepala (dari NPC_NAMA)

  // ---- Suara (lihat suara.js untuk volume) ----
  stepInterval: 0.32,      // jarak waktu antar bunyi langkah saat berjalan (detik)
  suaraPitch: { biru: 1.0, petani: 0.72, nenek: 1.3, anak: 1.7 }   // tinggi suara gumaman tiap karakter (1 = normal)
};

const Npc = (function () {
  const list = [];
  // mode: "local"  = dihitung di browser (tanpa server)
  //       "server" = dari server (online)   "wait" = menunggu tersambung ke server
  let mode = (CONFIG.serverUrl) ? "wait" : "local";
  let variants = [];       // tiap karakter: daftar frame gambarnya
  let variantNames = [];   // nama karakter (sejajar dengan variants)
  let ready = false;
  let spawnW = 0, spawnH = 0;

  // ---- Memuat frame semua karakter ----
  function loadVariant(name) {
    const jobs = [];
    for (let n = 1; n <= NPC_CONFIG.frameCount; n++) {
      jobs.push(new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = NPC_CONFIG.folder + name + "/" + n + ".png";
      }));
    }
    return Promise.all(jobs).then(all => {
      if (all.every(Boolean)) return all;
      console.warn("NPC: gambar karakter '" + name + "' tidak lengkap (" + NPC_CONFIG.folder + name + "/1.png sampai " + NPC_CONFIG.frameCount + ".png), dilewati.");
      return null;
    });
  }
  (async function () {
    const all = await Promise.all(NPC_CONFIG.variants.map(loadVariant));
    variants = []; variantNames = [];
    all.forEach((v, i) => { if (v) { variants.push(v); variantNames.push(NPC_CONFIG.variants[i]); } });
    if (!variants.length) console.warn("NPC: tidak ada gambar karakter yang bisa dimuat. NPC memakai gambar pengganti.");
    ready = true;
  })();

  const rand = (a, b) => a + Math.random() * (b - a);
  const comments = () => (typeof NPC_KOMENTAR !== "undefined" && NPC_KOMENTAR.length) ? NPC_KOMENTAR : ["Halo!"];

  // Tabrakan memakai blockedAt() milik game (kotak di kaki). Disesuaikan kalau ukuran NPC beda dengan pemain.
  function blocked(x, y) {
    return typeof blockedAt === "function" && blockedAt(x, y + (CONFIG.playerHeight - NPC_CONFIG.size) / 2);
  }
  function outOfBounds(x, y) {
    const h = NPC_CONFIG.size / 2;
    return x < h || y < h || x > CONFIG.worldWidth - h || y > CONFIG.worldHeight - h;
  }

  function spawnOne() {
    const h = NPC_CONFIG.size / 2;
    let x = 0, y = 0;
    for (let i = 0; i < 80; i++) {
      x = h + Math.random() * Math.max(1, CONFIG.worldWidth - NPC_CONFIG.size);
      y = h + Math.random() * Math.max(1, CONFIG.worldHeight - NPC_CONFIG.size);
      if (!blocked(x, y) && Math.hypot(x - player.x, y - player.y) >= NPC_CONFIG.spawnMinDistance) break;
    }
    const vIdx = variants.length ? list.length % variants.length : 0;     // karakter dibagi merata
    const names = (typeof NPC_NAMA !== "undefined" && NPC_NAMA.length) ? NPC_NAMA : null;
    const n = {
      x, y, left: Math.random() < 0.5, moving: true, state: "walk",
      v: vIdx, pitch: NPC_CONFIG.suaraPitch[variantNames[vIdx]] || 1, stepTimer: Math.random() * NPC_CONFIG.stepInterval,
      heading: 0, walkTimer: 0, talkTimer: 0, animTime: Math.random() * 3,
      chat: null, lastComment: -1,
      name: NPC_CONFIG.showName && names ? names[Math.floor(Math.random() * names.length)] : "",
      customDraw(px, py) { draw(this, px, py); }
    };
    newHeading(n);
    list.push(n);
  }

  function respawnAll() {
    list.length = 0;
    spawnW = CONFIG.worldWidth; spawnH = CONFIG.worldHeight;
    for (let i = 0; i < NPC_CONFIG.count; i++) spawnOne();
  }

  function newHeading(n) {
    n.heading = Math.random() * Math.PI * 2;
    n.walkTimer = rand(NPC_CONFIG.walkMin, NPC_CONFIG.walkMax);
  }

  // Cek rintangan di depan; kalau ada, belok ke arah pertama yang kosong.
  function steer(n) {
    const la = NPC_CONFIG.lookAhead;
    const clear = a => {
      const x = n.x + Math.cos(a) * la, y = n.y + Math.sin(a) * la;
      return !outOfBounds(x, y) && !blocked(x, y);
    };
    if (clear(n.heading)) return;
    const sign = Math.random() < 0.5 ? 1 : -1;
    for (const off of [0.6, 1.2, 1.9, 2.6, Math.PI]) {
      if (clear(n.heading + sign * off)) { n.heading += sign * off; return; }
      if (clear(n.heading - sign * off)) { n.heading -= sign * off; return; }
    }
    newHeading(n);     // buntu: acak arah lagi
  }

  function walk(n, dt) {
    n.walkTimer -= dt;
    if (n.walkTimer <= 0) newHeading(n);
    steer(n);
    const dx = Math.cos(n.heading), dy = Math.sin(n.heading);
    const step = NPC_CONFIG.speed * dt;
    const stuck = blocked(n.x, n.y);               // terjebak di dalam rintangan: boleh keluar bebas
    const nx = n.x + dx * step, ny = n.y + dy * step;
    let moved = false;
    if (!outOfBounds(nx, ny) && (stuck || !blocked(nx, ny))) { n.x = nx; n.y = ny; moved = true; }
    else if (!outOfBounds(nx, n.y) && (stuck || !blocked(nx, n.y))) { n.x = nx; moved = true; }
    else if (!outOfBounds(n.x, ny) && (stuck || !blocked(n.x, ny))) { n.y = ny; moved = true; }
    if (!moved) newHeading(n);
    else {
      n.stepTimer -= dt;
      if (n.stepTimer <= 0) {                               // bunyi langkah lembut (suara.js)
        n.stepTimer = NPC_CONFIG.stepInterval * rand(0.9, 1.15);
        if (typeof Suara !== "undefined") Suara.npcStep(n.x, n.y);
      }
    }
    n.moving = true;
    if (Math.abs(dx) > 0.05) n.left = dx < 0;
  }

  function say(n) {
    const c = comments();
    let i = Math.floor(Math.random() * c.length);
    if (c.length > 1 && i === n.lastComment) i = (i + 1 + Math.floor(Math.random() * (c.length - 1))) % c.length;   // jangan sama dengan sebelumnya
    n.lastComment = i;
    n.chat = { text: String(c[i]).slice(0, 80), time: performance.now() };
    n.talkTimer = NPC_CONFIG.talkSeconds;
    if (typeof Suara !== "undefined") Suara.talk(n.x, n.y, n.chat.text, n.pitch);    // gumaman abstrak (suara.js)
  }

  // ---- Mode online: data NPC dari server ----
  function netWelcome(data) {
    list.length = 0;
    if (!Array.isArray(data)) { mode = "local"; spawnW = 0; return; }   // server lama tanpa NPC: hitung sendiri di browser
    mode = "server";
    for (const e of data) {                       // [id, karakter, nama, x, y, kiri, jalan]
      if (!Array.isArray(e) || !Number.isFinite(e[3]) || !Number.isFinite(e[4])) continue;
      const variant = String(e[1]);
      list.push({
        id: e[0], variant, v: -1, pitch: NPC_CONFIG.suaraPitch[variant] || 1,
        name: NPC_CONFIG.showName ? String(e[2] || "") : "",
        x: e[3], y: e[4], tx: e[3], ty: e[4], left: !!e[5], moving: !!e[6],
        animTime: Math.random() * 3, stepTimer: 0, chat: null,
        customDraw(px, py) { draw(this, px, py); }
      });
    }
  }
  function netLost() {
    list.length = 0; spawnW = 0;
    mode = CONFIG.serverUrl ? "wait" : "local";
  }
  function net(msg) {
    if (mode !== "server") return;
    if (msg.t === "npc" && Array.isArray(msg.n)) {
      for (const e of msg.n) {                    // [id, x, y, kiri, jalan]
        if (!Array.isArray(e) || !Number.isFinite(e[1]) || !Number.isFinite(e[2])) continue;
        const n = list.find(q => q.id === e[0]);
        if (n) { n.tx = e[1]; n.ty = e[2]; n.left = !!e[3]; n.moving = !!e[4]; }
      }
    } else if (msg.t === "npcsay" && typeof msg.text === "string") {
      const n = list.find(q => q.id === msg.id);
      if (!n) return;
      n.chat = { text: msg.text.slice(0, 80), time: performance.now() };
      if (typeof Suara !== "undefined") Suara.talk(n.x, n.y, n.chat.text, n.pitch);   // gumaman abstrak (suara.js)
    }
  }
  function updateServer(dt) {
    const a = 1 - Math.exp(-CONFIG.remoteSmoothing * dt);
    for (const n of list) {
      if (n.v < 0) n.v = variantNames.indexOf(n.variant);
      if (Math.abs(n.tx - n.x) > 400 || Math.abs(n.ty - n.y) > 400) { n.x = n.tx; n.y = n.ty; }
      else { n.x += (n.tx - n.x) * a; n.y += (n.ty - n.y) * a; }
      n.animTime += dt;
      if (n.moving) {
        n.stepTimer -= dt;
        if (n.stepTimer <= 0) {                   // bunyi langkah lembut (suara.js)
          n.stepTimer = NPC_CONFIG.stepInterval * rand(0.9, 1.15);
          if (typeof Suara !== "undefined") Suara.npcStep(n.x, n.y);
        }
      }
    }
  }

  function update(dt) {
    if (!ready) return;
    if (mode === "server") { updateServer(dt); return; }
    if (mode === "wait") return;
    if (!list.length || spawnW !== CONFIG.worldWidth || spawnH !== CONFIG.worldHeight) respawnAll();
    for (const n of list) {
      n.animTime += dt;
      const d = Math.hypot(player.x - n.x, player.y - n.y);
      if (n.state === "walk") {
        walk(n, dt);
        if (d <= NPC_CONFIG.talkDistance) {          // pemain mendekat: berhenti & berkomentar
          n.state = "talk"; n.moving = false; say(n);
        }
      } else {
        n.moving = false;
        n.left = player.x < n.x;                     // menghadap pemain
        n.talkTimer -= dt;
        if (n.talkTimer <= 0) {
          if (d > NPC_CONFIG.talkDistance) { n.state = "walk"; newHeading(n); }   // pemain sudah menjauh: jalan lagi
          else say(n);                                                              // masih dekat: komentar lagi
        }
      }
    }
  }

  function draw(n, px, py) {
    const s = NPC_CONFIG.size;
    const frames = variants[n.v] || [];
    if (!frames.length) { ctx.fillStyle = "#4a90d9"; ctx.fillRect(px - s / 4, py - s / 2, s / 2, s); return; }
    const idx = n.moving ? Math.floor(n.animTime * NPC_CONFIG.fps) % frames.length
                         : Math.min(NPC_CONFIG.idleFrame - 1, frames.length - 1);
    ctx.save();
    ctx.translate(px, py);
    if (CONFIG.spriteFacesRight ? n.left : !n.left) ctx.scale(-1, 1);
    ctx.drawImage(frames[idx], -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  function addToDrawList(drawList) { for (const n of list) drawList.push(n); }

  return { update, addToDrawList, list, respawnAll, netWelcome, netLost, net };
})();
