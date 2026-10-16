// ===================== BACKSOUND: LAGU (bisa dipilih) + SUARA ANGIN =====================
// 1. LAGU     : daftar lagu ada di MUSIK_CONFIG.lagu di bawah. File MP3 disimpan di folder assets/musik/.
//               Pemain memilih lagu lewat Setting > 🎶 Lagu. Setelah satu lagu selesai, lagu berikutnya
//               diputar otomatis. Pilihan lagu & volume diingat di browser. Tombol 🎵 Musik tetap
//               untuk menyalakan / mematikan musik.
// 2. ANGIN    : suara angin dibuat otomatis oleh browser (WebAudio), TANPA file audio, jadi tidak
//               menambah ukuran game. Embusannya naik-turun sendiri. Tombol 🍃 Angin di menu Setting.
// Dimuat SETELAH game.js (lihat index.html).
//
// Cara menambah lagu:
//   1. Kompres jadi MP3 (disarankan 96 kbps), beri nama tanpa spasi, mis. santai-pagi.mp3
//   2. Taruh di folder assets/musik/
//   3. Tambahkan satu baris di MUSIK_CONFIG.lagu di bawah, lalu muat ulang game (Ctrl+F5).
const MUSIK_CONFIG = {
  lagu: [
    { nama: "Santai Pagi", file: "assets/musik/lagu.mp3" },
    { nama: "Petualangan",  file: "assets/musik/bgm.mp3" },
  ],
  acak: false,            // true = lagu berikutnya dipilih acak, false = urut sesuai daftar
  musikVolume: 0.2,      // volume awal lagu (0 - 1), pemain bisa mengubahnya di panel
  anginVolume: 0.2        // volume awal angin (0 - 1), pemain bisa mengubahnya di panel
};

