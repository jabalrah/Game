// ===================== PETA MINI (minimap) =====================
// Menampilkan peta dunia kecil di kiri atas, lengkap dengan titik dan nama
// semua pemain. Dimuat SETELAH game.js (lihat index.html).
// Tombol "Peta" di kanan atas atau tombol keyboard M untuk menyembunyikan/menampilkan.
(function () {
  // ---- Pengaturan (silakan ubah) ----
  const MAP_MAX_DESKTOP = 170;   // sisi terpanjang peta di komputer (piksel)
  const MAP_MAX_MOBILE  = 120;   // sisi terpanjang peta di HP
  const COLOR_BG     = "rgba(35, 70, 40, 0.88)";
  const COLOR_BORDER = "rgba(255, 255, 255, 0.85)";
  const COLOR_SELF   = "#ffd93d";   // titik saya
  const COLOR_OTHER  = "#ff6b6b";   // titik pemain lain
  const COLOR_VIEW   = "rgba(255, 255, 255, 0.55)";  // kotak area yang sedang terlihat
  const SHOW_VIEW_BOX = true;
  const LABEL_FONT = "bold 10px system-ui, sans-serif";

  const canvas = document.createElement("canvas");
  canvas.id = "minimap";
  Object.assign(canvas.style, {
    position: "fixed", left: "8px", top: "112px", zIndex: "5",
    pointerEvents: "none", borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,.5)"
  });
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d");

  let shown = true;
  let mapW = 0, mapH = 0, dpr = 1, lastWW = 0, lastWH = 0, lastMax = 0;

  // ---- Tombol di bilah atas ----
  const topbar = document.getElementById("topbar");
  let btn = null;
  if (topbar) {
    btn = document.createElement("button");
    btn.id = "btnMap";
    btn.title = "Tampilkan/sembunyikan peta (M)";
    btn.innerHTML = '<span>🗺️</span><span class="tx"> Peta</span>';
    topbar.insertBefore(btn, topbar.firstChild);
    btn.addEventListener("click", toggle);
  }
  function toggle() {
    shown = !shown;
    canvas.style.display = shown ? "block" : "none";
    if (btn) btn.classList.toggle("off", !shown);
  }
  window.addEventListener("keydown", e => {
    if (e.key !== "m" && e.key !== "M") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;   // sedang mengetik
    toggle();
  });

  // ---- Ukuran peta mengikuti ukuran dunia ----
  function resize(ww, wh, max) {
    const s = max / Math.max(ww, wh);
    mapW = Math.max(40, Math.round(ww * s));
    mapH = Math.max(40, Math.round(wh * s));
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(mapW * dpr);
    canvas.height = Math.round(mapH * dpr);
    canvas.style.width = mapW + "px";
    canvas.style.height = mapH + "px";
    lastWW = ww; lastWH = wh; lastMax = max;
  }

  // ---- Label nama, dijaga agar tidak keluar dari peta ----
  function label(text, x, y) {
    if (!text) return;
    g.font = LABEL_FONT;
    const half = g.measureText(text).width / 2;
    const lx = Math.max(half + 2, Math.min(mapW - half - 2, x));
    const ly = Math.max(11, y - 7);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(0,0,0,.75)";
    g.strokeText(text, lx, ly);
    g.fillStyle = "#fff";
    g.fillText(text, lx, ly);
  }

  function dot(x, y, r, color) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = "#fff";
    g.stroke();
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!shown) return;
    let ww, wh;
    try { ww = CONFIG.worldWidth; wh = CONFIG.worldHeight; } catch (e) { return; }   // game.js belum siap
    if (!(ww > 0 && wh > 0)) return;

    const max = window.innerWidth <= 600 ? MAP_MAX_MOBILE : MAP_MAX_DESKTOP;
    if (ww !== lastWW || wh !== lastWH || max !== lastMax) resize(ww, wh, max);

    // letakkan tepat di bawah kotak info kiri atas
    const info = document.getElementById("info");
    if (info) canvas.style.top = Math.round(info.getBoundingClientRect().bottom + 8) + "px";

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, mapW, mapH);
    g.fillStyle = COLOR_BG;
    g.fillRect(0, 0, mapW, mapH);

    const sx = mapW / ww, sy = mapH / wh;

    // kotak area layar yang sedang terlihat
    if (SHOW_VIEW_BOX) {
      const vw = window.innerWidth, vh = window.innerHeight;
      let camX = Math.max(0, Math.min(ww - vw, player.x - vw / 2));
      let camY = Math.max(0, Math.min(wh - vh, player.y - vh / 2));
      if (ww < vw) camX = 0;
      if (wh < vh) camY = 0;
      g.lineWidth = 1;
      g.strokeStyle = COLOR_VIEW;
      g.strokeRect(camX * sx + 0.5, camY * sy + 0.5, Math.min(vw, ww) * sx, Math.min(vh, wh) * sy);
    }

    // pemain lain
    for (const r of remotePlayers.values()) {
      const x = r.x * sx, y = r.y * sy;
      dot(x, y, 3, COLOR_OTHER);
      label(r.name, x, y);
    }
    // saya (digambar terakhir agar paling atas)
    const px = player.x * sx, py = player.y * sy;
    dot(px, py, 4, COLOR_SELF);
    label(playerName || "Saya", px, py);

    // bingkai
    g.lineWidth = 2;
    g.strokeStyle = COLOR_BORDER;
    g.strokeRect(1, 1, mapW - 2, mapH - 2);
  }
  requestAnimationFrame(frame);
})();
