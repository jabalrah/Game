// ===================== EFEK CAHAYA PAGI =====================
// Sinar matahari lembut dari pojok kiri-atas: cahaya menyebar + garis sinar tipis yang
// pelan-pelan "bernapas". Warna bisa diganti: Kuning, Biru, Putih (atau Mati).
// Hanya lapisan di atas kanvas, jadi kode game tidak diubah. Tombol/menu tetap jelas.
(function () {
  // ---- Pengaturan (silakan ubah) ----
  const LIGHT = {
    defaultMode: "kuning",   // "kuning" | "biru" | "putih" | "mati"
    glow: 0.42,              // kekuatan cahaya yang menyebar (0 - 1)
    rays: 0.35,              // kekuatan garis sinar (0 = tanpa garis sinar)
    wash: 0.05,              // warna tipis di seluruh layar
    sunX: 8,                 // posisi matahari: % dari kiri layar
    sunY: -8,                // posisi matahari: % dari atas layar (negatif = di luar layar)
    pulseSeconds: 9          // lama satu kali "napas" cahaya (detik)
  };
  // Warna (R, G, B). Tambah warna baru di sini kalau mau, lalu masukkan namanya ke MODES.
  const COLORS = {
    kuning: { rgb: "255, 205, 90",  label: "Kuning", icon: "🌤️" },
    biru:   { rgb: "130, 190, 255", label: "Biru",   icon: "🌥️" },
    putih:  { rgb: "255, 255, 255", label: "Putih",  icon: "☀️" }
  };
  const MODES = ["kuning", "biru", "putih", "mati"];
  const KEY = "gamePertamaCahaya";

  let mode = LIGHT.defaultMode;
  try {
    const s = localStorage.getItem(KEY);
    if (s && MODES.includes(s)) mode = s;
  } catch (e) {}

  // ---- CSS ----
  const style = document.createElement("style");
  style.textContent = `
    #lightWrap { position:fixed; inset:0; pointer-events:none; display:none; overflow:hidden;
                 --lc: 255, 205, 90; transition:opacity .4s; }
    body.cahaya #lightWrap { display:block; }
    #lightWrap > div { position:absolute; inset:0; }
    #lightGlow { mix-blend-mode:screen;
      background:
        radial-gradient(circle 62vmax at ${LIGHT.sunX}% ${LIGHT.sunY}%,
          rgba(var(--lc), ${LIGHT.glow}) 0%, rgba(var(--lc), ${LIGHT.glow * 0.4}) 40%,
          rgba(var(--lc), 0) 100%); }
    #lightWash { mix-blend-mode:soft-light; background:rgba(var(--lc), ${LIGHT.wash * 3}); }
    #lightRays { mix-blend-mode:screen; opacity:${LIGHT.rays};
      background:repeating-linear-gradient(
        118deg,
        rgba(var(--lc), 0) 0px, rgba(var(--lc), 0) 70px,
        rgba(var(--lc), .55) 110px, rgba(var(--lc), 0) 170px, rgba(var(--lc), 0) 260px);
      -webkit-mask-image:radial-gradient(circle at ${LIGHT.sunX}% ${LIGHT.sunY}%, #000 0%, rgba(0,0,0,.5) 40%, transparent 80%);
              mask-image:radial-gradient(circle at ${LIGHT.sunX}% ${LIGHT.sunY}%, #000 0%, rgba(0,0,0,.5) 40%, transparent 80%);
      animation:lightPulse ${LIGHT.pulseSeconds}s ease-in-out infinite; will-change:opacity; }
    @keyframes lightPulse { 0%,100% { opacity:${LIGHT.rays * 0.55}; } 50% { opacity:${LIGHT.rays}; } }
    @media (prefers-reduced-motion: reduce) { #lightRays { animation:none; } }
  `;
  document.head.appendChild(style);

  // ---- Lapisan cahaya ----
  // Diletakkan di atas lapisan tilt-shift (kalau ada) tapi di bawah semua tombol/menu.
  const wrap = document.createElement("div");
  wrap.id = "lightWrap";
  wrap.innerHTML = '<div id="lightWash"></div><div id="lightGlow"></div><div id="lightRays"></div>';
  const anchor = document.getElementById("tiltWrap") || document.getElementById("game");
  anchor.insertAdjacentElement("afterend", wrap);

  // ---- Tombol di menu Setting ----
  const menu = document.getElementById("settingsMenu");
  let btn = null;
  if (menu) {
    btn = document.createElement("button");
    btn.id = "btnLight";
    btn.title = "Cahaya pagi (klik untuk ganti warna)";
    const before = document.getElementById("btnName");
    menu.insertBefore(btn, before || null);
    btn.addEventListener("click", next);
  }

  function next() { set(MODES[(MODES.indexOf(mode) + 1) % MODES.length]); }

  function set(m, persist) {
    mode = m;
    const on = mode !== "mati";
    document.body.classList.toggle("cahaya", on);
    if (on) wrap.style.setProperty("--lc", COLORS[mode].rgb);
    if (btn) {
      const c = COLORS[mode];
      btn.classList.toggle("off", !on);
      btn.innerHTML = on
        ? `<span>${c.icon}</span><span class="tx"> Cahaya: ${c.label}</span>`
        : `<span>🌑</span><span class="tx"> Cahaya</span>`;
    }
    if (persist !== false) { try { localStorage.setItem(KEY, mode); } catch (e) {} }
  }
  set(mode);
  // Dipakai perf.js untuk mematikan efek ini sementara (tanpa mengubah pilihan tersimpan pemain)
  window.Cahaya = { off() { set("mati", false); }, get mode() { return mode; } };

  // Tombol cepat: L = ganti warna / matikan (tidak aktif saat mengetik)
  window.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.key === "l" || e.key === "L") next();
  });
})();
