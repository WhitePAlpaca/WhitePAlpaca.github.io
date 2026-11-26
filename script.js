// White Alpaca: stars above the water, drifting snow below it, a depth gauge,
// and a small deep where old ideas rise back up when you tap them.
(function () {
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // Reveal on scroll.
  var items = document.querySelectorAll(".reveal");
  if (calm || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("seen"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  // Depth gauge: the deeper you scroll, the older the ideas.
  var gauge = document.querySelector(".gauge");
  var dot = gauge && gauge.querySelector(".gauge-dot");
  var label = gauge && gauge.querySelector(".gauge-label");
  var sections = document.querySelectorAll("[data-depth]");
  function updateGauge() {
    if (!gauge) return;
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    gauge.classList.toggle("on", scrollY > innerHeight * 0.4);
    dot.style.top = (p * 100) + "%";
    var mid = innerHeight * 0.5, name = "";
    sections.forEach(function (s) { if (s.getBoundingClientRect().top < mid) name = s.getAttribute("data-depth"); });
    if (name && label.textContent !== name) label.textContent = name;
  }

  // Sky and sea.
  var canvas = document.getElementById("sea");
  var waterline = document.getElementById("waterline");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  var stars = [], snow = [];
  function resize() {
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var area = innerWidth * innerHeight;
    stars = []; snow = [];
    for (var i = 0; i < area / 9000; i++) {
      stars.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.9, r: Math.random() * 1.2 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.2 });
    }
    for (var j = 0; j < area / 12000; j++) {
      snow.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.4 + 0.4, v: 0.12 + Math.random() * 0.35, p: Math.random() * 6.28 });
    }
  }
  function seaAmount() {
    if (!waterline) return 0;
    var top = waterline.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, (innerHeight - top) / (innerHeight * 0.75)));
  }
  function draw(t) {
    if (!ctx) return;
    var sea = seaAmount();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (sea < 1) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var a = calm ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
        ctx.globalAlpha = a * (1 - sea);
        ctx.fillStyle = i % 9 === 0 ? "#e9b872" : "#dfe9f2";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    }
    if (sea > 0) {
      ctx.fillStyle = "#cfe2ee";
      for (var j = 0; j < snow.length; j++) {
        var f = snow[j];
        if (!calm) {
          f.y += f.v; f.x += Math.sin(t / 2400 + f.p) * 0.12;
          if (f.y > innerHeight + 4) { f.y = -4; f.x = Math.random() * innerWidth; }
        }
        ctx.globalAlpha = sea * (0.18 + 0.3 * (f.r / 1.8));
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (!calm) requestAnimationFrame(draw);
  }
  resize();
  addEventListener("resize", function () { resize(); if (calm) draw(0); updateGauge(); });
  addEventListener("scroll", function () { updateGauge(); if (calm) draw(0); }, { passive: true });
  updateGauge();
  requestAnimationFrame(draw);

  // The deep: tap a light and that idea rises back to the surface.
  var deep = document.getElementById("deep");
  if (!deep) return;
  var ideas = Array.prototype.slice.call(deep.querySelectorAll(".idea"));
  var note = deep.querySelector(".note");
  var text = note.querySelector(".note-text");
  var meta = note.querySelector(".note-meta");
  var current = null, pending = 0, touched = false, timer = 0, next = 0;

  function raise(btn) {
    if (current === btn) return;
    if (current) { current.classList.remove("up"); current.removeAttribute("aria-pressed"); }
    current = btn;
    btn.classList.add("up"); btn.setAttribute("aria-pressed", "true");
    note.classList.remove("show");
    clearTimeout(pending);
    pending = setTimeout(function () {
      text.textContent = btn.getAttribute("data-text");
      meta.textContent = btn.getAttribute("data-meta");
      note.classList.add("show");
    }, calm ? 0 : 1200);
  }
  ideas.forEach(function (btn) {
    btn.addEventListener("click", function () { touched = true; clearInterval(timer); raise(btn); });
  });

  // Until someone taps, the deep shows itself: one idea rises every few seconds.
  function autoplay() {
    if (touched) return;
    raise(ideas[next % ideas.length]);
    next += 3; // skip around so neighbours don't rise one after another
  }
  if (calm) { raise(ideas[0]); return; }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        clearInterval(timer);
        if (e.isIntersecting && !touched) {
          if (!current) setTimeout(autoplay, 700);
          timer = setInterval(autoplay, 6500);
        }
      });
    }, { threshold: 0.4 }).observe(deep);
  } else {
    raise(ideas[0]);
  }
})();
