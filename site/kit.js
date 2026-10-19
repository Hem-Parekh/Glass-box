/* Workspace components shared by every role: data tables (search, filters, sort, paging, CSV/Excel export,
   cards on phones), dialogs, toasts, count-up figures, status timelines, the kanban board, skeletons and empty states. */
(function (root) {
  "use strict";
  const { esc } = root.UI;
  const reduce = () => root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const strip = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

  // ---------- data tables ----------
  const TABLES = {};
  /** cfg: {columns: [{k, label, num, html(r), val(r), csv(r), sort:false, export:false}], rows, key(r), search(r), filters: [{k, label, options: [[v, l]], match(r, v)}],
   *  pageSize, empty: {title, text, action}, select: true, rowClass(r), name, actions(html for the toolbar)} */
  function table(id, cfg) {
    const t = TABLES[id] || (TABLES[id] = { q: "", f: {}, sort: null, dir: 1, page: 0, sel: new Set() });
    t.cfg = cfg;
    const keys = new Set(cfg.rows.map(cfg.key || ((r) => r.id)));
    for (const k of [...t.sel]) if (!keys.has(k)) t.sel.delete(k);
    return '<div class="dt" data-dt="' + esc(id) + '">' + tableInner(id) + "</div>";
  }
  function view(id) {
    const t = TABLES[id], c = t.cfg, q = t.q.trim().toLowerCase();
    let rows = c.rows.filter((r) => (!q || (c.search ? c.search(r) : c.columns.map((col) => strip(col.html ? col.html(r) : r[col.k])).join(" ")).toLowerCase().includes(q)) &&
      (c.filters || []).every((f) => !t.f[f.k] || (f.match ? f.match(r, t.f[f.k]) : String(r[f.k]) === t.f[f.k])));
    if (t.sort) {
      const col = c.columns.find((x) => x.k === t.sort), v = (r) => (col.val ? col.val(r) : r[col.k]);
      rows = rows.slice().sort((a, b) => { const x = v(a), y = v(b); return (x == null ? 1 : y == null ? -1 : typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * t.dir; });
    }
    return rows;
  }
  function tableInner(id) {
    const t = TABLES[id], c = t.cfg, rows = view(id), size = c.pageSize || 25, pages = Math.max(1, Math.ceil(rows.length / size));
    t.page = Math.min(t.page, pages - 1);
    const shown = rows.slice(t.page * size, t.page * size + size), key = c.key || ((r) => r.id);
    const tools = '<div class="dt-tools">' + (c.noSearch ? "" : '<label class="dt-search"><span class="sr">Search</span><input type="search" data-dt-q placeholder="Search" value="' + esc(t.q) + '" autocomplete="off"></label>') +
      (c.filters || []).map((f) => '<label class="dt-filter"><span class="sr">' + esc(f.label) + '</span><select data-dt-f="' + esc(f.k) + '"><option value="">' + esc(f.label) + ": all</option>" + f.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (t.f[f.k] === String(v) ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select></label>").join("") +
      '<span class="dt-count">' + rows.length + " of " + c.rows.length + "</span>" + (c.actions || "") +
      (c.noExport ? "" : '<span class="dt-export"><button type="button" class="btn ghost sm" data-dt-x="csv">CSV</button><button type="button" class="btn ghost sm" data-dt-x="xlsx">Excel</button></span>') + "</div>";
    if (!c.rows.length) return tools.replace('<div class="dt-tools">', '<div class="dt-tools" hidden>') + empty(c.empty && c.empty.title || "Nothing here yet", c.empty && c.empty.text || "", c.empty && c.empty.action);
    const sel = c.select, allOn = sel && shown.length && shown.every((r) => t.sel.has(key(r)));
    const th = (sel ? '<th class="sel"><input type="checkbox" data-dt-all aria-label="Select all on this page"' + (allOn ? " checked" : "") + "></th>" : "") +
      c.columns.map((col) => { const on = t.sort === col.k; return "<th" + (col.num ? ' class="num"' : "") + (col.sort === false ? "" : ' aria-sort="' + (on ? (t.dir > 0 ? "ascending" : "descending") : "none") + '"') + ">" +
        (col.sort === false ? esc(col.label) : '<button type="button" class="dt-sort" data-dt-s="' + esc(col.k) + '">' + esc(col.label) + '<svg class="dt-arrow' + (on ? (t.dir > 0 ? " asc" : " desc") : "") + '" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 6.5 5 4l2.5 2.5"/></svg></button>') + "</th>"; }).join("");
    const body = shown.map((r) => '<tr' + (c.rowClass ? ' class="' + c.rowClass(r) + '"' : "") + ">" + (sel ? '<td class="sel"><input type="checkbox" data-dt-row="' + esc(key(r)) + '" aria-label="Select"' + (t.sel.has(key(r)) ? " checked" : "") + "></td>" : "") +
      c.columns.map((col) => '<td data-label="' + esc(col.label) + '"' + (col.num ? ' class="num"' : "") + ">" + (col.html ? col.html(r) : esc(r[col.k])) + "</td>").join("") + "</tr>").join("");
    const pager = pages > 1 ? '<div class="dt-pager"><button type="button" class="btn ghost sm" data-dt-p="-1"' + (t.page ? "" : " disabled") + '>Previous</button><span>Page ' + (t.page + 1) + " of " + pages + '</span><button type="button" class="btn ghost sm" data-dt-p="1"' + (t.page < pages - 1 ? "" : " disabled") + ">Next</button></div>" : "";
    return tools + '<div class="tw dt-wrap"><table class="tbl dt-tbl"><thead><tr>' + th + "</tr></thead><tbody>" + (body || '<tr><td colspan="' + (c.columns.length + (sel ? 1 : 0)) + '" class="muted">No rows match.</td></tr>') + "</tbody></table></div>" + pager;
  }
  function redraw(id, focusQ) {
    const el = document.querySelector('[data-dt="' + id + '"]'); if (!el) return;
    el.innerHTML = tableInner(id);
    if (focusQ) { const i = el.querySelector("[data-dt-q]"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    el.dispatchEvent(new CustomEvent("dt-change", { bubbles: true, detail: { id, selected: [...TABLES[id].sel] } }));
  }
  const selected = (id) => (TABLES[id] ? [...TABLES[id].sel] : []);
  function clearSel(id) { if (TABLES[id]) TABLES[id].sel.clear(); }
  function select(id, ids) { const t = TABLES[id] || (TABLES[id] = { q: "", f: {}, sort: null, dir: 1, page: 0, sel: new Set() }); t.sel = new Set(ids); }
  document.addEventListener("input", (e) => { const dt = e.target.closest("[data-dt]"); if (dt && e.target.matches("[data-dt-q]")) { const t = TABLES[dt.dataset.dt]; t.q = e.target.value; t.page = 0; redraw(dt.dataset.dt, true); } });
  document.addEventListener("change", (e) => {
    const dt = e.target.closest("[data-dt]"); if (!dt) return;
    const id = dt.dataset.dt, t = TABLES[id], c = t.cfg, key = c.key || ((r) => r.id);
    if (e.target.matches("[data-dt-f]")) { t.f[e.target.dataset.dtF] = e.target.value; t.page = 0; redraw(id); }
    else if (e.target.matches("[data-dt-row]")) { const k = e.target.dataset.dtRow; e.target.checked ? t.sel.add(k) : t.sel.delete(k); redraw(id); }
    else if (e.target.matches("[data-dt-all]")) { const size = c.pageSize || 25; view(id).slice(t.page * size, t.page * size + size).forEach((r) => (e.target.checked ? t.sel.add(key(r)) : t.sel.delete(key(r)))); redraw(id); }
  });
  document.addEventListener("click", (e) => {
    const dt = e.target.closest("[data-dt]"); if (!dt) return;
    const id = dt.dataset.dt, t = TABLES[id], b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dtS) { t.dir = t.sort === b.dataset.dtS ? -t.dir : 1; t.sort = b.dataset.dtS; redraw(id); }
    else if (b.dataset.dtP) { t.page += +b.dataset.dtP; redraw(id); }
    else if (b.dataset.dtX) exportTable(id, b.dataset.dtX);
  });
  function exportTable(id, kind) {
    const c = TABLES[id].cfg, cols = c.columns.filter((col) => col.export !== false), rows = view(id);
    const cell = (col, r) => (col.csv ? col.csv(r) : col.val ? col.val(r) : strip(col.html ? col.html(r) : r[col.k]));
    const data = [cols.map((col) => col.label)].concat(rows.map((r) => cols.map((col) => cell(col, r))));
    const name = (c.name || id).replace(/[^\w-]+/g, "-");
    if (kind === "csv") save(name + ".csv", new Blob(["﻿" + data.map((row) => row.map((v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\r\n")], { type: "text/csv" }));
    else save(name + ".xlsx", xlsx(data, c.name || "Export"));
    toast("Downloaded " + rows.length + " row" + (rows.length === 1 ? "" : "s") + " as " + (kind === "csv" ? "CSV" : "Excel") + ".");
  }
  function save(name, blob) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- a minimal .xlsx writer (stored zip, inline strings) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], dir = []; let off = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const f of files) {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const head = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      parts.push(new Uint8Array(head), name, data);
      dir.push([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)], name);
      off += head.length + name.length + data.length;
    }
    const dirParts = [], start = off; let size = 0;
    for (let i = 0; i < dir.length; i += 2) { const h = new Uint8Array(dir[i]); dirParts.push(h, dir[i + 1]); size += h.length + dir[i + 1].length; }
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(size), ...u32(start), ...u16(0)]);
    return new Blob([...parts, ...dirParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function xlsx(rows, sheet) {
    const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const col = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
    const body = rows.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => { const ref = col(ci) + (ri + 1); return typeof v === "number" && Number.isFinite(v) ? '<c r="' + ref + '"><v>' + v + "</v></c>" : '<c r="' + ref + '" t="inlineStr"' + (ri === 0 ? ' s="1"' : "") + "><is><t>" + x(v == null ? "" : v) + "</t></is></c>"; }).join("") + "</row>").join("");
    return zip([
      { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + x(sheet.slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>' },
      { name: "xl/worksheets/sheet1.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + body + "</sheetData></worksheet>" },
    ]);
  }

  // ---------- dialogs ----------
  /** fields: [{name, label, type: text|number|date|select|textarea|checkbox|file, value, options: [[v, l]], hint, required, min, max, step}] -> Promise<values | null> */
  function dialog(o) {
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.className = "modal" + (o.danger ? " danger" : "");
      d.setAttribute("aria-labelledby", "mdl-t");
      const f = (o.fields || []).map((x) => {
        const id = "mf_" + x.name, req = x.required ? " required" : "", hint = x.hint ? '<small class="muted">' + x.hint + "</small>" : "";
        if (x.type === "checkbox") return '<label class="chk"><input type="checkbox" name="' + x.name + '" id="' + id + '"' + (x.value ? " checked" : "") + "> " + esc(x.label) + "</label>" + hint;
        const input = x.type === "select" ? '<select name="' + x.name + '" id="' + id + '"' + req + ">" + x.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(x.value) === String(v) ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>"
          : x.type === "textarea" ? '<textarea name="' + x.name + '" id="' + id + '" rows="3"' + req + ">" + esc(x.value || "") + "</textarea>"
          : '<input name="' + x.name + '" id="' + id + '" type="' + (x.type || "text") + '"' + (x.type === "file" ? "" : ' value="' + esc(x.value == null ? "" : x.value) + '"') + (x.min != null ? ' min="' + x.min + '"' : "") + (x.max != null ? ' max="' + x.max + '"' : "") + (x.step ? ' step="' + x.step + '"' : "") + (x.type === "number" ? ' inputmode="decimal"' : "") + req + (x.accept ? ' accept="' + x.accept + '"' : "") + ">";
        return '<label class="fld" for="' + id + '"><span>' + esc(x.label) + '</span><span class="in">' + input + (x.unit ? "<em>" + esc(x.unit) + "</em>" : "") + "</span>" + hint + "</label>";
      }).join("");
      d.innerHTML = '<form method="dialog" class="modal-in"><h2 id="mdl-t">' + esc(o.title) + "</h2>" + (o.text ? '<div class="modal-text">' + o.text + "</div>" : "") + (f ? '<div class="fields">' + f + "</div>" : "") +
        '<p class="form-err notice bad" role="alert" hidden></p><div class="row gap-s modal-act"><button class="btn ghost" value="cancel" type="button" data-mdl-cancel>' + esc(o.cancel || "Cancel") + '</button><button class="btn ' + (o.danger ? "danger" : "primary") + '" value="ok" type="submit">' + esc(o.confirm || "Confirm") + "</button></div></form>";
      document.body.appendChild(d);
      const close = (v) => { d.close(); d.remove(); resolve(v); };
      d.querySelector("[data-mdl-cancel]").addEventListener("click", () => close(null));
      d.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
      d.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = e.target, out = {};
        for (const x of o.fields || []) { const el = form.elements[x.name]; out[x.name] = x.type === "checkbox" ? el.checked : x.type === "file" ? el.files[0] || null : el.value; }
        const err = o.validate && o.validate(out);
        if (err) { const box = form.querySelector(".form-err"); box.textContent = err; box.hidden = false; return; }
        close(out);
      });
      d.showModal();
      const first = d.querySelector("input:not([type=checkbox]),select,textarea"); if (first) first.focus();
    });
  }
  const confirm = (title, text, label, danger) => dialog({ title, text, confirm: label, danger }).then((v) => v !== null);

  // ---------- toasts ----------
  function toast(msg, kind) {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast2 " + (kind || "ok"); t.setAttribute("role", kind === "bad" ? "alert" : "status"); t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, kind === "bad" ? 6000 : 3800);
  }

  // ---------- figures that count up, and flash when they change ----------
  const LAST = {};
  /** A number that animates from 0 on first view and from its old value when it changes. fmt: (x) => string */
  const FMT = {};
  function figure(key, value, fmt, cls) {
    FMT[key] = fmt;
    return '<span class="fig ' + (cls || "") + '" data-fig="' + esc(key) + '" data-v="' + value + '">' + esc(fmt(value)) + "</span>";
  }
  function animateFigures(scope, first) {
    scope.querySelectorAll("[data-fig]").forEach((el) => {
      const key = el.dataset.fig, to = +el.dataset.v, fmt = FMT[key], seen = key in LAST, from = seen ? LAST[key] : first ? 0 : to;
      LAST[key] = to;
      if (from === to || reduce() || !fmt) return;
      if (seen) el.classList.add(to > from ? "up" : "down");
      const t0 = performance.now(), dur = 380;
      const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to); };
      requestAnimationFrame(step);
      setTimeout(() => el.classList.remove("up", "down"), 900);
    });
  }

  // ---------- charts draw in once, when they enter the viewport ----------
  let io = null;
  function animateCharts(scope) {
    if (reduce() || !("IntersectionObserver" in root)) return;
    io = io || new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const svg = e.target;
      svg.querySelectorAll("polyline.ln:not([stroke-dasharray])").forEach((p) => {
        const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect();
        p.style.transition = "stroke-dashoffset .38s cubic-bezier(.16,1,.3,1)"; p.style.strokeDashoffset = "0";
        p.addEventListener("transitionend", () => { p.style.strokeDasharray = ""; p.style.transition = ""; }, { once: true });
      });
      svg.querySelectorAll("rect.bar").forEach((r, i) => { r.style.animationDelay = Math.min(i, 16) * 12 + "ms"; r.classList.add("grow"); });
    }), { threshold: 0.2 });
    scope.querySelectorAll("svg.chart:not([data-anim])").forEach((s) => { s.setAttribute("data-anim", "1"); io.observe(s); });
  }

  /** Call after every render. first = the route changed (stagger lists, count figures from zero). */
  function mount(scope, first) {
    animateFigures(scope, first);
    animateCharts(scope);
    if (first && !reduce()) scope.querySelectorAll("[data-stagger]").forEach((g) => [...g.children].slice(0, 14).forEach((c, i) => { c.style.setProperty("--i", i); c.classList.add("st"); }));
  }

  // ---------- small pieces ----------
  const ILLU = '<svg class="empty-art" viewBox="0 0 120 80" aria-hidden="true"><path d="M20 72 L52 16 L52 76 M100 72 L68 16 L68 76 M38 70 L60 46 L82 70" fill="none" stroke="currentColor" stroke-width="3"/><path d="M60 2 L67 9 L60 16 L53 9Z" fill="var(--gold)"/></svg>';
  function empty(title, text, action) { return '<div class="empty">' + ILLU + "<b>" + esc(title) + "</b>" + (text ? "<p>" + text + "</p>" : "") + (action || "") + "</div>"; }
  function skeleton() {
    const line = (w) => '<i class="sk" style="width:' + w + '"></i>';
    return '<div class="skel" aria-busy="true" aria-label="Loading"><div class="pg-head">' + line("38%") + '</div><div class="kpis k4">' + [1, 2, 3, 4].map(() => '<div class="kpi">' + line("50%") + line("70%") + "</div>").join("") + '</div><section class="panel">' + [90, 80, 85, 70, 88, 76].map((w) => line(w + "%")).join("") + "</section></div>";
  }
  /** steps: [[key, label]]; at: {key: iso}; current: key; stop: {label, reason} for withdrawn/rejected */
  function timeline(steps, current, at, stop) {
    const idx = steps.findIndex(([k]) => k === current);
    return '<ol class="timeline' + (stop ? " stopped" : "") + '">' + steps.map(([k, l], i) => '<li class="' + (i < idx ? "done" : i === idx ? (stop ? "done" : "now") : "") + '"><b>' + esc(l) + "</b>" + (at && at[k] ? '<span class="muted small">' + esc(root.DOM.dmy(at[k].slice(0, 10))) + "</span>" : "") + "</li>").join("") +
      (stop ? '<li class="stop"><b>' + esc(stop.label) + "</b>" + (stop.reason ? '<span class="muted small">' + esc(stop.reason) + "</span>" : "") + "</li>" : "") + "</ol>";
  }

  // ---------- kanban ----------
  const BOARDS = {};
  /** cols: [[key, label]]; cards: [{id, col, html, label}]; onMove(id, col) */
  function kanban(id, cols, cards, onMove) {
    BOARDS[id] = onMove;
    return '<div class="kanban" data-kb="' + esc(id) + '">' + cols.map(([k, l]) => { const cs = cards.filter((c) => c.col === k);
      return '<section class="kb-col" data-kb-col="' + esc(k) + '" aria-label="' + esc(l) + '"><h3>' + esc(l) + ' <span class="muted">' + cs.length + "</span></h3>" +
        '<div class="kb-list">' + cs.map((c) => '<article class="kb-card" draggable="true" data-kb-card="' + esc(c.id) + '">' + c.html +
          '<label class="kb-move"><span class="sr">Move ' + esc(c.label) + ' to</span><select data-kb-move="' + esc(c.id) + '"><option value="">Move to…</option>' + cols.filter(([k2]) => k2 !== k).map(([k2, l2]) => '<option value="' + esc(k2) + '">' + esc(l2) + "</option>").join("") + "</select></label></article>").join("") +
        (cs.length ? "" : '<p class="kb-empty muted small">Drop a company here</p>') + "</div></section>"; }).join("") + "</div>";
  }
  let dragging = null;
  document.addEventListener("dragstart", (e) => { const c = e.target.closest && e.target.closest("[data-kb-card]"); if (!c) return; dragging = c.dataset.kbCard; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragging); });
  document.addEventListener("dragend", (e) => { const c = e.target.closest && e.target.closest("[data-kb-card]"); if (c) c.classList.remove("dragging"); document.querySelectorAll(".kb-col.drop").forEach((x) => x.classList.remove("drop")); dragging = null; });
  document.addEventListener("dragover", (e) => { const col = dragging && e.target.closest && e.target.closest("[data-kb-col]"); if (!col) return; e.preventDefault(); document.querySelectorAll(".kb-col.drop").forEach((x) => x !== col && x.classList.remove("drop")); col.classList.add("drop"); });
  document.addEventListener("drop", (e) => { const col = dragging && e.target.closest("[data-kb-col]"); if (!col) return; e.preventDefault(); const b = col.closest("[data-kb]"), card = dragging; col.classList.remove("drop"); dragging = null; BOARDS[b.dataset.kb](card, col.dataset.kbCol); });
  document.addEventListener("change", (e) => { const s = e.target.closest("[data-kb-move]"); if (!s || !s.value) return; const b = s.closest("[data-kb]"); BOARDS[b.dataset.kb](s.dataset.kbMove, s.value); });

  root.KIT = { table, selected, clearSel, select, exportTable, xlsx, save, dialog, confirm, toast, figure, mount, empty, skeleton, timeline, kanban, strip };
})(typeof globalThis !== "undefined" ? globalThis : this);
