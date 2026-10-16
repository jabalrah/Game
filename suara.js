// ===================== SUARA (dibuat otomatis, tanpa file audio) =====================
// Tiga suara yang dibangkitkan langsung oleh browser (WebAudio), jadi tidak perlu file .wav/.mp3:
//   1. Berhasil menangkap kupu-kupu : dentingan ceria naik nada (kupu langka: lebih panjang & berkilau)
//   2. Langkah kaki NPC             : ketukan lembut teredam, makin jauh makin pelan (hampir tak terdengar)
//   3. NPC berkomentar              : "gumaman" abstrak seperti film kartun bisu - bunyi-bunyi pendek
//                                     tanpa kata yang jelas; tiap karakter NPC punya tinggi suara sendiri
// Semua suara ikut tombol 👣 Efek di menu Setting. Dimuat SETELAH game.js (lihat index.html).
const SUARA = {
  volume: 1,                // volume keseluruhan semua suara di file ini (0 - 1)
  hearDistance: 520,        // NPC lebih jauh dari ini tidak terdengar bicara (piksel)

  catchVolume: 0.4,         // volume suara berhasil menangkap

  stepVolume: 0.10,         // volume langkah NPC (kecil supaya tidak terlalu jelas)
  stepHearDistance: 380,    // langkah NPC lebih jauh dari ini tidak terdengar (piksel)

  talkVolume: 0.2,          // volume gumaman NPC
  talkBlipSeconds: 0.07,    // lama tiap bunyi pendek (detik); makin kecil makin cepat
  talkMaxBlips: 22,         // batas jumlah bunyi per komentar
  talkMaxVoices: 3          // batas jumlah NPC yang bergumam bersamaan
};

