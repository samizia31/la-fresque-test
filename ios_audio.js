/* La Fresque — déblocage audio iOS/Safari (chargé avant index.js).
 * 1) navigator.audioSession.type = "playback" (Safari 16.4+/17) : le son passe malgré le bouton silencieux.
 * 2) Repli (anciens iOS) : <audio> silencieux en boucle lancé dans le premier geste -> session « média ».
 * 3) Garde une référence à chaque AudioContext (dont celui de Godot) et le relance SYNCHRONEMENT
 *    dans chaque vrai geste (touchend / pointerup / click / keydown, en capture) + tampon d'1 échantillon.
 *    Relance aussi sur visibilitychange / pageshow et quand iOS passe le contexte en « interrupted ».
 */
(function () {
  "use strict";
  var nGesture = 0, ctxs = [], el = null, hasSession = false, log = [];
  function note(s) { log.push(s); try { console.log("[IOSAUDIO] " + s); } catch (e) {} }
  try {
    if (navigator.audioSession) { navigator.audioSession.type = "playback"; hasSession = true; note("audioSession=playback"); }
  } catch (e) { note("audioSession erreur " + e); }
  var DEBUG = /[?&]debug=1\b/.test(location.search);
  // Mesure du niveau réellement envoyé à la sortie (tout ce qui se branche sur ctx.destination passe aussi
  // dans un AnalyserNode). Active seulement avec ?debug=1.
  var meters = [], peak = 0, cur = 0;
  if (DEBUG && window.AudioNode && window.AudioDestinationNode) {
    var oconn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (d) {
      var r = oconn.apply(this, arguments);
      try {
        if (d instanceof AudioDestinationNode && !this.__fqMeter) {
          var c = this.context, m = null;
          for (var i = 0; i < meters.length; i++) if (meters[i].context === c) m = meters[i];
          if (!m) { m = c.createAnalyser(); m.fftSize = 1024; meters.push(m); }
          if (this !== m) oconn.call(this, m);
        }
      } catch (e) {}
      return r;
    };
  }
  var AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    var Hooked = function (a, b) {
      var c = (b !== undefined) ? new AC(a, b) : (a !== undefined ? new AC(a) : new AC());
      ctxs.push(c);
      note("AudioContext créé, état=" + c.state + ", " + c.sampleRate + " Hz");
      try { c.addEventListener("statechange", function () {
        note("état=" + c.state);
        // iOS : appel, Siri, autre app audio -> "interrupted" ; on retente (le prochain geste relancera sinon)
        if (c.state === "interrupted" && document.visibilityState === "visible" && nGesture > 0) { var p = c.resume(); if (p && p.catch) p.catch(function () {}); }
      }); } catch (e) {}
      return c;
    };
    Hooked.prototype = AC.prototype;           // garde 'audioWorklet' in AudioContext.prototype
    try { Object.setPrototypeOf(Hooked, AC); } catch (e) {}
    window.AudioContext = Hooked;
    if (window.webkitAudioContext) window.webkitAudioContext = Hooked;
  }
  var SILENT = "data:audio/wav;base64,UklGRsQPAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAPAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";
  function silentEl() {
    if (hasSession) return;                    // inutile avec audioSession
    if (!el) {
      el = document.createElement("audio");
      el.setAttribute("playsinline", ""); el.setAttribute("webkit-playsinline", "");
      el.setAttribute("x-webkit-airplay", "deny"); el.preload = "auto"; el.loop = true; el.src = SILENT;
      el.disableRemotePlayback = true; el.setAttribute("aria-hidden", "true");
    }
    if (el.paused && document.visibilityState !== "hidden") {
      var p = el.play(); if (p && p.catch) p.catch(function (e) { note("silence refusé " + e.name); });
    }
  }
  function kick(c) {
    try {
      if (c.state !== "running" && c.state !== "closed") { var p = c.resume(); if (p && p.catch) p.catch(function () {}); }
      if (c.state === "closed") return;
      var b = c.createBuffer(1, 1, c.sampleRate), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) { note("kick erreur " + e); }
  }
  function gesture(ev) {
    nGesture++;
    silentEl();
    for (var i = 0; i < ctxs.length; i++) if (ctxs[i].state !== "running" || nGesture <= 2) kick(ctxs[i]);
  }
  ["touchend", "pointerup", "click", "keydown"].forEach(function (t) {
    document.addEventListener(t, gesture, { capture: true, passive: true });
  });
  function wake() {
    if (document.visibilityState === "hidden") { if (el && !el.paused) el.pause(); return; }
    for (var i = 0; i < ctxs.length; i++) {
      var c = ctxs[i];
      if (c.state === "suspended" || c.state === "interrupted") { var p = c.resume(); if (p && p.catch) p.catch(function () {}); }
    }
  }
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pageshow", wake);
  window.addEventListener("focus", wake);
  function level() {
    var m = 0;
    for (var i = 0; i < meters.length; i++) {
      var a = meters[i], d = new Float32Array(a.fftSize);
      if (a.getFloatTimeDomainData) a.getFloatTimeDomainData(d);
      for (var j = 0; j < d.length; j++) { var v = d[j] < 0 ? -d[j] : d[j]; if (v > m) m = v; }
    }
    cur = m; if (m > peak) peak = m; return m;
  }
  window.__fresqueAudio = {
    level: function () { level(); return { cur: cur, peak: peak }; }, gestures: function () { return nGesture; },
    contexts: ctxs, log: log,
    states: function () { return ctxs.map(function (c) { return c.state; }); },
    silentPlaying: function () { return !!(el && !el.paused); },
    session: function () { return navigator.audioSession ? navigator.audioSession.type : null; }
  };

  // ---------- Overlay de diagnostic (?debug=1 uniquement) ----------
  if (!DEBUG) return;
  var godotLog = [], ocl = console.log;
  console.log = function () {
    try { var t = String(arguments[0]); if (/^\[(AUDIO|GODOTAUDIO)\]/.test(t)) { godotLog.push(t); if (godotLog.length > 30) godotLog.shift(); } } catch (e) {}
    return ocl.apply(console, arguments);
  };
  var beepCtx = null, beepInfo = "pas encore testé";
  function beep(useGodot) {
    try {
      var c;
      if (useGodot) { c = ctxs[0]; if (!c) { beepInfo = "aucun contexte Godot"; return; } }
      else { if (!beepCtx) beepCtx = new AC(); c = beepCtx; }
      if (c.state !== "running") { var p = c.resume(); if (p && p.catch) p.catch(function () {}); }
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = "square"; o.frequency.value = 660;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.__fqMeter = true; g.connect(c.destination); o.start(t); o.stop(t + 0.65);
      beepInfo = (useGodot ? "bip contexte Godot" : "bip hors Godot") + " lancé, état=" + c.state;
      note(beepInfo);
      setTimeout(function () { beepInfo += " -> " + c.state + ", t=" + c.currentTime.toFixed(2); }, 400);
    } catch (e) { beepInfo = "bip erreur " + e; note(beepInfo); }
  }
  function build() {
    var box = document.createElement("div");
    box.id = "fq-debug";
    box.style.cssText = "position:fixed;left:0;top:0;right:0;max-height:45%;overflow:auto;z-index:99999;" +
      "background:rgba(0,0,0,.82);color:#7CFC9A;font:bold 15px/1.35 Menlo,monospace;padding:8px 10px;" +
      "white-space:pre-wrap;word-break:break-word;-webkit-user-select:text;user-select:text;touch-action:pan-y";
    var bar = document.createElement("div");
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px";
    function btn(label, fn) {
      var b = document.createElement("button"); b.textContent = label;
      b.style.cssText = "font:bold 17px Menlo,monospace;padding:10px 14px;border-radius:8px;border:2px solid #7CFC9A;background:#123;color:#fff";
      b.addEventListener("click", function (e) { e.stopPropagation(); fn(b); });
      ["touchstart", "touchend", "pointerdown", "pointerup", "mousedown", "mouseup"].forEach(function (t) {
        b.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
      });
      bar.appendChild(b); return b;
    }
    var txt = document.createElement("div");
    btn("BIP TEST (hors Godot)", function () { beep(false); });
    btn("BIP contexte Godot", function () { beep(true); });
    btn("masquer", function (b) { var h = txt.style.display !== "none"; txt.style.display = h ? "none" : "block"; b.textContent = h ? "afficher" : "masquer"; });
    box.appendChild(bar); box.appendChild(txt);
    // les touches sur le texte ne doivent pas partir dans le jeu
    ["touchstart", "touchend", "pointerdown", "pointerup", "mousedown", "mouseup", "click"].forEach(function (t) {
      txt.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
    document.body.appendChild(box);
    function db(v) { return (v > 0 ? (20 * Math.log(v) / Math.LN10).toFixed(1) + " dB" : "-inf"); }
    setInterval(function () {
      level();
      var G = window.__fresqueGodot, L = [];
      L.push("DIAG SON La Fresque — " + new Date().toLocaleTimeString());
      L.push("NIVEAU SORTIE: " + db(cur) + " (max " + db(peak) + ")" + (peak > 0.003 ? "  => le jeu envoie du son" : "  => le jeu n'envoie RIEN"));
      L.push("audioSession: " + (navigator.audioSession ? navigator.audioSession.type + " (état " + (navigator.audioSession.state || "?") + ")" : "non dispo"));
      L.push("gestes: " + nGesture + " | <audio> silencieux: " + (el ? (el.paused ? "en pause" : "joue") : (hasSession ? "inutile (audioSession)" : "pas créé")));
      L.push("AudioContext: " + (ctxs.length ? ctxs.map(function (c, i) { return "#" + i + " " + c.state + " " + c.sampleRate + "Hz t=" + c.currentTime.toFixed(1); }).join(" | ") : "aucun"));
      L.push("bip: " + beepInfo + (beepCtx ? " [ctx bip " + beepCtx.state + "]" : ""));
      if (G) {
        L.push("Godot: lecture web=" + G.playback + " mix=" + G.mix + "Hz déverrouillé=" + G.unlocked + " sfx=" + G.sfx_on + " musique=" + G.music_on);
        L.push("musique: " + (G.music || "-") + " joue=" + G.music_playing + " | foule joue=" + G.amb_playing);
        L.push("bus: " + G.buses.map(function (b) { return b.name + " " + b.db.toFixed(1) + "dB" + (b.mute ? " MUET" : "") + (b.send ? "->" + b.send : ""); }).join(" | "));
      } else L.push("Godot: pas encore démarré");
      L.push("UA: " + navigator.userAgent);
      L.push("--- log [IOSAUDIO] ---"); L.push(log.slice(-8).join("\n"));
      L.push("--- log [AUDIO] Godot ---"); L.push(godotLog.slice(-6).join("\n"));
      txt.textContent = L.join("\n");
    }, 300);
  }
  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
})();