const Musik = (function () {
  const C = MUSIK_CONFIG;
  const KEY = "gamePertamaMusik";
  const lagu = (C.lagu || []).filter(l => l && l.file);
  const st = { file: "", musik: C.musikVolume, angin: C.anginVolume, anginOn: true };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s) {
      if (typeof s.file === "string") st.file = s.file;
      if (Number.isFinite(s.musik)) st.musik = Math.max(0, Math.min(1, s.musik));
      if (Number.isFinite(s.angin)) st.angin = Math.max(0, Math.min(1, s.angin));
      if (s.anginOn === false) st.anginOn = false;
    }
  } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  let idx = Math.max(0, lagu.findIndex(l => l.file === st.file));
  let errorRun = 0;
  const hasBgm = typeof bgm !== "undefined";

  // ------------------------------------------------------------------ LAGU
  function showHint() { if (typeof audioHint !== "undefined") audioHint.style.display = "none"; }
  function loadSong(i) {
    idx = ((i % lagu.length) + lagu.length) % lagu.length;
    st.file = lagu[idx].file; save();
    bgm.src = st.file;
    bgm.loop = lagu.length === 1;            // satu lagu saja: diulang terus
    bgm.volume = st.musik;
    refreshPanel();
  }
  function playNow() {                        // dipakai saat pemain memilih lagu: musik otomatis menyala
    if (typeof audioPrefs !== "undefined") { audioPrefs.music = true; saveAudioPrefs(); refreshAudioButtons(); }
    const p = bgm.play();
    const ok = () => { if (typeof audioStarted !== "undefined") audioStarted = true; showHint(); };
    if (p && p.then) p.then(ok).catch(() => {}); else ok();
  }
  function nextIndex() {
    if (lagu.length < 2) return idx;
    if (!C.acak) return idx + 1;
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * lagu.length);
    return n;
  }
  function choose(i) { loadSong(i); playNow(); }
  function next() { choose(nextIndex()); }
  function prev() { choose(idx - 1); }

  // ------------------------------------------------------------------ ANGIN (dibuat oleh browser)
  let ac = null, wind = null;
  function pinkBuffer(ctx) {
    const len = Math.floor(ctx.sampleRate * 4), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
    }
    return buf;
  }
  function buildWind() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { ac = null; return false; }
    const noise = pinkBuffer(ac);
    const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    // lapisan 1: gemuruh rendah yang stabil
    const s1 = ac.createBufferSource(); s1.buffer = noise; s1.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380; lp.Q.value = 0.4;
    const gLow = ac.createGain(); gLow.gain.value = 0.5;
    s1.connect(lp); lp.connect(gLow); gLow.connect(master);
    // lapisan 2: desir angin yang naik-turun
    const s2 = ac.createBufferSource(); s2.buffer = noise; s2.loop = true; s2.playbackRate.value = 0.83;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.8;
    const gMid = ac.createGain(); gMid.gain.value = 0.3;
    s2.connect(bp); bp.connect(gMid); gMid.connect(master);
    // gelombang pelan supaya suara "bernapas"
    const lfo1 = ac.createOscillator(), l1 = ac.createGain();
    lfo1.frequency.value = 0.11; l1.gain.value = 140; lfo1.connect(l1); l1.connect(bp.frequency);
    const lfo2 = ac.createOscillator(), l2 = ac.createGain();
    lfo2.frequency.value = 0.07; l2.gain.value = 0.08; lfo2.connect(l2); l2.connect(gMid.gain);
    s1.start(); s2.start(ac.currentTime, 1.3); lfo1.start(); lfo2.start();
    wind = { master, lp, gLow, bp, gMid, timer: 0 };
    gust();
    return true;
  }
  function gust() {                           // embusan acak tiap beberapa detik
    if (!ac || !wind) return;
    const t = ac.currentTime, k = Math.random();
    wind.gMid.gain.setTargetAtTime(0.12 + k * 0.5, t, 1.6);
    wind.bp.frequency.setTargetAtTime(480 + k * 650, t, 1.6);
    wind.gLow.gain.setTargetAtTime(0.35 + k * 0.35, t, 2);
    wind.timer = setTimeout(gust, 3000 + Math.random() * 5000);
  }
  function applyWind() {
    if (!wind || !ac) return;
    wind.master.gain.setTargetAtTime(st.anginOn ? st.angin * 0.6 : 0, ac.currentTime, 0.4);
  }
  function startWind() {                      // browser baru mengizinkan suara setelah pemain menyentuh layar
    if (!st.anginOn) return;
    if (!ac && !buildWind()) return;
    if (ac.state === "suspended") ac.resume().catch(() => {});
    applyWind();
  }
  ["pointerdown", "keydown", "touchend"].forEach(g => window.addEventListener(g, startWind));
  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else if (st.anginOn) ac.resume().catch(() => {});
  });

  // ------------------------------------------------------------------ TAMPILAN (tombol & panel)
  const css = document.createElement("style");
  css.textContent = `
    #musikPanel { position:fixed; top:calc(56px + var(--sat)); right:calc(8px + var(--sar)); z-index:12; width:290px;
      max-height:calc(100% - 72px - var(--sat)); overflow-y:auto; background:#fff; border-radius:14px; padding:14px;
      box-shadow:0 6px 24px rgba(0,0,0,.4); display:none; touch-action:pan-y; overscroll-behavior:contain;
      font-family:system-ui, sans-serif; color:#222; box-sizing:border-box; }
    #musikPanel.open { display:block; }
    #musikPanel h3 { margin:0 0 4px; font-size:16px; }
    #musikPanel .now { font-size:13px; color:#555; margin:0 0 10px; min-height:18px; }
    #musikPanel .sub { font-size:12px; font-weight:700; color:#666; margin:12px 0 6px; text-transform:uppercase; letter-spacing:.04em; }
    #musikPanel .songs { display:flex; flex-direction:column; gap:5px; }
    #musikPanel .songs button, #musikPanel .ctrl button, #musikPanel .wbtn {
      padding:9px 10px; border:1px solid #ccc; border-radius:8px; background:#f5f5f5; font-size:14px;
      text-align:left; cursor:pointer; touch-action:manipulation; }
    #musikPanel .songs button.cur { background:#bfdbfe; border-color:#60a5fa; font-weight:600; }
    #musikPanel .ctrl { display:flex; gap:6px; margin-top:8px; }
    #musikPanel .ctrl button { flex:1; text-align:center; }
    #musikPanel .vol { display:flex; align-items:center; gap:8px; margin:6px 0; font-size:13px; }
    #musikPanel .vol input { flex:1; min-width:0; }
    #musikPanel .wbtn { width:100%; }
    #musikPanel .wbtn.off { background:#bbb; color:#555; }
    #musikPanel .empty { font-size:13px; color:#666; line-height:1.4; }
    @media (max-width: 600px), (max-height: 500px) and (pointer: coarse) {
      #musikPanel { top:calc(62px + var(--sat)); width:min(310px, calc(100vw - 16px - var(--sal) - var(--sar)));
                    max-height:calc(100dvh - 78px - var(--sat) - var(--sab)); }
      #musikPanel .songs button, #musikPanel .ctrl button, #musikPanel .wbtn { min-height:44px; font-size:15px; }
    }`;
  document.head.appendChild(css);

  const menu = document.getElementById("settingsMenu");
  const anchor = document.getElementById("btnLie") || null;
  const btnLagu = document.createElement("button");
  btnLagu.id = "btnLagu"; btnLagu.title = "Pilih lagu & atur volume";
  btnLagu.innerHTML = '<span>🎶</span><span class="tx"> Lagu</span>';
  const btnAngin = document.createElement("button");
  btnAngin.id = "btnAngin"; btnAngin.title = "Suara angin";
  btnAngin.innerHTML = '<span>🍃</span><span class="tx"> Angin</span>';
  if (menu) { menu.insertBefore(btnLagu, anchor); menu.insertBefore(btnAngin, anchor); }

  const panel = document.createElement("div");
  panel.id = "musikPanel";
  document.body.appendChild(panel);

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function slider(label, value, onInput) {
    const row = el("div", "vol"), inp = el("input");
    inp.type = "range"; inp.min = "0"; inp.max = "1"; inp.step = "0.05"; inp.value = String(value);
    inp.addEventListener("input", () => onInput(Number(inp.value)));
    inp.addEventListener("keydown", e => e.stopPropagation());     // tombol panah di slider jangan menggerakkan karakter
    row.append(el("span", "", label), inp);
    return row;
  }
  function buildPanel() {
    panel.textContent = "";
    panel.append(el("h3", "", "🎶 Lagu & Angin"));
    const now = el("div", "now"); now.id = "musikNow"; panel.append(now);

    panel.append(el("div", "sub", "Lagu"));
    if (!lagu.length) {
      panel.append(el("div", "empty", "Belum ada lagu. Taruh file MP3 di folder assets/musik/ lalu daftarkan di MUSIK_CONFIG.lagu (file musik.js)."));
    } else {
      const box = el("div", "songs");
      lagu.forEach((l, i) => {
        const b = el("button", "", l.nama || l.file);
        b.dataset.i = String(i);
        b.addEventListener("click", () => choose(i));
        box.append(b);
      });
      panel.append(box);
      const ctrl = el("div", "ctrl");
      const bp = el("button", "", "⏮"), bn = el("button", "", "⏭");
      bp.title = "Lagu sebelumnya"; bn.title = "Lagu berikutnya";
      bp.addEventListener("click", prev); bn.addEventListener("click", next);
      ctrl.append(bp, bn); panel.append(ctrl);
      panel.append(slider("Volume", st.musik, v => { st.musik = v; bgm.volume = v; save(); }));
    }

    panel.append(el("div", "sub", "Suara angin"));
    const wb = el("button", "wbtn"); wb.id = "musikWind";
    wb.addEventListener("click", toggleWind);
    panel.append(wb);
    panel.append(slider("Volume", st.angin, v => { st.angin = v; save(); startWind(); applyWind(); }));
    refreshPanel();
  }
  function refreshPanel() {
    const now = document.getElementById("musikNow");
    if (now) {
      const on = typeof audioPrefs === "undefined" || audioPrefs.music;
      if (!lagu.length) now.textContent = "";
      else now.textContent = on && !bgm.paused ? "▶ " + (lagu[idx].nama || lagu[idx].file)
                           : on ? "Siap: " + (lagu[idx].nama || lagu[idx].file) : "Musik sedang dimatikan (tombol 🎵 Musik)";
    }
    panel.querySelectorAll(".songs button").forEach(b => b.classList.toggle("cur", Number(b.dataset.i) === idx));
    const wb = document.getElementById("musikWind");
    if (wb) { wb.textContent = st.anginOn ? "🍃 Angin: menyala" : "🍃 Angin: mati"; wb.classList.toggle("off", !st.anginOn); }
    btnAngin.classList.toggle("off", !st.anginOn);
  }
  function toggleWind() {
    st.anginOn = !st.anginOn; save();
    if (st.anginOn) startWind(); else applyWind();
    refreshPanel();
  }
  btnAngin.addEventListener("click", toggleWind);
  btnLagu.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (menu) menu.classList.remove("open");
    refreshPanel();
  });
  // tutup panel kalau klik di luar atau tekan Esc
  document.addEventListener("pointerdown", e => {
    if (panel.classList.contains("open") && !panel.contains(e.target) && !btnLagu.contains(e.target)) panel.classList.remove("open");
  }, true);
  window.addEventListener("keydown", e => { if (e.key === "Escape") panel.classList.remove("open"); });
  document.getElementById("btnMusic") && document.getElementById("btnMusic").addEventListener("click", () => setTimeout(refreshPanel, 50));

  buildPanel();

  // ---- mulai pemutar lagu (setelah panel siap) ----
  if (hasBgm && lagu.length) {
    bgm.preload = "metadata";                 // lagu baru diunduh penuh saat diputar, bukan saat game dibuka
    loadSong(idx);
    bgm.addEventListener("ended", () => { if (lagu.length > 1) next(); });
    bgm.addEventListener("playing", () => { errorRun = 0; refreshPanel(); });
    bgm.addEventListener("pause", refreshPanel);
    bgm.addEventListener("error", () => {     // file tidak ketemu / rusak: lewati, tapi jangan berputar tanpa henti
      console.warn("Musik: lagu '" + st.file + "' tidak bisa dimuat (cek nama file di MUSIK_CONFIG dan folder assets/musik/).");
      if (lagu.length > 1 && ++errorRun < lagu.length) setTimeout(() => {
        loadSong(nextIndex());
        if (typeof audioPrefs === "undefined" || audioPrefs.music) bgm.play().catch(() => {});
      }, 300);
    });
  } else if (hasBgm) {
    console.info("Musik: daftar lagu masih kosong. Tambahkan lagu di MUSIK_CONFIG.lagu (musik.js).");
  }

  return { choose, next, prev, get lagu() { return lagu; } };
})();
