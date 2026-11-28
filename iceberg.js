// The Iceberg, live: the same low-poly iceberg as the app's home screen (geometry,
// shading and lanterns ported from core/iceberg/IcebergScene.kt and IcebergCanvas.kt).
// Drag to turn, tap a light, Break the Ice, or write a line and watch it sink.
(function () {
  "use strict";
  var hero = document.getElementById("hero");
  var canvas = document.getElementById("berg");
  var scene = document.getElementById("scene");
  if (!hero || !canvas || !canvas.getContext) return;
  var g = canvas.getContext("2d");
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Palette (the app's Night colours) ----------
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var C = {
    bg: hex("#0B1017"), ice: hex("#9FC4DC"), lamp: hex("#E9B872"),
    iceAbove: hex("#E2EEF6"), iceBelowTop: hex("#5A82A0"), iceBelow: hex("#26425C"), iceDeep: hex("#0B1017"),
    iceEdge: hex("#C8E1F0"), waterTop: hex("#10202E"), waterBottom: hex("#0C1824"),
    words: hex("#F3F8FB"), voice: hex("#E9B872"), melody: hex("#C6BCF5"),
  };
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a.toFixed(3)) + ")"; }

  // ---------- Geometry (IcebergScene.kt) ----------
  var APEX = -0.56, BOTTOM = 1.9, SEGMENTS = 9, F_TOP = -0.30, F_BOTTOM = 1.62;
  var RINGS = [[-0.30, 0.10], [-0.12, 0.22], [0.0, 0.34], [0.18, 0.50], [0.45, 0.64], [0.8, 0.70], [1.15, 0.62], [1.45, 0.46], [1.7, 0.26]];
  var L = (function () { var x = -0.5, y = -0.8, z = -0.35, l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; })();
  var seed = 7;
  function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  var V = [[0.04, APEX, -0.02]];
  RINGS.forEach(function (r, ri) {
    for (var i = 0; i < SEGMENTS; i++) {
      var ang = (i / SEGMENTS) * 2 * Math.PI + (rnd() - 0.5) * 0.35 + ri * 0.31;
      var rad = r[1] * (0.78 + rnd() * 0.42);
      V.push([Math.cos(ang) * rad, r[0] + (rnd() - 0.5) * 0.08, Math.sin(ang) * rad * 0.85]);
    }
  });
  V.push([-0.05, BOTTOM, 0.03]);
  function ring(ri, i) { return 1 + ri * SEGMENTS + ((i + SEGMENTS) % SEGMENTS); }
  var F = [];
  for (var i = 0; i < SEGMENTS; i++) F.push([0, ring(0, i + 1), ring(0, i)]);
  for (var r = 0; r < RINGS.length - 1; r++) for (i = 0; i < SEGMENTS; i++) {
    F.push([ring(r, i), ring(r, i + 1), ring(r + 1, i)]);
    F.push([ring(r, i + 1), ring(r + 1, i + 1), ring(r + 1, i)]);
  }
  var last = V.length - 1, lr = RINGS.length - 1;
  for (i = 0; i < SEGMENTS; i++) F.push([ring(lr, i), ring(lr, i + 1), last]);

  function radiusAt(y) {
    if (y <= RINGS[0][0]) return RINGS[0][1] * Math.max(0, Math.min(1, (y - APEX) / (RINGS[0][0] - APEX)));
    for (var k = 0; k < RINGS.length - 1; k++) {
      var a = RINGS[k], b = RINGS[k + 1];
      if (y >= a[0] && y <= b[0]) return a[1] + (b[1] - a[1]) * ((y - a[0]) / (b[0] - a[0]));
    }
    var l2 = RINGS[RINGS.length - 1];
    return l2[1] * (1 - Math.max(0, Math.min(1, (y - l2[0]) / (BOTTOM - l2[0]))));
  }
  var SPAN = 730;
  function depthForAge(days) { return Math.max(0, Math.min(1, Math.log(1 + Math.max(0, days)) / Math.log(1 + SPAN))); }
  function yForDepth(d) { return F_TOP + (F_BOTTOM - F_TOP) * Math.max(0, Math.min(1, d)); }
  function hash(key) {
    var h = 0x811C9DC5 | 0;
    for (var k = 0; k < key.length; k++) { h ^= key.charCodeAt(k); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16;
    return h & 0x7fffffff;
  }
  function rotate(v, yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
  }

  // ---------- Ideas in the ice ----------
  var IDEAS = [
    { kind: "words", age: 2, title: "Streetlights", words: "the streetlights hum in B flat\nnobody else seems to hear it" },
    { kind: "words", age: 5, title: "3am", words: "a song that sounds like a kitchen at 3am" },
    { kind: "voice", age: 9, title: "Tuesday hum", words: "walking home, key of B flat", len: "0:42", unfinished: true, tune: 1 },
    { kind: "words", age: 21, title: "Porch light", words: "I kept the porch light on for a ghost\nand the ghost was me", unfinished: true },
    { kind: "melody", age: 40, title: "Four bars in D minor", words: "made in Keys, felt piano", tune: 2 },
    { kind: "voice", age: 150, title: "Voicemail chords", words: "hummed on the night bus,\nfourteen seconds of something", len: "0:14", tune: 0 },
    { kind: "words", age: 95, title: "Bridge idea", words: "half-time, then silence,\nthen the chorus a step up", unfinished: true },
    { kind: "words", age: 120, title: "Hymn for the Night Bus", words: "Hymn for the Night Bus\n(a title, waiting for its song)", fav: true },
    { kind: "words", age: 210, title: "November", words: "your coat still smells like November\nI don't wash it, I don't wear it", unfinished: true, opened: 160 },
    { kind: "voice", age: 330, title: "River", words: "if the river remembers, so will I", len: "0:31", tune: 3 },
    { kind: "words", age: 400, title: "Paper boats", words: "we folded every promise into paper boats\nand let the gutter carry them to sea", fav: true, opened: 240, recording: true },
    { kind: "melody", age: 520, title: "Stay on F", words: "Am – F – C – G\nstay on F one bar longer", unfinished: true },
    { kind: "words", age: 700, title: "Voicemail", words: "everything I meant to tell you\nfits inside a voicemail I never sent" },
    { kind: "voice", age: 60, title: "Stairwell", words: "humming in the stairwell, the echo was perfect", len: "0:19", tune: 1 },
  ];
  var TUNES = [
    { bpm: 80, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], notes: [[69, 1], [72, .5], [71, .5], [69, 1], [67, 1], [65, 1.5], [64, .5], [65, 1], [67, 1], [64, 2], [0, .5], [67, .5], [69, 1], [71, 1], [72, 2]] },
    { bpm: 92, chords: [[58, 62, 65], [55, 58, 62], [51, 55, 58], [53, 57, 60]], notes: [[70, .5], [70, .5], [72, .5], [74, 1.5], [72, .5], [70, 1], [67, 1], [0, .5], [65, .5], [67, .5], [70, 1], [72, 1], [70, 2.5]] },
    { bpm: 88, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], notes: [[62, .5], [65, .5], [69, 1], [67, .5], [65, .5], [64, 1], [62, 1], [61, 1], [62, 2], [0, .5], [69, .5], [70, 1], [69, 2]] },
    { bpm: 76, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], notes: [[64, 1], [67, 1], [69, 1.5], [67, .5], [64, 1], [62, 1], [60, 2], [0, .5], [62, .5], [64, 1], [67, 1], [64, 2]] },
  ];
  var nextId = 1;
  function place(idea) {
    idea.key = "idea:" + (nextId++);
    var h = hash(idea.key);
    idea.angle = ((h & 0xFFFF) / 65535) * 2 * Math.PI;
    idea.radial = 0.3 + Math.sqrt(((h >>> 8) & 0xFFF) / 4095) * 0.55;
    idea.jitter = (((h >>> 20) & 0xFF) / 255 - 0.5) * 0.06;
    idea.phase = (h & 0xFFFF) / 65535 * 6.283;
    idea.lift = 0;
  }
  IDEAS.forEach(place);
  function modelPos(idea, now) {
    var age = idea.age, y;
    if (idea.born != null) { // a line you just wrote: sinks a little while you watch
      var t = (now - idea.born) / 1000;
      age = Math.min(12, t * 0.4);
      y = yForDepth(depthForAge(age)) + idea.jitter;
      if (t < 1.4) { var k = easeOut(t / 1.4); y = APEX - 0.3 + (y - (APEX - 0.3)) * k; }
    } else {
      y = Math.max(F_TOP, Math.min(F_BOTTOM, yForDepth(depthForAge(age)) + idea.jitter));
    }
    if (idea.lift > 0) y = y + (F_TOP - 0.02 - y) * easeOut(idea.lift);
    var rr = radiusAt(Math.max(F_TOP, y)) * idea.radial;
    return [Math.cos(idea.angle) * rr, y, Math.sin(idea.angle) * rr * 0.85];
  }
  function easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 4); }

  // ---------- Camera + layout ----------
  var sceneL = 0, sceneT = 0, W = 0, H = 0, dpr = 1, cx = 0, waterY = 0, scale = 100, yaw = 0.6, pitch = 0.18;
  var vel = 0, dragging = false, lastInteract = -9999, filter = "all";
  var stars = [], snow = [], sparks = [], ripples = [], shooting = null, nextShoot = 6;
  function layout() {
    var hr = hero.getBoundingClientRect(), sr = scene.getBoundingClientRect();
    W = hr.width; H = hr.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sTop = sr.top - hr.top, sLeft = sr.left - hr.left;
    sceneL = sLeft; sceneT = sTop;
    var wide = W >= 920;
    cx = sLeft + sr.width / 2;
    waterY = sTop + sr.height * (wide ? 0.36 : 0.32);
    scale = Math.min(sr.height * (wide ? 0.62 : 0.58) / BOTTOM, sr.width * 0.40 / 0.7);
    hero.style.setProperty("--water", waterY + "px");
    stars = [];
    var n = Math.round(W * waterY / 5200);
    for (var k = 0; k < n; k++) stars.push({ x: Math.random() * W, y: Math.random() * waterY * 0.95, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.4 });
    snow = [];
    for (k = 0; k < 34; k++) snow.push({ h1: Math.random(), h2: Math.random() });
  }

  // ---------- Drawing ----------
  var projected = [];
  function draw(now) {
    var t = now / 1000;
    g.clearRect(0, 0, W, H);

    // stars and a rare shooting star
    stars.forEach(function (s) {
      var a = calm ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      g.fillStyle = "rgba(238,243,247," + a.toFixed(2) + ")";
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
    });
    if (!calm) {
      if (!shooting && t > nextShoot) { shooting = { x: W * (0.15 + Math.random() * 0.6), y: waterY * (0.05 + Math.random() * 0.3), t0: t }; nextShoot = t + 9 + Math.random() * 10; }
      if (shooting) {
        var k = (t - shooting.t0) / 0.9;
        if (k > 1) shooting = null;
        else {
          var sx = shooting.x + k * 220, sy = shooting.y + k * 80;
          var grd = g.createLinearGradient(sx - 90, sy - 33, sx, sy);
          grd.addColorStop(0, "rgba(238,243,247,0)"); grd.addColorStop(1, "rgba(238,243,247," + (0.8 * (1 - k)).toFixed(2) + ")");
          g.strokeStyle = grd; g.lineWidth = 1.4; g.beginPath(); g.moveTo(sx - 90, sy - 33); g.lineTo(sx, sy); g.stroke();
        }
      }
    }

    // water
    var wg = g.createLinearGradient(0, waterY, 0, H);
    wg.addColorStop(0, rgba(C.waterTop)); wg.addColorStop(1, rgba(C.waterBottom));
    g.fillStyle = wg; g.fillRect(0, waterY, W, H - waterY);

    // moon's path on the water
    var moon = hero.querySelector(".moon");
    if (moon) {
      var mr = moon.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      var mx = mr.left - hr.left + mr.width / 2;
      for (var m = 0; m < 9; m++) {
        var yy = waterY + 8 + m * 9, w2 = 26 - m * 2 + Math.sin(t * 1.3 + m) * 6;
        g.fillStyle = "rgba(233,184,114," + (0.16 - m * 0.015).toFixed(3) + ")";
        g.fillRect(mx - w2 / 2 + Math.sin(t * 0.9 + m * 1.7) * 4, yy, w2, 1.5);
      }
    }

    // shimmer and marine snow
    for (m = 0; m < 7; m++) {
      var len = W * (0.08 + (m % 3) * 0.04), speed = 6 + m * 2.3;
      var x0 = ((m * 0.37 * W + (calm ? 0 : t) * speed) % (W + len)) - len;
      var a2 = (0.10 - m * 0.011) * (0.6 + 0.4 * Math.sin(t * 0.8 + m));
      g.strokeStyle = rgba(C.ice, Math.max(0, a2)); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, waterY + 5 + m * 7); g.lineTo(x0 + len, waterY + 5 + m * 7); g.stroke();
    }
    var depthH = H - waterY;
    snow.forEach(function (s, idx) {
      var fall = (s.h2 + (calm ? 0 : t) * (0.004 + s.h1 * 0.006)) % 1;
      var x = s.h1 * W + Math.sin(t * 0.3 + idx) * 6, y = waterY + fall * depthH;
      g.fillStyle = rgba(C.iceEdge, 0.14 * Math.sin(fall * 3.1416));
      g.beginPath(); g.arc(x, y, 0.8 + s.h2, 0, 6.283); g.fill();
    });

    // the iceberg
    var R = V.map(function (v) { return rotate(v, yaw, pitch); });
    projected.length = 0;
    F.forEach(function (f) {
      var a = R[f[0]], b = R[f[1]], c = R[f[2]];
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (nz >= 0.05) return;
      var lam = Math.max(0, -(nx * L[0] + ny * L[1] + nz * L[2]));
      projected.push({
        p: [cx + a[0] * scale, waterY + a[1] * scale, cx + b[0] * scale, waterY + b[1] * scale, cx + c[0] * scale, waterY + c[1] * scale],
        light: 0.35 + 0.65 * lam, meanY: (V[f[0]][1] + V[f[1]][1] + V[f[2]][1]) / 3, depth: (a[2] + b[2] + c[2]) / 3,
      });
    });
    projected.sort(function (a, b) { return b.depth - a.depth; });
    g.lineJoin = "round";
    projected.forEach(function (f) {
      var col, alpha;
      if (f.meanY < 0) { col = mix(C.iceBelowTop, C.iceAbove, Math.min(1, f.light + 0.15)); alpha = 1; }
      else {
        var d = Math.max(0, Math.min(1, f.meanY / BOTTOM));
        col = mix(mix(C.iceBelow, C.iceDeep, d), C.iceAbove, f.light * 0.28 * (1 - d));
        alpha = 1 - d * 0.75;
      }
      var p = f.p;
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.lineTo(p[4], p[5]); g.closePath();
      g.fillStyle = rgba(col, alpha); g.fill();
      g.strokeStyle = rgba(C.iceEdge, 0.22 * alpha); g.lineWidth = 0.6; g.stroke();
      g.save(); g.translate(0.7, -0.5); g.strokeStyle = rgba(C.iceEdge, 0.10 * alpha); g.stroke(); g.restore();
    });
    // snow on the sunlit top edges
    g.lineCap = "round"; g.lineWidth = 1.4;
    projected.forEach(function (f) {
      if (f.meanY >= 0 || f.light < 0.55) return;
      var p = f.p, e = [[0, 1], [1, 2], [2, 0]].sort(function (a, b) { return (p[a[0] * 2 + 1] + p[a[1] * 2 + 1]) - (p[b[0] * 2 + 1] + p[b[1] * 2 + 1]); })[0];
      g.strokeStyle = rgba(C.iceAbove, 0.5 * f.light);
      g.beginPath(); g.moveTo(p[e[0] * 2], p[e[0] * 2 + 1]); g.lineTo(p[e[1] * 2], p[e[1] * 2 + 1]); g.stroke();
    });

    // the hand-drawn waterline
    g.strokeStyle = rgba(C.ice, 0.38); g.lineWidth = 1.2;
    g.beginPath();
    for (var s2 = 0; s2 <= 64; s2++) {
      var wx = W * s2 / 64, wy = waterY + 1.6 * Math.sin(s2 * 0.55 + (calm ? 0 : t) * 0.35) + 0.8 * Math.sin(s2 * 1.7 + 1.3);
      if (s2 === 0) g.moveTo(wx, wy); else g.lineTo(wx, wy);
    }
    g.stroke();

    // lanterns
    var lights = IDEAS.map(function (idea) {
      var mp = rotate(modelPos(idea, now), yaw, pitch);
      idea.sx = cx + mp[0] * scale; idea.sy = waterY + mp[1] * scale; idea.z = mp[2];
      return idea;
    }).sort(function (a, b) { return b.z - a.z; });
    var base = Math.max(3, scale / 62);
    lights.forEach(function (idea) {
      var dFrac = depthForAge(idea.born != null ? 0 : idea.age);
      var col = C[idea.kind];
      var match = filter === "all" || filter === idea.kind;
      var vis = (1 - dFrac * 0.3) * (idea.z > 0.12 ? 0.72 : 1) * (match ? 1 : 0.14);
      var rad = base * (1.15 - dFrac * 0.3);
      var breath = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * (0.45 + idea.phase * 0.03) + idea.phase);
      var glowR = rad * (3.6 + 0.8 * breath) * (match ? 1 : 0.6);
      var gr = g.createRadialGradient(idea.sx, idea.sy, 0, idea.sx, idea.sy, glowR);
      gr.addColorStop(0, rgba(col, 0.42 * vis)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(idea.sx, idea.sy, glowR, 0, 6.283); g.fill();
      g.fillStyle = rgba(C.bg, 0.55 * vis); g.beginPath(); g.arc(idea.sx, idea.sy, rad * 1.75, 0, 6.283); g.fill();
      g.fillStyle = rgba(col, vis); g.beginPath(); g.arc(idea.sx, idea.sy, rad, 0, 6.283); g.fill();
      g.strokeStyle = rgba(col, 0.6 * vis); g.lineWidth = 1; g.beginPath(); g.arc(idea.sx, idea.sy, rad * 1.75, 0, 6.283); g.stroke();
      if (idea.kind !== "words") { g.fillStyle = "rgba(255,255,255," + (0.75 * vis).toFixed(2) + ")"; g.beginPath(); g.arc(idea.sx, idea.sy, rad * 0.38, 0, 6.283); g.fill(); }
      if (idea.highlight) {
        var b2 = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
        g.fillStyle = rgba(C.lamp, 0.18 + 0.14 * b2); g.beginPath(); g.arc(idea.sx, idea.sy, rad * (3.6 + 0.9 * b2), 0, 6.283); g.fill();
        g.strokeStyle = rgba(C.lamp, 1); g.lineWidth = 1.5; g.beginPath(); g.arc(idea.sx, idea.sy, rad * (3.2 + 0.5 * b2), 0, 6.283); g.stroke();
      }
    });

    // depth marks, like the app's right edge
    var sr = scene.getBoundingClientRect(), hr2 = hero.getBoundingClientRect();
    var edge = sr.right - hr2.left - 6;
    g.font = "600 12px 'Atkinson Next', system-ui, sans-serif"; g.textAlign = "right"; g.textBaseline = "middle";
    [[0, "now"], [7, "1 wk"], [30, "1 mo"], [182, "6 mo"], [365, "1 yr"], [730, "2 yrs"]].forEach(function (mk) {
      var y = waterY + yForDepth(depthForAge(mk[0])) * scale * Math.cos(pitch);
      if (y > H - 30) return;
      g.strokeStyle = "rgba(154,168,182,.5)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(edge - 6, y); g.lineTo(edge, y); g.stroke();
      g.fillStyle = "rgba(154,168,182,.75)"; g.fillText(mk[1], edge - 10, y);
    });

    // ripples and sparkles
    ripples = ripples.filter(function (rp) {
      var k2 = (now - rp.t0) / 1600; if (k2 > 1) return false;
      g.strokeStyle = rgba(C.iceAbove, 0.5 * (1 - k2)); g.lineWidth = 1;
      g.beginPath(); g.ellipse(rp.x, rp.y, 8 + k2 * 46, 2 + k2 * 9, 0, 0, 6.283); g.stroke();
      return true;
    });
    sparks = sparks.filter(function (sp) {
      var k3 = (now - sp.t0) / sp.life; if (k3 > 1) return false;
      var x = sp.x + sp.vx * k3 * 40, y = sp.y + sp.vy * k3 * 40 + k3 * k3 * 12;
      g.fillStyle = rgba(sp.c, 1 - k3);
      g.beginPath(); g.arc(x, y, sp.r * (1 - k3 * 0.5), 0, 6.283); g.fill();
      return true;
    });

    // blend the deep body into the sea below the hero
    var fade = g.createLinearGradient(0, H - 140, 0, H);
    fade.addColorStop(0, rgba(C.waterBottom, 0)); fade.addColorStop(1, rgba(C.waterBottom, 1));
    g.fillStyle = fade; g.fillRect(0, H - 140, W, 140);
  }

  // ---------- Loop ----------
  var running = false, visible = true, lastT = 0;
  function frame(now) {
    if (!visible) { running = false; return; }
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0); lastT = now;
    if (!dragging) {
      if (Math.abs(vel) > 0.0005) { yaw += vel * dt; vel *= Math.pow(0.12, dt); }
      else if (!calm && now - lastInteract > 1600) yaw += 0.09 * dt;
    }
    IDEAS.forEach(function (idea) {
      if (idea.liftTarget != null) idea.lift += (idea.liftTarget - idea.lift) * Math.min(1, dt * (idea.liftTarget ? 2.2 : 1.4));
    });
    draw(now);
    requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(hero);
  }
  addEventListener("resize", function () { layout(); });
  if (document.fonts) document.fonts.ready.then(layout);
  layout(); start();

  // ---------- Pointer: drag to turn, tap a light, sparkles in the sky ----------
  var down = null;
  canvas.addEventListener("pointerdown", function (e) {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, moved: false, id: e.pointerId };
    lastInteract = performance.now(); vel = 0;
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.lx;
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      down.moved = true; dragging = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    if (dragging) {
      var now = performance.now(), step = dx / (scale * 0.9);
      yaw += step; vel = step / Math.max(0.008, (now - (down.lt || down.t)) / 1000);
      down.lx = e.clientX; down.lt = now; lastInteract = now;
      hero.classList.add("turned");
    }
  });
  function up(e) {
    if (!down) return;
    var wasDrag = down.moved;
    if (!wasDrag) tap(e.clientX, e.clientY);
    if (wasDrag && performance.now() - (down.lt || 0) > 90) vel = 0;
    vel = Math.max(-6, Math.min(6, vel));
    dragging = false; down = null; lastInteract = performance.now();
  }
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", function () { dragging = false; down = null; });

  function tap(clientX, clientY) {
    var hr = hero.getBoundingClientRect(), x = clientX - hr.left, y = clientY - hr.top;
    var best = null, bd = 26;
    IDEAS.forEach(function (idea) {
      if (filter !== "all" && filter !== idea.kind) return;
      var d = Math.hypot(idea.sx - x, idea.sy - y) + (idea.z > 0.12 ? 8 : 0);
      if (d < bd) { bd = d; best = idea; }
    });
    if (best) { openCard(best, false); return; }
    if (y < waterY - 4) burst(x, y, [C.words, C.lamp, C.ice], 14);
    else ripples.push({ x: x, y: Math.max(y, waterY + 2), t0: performance.now() });
  }
  function burst(x, y, cols, n) {
    var now = performance.now();
    for (var k = 0; k < n; k++) {
      var a = Math.random() * 6.283, sp = 0.4 + Math.random();
      sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.3, r: 1 + Math.random() * 1.6, c: cols[k % cols.length], t0: now, life: 700 + Math.random() * 600 });
    }
  }

  // ---------- Filter chips ----------
  Array.prototype.forEach.call(scene.querySelectorAll(".chip"), function (chip, _, all) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      Array.prototype.forEach.call(scene.querySelectorAll(".chip"), function (c) { var on = c === chip; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on); });
    });
  });

  // ---------- A tiny synth, so voice memos can "play" ----------
  var audio = null;
  function ac() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audio) audio = new AC();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function playTune(tune, keys, onEnd) {
    var a = ac();
    if (!a) { onEnd(); return function () {}; }
    var t0 = a.currentTime + 0.05, master = a.createGain(), lp = a.createBiquadFilter(), nodes = [];
    lp.type = "lowpass"; lp.frequency.value = 1800;
    master.gain.value = 0.0001; master.gain.exponentialRampToValueAtTime(0.5, t0 + 0.15);
    master.connect(lp); lp.connect(a.destination);
    var beat = 60 / tune.bpm, total = 0;
    tune.notes.forEach(function (n) { total += n[1]; });
    tune.chords.forEach(function (ch, ci) {
      if (ci * 4 >= total) return;
      var st = t0 + ci * 4 * beat, ln = 4 * beat;
      ch.forEach(function (m) {
        var o = a.createOscillator(), gn = a.createGain();
        o.type = "triangle"; o.frequency.value = hz(m);
        gn.gain.setValueAtTime(0.0001, st); gn.gain.linearRampToValueAtTime(0.045, st + 0.4); gn.gain.linearRampToValueAtTime(0.0001, st + ln + 0.3);
        o.connect(gn); gn.connect(master); o.start(st); o.stop(st + ln + 0.4); nodes.push(o);
      });
    });
    var at = t0;
    tune.notes.forEach(function (n) {
      var ln = n[1] * beat;
      if (n[0] > 0) {
        var o = a.createOscillator(), gn = a.createGain();
        o.type = keys ? "triangle" : "sine"; o.frequency.value = hz(n[0]);
        if (!keys) { var v = a.createOscillator(), vg = a.createGain(); v.frequency.value = 5.2; vg.gain.value = 3.5; v.connect(vg); vg.connect(o.frequency); v.start(at); v.stop(at + ln); nodes.push(v); }
        gn.gain.setValueAtTime(0.0001, at);
        gn.gain.linearRampToValueAtTime(keys ? 0.18 : 0.22, at + (keys ? 0.01 : 0.06));
        if (keys) gn.gain.exponentialRampToValueAtTime(0.0008, at + ln * 0.98);
        else { gn.gain.setValueAtTime(0.2, at + ln * 0.7); gn.gain.linearRampToValueAtTime(0.0001, at + ln * 0.98); }
        o.connect(gn); gn.connect(master); o.start(at); o.stop(at + ln); nodes.push(o);
      }
      at += ln;
    });
    var ended = false, timer = setTimeout(finish, (at - t0) * 1000 + 400);
    function finish() {
      if (ended) return; ended = true; clearTimeout(timer);
      var n = a.currentTime;
      master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(0.0001, n + 0.25);
      setTimeout(function () { nodes.forEach(function (o) { try { o.stop(); } catch (err) {} }); master.disconnect(); }, 300);
      onEnd();
    }
    return finish;
  }

  // ---------- The card (preview or Break the Ice) ----------
  var card = document.getElementById("card");
  var f = function (k) { return card.querySelector('[data-f="' + k + '"]'); };
  var playBtn = card.querySelector("[data-play]");
  var current = null, stopPlay = null, surfaced = {};
  var KIND = { words: "Words", voice: "Voice", melody: "Melody" };
  function ago(d) {
    if (d < 1) return "just now";
    if (d < 2) return "yesterday";
    if (d < 7) return Math.round(d) + " days ago";
    if (d < 30) { var w = Math.round(d / 7); return w === 1 ? "a week ago" : w + " weeks ago"; }
    if (d < 365) { var mo = Math.round(d / 30); return mo === 1 ? "a month ago" : mo + " months ago"; }
    var y = Math.round(d / 365); return y === 1 ? "a year ago" : y + " years ago";
  }
  function reasons(idea) {
    var out = ["You caught this " + ago(idea.age) + "."];
    out.push(idea.opened ? "You last opened it " + ago(idea.opened) + "." : "You haven't opened it since.");
    if (idea.unfinished) out.push("It's still unfinished.");
    else if (idea.fav) out.push("You starred it once.");
    else if (idea.recording || idea.kind === "voice") out.push("There's a recording with it.");
    else out.push("It isn't connected to any other idea.");
    return out.slice(0, 3);
  }
  function stopAudio() { if (stopPlay) { stopPlay(); stopPlay = null; } }
  function settle(idea) { if (idea) { idea.liftTarget = 0; idea.highlight = false; } }
  function openCard(idea, surfacing) {
    stopAudio();
    if (current && current !== idea) settle(current);
    current = idea;
    idea.highlight = true;
    if (surfacing) { idea.lift = idea.lift || 0; idea.liftTarget = 1; }
    f("sub").hidden = !surfacing;
    f("kind").textContent = KIND[idea.kind];
    f("kind").className = "kind k-" + idea.kind;
    f("age").textContent = idea.born != null ? "just now" : ago(idea.age);
    f("title").textContent = idea.title;
    f("words").textContent = idea.words;
    var tune = idea.tune != null ? TUNES[idea.tune] : null;
    playBtn.hidden = !tune;
    if (tune) f("len").textContent = idea.len || "0:12";
    f("whybox").hidden = !surfacing; f("actions").hidden = !surfacing; f("foot").hidden = !surfacing;
    if (surfacing) {
      f("reasons").innerHTML = "";
      reasons(idea).forEach(function (r, k) { var li = document.createElement("li"); li.textContent = r; li.style.setProperty("--k", k); f("reasons").appendChild(li); });
    }
    card.hidden = false;
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    if (surfacing) card.classList.add("surfacing"); else card.classList.remove("surfacing");
  }
  function closeCard() {
    stopAudio(); settle(current); current = null;
    card.classList.remove("in"); card.classList.add("out");
    setTimeout(function () { card.hidden = true; card.classList.remove("out"); }, calm ? 0 : 320);
  }
  card.querySelector(".card-x").addEventListener("click", closeCard);
  playBtn.addEventListener("click", function () {
    if (stopPlay) { stopAudio(); return; }
    if (!current || current.tune == null) return;
    playBtn.classList.add("on"); playBtn.setAttribute("aria-label", "Stop");
    stopPlay = playTune(TUNES[current.tune], current.kind === "melody", function () {
      stopPlay = null; playBtn.classList.remove("on"); playBtn.setAttribute("aria-label", "Play this idea");
    });
  });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && !card.hidden) closeCard(); });

  // Break the Ice: the app's scoring, simplified for a demo archive.
  function breakTheIce(exclude) {
    var pool = IDEAS.filter(function (i) { return i.born == null && i.age >= 7 && i !== exclude && (filter === "all" || filter === i.kind); });
    if (!pool.length) pool = IDEAS.filter(function (i) { return i.born == null && i.age >= 7; });
    var scored = pool.map(function (i) {
      var s = Math.min(28, i.age / 7) + (i.opened ? Math.min(20, i.opened * 2) : 14) + (surfaced[i.key] ? -45 : 30) +
        (i.unfinished ? 12 : 0) + 8 + (i.fav ? 6 : 0) + 5 + (i.kind !== "words" || i.recording ? 4 : 0);
      return { i: i, s: s };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4);
    var min = scored[scored.length - 1].s, total = 0;
    scored.forEach(function (x) { x.w = Math.max(1, x.s - min + 6); total += x.w; });
    var r = Math.random() * total;
    for (var k = 0; k < scored.length; k++) { r -= scored[k].w; if (r < 0) return scored[k].i; }
    return scored[0].i;
  }
  function surface(exclude) {
    var idea = breakTheIce(exclude);
    surfaced[idea.key] = true;
    if (current) settle(current);
    card.hidden = true;
    current = idea; idea.highlight = true; idea.liftTarget = 1;
    setTimeout(function () { if (current === idea) openCard(idea, true); }, calm ? 0 : 650);
  }
  scene.querySelector("[data-bti]").addEventListener("click", function () { lastInteract = performance.now(); surface(); });
  card.querySelector("[data-another]").addEventListener("click", function () { var prev = current; closeCard(); setTimeout(function () { surface(prev); }, calm ? 0 : 340); });
  card.querySelector("[data-notnow]").addEventListener("click", function () { toast("Okay. It'll stay down for two weeks."); closeCard(); });

  // ---------- The dock: write a line or record, and it joins the ice ----------
  var dock = document.getElementById("dock"), input = document.getElementById("dock-input");
  var timerEl = dock.querySelector(".dock-timer"), toastEl = scene.querySelector(".dock-toast"), toastT = null;
  function toast(text) {
    toastEl.textContent = text; toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 3600);
  }
  input.addEventListener("input", function () { dock.classList.toggle("has-text", input.value.trim().length > 0); dock.querySelector(".dock-rec").setAttribute("aria-label", input.value.trim() ? "Keep it" : "Record a voice memo"); });
  var recTimer = null, recStart = 0;
  function keep(kind, text) {
    IDEAS.forEach(function (i) { if (i.born != null) i.highlight = false; });
    var idea = { kind: kind, age: 0, born: performance.now(), title: kind === "voice" ? "New voice memo" : "Your idea", words: text, highlight: true };
    if (kind === "voice") { idea.tune = Math.floor(Math.random() * TUNES.length); idea.len = text; idea.words = "a hum you just caught"; }
    place(idea); IDEAS.push(idea);
    if (IDEAS.filter(function (i) { return i.born != null; }).length > 4) IDEAS.splice(IDEAS.indexOf(IDEAS.filter(function (i) { return i.born != null; })[0]), 1);
    lastInteract = performance.now();
    toast(kind === "voice" ? "Kept. Your hum is at the surface now." : "Kept. Over the weeks it will sink slowly. That's the point.");
    setTimeout(function () { idea.highlight = false; }, 6000);
  }
  function stopRec() {
    clearInterval(recTimer); recTimer = null;
    var secs = Math.max(1, Math.round((performance.now() - recStart) / 1000));
    dock.classList.remove("rec"); timerEl.textContent = "";
    input.disabled = false;
    keep("voice", "0:" + (secs < 10 ? "0" : "") + secs);
  }
  dock.addEventListener("submit", function (e) {
    e.preventDefault();
    if (recTimer) { stopRec(); return; }
    var text = input.value.trim();
    if (text) { keep("words", text); input.value = ""; dock.classList.remove("has-text"); input.blur(); return; }
    dock.classList.add("rec"); input.disabled = true; recStart = performance.now(); timerEl.textContent = "Recording 0:00";
    recTimer = setInterval(function () {
      var s = Math.floor((performance.now() - recStart) / 1000);
      timerEl.textContent = "Recording 0:0" + Math.min(9, s);
      if (s >= 4) stopRec();
    }, 250);
  });

  // ---------- The paper boat and the alpaca ----------
  var boat = scene.querySelector(".boat"), floe = scene.querySelector(".floe");
  function notes(x, y, host) {
    "♪♫♩".split("").forEach(function (n, k) {
      var s = document.createElement("span"); s.className = "float-note"; s.textContent = n;
      s.style.left = x + (k - 1) * 14 + "px"; s.style.top = y + "px"; s.style.animationDelay = k * 120 + "ms";
      host.appendChild(s); setTimeout(function () { s.remove(); }, 1900);
    });
  }
  function boatLoop(now) {
    if (visible) {
      var t = now / 1000, span = W + 120, period = 46;
      var ph = (t % (period * 2)) / period; // 0..2
      var k = ph < 1 ? ph : 2 - ph;
      var x = -60 + k * span, bob = Math.sin(t * 1.6) * 2;
      boat.style.transform = "translate(" + (x - 26 - sceneL) + "px," + (waterY - 30 + bob - sceneT) + "px) scaleX(" + (ph < 1 ? 1 : -1) + ") rotate(" + Math.sin(t * 1.3) * 3 + "deg)";
      boat.style.zIndex = ph < 1 ? 3 : 1;
      var fw = floe.offsetWidth;
      var fx = (W >= 920 ? cx - scale * 0.95 - fw : 10) + Math.sin(t * 0.07) * (W >= 920 ? 30 : 10);
      floe.style.transform = "translate(" + (fx - sceneL) + "px," + (waterY - floe.offsetHeight * 0.83 + Math.sin(t * 1.2) * 3 - sceneT) + "px) rotate(" + Math.sin(t * 0.9) * 1.5 + "deg)";
    }
    requestAnimationFrame(boatLoop);
  }
  requestAnimationFrame(boatLoop);
  boat.addEventListener("click", function () {
    var hr = hero.getBoundingClientRect(), br = boat.getBoundingClientRect();
    boat.classList.remove("hop"); void boat.offsetWidth; boat.classList.add("hop");
    ripples.push({ x: br.left - hr.left + br.width / 2, y: waterY + 2, t0: performance.now() });
    notes(br.left - hr.left + br.width / 2, br.top - hr.top - 6, hero);
  });
  floe.addEventListener("click", function () {
    var hr = hero.getBoundingClientRect(), fr = floe.getBoundingClientRect();
    notes(fr.left - hr.left + fr.width * 0.62, fr.top - hr.top + fr.height * 0.15, hero);
    burst(fr.left - hr.left + fr.width * 0.62, fr.top - hr.top + fr.height * 0.25, [C.lamp, C.words], 10);
  });
})();
