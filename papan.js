// ===================== PAPAN SKOR (online) =====================
// Menampilkan peringkat pemain berdasarkan jumlah kupu-kupu yang ditangkap selama masih online.
// Skor dihitung dan dikirim oleh SERVER (server.js), jadi tidak bisa diubah dari browser.
// Skor kembali ke 0 kalau pemain keluar dari game. Klik judul papan atau tekan P untuk buka/tutup.
// Di HP (layar sempit) papan mulai dalam keadaan tertutup. Dimuat SETELAH game.js (lihat index.html).
const Papan = (function () {
  const MAX_ROWS = 10;
  const style = document.createElement("style");
  style.textContent = `
    #papan { position:fixed; left:calc(8px + env(safe-area-inset-left,0px)); top:90px; z-index:4; display:none;
             min-width:150px; max-width:210px; background:rgba(0,0,0,.55); color:#fff; border-radius:8px;
             font:12px system-ui,sans-serif; -webkit-user-select:none; user-select:none; overflow:hidden; }
    #papan.on { display:block; }
    #papan .hd { padding:5px 8px; font-weight:700; cursor:pointer; background:rgba(255,255,255,.12); display:flex; justify-content:space-between; gap:8px; }
    #papan .rows { padding:3px 0; }
    #papan.closed .rows { display:none; }
    #papan .r { display:flex; gap:6px; padding:2px 8px; }
    #papan .r .no { width:16px; text-align:right; opacity:.7; }
    #papan .r .nm { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #papan .r .sc { font-weight:700; }
    #papan .r.me { background:rgba(255,210,60,.28); }
    #papan .empty { padding:3px 8px; opacity:.75; }
  `;
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.id = "papan";
  el.innerHTML = '<div class="hd"><span>🏆 Papan Skor</span><span class="tg">▾</span></div><div class="rows"></div>';
  document.body.appendChild(el);
  const rowsEl = el.querySelector(".rows"), tg = el.querySelector(".tg");

  let closed = window.innerWidth <= 600;
  function applyClosed() { el.classList.toggle("closed", closed); tg.textContent = closed ? "▸" : "▾"; }
  applyClosed();
  el.querySelector(".hd").addEventListener("click", () => { closed = !closed; applyClosed(); });
  window.addEventListener("keydown", e => {
    if ((e.key !== "p" && e.key !== "P") || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = document.activeElement;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    closed = !closed; applyClosed();
  });

  // letakkan tepat di bawah kotak info kiri-atas (status online, jumlah tangkapan)
  function place() {
    const info = document.getElementById("info");
    el.style.top = (info ? Math.round(info.getBoundingClientRect().bottom + 8) : 90) + "px";
  }
  window.addEventListener("resize", place);

  function row(no, name, score, me) {
    const r = document.createElement("div");
    r.className = "r" + (me ? " me" : "");
    const a = document.createElement("span"); a.className = "no"; a.textContent = no ? no + "." : "…";
    const b = document.createElement("span"); b.className = "nm"; b.textContent = name;
    const c = document.createElement("span"); c.className = "sc"; c.textContent = score;
    r.append(a, b, c);
    return r;
  }

  function net(msg) {
    if (!Array.isArray(msg.b)) return;
    rowsEl.textContent = "";
    let meShown = false;
    const myRank = Array.isArray(msg.me) ? msg.me : [0, 0];
    let n = 0;
    for (const e of msg.b) {
      if (!Array.isArray(e) || n >= MAX_ROWS) continue;
      const mine = typeof myId !== "undefined" && e[0] === myId;
      if (mine) meShown = true;
      rowsEl.appendChild(row(++n, String(e[1]).slice(0, 16), Number(e[2]) | 0, mine));
    }
    if (!n) { const d = document.createElement("div"); d.className = "empty"; d.textContent = "Belum ada tangkapan. Tekan Shift dekat kupu-kupu!"; rowsEl.appendChild(d); }
    if (!meShown && myRank[1] > 0) rowsEl.appendChild(row(myRank[0], typeof playerName !== "undefined" ? playerName : "Saya", myRank[1] | 0, true));
    el.classList.add("on");
    place();
  }
  function reset() { el.classList.remove("on"); rowsEl.textContent = ""; }

  return { net, reset };
})();
