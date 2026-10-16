// ===================== KUALITAS GRAFIK OTOMATIS =====================
// Mengukur kelancaran (frame per detik) dan, kalau perangkat pemain terasa berat, mematikan efek
// paling mahal SATU PER SATU sampai lancar:
//   1. blur tilt-shift (16 lapisan blur menumpuk di atas kanvas - efek paling berat di HP)
//   2. efek cahaya (blend mode layar penuh)
//   3. ketajaman kanvas diturunkan (lebih sedikit piksel yang digambar)
//   4. animasi layer dimatikan, ketajaman 1x
// Pilihan tersimpan milik pemain (tombol Miniatur / Cahaya) TIDAK diubah; yang diturunkan hanya
// sementara. Level terakhir diingat 14 hari supaya kunjungan berikutnya langsung lancar.
// Tombol "Grafik" di menu Setting: Otomatis <-> Penuh (Penuh = tidak pernah diturunkan otomatis).
// Dimuat SETELAH game.js, tiltshift.js, dan cahaya.js (lihat index.html).
(function () {
  // ---- Pengaturan (silakan ubah) ----
  const PERF = {
    slowFrameMs: 24,       // median waktu per frame di atas ini = terasa berat (24 ms = di bawah ~41 fps)
    windowMs: 2500,        // lama satu jendela pengukuran
    slowWindows: 3,        // berapa jendela berat berturut-turut sebelum efek diturunkan
    warmupMs: 6000,        // abaikan pengukuran saat game baru dibuka (memuat gambar)
    cooldownMs: 4000,      // jeda setelah satu penurunan sebelum menilai lagi
    rememberDays: 14
  };
  const KEY = "gamePertamaPerf";            // { level, auto, t }

  const LEVELS = [
    null,
    { text: "blur miniatur dimatikan", apply() { if (window.TiltShift) window.TiltShift.off(); } },
    { text: "efek cahaya dimatikan",   apply() { if (window.Cahaya) window.Cahaya.off(); } },
    { text: "ketajaman kanvas diturunkan", apply() { maxDpr = Math.min(maxDpr, 1.25); resize(); } },
    { text: "animasi layer dimatikan",  apply() {
        animLayerOn = false;
        const b = document.getElementById("btnAnimLayer"); if (b) b.classList.add("off");
        maxDpr = 1; resize();
    } }
  ];

  let st = { level: 0, auto: true, t: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && typeof s === "object") {
      st.auto = s.auto !== false;
      if (Number.isFinite(s.level) && Date.now() - (s.t || 0) < PERF.rememberDays * 864e5) st.level = Math.max(0, Math.min(LEVELS.length - 1, s.level | 0));
    }
  } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ level: st.level, auto: st.auto, t: Date.now() })); } catch (e) {} };

  let applied = 0;
  function applyUpTo(level) {
    while (applied < level) { applied++; LEVELS[applied].apply(); }
  }
  if (st.auto) applyUpTo(st.level);          // kunjungan berikutnya: langsung mulai dari level terakhir

  // ---- Pemberitahuan singkat ----
  let toast = null, toastTimer = 0;
  function say(text) {
    if (!toast) {
      toast = document.createElement("div");
      toast.style.cssText = "position:fixed;left:50%;top:calc(52px + env(safe-area-inset-top,0px));transform:translateX(-50%);" +
        "background:rgba(0,0,0,.75);color:#fff;font:13px system-ui,sans-serif;padding:7px 12px;border-radius:8px;" +
        "z-index:30;pointer-events:none;transition:opacity .4s;max-width:80vw;text-align:center";
      document.body.appendChild(toast);
    }
    toast.textContent = text; toast.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = "0"; }, 5000);
  }

  // ---- Tombol di menu Setting ----
  const menu = document.getElementById("settingsMenu");
  if (menu) {
    const btn = document.createElement("button");
    btn.id = "btnPerf";
    const refresh = () => {
      btn.title = "Kualitas grafik: Otomatis menurunkan efek kalau terasa berat; Penuh tidak pernah menurunkan";
      btn.innerHTML = '<span>🎚️</span><span class="tx"> Grafik: ' + (st.auto ? "Otomatis" : "Penuh") + "</span>";
      btn.classList.toggle("off", !st.auto);
    };
    btn.addEventListener("click", () => {
      st.auto = !st.auto; st.level = 0; save();
      location.reload();                       // muat ulang supaya semua efek kembali ke pilihan pemain
    });
    refresh();
    menu.insertBefore(btn, document.getElementById("btnName") || null);
  }

  // ---- Pengukur kelancaran ----
  if (!st.auto) return;
  const samples = [];
  const t0 = performance.now();
  let last = 0, winStart = t0, slowStreak = 0, cooldownUntil = 0;

  function median(a) { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; }

  function evaluate(now) {
    const n = samples.length;
    const frames = samples.splice(0, n);   // minimal 8 frame: perangkat yang sangat lambat (10 fps) hanya menghasilkan ~25 frame per jendela
    if (n < 8 || now - t0 < PERF.warmupMs || now < cooldownUntil || st.level >= LEVELS.length - 1) { slowStreak = 0; return; }
    const med = median(frames);
    // Catatan: perangkat yang dikunci 30 fps (mode hemat baterai) juga ikut diturunkan; pemain bisa memilih
    // "Grafik: Penuh" di menu Setting. Membedakannya dari perangkat lambat yang terkunci 30 fps oleh vsync tidak bisa diandalkan.
    if (med > PERF.slowFrameMs) slowStreak++; else slowStreak = 0;
    if (slowStreak >= PERF.slowWindows) {
      slowStreak = 0;
      st.level++; save();
      applyUpTo(st.level);
      cooldownUntil = now + PERF.cooldownMs;
      console.info("Grafik diturunkan otomatis (level " + st.level + "): " + LEVELS[st.level].text + " (median " + med.toFixed(1) + " ms/frame)");
      say("Grafik diturunkan otomatis supaya lancar: " + LEVELS[st.level].text);
    }
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = 0; samples.length = 0; winStart = now; return; }
    if (last) { const d = now - last; if (d < 250) samples.push(d); }   // jeda panjang (tab dibuka lagi) tidak dihitung
    last = now;
    if (now - winStart >= PERF.windowMs) { winStart = now; evaluate(now); }
  }
  requestAnimationFrame(tick);
})();
