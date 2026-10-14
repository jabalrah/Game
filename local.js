// Saat game dibuka dari komputer sendiri (localhost), pakai server lokal.
// Di GitHub Pages file ini tidak berpengaruh, jadi aman ikut dikirim ke GitHub.
(function () {
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1") {
    CONFIG.serverUrl = "ws://localhost:3000";
  }
})();
