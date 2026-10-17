/* Shared UI helpers: escaping, formatting, the click-any-number explain panel, and small SVG charts. */
(function (root) {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }) : "n/a");
  const cr = (x, d = 1) => "Rs " + n(x, d) + " cr";
  const lakh = (x, d = 1) => "Rs " + n(x, d) + " lakh";
  const pct = (x, d = 0) => (Number.isFinite(x) ? (x * 100).toFixed(d) + "%" : "n/a");
  const xx = (x) => (Number.isFinite(x) ? x.toFixed(2) + "x" : "no debt");
  const date = (s) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "");
  const dt = (s) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  // ---------- glass box: every number can explain itself ----------
  const REG = new Map();
  let seq = 0;
  /** Returns a clickable number. info: {title, formula, inputs: [[label, value, source]], note} */
  function gx(display, info) {
    const k = "x" + ++seq;
    REG.set(k, info);
    if (REG.size > 600) REG.delete(REG.keys().next().value);
    return '<button type="button" class="gx" data-gx="' + k + '" title="Show how this number is calculated">' + esc(display) + "</button>";
  }
  function openExplain(k) {
    const info = REG.get(k); if (!info) return;
    const p = document.getElementById("explain");
    const rows = (info.inputs || []).map(([l, v, s]) => "<tr><td>" + esc(l) + "</td><td class=\"num\">" + esc(v) + "</td><td><span class=\"src src-" + esc((s || "engine").split(" ")[0]) + "\">" + esc(s || "engine") + "</span></td></tr>").join("");
    p.querySelector(".xp-body").innerHTML =
      "<h3>" + esc(info.title) + "</h3>" +
      '<div class="xp-label">Formula</div><pre class="formula">' + esc(info.formula) + "</pre>" +
      (rows ? '<div class="xp-label">Inputs used</div><div class="tw"><table class="tbl"><thead><tr><th>Input</th><th class="num">Value</th><th>Source</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : "") +
      (info.note ? '<p class="muted">' + esc(info.note) + "</p>" : "") +
      '<p class="xp-ver">Calculated by ' + esc(root.GB ? root.GB.ENGINE_VERSION : "engine") + " in this page. No AI produced this number.</p>";
    p.hidden = false; p.querySelector(".xp-close").focus();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gx]"); if (b) { e.preventDefault(); openExplain(b.dataset.gx); }
    if (e.target.closest(".xp-close") || e.target.id === "explain") document.getElementById("explain").hidden = true;
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const p = document.getElementById("explain"); if (p) p.hidden = true; } });

  // ---------- charts (single axis, direct labels, hover tooltips) ----------
  const C = { debt: "var(--s-debt)", equity: "var(--s-equity)", mix: "var(--s-mix)", grid: "var(--grid)", axis: "var(--axis)", ink: "var(--ink-2)", bad: "var(--bad)", warn: "var(--warn)" };
  function niceStep(range, k) { const raw = range / k, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function ticks(lo, hi, k = 4) { if (!(hi > lo)) hi = lo + 1; const s = niceStep(hi - lo, k), out = []; for (let v = Math.ceil(lo / s - 1e-9) * s; v <= hi + 1e-9; v += s) out.push(+v.toFixed(8)); return out; }
  let chartSeq = 0;

  /** Horizontal bars with value labels. rows: [{label, value, color, note}] */
  function hbars(rows, opt = {}) {
    const W = 560, rowH = 40, pad = { l: 170, r: 90, t: 8, b: 26 }, H = pad.t + pad.b + rows.length * rowH;
    const mx = Math.max(...rows.map((r) => r.value), 0) * 1.05 || 1, mn = Math.min(0, ...rows.map((r) => r.value));
    const x = (v) => pad.l + (v - mn) / (mx - mn) * (W - pad.l - pad.r);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(mn, mx)) s += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="' + C.grid + '"/><text x="' + x(t) + '" y="' + (H - 8) + '" text-anchor="middle" class="tick">' + n(t, 0) + "</text>";
    rows.forEach((r, i) => {
      const y = pad.t + i * rowH + 8, h = rowH - 16, x0 = x(0), x1 = x(r.value);
      s += '<text x="' + (pad.l - 10) + '" y="' + (y + h / 2 + 4) + '" text-anchor="end" class="lab">' + esc(r.label) + "</text>";
      s += '<rect x="' + Math.min(x0, x1) + '" y="' + y + '" width="' + Math.max(Math.abs(x1 - x0), 1) + '" height="' + h + '" rx="4" fill="' + r.color + '"><title>' + esc(r.label + ": " + cr(r.value)) + "</title></rect>";
      s += '<text x="' + (Math.max(x0, x1) + 8) + '" y="' + (y + h / 2 + 4) + '" class="val">' + esc(opt.fmt ? opt.fmt(r.value) : cr(r.value)) + "</text>";
    });
    return s + "</svg>";
  }

  /** Line chart with crosshair tooltip. series: [{name, color, values, dash}], refs: [{y, label, color}] */
  function lines(xs, series, opt = {}) {
    const id = "lc" + ++chartSeq, W = 560, H = opt.height || 240, pad = { l: 46, r: 16, t: 14, b: 28 };
    const all = series.flatMap((s) => s.values.filter(Number.isFinite)).concat((opt.refs || []).map((r) => r.y));
    let lo = opt.min !== undefined ? opt.min : Math.min(0, ...all), hi = Math.max(...all) * 1.1;
    if (opt.max !== undefined) hi = Math.min(hi, opt.max);
    const X = (i) => pad.l + (xs.length === 1 ? 0.5 : i / (xs.length - 1)) * (W - pad.l - pad.r);
    const Y = (v) => H - pad.b - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo) * (H - pad.t - pad.b);
    let s = '<div class="chartwrap" id="' + id + '"><svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(lo, hi)) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + C.grid + '"/><text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tick">' + esc(opt.yfmt ? opt.yfmt(t) : n(t, t % 1 ? 1 : 0)) + "</text>";
    const every = opt.xEvery || Math.ceil(xs.length / 10);
    xs.forEach((x, i) => { if (i % every === 0) s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" class="tick">' + esc(x) + "</text>"; });
    for (const r of opt.refs || []) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(r.y) + '" y2="' + Y(r.y) + '" stroke="' + (r.color || C.bad) + '" stroke-dasharray="5 4" stroke-width="1.5"/><text x="' + (W - pad.r) + '" y="' + (Y(r.y) - 5) + '" text-anchor="end" class="reflab">' + esc(r.label) + "</text>";
    for (const se of series) {
      const pts = se.values.map((v, i) => (Number.isFinite(v) ? X(i).toFixed(1) + "," + Y(v).toFixed(1) : null)).filter(Boolean);
      s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + se.color + '" stroke-width="2"' + (se.dash ? ' stroke-dasharray="6 4"' : "") + ' stroke-linejoin="round"/>';
      if (se.diamonds) se.values.forEach((v, i) => { if (Number.isFinite(v)) s += '<rect x="' + (X(i) - 4.5).toFixed(1) + '" y="' + (Y(v) - 4.5).toFixed(1) + '" width="9" height="9" transform="rotate(45 ' + X(i).toFixed(1) + " " + Y(v).toFixed(1) + ')" fill="' + se.color + '" stroke="var(--surface,#fff)" stroke-width="1.5"/>'; });
      else se.values.forEach((v, i) => { if (Number.isFinite(v) && (se.dots || xs.length <= 12)) s += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (se.hollow && se.hollow[i] ? 4 : 4) + '" fill="' + (se.hollow && se.hollow[i] ? "var(--surface)" : se.color) + '" stroke="' + se.color + '" stroke-width="2"/>'; });
      if (se.endLabel !== false) { const last = se.values.length - 1; if (Number.isFinite(se.values[last])) s += '<text x="' + (X(last) - 4) + '" y="' + (Y(se.values[last]) - 9) + '" text-anchor="end" class="dl">' + esc(se.name) + "</text>"; }
    }
    const dia = (x, y, r, fill) => '<rect x="' + (x - r).toFixed(1) + '" y="' + (y - r).toFixed(1) + '" width="' + 2 * r + '" height="' + 2 * r + '" transform="rotate(45 ' + x.toFixed(1) + " " + y.toFixed(1) + ')" fill="' + fill + '" stroke="var(--surface,#fff)" stroke-width="2"/>';
    for (const m of opt.marks || []) s += dia(X(m.i), Y(m.v), m.gold === false ? 5 : 7, m.gold === false ? "var(--ink-2)" : "var(--gold)") + '<text x="' + X(m.i) + '" y="' + (Y(m.v) + 24) + '" text-anchor="middle" class="dl">' + esc(m.label) + "</text>";
    s += '<line class="xh" x1="0" x2="0" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="var(--axis)" visibility="hidden"/>';
    xs.forEach((x, i) => {
      const w = (W - pad.l - pad.r) / Math.max(xs.length - 1, 1);
      s += '<rect class="hit" data-i="' + i + '" x="' + (X(i) - w / 2) + '" y="' + pad.t + '" width="' + w + '" height="' + (H - pad.t - pad.b) + '" fill="transparent"/>';
    });
    s += "</svg>";
    s += '<div class="legend">' + series.map((se) => '<span><i style="background:' + se.color + '"></i>' + esc(se.name) + "</span>").join("") + (opt.refs || []).map((r) => '<span><i class="dash" style="border-color:' + (r.color || C.bad) + '"></i>' + esc(r.label) + "</span>").join("") + "</div>";
    s += '<div class="tip" hidden></div></div>';
    setTimeout(() => {
      const el = document.getElementById(id); if (!el) return;
      const tip = el.querySelector(".tip"), xh = el.querySelector(".xh"), svg = el.querySelector("svg");
      el.querySelectorAll(".hit").forEach((r) => {
        r.addEventListener("mouseenter", () => {
          const i = +r.dataset.i;
          xh.setAttribute("x1", X(i)); xh.setAttribute("x2", X(i)); xh.setAttribute("visibility", "visible");
          tip.innerHTML = "<b>" + esc(xs[i]) + "</b>" + series.map((se) => '<div><i style="background:' + se.color + '"></i>' + esc(se.name) + ": " + esc(opt.yfmt ? opt.yfmt(se.values[i]) : n(se.values[i], 2)) + "</div>").join("");
          const bb = svg.getBoundingClientRect(), px = X(i) / W * bb.width;
          tip.style.left = Math.min(Math.max(px - 80, 0), bb.width - 170) + "px"; tip.hidden = false;
        });
        r.addEventListener("mouseleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
      });
    }, 0);
    return s;
  }

  /** Vertical bars for a few categories, value-labelled. */
  function vbars(cats, values, color, opt = {}) {
    const W = 560, H = opt.height || 200, pad = { l: 46, r: 10, t: 22, b: 28 };
    const hi = Math.max(...values, 0) * 1.15 || 1;
    const bw = (W - pad.l - pad.r) / cats.length;
    const Y = (v) => H - pad.b - v / hi * (H - pad.t - pad.b);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(0, hi)) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + C.grid + '"/><text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tick">' + n(t, 0) + "</text>";
    cats.forEach((c, i) => {
      const x = pad.l + i * bw + bw * 0.2, w = bw * 0.6, y = Y(values[i]);
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + Math.max(H - pad.b - y, 0) + '" rx="4" fill="' + (Array.isArray(color) ? color[i] : color) + '"><title>' + esc(c + ": " + (opt.fmt ? opt.fmt(values[i]) : n(values[i]))) + "</title></rect>";
      s += '<text x="' + (x + w / 2) + '" y="' + (y - 6) + '" text-anchor="middle" class="val">' + esc(opt.fmt ? opt.fmt(values[i]) : n(values[i])) + "</text>";
      s += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="tick">' + esc(c) + "</text>";
    });
    return s + "</svg>";
  }

  /** Stacked vertical bars. series: [{name, color, values}] (negative values stack below zero). opt.tops: label over each bar. */
  function stack(cats, series, opt = {}) {
    const W = 560, H = opt.height || 260, pad = { l: 52, r: 10, t: 26, b: 30 };
    const pos = cats.map((_, i) => series.reduce((a, s) => a + Math.max(s.values[i], 0), 0));
    const neg = cats.map((_, i) => series.reduce((a, s) => a + Math.min(s.values[i], 0), 0));
    const hi = Math.max(...pos, 1e-9) * 1.12, lo = Math.min(0, ...neg) * 1.12;
    const Y = (v) => H - pad.b - (v - lo) / (hi - lo) * (H - pad.t - pad.b);
    const bw = (W - pad.l - pad.r) / cats.length;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(lo, hi)) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + C.grid + '"/><text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tick">' + esc(opt.yfmt ? opt.yfmt(t) : n(t, 0)) + "</text>";
    cats.forEach((c, i) => {
      const x = pad.l + i * bw + bw * 0.18, w = bw * 0.64;
      let up = 0, down = 0;
      for (const se of series) {
        const v = se.values[i]; if (!v) continue;
        const y0 = v >= 0 ? up : down, y1 = y0 + v;
        if (v >= 0) up = y1; else down = y1;
        const top = Math.min(Y(y0), Y(y1)), h = Math.abs(Y(y1) - Y(y0));
        s += '<rect x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h - 1, 0.5).toFixed(1) + '" fill="' + se.color + '"><title>' + esc(c + " · " + se.name + ": " + (opt.fmt ? opt.fmt(v) : n(v))) + "</title></rect>";
      }
      if (opt.tops) s += '<text x="' + (x + w / 2) + '" y="' + (Y(up) - 7) + '" text-anchor="middle" class="val">' + esc(opt.tops[i]) + "</text>";
      s += '<text x="' + (x + w / 2) + '" y="' + (H - 9) + '" text-anchor="middle" class="tick">' + esc(c) + "</text>";
    });
    s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="' + C.axis + '"/></svg>';
    return s + '<div class="legend">' + series.map((se) => '<span><i style="background:' + se.color + ';height:9px;width:9px"></i>' + esc(se.name) + "</span>").join("") + "</div>";
  }

  /** A 0-100 score meter. */
  function meter(score, label) {
    const st = score >= 75 ? "good" : score >= 55 ? "warn" : "bad";
    return '<div class="meter"><div class="meter-top"><span>' + esc(label) + '</span><b>' + score + '<small>/100</small></b></div><div class="meter-bar"><i class="' + st + '" style="width:' + score + '%"></i></div></div>';
  }
  function chip(state, text) { return '<span class="chip ' + esc(state) + '">' + esc(text) + "</span>"; }

  root.UI = { esc, n, cr, lakh, pct, xx, date, dt, gx, hbars, lines, vbars, stack, meter, chip, C };
})(typeof globalThis !== "undefined" ? globalThis : this);
