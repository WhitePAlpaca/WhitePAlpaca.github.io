// The Iceberg · whitealpaca.tech
// Small things: a depth gauge, a resurfacing demo you can play, a tap-a-light iceberg,
// a home-screen capture demo, the studio views and the beta sign-up.
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

  // ---------- Reveal ----------
  onView($$(".reveal"), function (el) { el.classList.add("seen"); }, 0.12);

  // ---------- Header + depth gauge ----------
  var top = $(".top"), gauge = $(".gauge"), label = $(".gauge-label");
  var depths = $$("[data-depth]");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    top.classList.toggle("scrolled", y > 8);
    if (!gauge) return;
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    gauge.classList.toggle("on", y > innerHeight * 0.6);
    gauge.style.setProperty("--p", (p * 100).toFixed(2) + "%");
    var mid = innerHeight * 0.5, name = "now";
    depths.forEach(function (s) { if (s.getBoundingClientRect().top < mid) name = s.getAttribute("data-depth"); });
    if (label.textContent !== name) label.textContent = name;
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- Bubbles in the sea ----------
  var sea = $(".sea");
  if (sea && !calm) {
    var b = document.createElement("div");
    b.className = "bubbles"; b.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 14; i++) {
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

  // ---------- A tiny synth, so the demo can "play" a memo ----------
  var audio = null;
  function ctx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audio) audio = new AC();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // Plays a hummed line over a soft pad. Returns a stop function.
  function playIdea(idea, onEnd) {
    var ac = ctx();
    if (!ac) { onEnd(); return function () {}; }
    var t = ac.currentTime + 0.05, master = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1800;
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.5, t + 0.15);
    master.connect(lp); lp.connect(ac.destination);
    var nodes = [];
    var beat = 60 / (idea.bpm || 84);
    var total = 0;
    idea.tune.forEach(function (n) { total += n[1]; });
    // pad chords
    (idea.chords || []).forEach(function (ch, ci) {
      var start = t + ci * 4 * beat, len = 4 * beat;
      if (ci * 4 >= total) return;
      ch.forEach(function (m) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "triangle"; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.045, start + 0.4);
        g.gain.linearRampToValueAtTime(0.0001, start + len + 0.3);
        o.connect(g); g.connect(master); o.start(start); o.stop(start + len + 0.4);
        nodes.push(o);
      });
    });
    // hummed melody: sine + a little vibrato
    var at = t;
    idea.tune.forEach(function (n) {
      var len = n[1] * beat;
      if (n[0] > 0) {
        var o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
        o.type = "sine"; o.frequency.value = hz(n[0]);
        v.frequency.value = 5.2; vg.gain.value = 3.5; v.connect(vg); vg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(0.22, at + 0.06);
        g.gain.setValueAtTime(0.2, at + len * 0.7);
        g.gain.linearRampToValueAtTime(0.0001, at + len * 0.98);
        o.connect(g); g.connect(master);
        o.start(at); v.start(at); o.stop(at + len); v.stop(at + len);
        nodes.push(o, v);
      }
      at += len;
    });
    var ended = false;
    var timer = setTimeout(function () { finish(); }, (at - t) * 1000 + 400);
    function finish() {
      if (ended) return; ended = true; clearTimeout(timer);
      var now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.25);
      setTimeout(function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); master.disconnect(); }, 300);
      onEnd();
    }
    return finish;
  }

  // ---------- Hero: Break the Ice demo ----------
  var IDEAS = [
    { kind: "Voice memo", age: "5 months ago", title: "Voicemail chords", words: "hummed on the night bus, fourteen seconds of something", len: "0:14", bpm: 80,
      reasons: ["You caught this 5 months ago.", "You haven't opened it since."],
      chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
      tune: [[69, 1], [72, .5], [71, .5], [69, 1], [67, 1], [65, 1.5], [64, .5], [65, 1], [67, 1], [64, 2], [0, .5], [67, .5], [69, 1], [71, 1], [72, 2]] },
    { kind: "Words", age: "6 weeks ago", title: "Porch light", words: "I kept the porch light on for a ghost\nand the ghost was me",
      reasons: ["You caught this 6 weeks ago.", "It's still unfinished.", "It isn't connected to any other idea."] },
    { kind: "Voice memo", age: "3 months ago", title: "Tuesday hum", words: "walking home, key of B flat", len: "0:42", bpm: 92,
      reasons: ["You caught this 3 months ago.", "It's still unfinished.", "You haven't opened it since."],
      chords: [[58, 62, 65], [55, 58, 62], [51, 55, 58], [53, 57, 60]],
      tune: [[70, .5], [70, .5], [72, .5], [74, 1.5], [72, .5], [70, 1], [67, 1], [0, .5], [65, .5], [67, .5], [70, 1], [72, 1], [70, 2.5]] },
    { kind: "Words", age: "1 year ago", title: "Paper boats", words: "we folded every promise into paper boats\nand let the gutter carry them to sea", len: "0:31", bpm: 76,
      reasons: ["You caught this a year ago.", "You last opened it 8 months ago.", "You starred it once.", "There's a recording with it."],
      chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]],
      tune: [[64, 1], [67, 1], [69, 1.5], [67, .5], [64, 1], [62, 1], [60, 2], [0, .5], [62, .5], [64, 1], [67, 1], [64, 2]] },
  ];
  var card = $("#surfaced");
  var demo = $(".hero-demo");
  if (demo) onView([demo], function (el) { el.classList.add("go"); }, 0.3);
  if (card) {
    var idx = 0, stop = null;
    var f = function (k) { return card.querySelector('[data-f="' + k + '"]'); };
    var playBtn = card.querySelector("[data-play]");
    function stopPlay() { if (stop) { stop(); stop = null; } }
    function fill(idea) {
      f("kind").textContent = idea.kind;
      f("age").textContent = idea.age;
      f("title").textContent = idea.title;
      f("words").textContent = idea.words;
      playBtn.hidden = !idea.tune;
      if (idea.len) f("len").textContent = idea.len;
      f("reasons").innerHTML = "";
      idea.reasons.forEach(function (r, k) {
        var li = document.createElement("li"); li.textContent = r; li.style.setProperty("--k", k);
        f("reasons").appendChild(li);
      });
    }
    $$("li", f("reasons")).forEach(function (li, k) { li.style.setProperty("--k", k); });
    function next(message) {
      stopPlay();
      if (message) toast(message);
      if (calm) { idx = (idx + 1) % IDEAS.length; fill(IDEAS[idx]); return; }
      card.classList.remove("arriving");
      card.classList.add("leaving");
      setTimeout(function () {
        idx = (idx + 1) % IDEAS.length;
        fill(IDEAS[idx]);
        card.classList.remove("leaving");
        void card.offsetWidth;
        card.classList.add("arriving");
      }, 560);
    }
    function toast(text) {
      var t = document.createElement("div");
      t.className = "toast"; t.setAttribute("role", "status"); t.textContent = text;
      card.parentNode.appendChild(t);
      setTimeout(function () { t.remove(); }, 2100);
    }
    card.querySelector("[data-another]").addEventListener("click", function () { next(); });
    card.querySelector("[data-notnow]").addEventListener("click", function () { next("Okay. It'll stay down for two weeks."); });
    playBtn.addEventListener("click", function () {
      if (stop) { stopPlay(); return; }
      var idea = IDEAS[idx];
      if (!idea.tune) return;
      playBtn.classList.add("on");
      playBtn.setAttribute("aria-label", "Stop");
      stop = playIdea(idea, function () {
        stop = null; playBtn.classList.remove("on"); playBtn.setAttribute("aria-label", "Play this idea");
      });
    });
  }

  // ---------- Tap a light ----------
  var deep = $("#deep");
  if (deep) {
    var note = $(".note", deep), text = $(".note-text", deep), meta = $(".note-meta", deep);
    $$(".light", deep).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".light.picked", deep).forEach(function (o) { o.classList.remove("picked"); });
        void btn.offsetWidth;
        btn.classList.add("picked");
        text.textContent = btn.getAttribute("data-text");
        meta.textContent = btn.getAttribute("data-meta");
        note.classList.remove("up"); void note.offsetWidth; note.classList.add("up");
        setTimeout(function () { btn.classList.remove("picked"); }, 2600);
      });
    });
  }

  // ---------- Home-screen capture demo ----------
  var hs = $("#homescreen");
  if (hs) {
    var time = $(".rec-time", hs), timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function run() {
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
    }
    onView([hs], run, 0.5);
    hs.querySelector("[data-replay]").addEventListener("click", run);
  }

  // ---------- Studio views ----------
  var seg = $(".seg"), shot = $("#shot");
  if (seg && shot) {
    var tabs = $$("button", seg), img = $("img", shot);
    var ink = document.createElement("span"); ink.className = "seg-ink"; seg.appendChild(ink);
    function placeInk(btn) { ink.style.width = btn.offsetWidth + "px"; ink.style.transform = "translateX(" + btn.offsetLeft + "px)"; }
    function select(btn, focus) {
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
    }
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
    var original = note.textContent, label = btn.textContent;
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
          signed_up_from: form.closest(".hero") ? "top of the page" : "beta section",
          _subject: "The Iceberg beta: " + email,
          _template: "table",
          _captcha: "false",
          _honey: honey ? honey.value : "",
        }),
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          var good = res.ok && String(res.j.success) !== "false";
          if (!good) throw new Error("not accepted");
          form.classList.remove("busy"); form.classList.add("sent");
          btn.innerHTML = '<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg> You\'re on the list';
          note.className = "form-note ok";
          note.textContent = "Thank you. Your invite will come to " + email + " when the beta opens.";
          $$("[data-signup] input[type=email]").forEach(function (other) { if (!other.value) other.value = email; });
        })
        .catch(function () {
          form.classList.remove("busy");
          btn.textContent = label;
          note.className = "form-note err";
          var href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent("The Iceberg beta") + "&body=" + encodeURIComponent("Please send a beta invite to: " + email);
          note.innerHTML = 'The sign-up didn\'t go through. <a href="' + href + '">Send it by email instead</a>, or try again.';
        });
    });
  });
})();
