// The Iceberg · whitealpaca.tech
// Small things: hand-drawn ink under titles, a nav ink mark, a depth gauge, the capture demo,
// the studio views and the beta sign-up. The live iceberg is in iceberg.js.
(function () {
  "use strict";

  // Where beta sign-ups go. FormSubmit forwards each one to this inbox as an email.
  // The first submission sends an "Activate form" email to the inbox: click it once.
  // To use a Google Form or another service instead, change this one line.
  var SIGNUP_ENDPOINT = "https://formsubmit.co/ajax/anewyak@gmail.com";
  var CONTACT = "anewyak@gmail.com";

  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function onView(els, fn, threshold) {
    if (!("IntersectionObserver" in window)) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } });
    }, { threshold: threshold || 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---------- Hand-drawn ink under each section title, like the app's screen titles ----------
  var INK = [
    "M2 6 C 14 1, 24 11, 38 6 S 62 1, 76 6 S 100 11, 118 5",
    "M2 5 C 18 9, 30 1, 46 5 S 74 10, 90 4 S 108 2, 118 6",
    "M2 6 C 12 2, 26 10, 40 5 S 66 2, 80 7 S 104 9, 118 4",
  ];
  $$(".sea h2").forEach(function (h, k) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 120 12");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "ink");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", INK[k % INK.length]);
    svg.appendChild(path);
    h.appendChild(svg);
  });

  // ---------- Reveal ----------
  onView($$(".reveal"), function (el) { el.classList.add("seen"); }, 0.12);

  // ---------- Header, depth gauge, nav ink ----------
  var top = $(".top"), gauge = $(".gauge"), label = $(".gauge-label");
  var depths = $$("[data-depth]");
  var navInk = $(".nav-ink"), navLinks = $$("[data-spy]"), spyOn = null;
  function spy() {
    if (!navInk) return;
    var mid = innerHeight * 0.4, on = null;
    navLinks.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute("data-spy"));
      if (sec && sec.getBoundingClientRect().top < mid) on = a;
    });
    if (on && getComputedStyle(on).display === "none") on = null;
    if (on === spyOn) return;
    spyOn = on;
    navLinks.forEach(function (a) { a.classList.toggle("here", a === on); });
    if (!on) { navInk.classList.remove("on"); return; }
    var nr = navInk.parentNode.getBoundingClientRect(), r = on.getBoundingClientRect();
    navInk.style.width = r.width + "px";
    navInk.style.transform = "translateX(" + (r.left - nr.left) + "px)";
    navInk.classList.add("on");
  }
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    top.classList.toggle("scrolled", y > 8);
    if (gauge) {
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      gauge.classList.toggle("on", y > innerHeight * 0.6);
      gauge.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      var mid = innerHeight * 0.5, name = "now";
      depths.forEach(function (s) { if (s.getBoundingClientRect().top < mid) name = s.getAttribute("data-depth"); });
      if (label.textContent !== name) label.textContent = name;
    }
    spy();
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", function () { spyOn = null; spy(); });
  onScroll();

  // ---------- Bubbles in the sea ----------
  var sea = $(".sea");
  if (sea && !calm) {
    var b = document.createElement("div");
    b.className = "bubbles"; b.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 16; i++) {
      var dot = document.createElement("i");
      dot.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
      dot.style.setProperty("--s", (4 + Math.random() * 8).toFixed(1) + "px");
      dot.style.setProperty("--t", (14 + Math.random() * 16).toFixed(1) + "s");
      dot.style.setProperty("--d", (-Math.random() * 30).toFixed(1) + "s");
      b.appendChild(dot);
    }
    sea.insertBefore(b, sea.firstChild);
  }

  // ---------- "New Recording 87" counter ----------
  onView($$("[data-count]"), function (el) {
    var end = +el.getAttribute("data-count");
    if (calm) { el.textContent = end; return; }
    var t0 = performance.now(), dur = 1400;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(1 + (end - 1) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }, 0.6);

  // ---------- Home-screen capture demo ----------
  var hs = $("#homescreen");
  if (hs) {
    var time = $(".rec-time", hs), timers = [];
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var run = function () {
      timers.forEach(clearTimeout); timers = [];
      hs.className = "homescreen reveal seen";
      time.textContent = "0:00";
      if (calm) { hs.classList.add("kept", "done"); time.textContent = "0:06"; return; }
      later(function () { hs.classList.add("tapping"); }, 700);
      later(function () { hs.classList.add("recording"); }, 1000);
      for (var s = 1; s <= 6; s++) (function (s) { later(function () { time.textContent = "0:0" + s; }, 1000 + s * 800); })(s);
      later(function () { hs.classList.remove("recording"); hs.classList.add("kept"); }, 1000 + 6 * 800 + 300);
      later(function () { hs.classList.remove("kept", "tapping"); }, 9200);
      later(function () { hs.classList.add("done"); }, 9800);
    };
    onView([hs], run, 0.5);
    hs.querySelector("[data-replay]").addEventListener("click", run);
  }

  // ---------- Studio views ----------
  var seg = $(".seg"), shot = $("#shot");
  if (seg && shot) {
    var tabs = $$("button", seg), img = $("img", shot);
    var ink = document.createElement("span"); ink.className = "seg-ink"; seg.appendChild(ink);
    var placeInk = function (btn) { ink.style.width = btn.offsetWidth + "px"; ink.style.transform = "translateX(" + btn.offsetLeft + "px)"; };
    var select = function (btn, focus) {
      tabs.forEach(function (t) { var on = t === btn; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
      placeInk(btn);
      if (focus) btn.focus();
      var src = "assets/screens/" + btn.getAttribute("data-shot") + ".webp";
      if (img.getAttribute("src") === src) return;
      var pre = new Image();
      pre.onload = function () {
        shot.classList.add("swap");
        setTimeout(function () { img.src = src; img.alt = btn.getAttribute("data-alt"); shot.classList.remove("swap"); }, calm ? 0 : 220);
      };
      pre.src = src;
    };
    tabs.forEach(function (t, k) {
      t.tabIndex = k === 0 ? 0 : -1;
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(k + d + tabs.length) % tabs.length], true); }
      });
    });
    requestAnimationFrame(function () { placeInk(tabs[0]); });
    addEventListener("resize", function () { placeInk(seg.querySelector("[aria-selected=true]")); });
    if (document.fonts) document.fonts.ready.then(function () { placeInk(seg.querySelector("[aria-selected=true]")); });
  }

  // ---------- Beta sign-up ----------
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $$("[data-signup]").forEach(function (form) {
    var input = form.querySelector("input[type=email]");
    var btn = form.querySelector("button[type=submit]");
    var note = form.querySelector(".form-note");
    var original = note.textContent, labelText = btn.textContent;
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid")) { input.removeAttribute("aria-invalid"); note.className = "form-note"; note.textContent = original; }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("sent") || form.classList.contains("busy")) return;
      var email = input.value.trim();
      if (!EMAIL.test(email)) {
        input.setAttribute("aria-invalid", "true");
        note.className = "form-note err";
        note.textContent = "That email doesn't look complete. Check it and try again.";
        input.focus();
        return;
      }
      var honey = form.querySelector("[name=_honey]");
      var makes = $$("input[name=makes]:checked", form).map(function (c) { return c.value; }).join(", ");
      form.classList.add("busy");
      btn.textContent = "Sending…";
      fetch(SIGNUP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          email: email,
          makes: makes || "not said",
          _subject: "The Iceberg beta: " + email,
          _template: "table",
          _captcha: "false",
          _honey: honey ? honey.value : "",
        }),
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!(res.ok && String(res.j.success) !== "false")) throw new Error("not accepted");
          form.classList.remove("busy"); form.classList.add("sent");
          btn.innerHTML = '<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg> You\'re on the list';
          note.className = "form-note ok";
          note.textContent = "Thank you. Your invite will come to " + email + " when the beta opens.";
        })
        .catch(function () {
          form.classList.remove("busy");
          btn.textContent = labelText;
          note.className = "form-note err";
          var href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent("The Iceberg beta") + "&body=" + encodeURIComponent("Please send a beta invite to: " + email);
          note.innerHTML = 'The sign-up didn\'t go through. <a href="' + href + '">Send it by email instead</a>, or try again.';
        });
    });
  });
})();