const Suara = (function () {
  const C = SUARA;
  let ac = null, master = null, noiseBuf = null;
  const talkEnd = [];                       // waktu berakhirnya gumaman yang sedang berbunyi

  function ensure() {
    if (ac) { if (ac.state === "suspended") ac.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    master = ac.createGain(); master.gain.value = C.volume;
    const comp = ac.createDynamicsCompressor();            // mencegah suara pecah kalau banyak yang berbunyi
    master.connect(comp); comp.connect(ac.destination);
    const len = Math.floor(ac.sampleRate * 0.15);
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  // browser baru mengizinkan suara setelah pemain menyentuh layar / menekan tombol
  ["pointerdown", "keydown", "touchend"].forEach(g => window.addEventListener(g, ensure));

  function allowed() {
    if (typeof audioPrefs !== "undefined" && !audioPrefs.sfx) return false;       // tombol Efek dimatikan
    if (typeof audioStarted !== "undefined" && !audioStarted) return false;       // belum ada interaksi pemain
    return ensure() && ac.state === "running";
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // seberapa keras & dari arah mana suara terdengar, menurut jarak ke pemain
  function spatial(x, y, maxD) {
    if (x === undefined) return { g: 1, pan: 0 };
    const d = Math.hypot(x - player.x, y - player.y);
    if (d >= maxD) return null;
    return { g: Math.pow(1 - d / maxD, 1.5), pan: Math.max(-0.8, Math.min(0.8, (x - player.x) / maxD * 1.2)) };
  }
  function outNode(pan) {
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(master); return p; }
    return master;
  }
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  // ---- 1. Berhasil menangkap ----
  function bell(freq, t, peak, decay, out) {
    const parts = [[1, 1, decay], [2.76, 0.25, decay * 0.5]];              // nada dasar + denting logam
    for (const [mul, vol, dec] of parts) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = freq * mul;
      env(g, t, peak * vol, 0.004, dec);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dec + 0.06);
    }
  }
  function catchSuccess(rare) {
    if (!allowed()) return;
    const t0 = ac.currentTime + 0.01, peak = C.catchVolume * 0.5;
    const pop = ac.createOscillator(), pg = ac.createGain();               // "pop" kecil di awal
    pop.type = "sine"; pop.frequency.setValueAtTime(420, t0); pop.frequency.exponentialRampToValueAtTime(900, t0 + 0.07);
    env(pg, t0, peak * 0.6, 0.004, 0.08);
    pop.connect(pg); pg.connect(master); pop.start(t0); pop.stop(t0 + 0.12);
    const notes = rare ? [84, 88, 91, 96, 100] : [84, 88, 91], step = rare ? 0.075 : 0.07;
    notes.forEach((m, i) => bell(mtof(m), t0 + 0.05 + i * step, peak * (rare ? 0.95 : 0.8), rare ? 0.9 : 0.45, master));
    if (rare) for (let i = 0; i < 4; i++) bell(mtof(103 + Math.floor(Math.random() * 7)), t0 + 0.42 + i * 0.07, peak * 0.4, 0.5, master);   // kilauan
  }

  // ---- 2. Langkah NPC ----
  function npcStep(x, y) {
    if (!allowed()) return;
    const s = spatial(x, y, C.stepHearDistance);
    if (!s) return;
    const t = ac.currentTime, out = outNode(s.pan), peak = C.stepVolume * s.g;
    const src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    lp.type = "lowpass"; lp.frequency.value = 450 + Math.random() * 350; lp.Q.value = 0.7;
    env(g, t, peak, 0.004, 0.07);
    src.connect(lp); lp.connect(g); g.connect(out);
    src.start(t); src.stop(t + 0.12);
    const th = ac.createOscillator(), tg = ac.createGain();                // ketukan rendah di bawahnya
    th.type = "sine"; th.frequency.setValueAtTime(115, t); th.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    env(tg, t, peak * 0.6, 0.004, 0.06);
    th.connect(tg); tg.connect(out); th.start(t); th.stop(t + 0.1);
  }

  // ---- 3. NPC berkomentar (gumaman abstrak) ----
  function blip(f, t, d, formant, gain, out, endMul) {
    const o = ac.createOscillator(), o2 = ac.createOscillator();
    o.type = "sawtooth"; o2.type = "sine";
    const end = f * (endMul || (0.92 + Math.random() * 0.2));
    for (const x of [o, o2]) { x.frequency.setValueAtTime(f, t); x.frequency.exponentialRampToValueAtTime(end, t + d); }
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = formant; bp.Q.value = 3;
    const g = ac.createGain(), g2 = ac.createGain();
    env(g, t, C.talkVolume * gain, 0.008, d);
    env(g2, t, C.talkVolume * gain * 0.5, 0.008, d);
    o.connect(bp); bp.connect(g); o2.connect(g2);
    g.connect(out); g2.connect(out);
    o.start(t); o2.start(t); o.stop(t + d + 0.03); o2.stop(t + d + 0.03);
  }
  function talk(x, y, text, pitch) {
    if (!allowed() || !text) return;
    const s = spatial(x, y, C.hearDistance);
    if (!s) return;
    const now = ac.currentTime;
    for (let i = talkEnd.length - 1; i >= 0; i--) if (talkEnd[i] <= now) talkEnd.splice(i, 1);
    if (talkEnd.length >= C.talkMaxVoices) return;
    const out = outNode(s.pan), base = 190 * (pitch || 1), dur = C.talkBlipSeconds;
    let t = now + 0.02, blips = 0;
    for (let i = 0; i < text.length && blips < C.talkMaxBlips; i++) {
      const ch = text[i];
      if (/\s/.test(ch)) { t += 0.035; continue; }                         // jeda antar kata
      if (/[.,!?…]/.test(ch)) { t += 0.12; continue; }                     // jeda tanda baca
      if (i % 2) continue;                                                  // satu bunyi tiap dua huruf
      const code = ch.toLowerCase().charCodeAt(0);
      const f = base * Math.pow(2, (((code * 7) % 9) - 4) / 12) * (0.97 + Math.random() * 0.06);   // nada tiap huruf tetap, tidak berupa kata
      blip(f, t, dur * (0.85 + (code % 3) * 0.12), 500 + ((code * 13) % 12) * 90, s.g, out);
      t += dur; blips++;
    }
    if (/\?\s*$/.test(text)) blip(base * 1.1, t, dur * 1.6, 900, s.g, out, 1.5);     // pertanyaan: nada naik di akhir
    talkEnd.push(t + 0.2);
  }

  return { catchSuccess, npcStep, talk, unlock: ensure };
})();
