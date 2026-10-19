/* Founder workspace additions: fundraise tracker, cap table with the planned round, data room, revenue share, loans and monitoring. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT;
  const { esc, gx, pct, chip } = UI;
  const { rs, rsPrice, dmy } = DOM;
  const S = WS.S, API = WS.API;
  const D = () => S.data;
  const today = () => D().today;
  const STAGES = [["applied", "Applied"], ["under_review", "Under review"], ["approved", "Approved"], ["offering", "Offering"], ["funded", "Funded"], ["monitoring", "Monitoring"]];
  const DATAROOM = [["accounts", "Audited accounts, last 3 years", "audited"], ["gst", "GST returns, last 12 months", "gst"], ["cma", "CMA data and projections", "cma"], ["captable", "Cap table", "cap table"], ["board", "Board resolution approving the raise", "board"], ["contracts", "Key customer contracts", "contract"], ["bank", "Bank statements, last 12 months", "bank statement"], ["report", "Debt vs equity report", "debt vs equity"]];

  // ---------- fundraise tracker ----------
  function fundraise() {
    const c = WS.myCompany(), fy = DOM.fy(today()), sec = c.security_type || "equity";
    const O = D().offers.filter((o) => o.fy === fy && o.security_type === sec), offersN = O.length, ext = (((c.external_offers || {})[fy]) || {})[sec] || 0;
    const keen = D().offers.filter((o) => o.response === "interested"), committed = D().offers.filter((o) => o.response === "invested");
    const raised = D().holdings.reduce((a, h) => a + h.cost_paise, 0);
    const ck = c.checklist || {}, pending = DOM.DOC_CHECKLIST.filter(([k]) => !ck[k]);
    const idx = Math.max(0, STAGES.findIndex(([k]) => k === c.pipeline_stage));
    return WS.head("Fundraise tracker", "Where your raise stands. Investors' names appear only after they agree to share them with you.") +
      '<section class="panel"><h2>Stage</h2>' + (c.pipeline_stage === "rejected" ? '<p class="t-bad">Your application was not taken forward. Your advisor will explain why.</p>' : KIT.timeline(STAGES, STAGES[idx][0], { [c.pipeline_stage]: c.stage_since })) + "</section>" +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Offers sent this year</small><b>' + gx(String(offersN + ext), { title: "Offers counted for FY " + fy, formula: "Investors offered through Aegis Ascend + offers your company made directly. Limit 200 per financial year for each kind of security.", inputs: [["Through Aegis Ascend", String(offersN), "offer log"], ["Made directly", String(ext), "advisor"]] }) + "</b><span>of " + (D().settings || {}).offer_limit + " allowed in FY " + fy + '</span></div>' +
      '<div class="kpi"><small>Interested</small><b>' + keen.length + '</b></div><div class="kpi"><small>Committed</small><b>' + committed.length + '</b></div><div class="kpi"><small>Raised so far</small><b>' + rs(raised, true) + "</b><span>of " + rs(c.raise_paise, true) + "</span></div></div>" +
      '<div class="grid2"><section class="panel"><h2>Investors</h2>' + (keen.length + committed.length ? '<ul class="docs">' + committed.concat(keen).map((o) => "<li><span>" + (o.investor_id ? "<b>" + esc(o.investor_name) + "</b>" : '<span class="muted">' + esc(o.investor_name) + "</span>") + "</span>" + chip(o.response === "invested" ? "ok" : "warn", o.response === "invested" ? "Committed" : "Interested") + "</li>").join("") + "</ul>" : '<p class="muted">No responses yet.</p>') +
      '<p class="small muted">' + O.filter((o) => o.response === "pending").length + " offers awaiting a reply, " + O.filter((o) => o.response === "declined").length + " declined.</p></section>" +
      '<section class="panel"><h2>Documents still pending</h2>' + (pending.length ? '<ul class="checklist2">' + pending.map(([, l]) => "<li>" + esc(l) + "</li>").join("") + '</ul><p class="small muted">Your advisor marks these as each filing is done.</p>' : '<p class="t-good">All filings done.</p>') + "</section></div>";
  }

  // ---------- cap table and the planned round ----------
  function captable() {
    const c = WS.myCompany(), cap = D().cap_table, H = D().holdings.filter((h) => h.shares > 0);
    const rows = cap.map((e) => ({ name: e.holder_name, type: e.holder_type === "founder" ? "Founder" : "Existing shareholder", holders: e.holders || 1, shares: e.shares }))
      .concat(H.map((h) => ({ name: h.investor_name, type: "Platform investor", holders: 1, shares: h.shares })));
    const extra = c.fd_extra_shares || 0, fd = rows.reduce((a, r) => a + r.shares, 0) + extra;
    const rep = WS.latestReport(c.id), eqShare = rep && rep.status === "approved" && rep.summary ? 1 - rep.summary.best_share : 0.5;
    const plan = S.round || { amount: Math.round((c.raise_paise || 0) * eqShare / 100), price: (c.offer_price_paise || 0) / 100 };
    const newShares = plan.price > 0 ? Math.floor(plan.amount / plan.price) : 0, post = fd + newShares;
    const members = rows.reduce((a, r) => a + r.holders, 0);
    return WS.head("Cap table", "Everyone who owns " + esc(c.name) + ", on a fully diluted basis, and what the planned round does to it.") +
      '<section class="panel">' + KIT.table("f-cap", { name: "cap-table", rows, key: (r) => r.name, noSearch: true, pageSize: 50,
        columns: [{ k: "name", label: "Holder", html: (r) => "<b>" + esc(r.name) + "</b>" + (r.holders > 1 ? '<span class="muted small block">' + r.holders + " holders</span>" : "") }, { k: "type", label: "Type" },
          { k: "shares", label: "Shares", num: true, html: (r) => DOM.shares(r.shares) }, { k: "pct", label: "Today", num: true, val: (r) => r.shares / fd, html: (r) => pct(r.shares / fd, 2) },
          { k: "post", label: "After the round", num: true, val: (r) => r.shares / post, html: (r) => pct(r.shares / post, 2) }] }) +
      '<p class="small muted">Fully diluted shares ' + DOM.shares(fd) + " including " + DOM.shares(extra) + " unissued options and convertibles. Members today: " + members + " of the 200 a private company may have.</p></section>" +
      '<section class="panel"><h2>Effect of the planned round</h2><form class="fields f3" data-form="f-round"><label class="fld"><span>Equity to raise</span><span class="in"><input name="amount" inputmode="decimal" value="' + (plan.amount / 1e7).toFixed(2) + '"><em>Rs cr</em></span></label>' +
      '<label class="fld"><span>Price per share</span><span class="in"><input name="price" inputmode="decimal" value="' + plan.price + '"><em>Rs</em></span></label><div class="fld"><span>&nbsp;</span><button class="btn ghost" type="submit">Recalculate</button></div></form>' +
      '<div class="kpis k4"><div class="kpi"><small>New shares</small><b>' + DOM.shares(newShares) + '</b></div><div class="kpi"><small>Post-money fully diluted</small><b>' + DOM.shares(post) + '</b></div><div class="kpi"><small>New investors will own</small><b>' + gx(pct(newShares / (post || 1), 2), { title: "New investors' stake", formula: "New shares / (fully diluted shares today + new shares)\nNew shares = equity raised / price per share", inputs: [["Equity raised", rs(plan.amount * 100), "founder"], ["Price per share", "Rs " + plan.price, "advisor"], ["Fully diluted today", DOM.shares(fd), "cap table"]] }) + "</b></div>" +
      '<div class="kpi"><small>Founders after the round</small><b>' + pct(rows.filter((r) => r.type === "Founder").reduce((a, r) => a + r.shares, 0) / (post || 1), 2) + "</b><span>from " + pct(rows.filter((r) => r.type === "Founder").reduce((a, r) => a + r.shares, 0) / (fd || 1), 2) + "</span></div></div>" +
      '<p class="small muted">Default amount: the equity share of your advisor-approved mix (' + pct(eqShare) + "). The final round size and price are set in the term sheet.</p></section>";
  }

  // ---------- data room ----------
  function dataroom() {
    const c = WS.myCompany(), F = (D().files || []).filter((f) => f.purpose === "dataroom"), docs = c.docs || [];
    const word = (k) => DATAROOM.find((x) => x[0] === k)[2];
    const has = (k) => F.some((f) => f.item === k) || docs.some((d) => d.toLowerCase().includes(word(k)));
    const done = DATAROOM.filter(([k]) => has(k)).length;
    const views = D().offers.flatMap((o) => (o.views || []).map((v) => Object.assign({ who: o.investor_name }, v))).sort((a, b) => (a.at < b.at ? 1 : -1));
    return WS.head("Data room", "Documents investors and lenders review. Upload each item; your advisor shares the room only with investors who have the offer.") +
      '<section class="panel"><div class="panel-head"><h2>Checklist</h2><b>' + done + " of " + DATAROOM.length + '</b></div><div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + DATAROOM.length + '" aria-valuenow="' + done + '"><i style="width:' + done / DATAROOM.length * 100 + '%"></i></div>' +
      '<ul class="checklist2">' + DATAROOM.map(([k, l]) => { const f = F.filter((x) => x.item === k); return '<li class="' + (has(k) ? "done" : "") + '"><span>' + esc(l) + (f.length ? '<span class="muted small block">' + f.map((x) => esc(x.name) + " · " + dmy(x.at.slice(0, 10))).join(", ") + "</span>" : "") + '</span><button class="btn ghost sm" data-act="f-upload" data-id="' + k + '">' + (f.length ? "Replace" : "Upload") + "</button></li>"; }).join("") + "</ul></section>" +
      '<div class="grid2"><section class="panel"><h2>Other documents</h2><ul class="docs">' + docs.map((d, k) => "<li><span>" + esc(d) + '</span><button class="linkbtn small" data-act="doc-remove" data-k="' + k + '">Remove</button></li>').join("") +
      F.filter((f) => !f.item).map((f) => "<li><span>" + esc(f.name) + '</span><button class="linkbtn small" data-act="file" data-id="' + f.id + '">Download</button></li>').join("") + "</ul>" +
      '<form class="row gap-s" data-form="doc-add"><span class="in grow"><input name="doc" id="doc_name" placeholder="Document name, e.g. Board resolution" aria-label="Document name"></span><button class="btn ghost" type="submit">Add</button></form></section>' +
      '<section class="panel"><h2>Who viewed what</h2>' + (views.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Investor</th><th>Document</th><th>When</th></tr></thead><tbody>' + views.map((v) => "<tr><td>" + esc(v.who) + "</td><td>" + esc(v.doc) + "</td><td>" + UI.dt(v.at) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No views yet. Views by investors who have not shared their name are not shown.</p>') + "</section></div>";
  }

  // ---------- revenue share ----------
  function revshare() {
    const c = WS.myCompany(), F = (D().invoices || []).filter((f) => f.kind === "revenue_share").sort((a, b) => (a.issued < b.issued ? 1 : -1));
    const paid = F.filter((f) => f.paid_on), due = F.filter((f) => !f.paid_on), sum = (L) => L.reduce((a, f) => a + f.amount_paise + f.gst_paise, 0);
    return WS.head("Revenue share", "0.4% of revenue each quarter for 5 years after the raise, plus 18% GST. Invoiced by Aegis Ascend from your quarterly accounts.") +
      '<div class="kpis k3" data-stagger><div class="kpi"><small>Paid to date</small><b>' + rs(sum(paid), true) + "</b><span>incl. GST, " + paid.length + ' quarters</span></div><div class="kpi"><small>Due</small><b class="' + (due.some((f) => f.due < today()) ? "t-bad" : "") + '">' + rs(sum(due), true) + "</b><span>" + due.length + " invoice" + (due.length === 1 ? "" : "s") + '</span></div><div class="kpi"><small>Quarterly estimate</small><b>' + gx(rs(Math.round(c.revenue * 1e9 / 4 * 0.004), true), { title: "Revenue share for a quarter", formula: "Annual revenue / 4 x 0.4%", inputs: [["Annual revenue", UI.cr(c.revenue, 0), "founder"]], note: "Plus 18% GST." }) + "</b><span>before GST</span></div></div>" +
      '<section class="panel"><h2>Statements</h2>' + KIT.table("f-rs", { name: "revenue-share", rows: F, noSearch: true, empty: { title: "No statements yet", text: "Revenue share starts in the first quarter after your equity raise closes." },
        columns: [{ k: "period", label: "Quarter" }, { k: "amount_paise", label: "Amount", num: true, csv: (f) => f.amount_paise / 100, html: (f) => rs(f.amount_paise) }, { k: "gst_paise", label: "GST", num: true, csv: (f) => f.gst_paise / 100, html: (f) => rs(f.gst_paise) },
          { k: "due", label: "Due", html: (f) => dmy(f.due) }, { k: "paid_on", label: "Status", html: (f) => (f.paid_on ? chip("ok", "Paid " + dmy(f.paid_on)) : chip(f.due < today() ? "bad" : "warn", f.due < today() ? "Overdue" : "Due")) }] }) + "</section>";
  }

  // ---------- loans and monitoring ----------
  function loans() {
    const c = WS.myCompany(), L = D().loans, lenders = (D().directory || []).filter((u) => u.role === "lender");
    return WS.head("Loans & monitoring", "Your loans, applications and quarterly covenant checks. Lenders pay all Aegis Ascend debt fees.") +
      '<section class="panel"><h2>Loans</h2>' + KIT.table("f-loans", { name: "loans", rows: L, noSearch: true, empty: { title: "No loans yet", text: "Apply through Aegis Ascend below." },
        columns: [{ k: "lender", label: "Lender", val: (l) => WS.userName(l.lender_id), html: (l) => esc(WS.userName(l.lender_id)) }, { k: "amount_paise", label: "Amount", num: true, csv: (l) => l.amount_paise / 100, html: (l) => rs(l.amount_paise, true) },
          { k: "rate_bps", label: "Rate", num: true, html: (l) => (l.rate_bps / 100).toFixed(2) + "%" }, { k: "tenor_months", label: "Tenor", html: (l) => l.tenor_months + " months" + (l.moratorium_months ? " · " + l.moratorium_months + " mo moratorium" : "") },
          { k: "out", label: "Outstanding", num: true, val: (l) => DOM.loanSummary(l, today()).principal_pending, html: (l) => (l.status === "disbursed" ? rs(DOM.loanSummary(l, today()).principal_pending, true) : "–") },
          { k: "next", label: "Next EMI", val: (l) => DOM.loanSummary(l, today()).next_due, html: (l) => { const s = DOM.loanSummary(l, today()); return l.status === "disbursed" ? (s.next_due ? dmy(s.next_due) + '<span class="muted small block">' + rs(s.next_amount) + "</span>" : "Repaid") + (s.overdue ? ' <span class="chip bad">' + s.overdue + " overdue</span>" : "") : "–"; } },
          { k: "status", label: "Status", html: (l) => WS.statusChip(l.status) }] }) +
      '<h3>Apply through Aegis Ascend</h3><form class="fields f5" data-form="f-apply"><label class="fld"><span>Lender</span><span class="in"><select name="lender_id" id="al_lender">' + lenders.map((l) => '<option value="' + l.id + '">' + esc(l.firm) + "</option>").join("") + "</select></span></label>" +
      UI_field("amount", "Amount", c.raise, "Rs cr") + UI_field("rate", "Expected rate", 10.5, "%") + UI_field("tenor", "Tenor", 7, "years") + UI_field("moratorium", "Moratorium", 0, "months") + '<button class="btn primary" type="submit">Send application</button></form></section>' +
      '<section class="panel"><div class="panel-head"><h2>Covenant monitoring</h2><button class="btn ghost sm" data-act="f-upload-q">Upload quarterly accounts</button></div>' + WS.monitorBlock(c, false) + "</section>";
  }
  const UI_field = (id, label, val, sfx) => root.PUB.field("al_" + id, label, val, sfx).replace('name="al_' + id + '"', 'name="' + id + '"');

  // ---------- investors (fit-ranked panel) and deal room ----------
  function investors() {
    const c = WS.myCompany(), I = D().intros || [];
    const named = new Map(D().offers.filter((o) => o.investor_id).map((o) => [o.investor_id, o.response]));
    const panel = (D().directory || []).filter((u) => u.role === "investor").map((u) => Object.assign({ fit: root.GB.fitScore(c, u) }, u)).sort((a, b) => b.fit.score - a.fit.score);
    const asks = I.filter((i) => i.status === "requested");
    return WS.head("Investors", "Ranked by Investor Fit Score. Your advisor decides who receives the offer; you decide who enters your deal room.") +
      (asks.length ? '<section class="panel"><h2>Deal-room requests</h2>' + asks.map((i) => '<div class="item"><div><b>' + esc(i.investor_name) + '</b><span class="muted small">asked ' + UI.date(i.created_at) + '</span></div><div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div></div>').join("") + "</section>" : "") +
      '<div class="cards" data-stagger>' + panel.map((u) => { const i = I.find((x) => x.investor_id === u.id), resp = named.get(u.id);
        return '<article class="card"><div class="card-top"><div><b>' + esc(u.firm || u.name) + '</b><span class="muted small">' + esc(u.name) + '</span></div><div class="score" title="Investor Fit Score">' + u.fit.score + "<small>/100</small></div></div>" +
          '<ul class="reasons">' + u.fit.reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
          (i ? "<p>" + WS.statusChip(i.status) + (i.nda_signed_at ? " " + chip("ok", "NDA signed") : "") + "</p>" : resp ? "<p>" + chip(resp === "invested" || resp === "interested" ? "ok" : "warn", resp === "invested" ? "Invested" : resp === "interested" ? "Interested" : "Offer " + resp) + "</p>" : "") +
          (i && i.status === "requested" ? '<div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div>'
            : !i && !resp ? '<button class="btn ghost sm" data-act="f-suggest" data-id="' + u.id + '">Suggest to my advisor</button>' : "") + "</article>"; }).join("") + "</div>";
  }
  function dealroom() {
    const c = WS.myCompany(), I = D().intros || [];
    const views = I.flatMap((i) => (i.views || []).map((v) => Object.assign({ who: i.investor_name }, v))).sort((a, b) => (a.at < b.at ? 1 : -1));
    return WS.head("Deal room", "Documents investors can open after you grant access and they sign the NDA. Every view is watermarked and logged.") +
      '<div class="grid2"><section class="panel"><h2>Documents</h2><ul class="docs">' + (c.docs || []).map((d, k) => "<li><span>" + esc(d) + '</span><button class="linkbtn small" data-act="doc-remove" data-k="' + k + '">Remove</button></li>').join("") + "</ul>" +
      '<form class="row gap-s" data-form="doc-add"><span class="in grow"><input name="doc" id="doc_name2" placeholder="Document name, e.g. Board resolution" aria-label="Document name"></span><button class="btn ghost" type="submit">Add</button></form>' +
      '<p class="small muted">Upload the files themselves in the <a href="#app-dataroom">data room</a>.</p></section>' +
      '<section class="panel"><h2>Who has access</h2>' + (I.length ? '<ul class="docs">' + I.map((i) => "<li><span>" + esc(i.investor_name) + '</span><span>' + WS.statusChip(i.status) + (i.nda_signed_at ? " " + chip("ok", "NDA " + UI.date(i.nda_signed_at)) : "") + "</span></li>").join("") + "</ul>" : '<p class="muted">No requests yet.</p>') +
      "<h3>Who viewed what</h3>" + (views.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Investor</th><th>Document</th><th>When</th></tr></thead><tbody>' + views.map((v) => "<tr><td>" + esc(v.who) + "</td><td>" + esc(v.doc) + "</td><td>" + UI.dt(v.at) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No views yet.</p>') + "</section></div>";
  }

  Object.assign(WS.clicks, {
    "f-suggest": async (b, id) => { if (await KIT.confirm("Suggest this investor to your advisor?", "<p>Your advisor checks the investor's KYC and the offer limits, and decides whether to share the offer.</p>", "Suggest")) return WS.after(await API.act("suggest_investor", { investor_id: id })); },
    "f-upload": async (b, item) => {
      const l = (DATAROOM.find((x) => x[0] === item) || [item, item])[1];
      const v = await KIT.dialog({ title: "Upload: " + l, confirm: "Upload", fields: [{ name: "file", label: "File (PDF, Excel, Word, CSV or image)", type: "file", accept: ".pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg" }], validate: (x) => (x.file ? null : "Choose a file") });
      if (!v) return;
      await API.upload(v.file, { company_id: S.user.company_id, purpose: "dataroom", item });
      return WS.after(null, "Uploaded " + v.file.name + ".");
    },
    "f-upload-q": async () => {
      const v = await KIT.dialog({ title: "Upload quarterly accounts", text: "<p>Upload the file for your advisor and lenders, then enter the quarter's figures below so DSCR and covenant headroom are recalculated.</p>", confirm: "Upload", fields: [{ name: "file", label: "Quarterly accounts", type: "file", accept: ".pdf,.xlsx,.xls,.csv" }], validate: (x) => (x.file ? null : "Choose a file") });
      if (!v) return;
      await API.upload(v.file, { company_id: S.user.company_id, purpose: "monitoring" });
      return WS.after(null, "Uploaded " + v.file.name + ". Now add the quarter's figures.");
    },
    file: async (b, id) => {
      if (API.download) { const f = await API.download(id); const a = document.createElement("a"); a.href = f.url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); return; }
      location.href = "/api/file/" + encodeURIComponent(id);
    },
  });
  Object.assign(WS.forms, {
    "f-round": (f, v) => { const a = WS.num(v.amount), p = WS.num(v.price); if (!(a > 0) || !(p > 0)) throw new Error("Enter the amount and price as positive numbers."); S.round = { amount: a * 1e7, price: p }; return WS.render({ keepScroll: true }); },
    "f-apply": async (f, v) => {
      const amt = WS.num(v.amount), rate = WS.num(v.rate), ten = WS.num(v.tenor), mor = WS.num(v.moratorium || 0);
      if (!(amt > 0 && rate > 0 && ten > 0 && mor >= 0)) throw new Error("Enter the amount, rate, tenor and moratorium as numbers.");
      return WS.after(await API.act("apply_loan", { company_id: S.user.company_id, lender_id: v.lender_id, amount_paise: Math.round(amt * 1e9), rate_bps: Math.round(rate * 100), tenor_months: Math.round(ten * 12), moratorium_months: Math.round(mor) }));
    },
  });
  Object.assign(WS.PAGES.founder, { "app-investors": investors, "app-dealroom": dealroom, "app-fundraise": fundraise, "app-captable": captable, "app-dataroom": dataroom, "app-revshare": revshare, "app-loans": loans });
})(typeof globalThis !== "undefined" ? globalThis : this);
