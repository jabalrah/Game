// ===================== EFEK TILT-SHIFT (tampilan miniatur) =====================
// Cara kerja: bagian atas dan bawah layar di-blur bertahap, bagian tengah (tempat
// karakter berada) tetap tajam. Warna juga dibuat sedikit lebih jenuh seperti foto miniatur.
// Efek ini hanya "lapisan di atas kanvas", jadi tidak mengubah kode game sama sekali.
// Tombol, menu, dan peta mini tetap tajam karena berada di atas lapisan efek.
(function () {
  // ---- Pengaturan (silakan ubah) ----
  const TILT = {
    enabledByDefault: true,
    focusTop: 0.34,       // batas atas area tajam (0 = atas layar, 1 = bawah layar)
    focusBottom: 0.64,    // batas bawah area tajam
    focusLeft: 0.22,      // batas kiri area tajam (0 = tepi kiri, 1 = tepi kanan)
    focusRight: 0.78,     // batas kanan area tajam
    maxBlur: 7,           // blur terkuat di tepi atas/bawah (piksel); makin besar makin "miniatur"
    maxBlurSide: 7,       // blur terkuat di tepi kiri/kanan (0 = tanpa blur kiri-kanan)
    saturate: 1.35,       // 1 = normal; makin besar warna makin pekat
    contrast: 1.08,       // 1 = normal
    brightness: 1.03,     // 1 = normal
    vignette: 0.18        // gelap tipis di pojok layar (0 = mati)
  };
  const KEY = "gamePertamaTiltShift";
  const LAYERS = 4;       // jumlah lapisan blur (makin banyak makin halus, tapi lebih berat)

  const supportsBackdrop = CSS.supports("backdrop-filter", "blur(1px)") ||
                           CSS.supports("-webkit-backdrop-filter", "blur(1px)");

  let enabled = TILT.enabledByDefault;
  try {
    const s = localStorage.getItem(KEY);
    if (s !== null) enabled = s === "1";
  } catch (e) {}

  // ---- CSS ----
  const style = document.createElement("style");
  let css = `
    #tiltWrap { position:fixed; inset:0; pointer-events:none; display:none; }
    body.tilt #tiltWrap { display:block; }
    body.tilt canvas#game { filter:saturate(${TILT.saturate}) contrast(${TILT.contrast}) brightness(${TILT.brightness}); }
    #tiltWrap .tb { position:absolute; }
    #tiltVig { position:absolute; inset:0; background:radial-gradient(ellipse at center,
               rgba(0,0,0,0) 55%, rgba(0,0,0,${TILT.vignette}) 100%); }
  `;
  style.textContent = css;
  document.head.appendChild(style);

  // ---- Lapisan blur ----
  // Tiap lapisan menambah blur; makin dekat tepi layar, makin banyak lapisan yang menumpuk.
  const wrap = document.createElement("div");
  wrap.id = "tiltWrap";
  // diletakkan tepat setelah kanvas game supaya elemen UI lain (yang ada di bawah/kemudian) tetap di atasnya
  const gameCanvas = document.getElementById("game");
  gameCanvas.insertAdjacentElement("afterend", wrap);

  function build() {
    wrap.innerHTML = "";
    if (supportsBackdrop) {
      // Satu sisi layar = beberapa lapisan blur bertumpuk. Makin dekat tepi, makin banyak lapisan
      // yang menumpuk, jadi blur naik halus (tidak ada garis batas).
      // side: "top" | "bottom" | "left" | "right"; edge = posisi batas area tajam (% layar)
      const addSide = (side, edge, maxBlur) => {
        if (maxBlur <= 0) return;
        const fromStart = side === "top" || side === "left";     // sisi yang menempel di 0%
        const span = fromStart ? edge : 100 - edge;               // lebar zona blur (% layar)
        if (span <= 0) return;
        const horizontal = side === "left" || side === "right";
        const dir = { top: "to bottom", bottom: "to top", left: "to right", right: "to left" }[side];
        for (let i = 0; i < LAYERS; i++) {
          const blur = (maxBlur * Math.pow(2, i - (LAYERS - 1))).toFixed(2);   // contoh: 0.9, 1.75, 3.5, 7
          const size = span * (1 - i / LAYERS);          // lapisan i menutupi sebagian zona dari tepi
          const opaque = (1 - (i + 1) / LAYERS) / (1 - i / LAYERS) * 100;   // bagian yang penuh (%)
          const el = document.createElement("div");
          el.className = "tb";
          const bf = `blur(${blur}px)`;
          el.style.backdropFilter = bf;
          el.style.webkitBackdropFilter = bf;
          el.style[side] = "0";
          if (horizontal) { el.style.top = "0"; el.style.bottom = "0"; el.style.left = side === "left" ? "0" : "auto";
                            el.style.right = side === "right" ? "0" : "auto"; el.style.width = size + "%"; }
          else            { el.style.left = "0"; el.style.right = "0"; el.style.height = size + "%"; }
          const g = `linear-gradient(${dir}, #000 ${opaque}%, transparent 100%)`;
          el.style.maskImage = g; el.style.webkitMaskImage = g;
          wrap.appendChild(el);
        }
      };
      addSide("top",    TILT.focusTop * 100,          TILT.maxBlur);
      addSide("bottom", TILT.focusBottom * 100,       TILT.maxBlur);
      addSide("left",   TILT.focusLeft * 100,         TILT.maxBlurSide);
      addSide("right",  TILT.focusRight * 100,        TILT.maxBlurSide);
    }
    if (TILT.vignette > 0) {
      const v = document.createElement("div");
      v.id = "tiltVig";
      wrap.appendChild(v);
    }
  }
  build();

  // ---- Tombol di menu Setting ----
  const menu = document.getElementById("settingsMenu");
  let btn = null;
  if (menu) {
    btn = document.createElement("button");
    btn.id = "btnTilt";
    btn.title = "Efek miniatur (tilt-shift)";
    btn.innerHTML = '<span>🔍</span><span class="tx"> Miniatur</span>';
    const before = document.getElementById("btnName");
    menu.insertBefore(btn, before || null);
    btn.addEventListener("click", () => set(!enabled));
  }

  function set(on, persist) {
    enabled = on;
    document.body.classList.toggle("tilt", enabled);
    if (btn) btn.classList.toggle("off", !enabled);
    if (persist !== false) { try { localStorage.setItem(KEY, enabled ? "1" : "0"); } catch (e) {} }
  }
  set(enabled);
  // Dipakai perf.js untuk mematikan efek ini sementara (tanpa mengubah pilihan tersimpan pemain)
  window.TiltShift = { off() { set(false, false); }, get enabled() { return enabled; } };

  // Tombol cepat di keyboard: T = hidupkan/matikan (tidak aktif saat mengetik chat/nama)
  window.addEventListener("keydown", e => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.key === "t" || e.key === "T") set(!enabled);
  });
})();
