// White Alpaca: a few twinkling stars, and sections that drift into view as you scroll.
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

  // Stars.
  var canvas = document.getElementById("stars");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var stars = [];
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round((innerWidth * innerHeight) / 9000);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight * 0.85, r: Math.random() * 1.2 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.2 });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = calm ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 9 === 0 ? "#e9b872" : "#dfe9f2";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    if (!calm) requestAnimationFrame(draw);
  }
  resize();
  addEventListener("resize", resize);
  requestAnimationFrame(draw);
})();
