/* Branded PDF reports: one renderer for every tool and for signed debt vs equity reports.
   GBPDF.build(meta, blocks) lays out A4 pages with jsPDF (site/jspdf.min.js) and downloads the file.
   GBPDF.fromPage(meta, formEl, outEl) turns a tool page (its inputs and results) into blocks first. */
(function (root) {
  "use strict";
  const C = { ink: [22, 23, 26], soft: [71, 68, 62], gold: [201, 160, 79], goldInk: [123, 92, 31], line: [217, 205, 180], tint: [245, 238, 223], black: [13, 14, 16], ivory: [244, 239, 230], faint: [236, 230, 218], bad: [166, 50, 41], good: [30, 120, 90] };
  const A4 = { w: 595.28, h: 841.89 }, M = 46, W = A4.w - 2 * M, TOP = 66, BOTTOM = A4.h - 58;

  // The standard PDF fonts cover Latin-1 plus a few typographic marks; map the rest to plain text.
  const MAP = { "−": "-", "‑": "-", "≈": "~", "≥": ">=", "≤": "<=", "₹": "Rs ", "✓": "Yes", "✔": "Yes", "✗": "No", "→": "->", "←": "<-", " ": " ", " ": " ", " ": " ", "◆": "-", "♦": "-" };
  const KEEP = new Set("–—‘’“”•…€");
  function clean(s) {
    return String(s == null ? "" : s).replace(/[Ā-￿]/g, (ch) => (MAP[ch] != null ? MAP[ch] : KEEP.has(ch) ? ch : "")).replace(/[ \t]+/g, " ").trim();
  }
  const today = () => { const d = new Date(); return d.getDate() + " " + d.toLocaleString("en-GB", { month: "short" }) + " " + d.getFullYear(); };

  function build(meta, blocks) {
    const J = root.jspdf && root.jspdf.jsPDF;
    if (!J) throw new Error("The PDF maker did not load. Refresh the page and try again.");
    const doc = new J({ unit: "pt", format: "a4", compress: true });
    doc.setProperties({ title: clean(meta.title), subject: clean(meta.subtitle || ""), author: "Aegis Ascend Financial Advisors", creator: "Aegis Ascend" });
    let y = 0;
    const font = (f, st, size, col) => { doc.setFont(f, st); doc.setFontSize(size); doc.setTextColor.apply(doc, col || C.ink); };
    const lines = (t, w) => doc.splitTextToSize(clean(t), w);

    function cover() {
      doc.setFillColor.apply(doc, C.black); doc.rect(0, 0, A4.w, 96, "F");
      doc.setFillColor.apply(doc, C.gold);
      const dx = M + 9, dy = 40; doc.triangle(dx, dy - 9, dx + 9, dy, dx, dy + 9, "F"); doc.triangle(dx, dy - 9, dx - 9, dy, dx, dy + 9, "F");
      font("times", "normal", 17, C.ivory); doc.text("AEGIS", M + 28, 46, { charSpace: 2 });
      doc.setTextColor.apply(doc, C.gold); doc.text("ASCEND", M + 28 + doc.getTextWidth("AEGIS ") + 12, 46, { charSpace: 2 });
      font("helvetica", "normal", 7.5, C.gold); doc.text("FINANCIAL ADVISORS", M + 28, 60, { charSpace: 2.2 });
      font("helvetica", "normal", 8, [190, 182, 166]); doc.text(clean(meta.kind || "Report"), A4.w - M, 46, { align: "right" });
      doc.text(today(), A4.w - M, 60, { align: "right" });
      y = 128;
      font("times", "normal", 22, C.ink); for (const l of lines(meta.title, W)) { doc.text(l, M, y); y += 26; }
      if (meta.subtitle) { font("helvetica", "normal", 10.5, C.soft); for (const l of lines(meta.subtitle, W)) { doc.text(l, M, y - 6); y += 14; } }
      const facts = (meta.facts || []).filter((f) => f && f[1]);
      if (facts.length) {
        y += 4; font("helvetica", "normal", 8.5, C.soft);
        const txt = facts.map((f) => clean(f[0]) + ": " + clean(f[1])).join("   ·   ");
        for (const l of lines(txt, W)) { doc.text(l, M, y); y += 12; }
      }
      if (meta.stamp) {
        y += 6; const t = clean(meta.stamp); font("helvetica", "bold", 9, meta.stampBad ? C.bad : C.goldInk);
        const tw = doc.getTextWidth(t) + 20;
        doc.setDrawColor.apply(doc, meta.stampBad ? C.bad : C.gold); doc.setLineWidth(1); doc.roundedRect(M, y - 11, tw, 18, 2, 2, "S");
        doc.text(t, M + 10, y + 1); y += 16;
      }
      y += 10; doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(1.2); doc.line(M, y, A4.w - M, y); y += 22;
    }
    function mark() {
      if (!meta.watermark) return;
      font("helvetica", "bold", 30, [236, 231, 221]);
      doc.text(clean(meta.watermark), A4.w / 2, A4.h / 2 + 60, { align: "center", angle: 32 });
    }
    function newPage() {
      doc.addPage(); mark(); y = TOP;
    }
    function need(h) { if (y + h > BOTTOM) newPage(); }

    function heading(t, level, keep) {
      const big = level !== 3;
      need((big ? 46 : 30) + (keep || 0));
      if (big) { y += 6; font("times", "normal", 14.5, C.ink); doc.text(clean(t), M, y); y += 6; doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.6); doc.line(M, y, A4.w - M, y); y += 16; }
      else { y += 2; font("helvetica", "bold", 10, C.goldInk); doc.text(clean(t), M, y); y += 14; }
    }
    function para(t, o = {}) {
      const size = o.size || (o.note ? 8.5 : 10), lh = size * 1.38;
      font("helvetica", o.bold ? "bold" : o.italic ? "italic" : "normal", size, o.note ? C.soft : o.color || C.ink);
      for (const l of lines(t, W - (o.indent || 0))) { need(lh); doc.text(l, M + (o.indent || 0), y); y += lh; }
      y += o.after != null ? o.after : 6;
    }
    function bullets(items) {
      for (const it of items) {
        font("helvetica", "normal", 10, C.ink);
        const ls = lines(it, W - 16);
        need(14 * Math.min(ls.length, 2));
        doc.setFillColor.apply(doc, C.gold); const by = y - 3.5; doc.triangle(M + 4, by - 3, M + 7, by, M + 4, by + 3, "F"); doc.triangle(M + 4, by - 3, M + 1, by, M + 4, by + 3, "F");
        for (const l of ls) { need(14); doc.text(l, M + 16, y); y += 13.8; }
        y += 2;
      }
      y += 4;
    }
    function kpis(items) {
      const per = items.length >= 4 ? 4 : items.length, gap = 8, w = (W - gap * (per - 1)) / per;
      for (let i = 0; i < items.length; i += per) {
        const row = items.slice(i, i + per);
        const hts = row.map(([l, v, s]) => { font("helvetica", "normal", 7.5); const a = lines(l, w - 16).length; font("helvetica", "bold", 14); const b = lines(v, w - 16).length; font("helvetica", "normal", 7.5); const c = s ? lines(s, w - 16).length : 0; return 16 + a * 9.5 + b * 17 + c * 9.5 + 4; });
        const h = Math.max(...hts); need(h + 8);
        row.forEach(([l, v, s, bad], j) => {
          const x = M + j * (w + gap); let yy = y + 15;
          doc.setFillColor.apply(doc, j === 0 && i === 0 ? C.tint : [255, 255, 255]); doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.6); doc.rect(x, y, w, h, "FD");
          doc.setFillColor.apply(doc, C.gold); doc.rect(x, y, 2.5, h, "F");
          font("helvetica", "normal", 7.5, C.soft); for (const t of lines(String(l).toUpperCase(), w - 16)) { doc.text(t, x + 10, yy); yy += 9.5; }
          yy += 6; font("helvetica", "bold", 14, bad ? C.bad : C.ink); for (const t of lines(v, w - 16)) { doc.text(t, x + 10, yy); yy += 17; }
          if (s) { yy -= 4; font("helvetica", "normal", 7.5, C.soft); for (const t of lines(s, w - 16)) { doc.text(t, x + 10, yy); yy += 9.5; } }
        });
        y += h + 10;
      }
      y += 4;
    }
    function table(head, rows, align) {
      const n = Math.max(head.length, ...rows.map((r) => r.length)), pad = 5, size = n > 5 ? 8 : 8.8, lh = size * 1.3;
      head = head.map(clean); rows = rows.map((r) => Array.from({ length: n }, (_, i) => clean(r[i])));
      align = align || head.map((_, i) => (i > 0 && rows.length && rows.every((r) => /^[-+(]?\s*(Rs\s*)?[\d,.]+\s*(%|x|cr|crore|lakh|yrs|years|points)?\)?$|^$/i.test(r[i])) ? "right" : "left"));
      // natural widths, then scale to the page
      font("helvetica", "normal", size);
      const nat = Array.from({ length: n }, (_, i) => Math.min(220, Math.max(doc.getTextWidth(head[i] || "") * 1.05, ...rows.map((r) => doc.getTextWidth(r[i] || ""))) + 2 * pad + 2));
      const minW = 46; let tot = nat.reduce((a, b) => a + b, 0);
      let ws = nat.map((x) => Math.max(minW, (x / tot) * W));
      tot = ws.reduce((a, b) => a + b, 0); ws = ws.map((x) => (x / tot) * W);
      const rowLines = (r, bold) => { font("helvetica", bold ? "bold" : "normal", size); return r.map((t, i) => doc.splitTextToSize(t || "", ws[i] - 2 * pad)); };
      const drawRow = (cells, kind, idx) => {
        const h = Math.max(...cells.map((c) => c.length)) * lh + 2 * pad - 1.5;
        let x = M;
        if (kind === "head") doc.setFillColor.apply(doc, C.tint); else doc.setFillColor.apply(doc, idx % 2 ? [251, 248, 241] : [255, 255, 255]);
        doc.rect(M, y, W, h, "F");
        doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.5); doc.line(M, y + h, M + W, y + h);
        cells.forEach((c, i) => {
          font("helvetica", kind === "head" ? "bold" : i === 0 && kind !== "plain" ? "bold" : "normal", kind === "head" ? size - 0.6 : size, kind === "head" ? C.goldInk : C.ink);
          const right = align[i] === "right", tx = right ? x + ws[i] - pad : x + pad;
          c.forEach((t, k) => doc.text(t, tx, y + pad + size * 0.85 + k * lh, right ? { align: "right" } : undefined));
          x += ws[i];
        });
        y += h;
        return h;
      };
      const hc = rowLines(head, true), hh = Math.max(...hc.map((c) => c.length)) * lh + 2 * pad;
      need(hh + 24); doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(1); doc.line(M, y, M + W, y); drawRow(hc, "head");
      rows.forEach((r, i) => {
        const cells = rowLines(r, false), h = Math.max(...cells.map((c) => c.length)) * lh + 2 * pad;
        if (y + h > BOTTOM) { newPage(); doc.setDrawColor.apply(doc, C.gold); doc.setLineWidth(1); doc.line(M, y, M + W, y); drawRow(hc, "head"); }
        drawRow(cells, "body", i);
      });
      y += 14;
    }
    function image(b) {
      let w = Math.min(W, b.w), h = (b.h / b.w) * w;
      if (h > 300) { h = 300; w = (b.w / b.h) * h; }
      need(h + 10); doc.addImage(b.data, "PNG", M, y, w, h, undefined, "FAST"); y += h + 12;
    }

    mark(); cover();
    // a heading stays on the same page as the start of what follows it
    const keepH = (b) => !b ? 0 : b.t === "img" ? Math.min(300, (b.h / b.w) * Math.min(W, b.w)) + 10 : b.t === "kpis" ? 80 : b.t === "table" || b.t === "kv" ? 70 : b.t === "h" ? 40 : 30;
    blocks = blocks.filter(Boolean);
    blocks.forEach((b, i) => {
      if (b.t === "h") { const nx = blocks[i + 1]; heading(b.text, b.level, keepH(nx) + (nx && ["h", "p", "note"].includes(nx.t) ? keepH(blocks[i + 2]) : 0)); }
      else if (b.t === "p") para(b.text, b);
      else if (b.t === "note") para(b.text, { note: true });
      else if (b.t === "bullets") bullets(b.items);
      else if (b.t === "kpis") kpis(b.items);
      else if (b.t === "table") table(b.head, b.rows, b.align);
      else if (b.t === "kv") table(b.head || ["Item", "Value"], b.rows, ["left", "left"]);
      else if (b.t === "img") image(b);
      else if (b.t === "space") y += b.h || 10;
    });
    if (meta.closing) { y += 6; para(meta.closing, { note: true }); }

    // running header, footer, page numbers and the optional watermark on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      if (i > 1) {
        font("times", "normal", 8, C.goldInk); doc.text("AEGIS ASCEND", M, 36, { charSpace: 1.5 });
        font("helvetica", "normal", 8, C.soft); doc.text(clean(meta.title), A4.w - M, 36, { align: "right" });
        doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.5); doc.line(M, 44, A4.w - M, 44);
      }
      doc.setDrawColor.apply(doc, C.line); doc.setLineWidth(0.5); doc.line(M, A4.h - 44, A4.w - M, A4.h - 44);
      font("helvetica", "normal", 7, C.soft);
      const foot = clean(meta.footer || "Decision-support analysis from tested calculation code, not financial advice. Figures depend on the inputs shown.");
      doc.text(doc.splitTextToSize(foot, W - 70), M, A4.h - 32);
      doc.text("Page " + i + " of " + pages, A4.w - M, A4.h - 32, { align: "right" });
    }
    return doc;
  }

  // Resolves with the file name once saved, or null if the viewer declined the download prompt.
  async function save(meta, blocks) {
    const doc = build(meta, blocks);
    const name = (meta.filename || meta.title || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + ".pdf";
    const blob = doc.output("blob");
    if (root.KIT && root.KIT.save) return (await root.KIT.save(name, blob)) === "saved" ? name : null;
    doc.save(name);
    return name;
  }

  // ---------- reading a tool page ----------
  const txt = (el) => clean((el.innerText || el.textContent || "").replace(/\s*\n\s*/g, " "));
  function formInputs(form) {
    const rows = [];
    if (!form) return rows;
    form.querySelectorAll("label.fld, label.slider").forEach((lab) => {
      if (lab.closest("[hidden]")) return;
      const span = lab.querySelector("span"); if (!span) return;
      const c = span.cloneNode(true); c.querySelectorAll("i, b").forEach((x) => x.remove());
      const ctl = lab.querySelector("input, select, textarea");
      if (lab.classList.contains("slider")) { rows.push([txt(span).replace(/\s+by\s+.*$/i, ""), txt(span).replace(/^.*?\s+by\s+/i, "")]); return; }
      if (!ctl || ctl.type === "file" || ctl.type === "hidden") return;
      let v = ctl.tagName === "SELECT" ? (ctl.selectedOptions[0] || {}).text || ctl.value : ctl.value;
      const unit = lab.querySelector("em"); if (unit && v !== "") v += " " + txt(unit);
      rows.push([txt(c), v === "" ? "-" : v]);
    });
    form.querySelectorAll(".checkset label, .checks label, label.check").forEach((lab) => {
      const cb = lab.querySelector('input[type="checkbox"]'); if (!cb) return;
      rows.push([txt(lab), cb.checked ? "Yes" : "No"]);
    });
    return rows;
  }

  async function svgImage(svg) {
    const box = svg.getBoundingClientRect(); if (box.width < 20 || box.height < 20) return null;
    const clone = svg.cloneNode(true), src = [svg, ...svg.querySelectorAll("*")], dst = [clone, ...clone.querySelectorAll("*")];
    const props = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "opacity", "fill-opacity", "stroke-opacity", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline", "visibility"];
    src.forEach((el, i) => {
      const cs = getComputedStyle(el); if (!dst[i] || !dst[i].setAttribute) return;
      dst[i].setAttribute("style", props.map((p) => p + ":" + cs.getPropertyValue(p)).join(";") + (el.tagName === "text" || el.tagName === "tspan" ? ";font-family:Helvetica,Arial,sans-serif" : ""));
    });
    clone.setAttribute("width", box.width); clone.setAttribute("height", box.height);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    try {
      const im = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
      const k = 2, cv = document.createElement("canvas"); cv.width = Math.round(box.width * k); cv.height = Math.round(box.height * k);
      const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
      return { t: "img", data: cv.toDataURL("image/png"), w: box.width, h: box.height };
    } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
  }

  async function walk(el, out) {
    for (const ch of el.children) {
      if (ch.hidden || ch.matches("button, form, input, select, textarea, script, style, [data-pdf-skip]")) continue;
      if (getComputedStyle(ch).display === "none") continue;
      if (ch.matches(".kpis")) {
        out.push({ t: "kpis", items: [...ch.querySelectorAll(".kpi")].map((k) => { const b = k.querySelector("b"); return [k.querySelector("small") ? txt(k.querySelector("small")) : "", b ? txt(b) : "", k.querySelector("span") ? txt(k.querySelector("span")) : "", !!(b && b.classList.contains("t-bad"))]; }) });
      } else if (/^H[1-3]$/.test(ch.tagName)) out.push({ t: "h", text: txt(ch), level: ch.tagName === "H3" ? 3 : 2 });
      else if (ch.tagName === "TABLE" || ch.matches(".tw")) {
        const tb = ch.tagName === "TABLE" ? ch : ch.querySelector("table"); if (!tb) continue;
        const head = [...tb.querySelectorAll("thead th")].map(txt);
        const rows = [...tb.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(txt));
        const align = [...tb.querySelectorAll("thead th")].map((th) => (th.classList.contains("num") ? "right" : "left"));
        if (rows.length) out.push({ t: "table", head: head.length ? head : rows[0].map(() => ""), rows, align: align.length ? align : undefined });
      } else if (ch.tagName === "svg" || ch.tagName === "SVG") { const im = await svgImage(ch); if (im) out.push(im); }
      else if (ch.tagName === "UL" || ch.tagName === "OL") { const items = [...ch.children].map(txt).filter(Boolean); if (items.length) out.push({ t: "bullets", items }); }
      else if (ch.tagName === "P" || ch.matches(".notice")) { const t = txt(ch); if (t) out.push(ch.matches(".muted, .small, .notice") ? { t: "note", text: t } : { t: "p", text: t, bold: ch.matches(".rule") }); }
      else if (ch.matches(".meter")) { const l = ch.querySelector(".meter-top span"), v = ch.querySelector(".meter-top b"); out.push({ t: "h", level: 3, text: (l ? txt(l) : "") + ": " + (v ? txt(v) : "") }); }
      else if (ch.children.length && ch.querySelector("div, p, section, ul, ol, table, h1, h2, h3, svg, .kpis")) await walk(ch, out);
      else { const t = txt(ch); if (t) out.push({ t: "p", text: t }); }
    }
    return out;
  }

  async function fromPage(meta, form, out) {
    const blocks = [];
    const inputs = formInputs(form);
    if (out) await walk(out, blocks);
    if (inputs.length) blocks.push({ t: "h", text: meta.inputsTitle || "Inputs used" }, { t: "kv", head: ["Input", "Value"], rows: inputs });
    return save(meta, blocks);
  }

  root.GBPDF = { build, save, fromPage, clean };
})(typeof window !== "undefined" ? window : globalThis);
