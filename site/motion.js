/* Whiteboard motion on the home page. Two collaboration cursors (Advisor and Founder) visit the
   live example and the method steps, leaving hand-drawn circles, underlines, arrows and sticky
   notes that point out what matters. Decorative only: every fact here is also on the page as
   text, the overlay ignores the pointer, and nothing in the layout moves. Readers who ask for
   reduced motion get the finished annotations without cursors. */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const f = (v) => v.toFixed(1);
  const EASE = "cubic-bezier(.45,0,.2,1)";

  // a small seeded generator, so the hand-drawn lines look the same on every visit
  function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  // Catmull-Rom through the points, as cubic curves
  function smooth(pts) {
    let d = "M" + f(pts[0][0]) + " " + f(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += " C" + [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]].map(f).join(" ");
    }
    return d;
  }
  // a pen loop: slightly uneven, and it overshoots where it started
  function loop(cx, cy, rx, ry, seed) {
    const r = rng(seed), pts = [], a0 = -2.5, a1 = a0 + Math.PI * 2 + 0.6;
    for (let i = 0; i <= 28; i++) {
      const a = a0 + ((a1 - a0) * i) / 28, w = 1 + (r() - 0.5) * 0.07 + i * 0.003;
      pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
    }
    return smooth(pts);
  }
  function underline(x0, x1, y, seed) {
    const r = rng(seed), pts = [];
    for (let i = 0; i <= 8; i++) pts.push([x0 + ((x1 - x0) * i) / 8, y + (r() - 0.5) * 2.4 + (i % 2 ? 1 : -1)]);
    return smooth(pts);
  }
  // a curved arrow; bend > 0 bows to the left of the direction of travel
  function arrow(x0, y0, x1, y1, bend) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const cx = (x0 + x1) / 2 + (dy / len) * bend, cy = (y0 + y1) / 2 - (dx / len) * bend;
    const tl = Math.hypot(x1 - cx, y1 - cy) || 1, ux = (x1 - cx) / tl, uy = (y1 - cy) / tl, h = 10;
    const wing = (s) => [x1 - h * (ux * Math.cos(s) - uy * Math.sin(s)), y1 - h * (uy * Math.cos(s) + ux * Math.sin(s))];
    const a = wing(0.5), b = wing(-0.5);
    return ["M" + f(x0) + " " + f(y0) + " Q" + f(cx) + " " + f(cy) + " " + f(x1) + " " + f(y1), "M" + f(a[0]) + " " + f(a[1]) + " L" + f(x1) + " " + f(y1) + " L" + f(b[0]) + " " + f(b[1])];
  }

  const POINTER = '<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M2 1.5 L2 18 L6.6 13.8 L9.6 20.4 L12.6 19 L9.7 12.6 L16 12.4 Z" stroke="#0D0E10" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  // One overlay on top of a host element. Everything is built in its start state, then
  // `go` lets the CSS transitions (each with its own delay) and the cursor animations run.
  function Board(host) {
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const wb = document.createElement("div");
    wb.className = "wb"; wb.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "wb-ink");
    wb.appendChild(svg); host.appendChild(wb);
    const hb = host.getBoundingClientRect(), runs = [];
    // the box of an element's own text, not of its (often full-width) block
    const box = (el, text) => { let r = el.getBoundingClientRect(); if (text) { const g = document.createRange(); g.selectNodeContents(el); r = g.getBoundingClientRect(); } return { x: r.left - hb.left, y: r.top - hb.top, w: r.width, h: r.height, cx: r.left - hb.left + r.width / 2, cy: r.top - hb.top + r.height / 2 }; };
    function ink(d, at, ms) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d); p.setAttribute("pathLength", "1");
      p.style.transition = "stroke-dashoffset " + ms + "ms cubic-bezier(.55,.1,.3,1) " + at + "ms";
      svg.appendChild(p);
    }
    function arrowInk(a, at, ms) { ink(a[0], at, ms); ink(a[1], at + ms - 40, 180); }
    function note(text, x, y, rot, at) {
      const n = document.createElement("div");
      n.className = "wb-note"; n.textContent = text;
      n.style.left = f(x) + "px"; n.style.top = f(y) + "px"; n.style.setProperty("--rot", rot + "deg");
      n.style.transition = "opacity .3s ease-out " + at + "ms, transform .7s cubic-bezier(.2,1.5,.4,1) " + at + "ms";
      wb.appendChild(n);
      return n;
    }
    // stops: [[x, y, ms], ...]; clicks: times (ms) at which the cursor taps where it stands
    function cursor(name, tone, stops, clicks, endAt) {
      const c = document.createElement("div");
      c.className = "wb-cur " + tone; c.innerHTML = POINTER + "<span>" + name + "</span>";
      wb.appendChild(c);
      const t0 = stops[0][2], total = endAt - t0;
      const frames = stops.map(([x, y, t], i) => ({ offset: (t - t0) / total, transform: "translate(" + f(x) + "px," + f(y) + "px)", opacity: i === 0 ? 0 : 1, easing: EASE }));
      // hold fully visible after the last stop, then fade out over the final 600 ms
      const lastFrame = frames[frames.length - 1], hold = (total - 600) / total;
      if (hold > lastFrame.offset) frames.push({ offset: hold, transform: lastFrame.transform, opacity: 1 });
      frames.push({ offset: 1, transform: lastFrame.transform, opacity: 0 });
      runs.push(() => c.animate(frames, { duration: total, delay: t0, fill: "both" }));
      clicks.forEach((t) => {
        const at = stops.reduce((p, s) => (s[2] <= t ? s : p), stops[0]);
        const ring = document.createElement("i");
        ring.className = "wb-ring " + tone; ring.style.left = f(at[0] + 2) + "px"; ring.style.top = f(at[1] + 2) + "px";
        wb.appendChild(ring);
        runs.push(() => ring.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 0.9, transform: "scale(.4)", offset: 0.08 }, { opacity: 0, transform: "scale(1.5)" }], { duration: 650, delay: t, easing: "ease-out", fill: "both" }));
      });
    }
    return {
      wb, box, ink, arrowInk, note, cursor,
      go() { requestAnimationFrame(() => { wb.classList.add("go"); runs.forEach((r) => r()); }); },
      done() { wb.classList.add("done"); wb.querySelectorAll(".wb-cur,.wb-ring").forEach((el) => el.remove()); },
    };
  }

  // The live example: the Advisor circles the debt share and notes how it was found; the
  // Founder underlines the repayment safety; the Advisor circles the sign-off stamp.
  function stripBoard(host) {
    const d = host.querySelector(".decision"); if (!d) return null;
    const debt = d.querySelector(".split-legend span"), dscr = d.querySelector(".decision-stats div:nth-child(2) .gx"), stamp = d.querySelector(".decision-stats .stamp");
    if (!debt || !dscr || !stamp) return null;
    const B = Board(host), D = B.box(d), v = B.box(debt, true), s = B.box(dscr), st = B.box(stamp);
    const room = D.x >= 250;   // sticky notes only where there is space beside the strip
    B.cursor("Advisor", "gold",
      [[D.x - 110, D.y + D.h + 30, 0], [v.x + v.w - 14, v.cy, 900], [v.x + v.w - 14, v.cy, 3600], [st.cx, st.cy - 4, 4500], [st.cx, st.cy - 4, 6800]],
      [950, 4550], 7400);
    B.ink(loop(v.cx, v.cy, v.w / 2 + 14, v.h / 2 + 8, 7), 1050, 650);
    B.cursor("Founder", "ivory",
      [[D.x + D.w + 90, D.y + D.h + 50, 1700], [s.cx + 6, s.cy - 2, 2700], [s.cx + 6, s.cy - 2, 6800]],
      [2750], 7400);
    B.ink(underline(s.x - 4, s.x + s.w + 6, s.y + s.h + 3, 11), 2850, 450);
    B.ink(loop(st.cx, st.cy, st.w / 2 + 12, st.h / 2 + 5, 3), 4650, 600);
    if (room) {
      // placed once rendered, so their own size decides where they go
      const n1 = B.note("Every mix tested, from 0% to 100% debt", 0, 0, -3, 1900);
      const n1x = D.x - 40 - n1.offsetWidth, n1y = D.y + 4;
      n1.style.left = f(n1x) + "px"; n1.style.top = f(n1y) + "px";
      B.arrowInk(arrow(v.x - 4, v.y - 4, n1x + n1.offsetWidth + 8, n1y + n1.offsetHeight * 0.6, -18), 1600, 420);
      const n2 = B.note("A named advisor signs every report", 0, 0, 2.5, 5400);
      const n2x = D.x + D.w + 40, n2y = st.cy - n2.offsetHeight / 2 + 24;
      n2.style.left = f(n2x) + "px"; n2.style.top = f(n2y) + "px";
      B.arrowInk(arrow(st.x + st.w + 12, st.cy, n2x - 8, n2y + n2.offsetHeight * 0.5, 18), 5150, 380);
    }
    return B;
  }

  // The eight method steps: the Advisor walks the numbers in order, an arrow drawn from each
  // step to the next on the same row, and the last step, the sign-off, circled.
  function methodBoard(host) {
    const lis = [...host.querySelectorAll(".method li")]; if (lis.length < 2) return null;
    const B = Board(host), at = (li) => { const b = B.box(li); return [b.x + 9, b.y + 37]; };
    const stops = [], step = 380, start = 200;
    const first = at(lis[0]);
    stops.push([first[0] - 60, first[1] + 70, 0]);
    lis.forEach((li, i) => {
      const [x, y] = at(li), t = start + i * step;
      stops.push([x + 4, y + 2, t + 300]);
      const next = lis[i + 1];
      if (next) {
        const [nx, ny] = at(next);
        if (Math.abs(ny - y) < 4) B.arrowInk(arrow(x + 24, y, nx - 12, ny, 14), t + 360, 300);
      }
    });
    const lastB = B.box(lis[lis.length - 1].querySelector("b"), true);
    const tEnd = start + lis.length * step + 300;
    stops.push([lastB.cx, lastB.cy, tEnd]);
    B.ink(loop(lastB.cx, lastB.cy, lastB.w / 2 + 14, lastB.h / 2 + 7, 5), tEnd + 60, 600);
    B.cursor("Advisor", "gold", stops.concat([[lastB.cx, lastB.cy, tEnd + 1500]]), [tEnd + 40], tEnd + 2100);
    return B;
  }

  const KINDS = [[".strip-sec", ".decision", stripBoard], ["#method", ".method", methodBoard]];
  let io = null, live = [];
  function mount(reduce) {
    if (io) io.disconnect();
    live.forEach((b) => b && b.wb.remove());
    live = [];
    const items = KINDS.map(([h, t, build]) => ({ host: document.querySelector(h), trigger: document.querySelector(h + " " + t), build, played: false, board: null })).filter((k) => k.host && k.trigger);
    if (!items.length) return;
    if (reduce || !("IntersectionObserver" in window) || !Element.prototype.animate) { items.forEach((k) => { k.played = true; finish(k); }); mount.items = items; return; }
    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const k = items.find((it) => it.trigger === e.target); if (!k || k.played) return;
      k.played = true; io.unobserve(e.target);
      // wait for the section's own rise-in to settle so positions are final
      setTimeout(() => { if (!k.host.isConnected) return; k.board = k.build(k.host); if (k.board) { live.push(k.board); k.board.go(); } }, 850);
    }), { threshold: 0.45 });
    items.forEach((k) => io.observe(k.trigger));
    mount.items = items;
  }
  // after a resize, redraw what has already played in its finished state
  let rz;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => (mount.items || []).forEach((k) => {
      if (!k.played || !k.host.isConnected) return;
      if (k.board) { k.board.wb.remove(); live = live.filter((b) => b !== k.board); }
      finish(k);
    }), 200);
  });
  function finish(k) { k.board = k.build(k.host); if (k.board) { k.board.done(); live.push(k.board); } }

  root.BOARD = { mount };
})(typeof window !== "undefined" ? window : globalThis);
