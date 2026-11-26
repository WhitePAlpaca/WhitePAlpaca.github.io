// Version 2: old ideas rest under the water. "Bring one up" lifts one to the surface.
(function () {
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;

  // A still reflection when motion isn't welcome, or on small screens (saves battery).
  if (calm || small) {
    var move = document.getElementById("rippleMove");
    if (move && move.parentNode) move.parentNode.removeChild(move);
  }

  var water = document.querySelector(".water");
  var ideas = Array.prototype.slice.call(document.querySelectorAll(".sunk li"));
  var slot = document.querySelector(".slot");
  var age = document.querySelector(".risen-age");
  var button = document.querySelector(".up");
  if (!water || !ideas.length || !button) return;

  var current = null, order = [3, 0, 4, 1, 5, 2], i = 0, timer = 0;

  function lift(li) {
    if (current) {
      current.classList.remove("risen");
      current.style.left = ""; current.style.top = "";
    }
    current = li;
    var w = water.getBoundingClientRect(), s = slot.getBoundingClientRect();
    li.style.left = ((s.left - w.left) / w.width * 100) + "%";
    li.style.top = ((s.top - w.top) / w.height * 100) + "%";
    li.classList.add("risen");
    age.classList.remove("on");
    clearTimeout(timer);
    timer = setTimeout(function () {
      age.textContent = "You wrote this " + li.getAttribute("data-age") + ".";
      age.classList.add("on");
    }, calm ? 0 : 1500);
  }

  button.addEventListener("click", function () {
    lift(ideas[order[i % order.length]]);
    i++;
    button.textContent = "Bring another up";
  });

  // Keep a risen idea at the surface if the window changes size.
  addEventListener("resize", function () { if (current) { var c = current; current = null; c.classList.remove("risen"); c.style.left = ""; c.style.top = ""; lift(c); } });
})();
