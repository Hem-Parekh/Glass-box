/* Advisor console: Today, pipeline, company file, investor directory and offers, resale requests, loan transfers,
   revaluations, compliance, revenue, notes and tasks, message templates, audit log and settings. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT, GB = root.GB;
  const { esc, gx, pct, chip, lines, C } = UI;
  const { rs, rsPrice, dmy } = DOM;
  const S = WS.S, API = WS.API;
  const D = () => S.data;
  const today = () => D().today;
  const fyNow = () => DOM.fy(today());
  const set = () => D().settings || DOM.SETTINGS_DEFAULT;
  const co = (id) => WS.companyById(id) || { id, name: id };
  const person = (id) => (D().directory || []).find((u) => u.id === id) || {};
  const who = (id) => { const u = person(id); return u.firm || u.name || id; };
  const my = (s) => DOM.MON[+s.slice(5, 7) - 1] + " '" + s.slice(2, 4);
  const STAGES = [["applied", "Applied"], ["under_review", "Under review"], ["approved", "Approved"], ["offering", "Offering"], ["funded", "Funded"], ["monitoring", "Monitoring"], ["closed", "Closed"], ["rejected", "Rejected"]];
  const stageName = (k) => (STAGES.find((x) => x[0] === k) || [k, k])[1];
  const SELL_STEPS = [["submitted", "Submitted"], ["under_review", "Under review"], ["rofr", "First refusal"], ["buyer_introduced", "Buyer introduced"], ["spa_signed", "SPA signed"], ["completed", "Transfer complete"]];
  const SELL_OPEN = ["submitted", "under_review", "rofr", "buyer_introduced", "spa_signed"];
  const age = (iso) => DOM.daysBetween(iso.slice(0, 10), today());
  const ageTxt = (n) => (n === 0 ? "today" : n === 1 ? "1 day" : n + " days");

  // ---------- counters ----------
  const used = (cid, sec) => DOM.offersUsed(D(), cid, fyNow(), sec || co(cid).security_type || "equity");
  const mem = (cid) => DOM.members(D(), cid);
  const plat = (cid) => DOM.platformInvestors(D(), cid).length;
  function meter(n, of, warn, label) {
    const cls = n >= of ? "bad" : n >= warn ? "warn" : "ok";
    return '<div class="cmeter ' + cls + '" title="' + esc(label) + '"><div class="cm-top"><span>' + esc(label) + "</span><b>" + n + " / " + of + '</b></div><div class="cm-bar"><i style="width:' + Math.min(100, n / of * 100) + '%"></i><em style="left:' + warn / of * 100 + '%"></em></div></div>';
  }
  const offerMeter = (cid, sec) => meter(used(cid, sec), set().offer_limit, set().offer_warn, "Offers FY " + fyNow() + (sec && sec !== "equity" ? " (" + sec + ")" : ""));
  const memberMeter = (cid) => meter(mem(cid), set().member_limit, set().member_warn, "Members");
  const platMeter = (cid) => meter(plat(cid), set().max_platform_investors, set().max_platform_investors - 2, "Platform investors");
  const lastVal = (cid) => DOM.latestValuation(D(), cid);
  const funded = (c) => D().holdings.some((h) => h.company_id === c.id && h.shares > 0);
  const revalDue = (c) => { const v = lastVal(c.id); return v ? DOM.addMonths(v.date, 3) : today(); };
  const report = (cid) => D().reports.filter((r) => r.company_id === cid && r.status === "approved").sort((a, b) => (a.reviewed_at < b.reviewed_at ? 1 : -1))[0];
  function dscrOf(c) { const m = GB.monitor(c.quarters || [], c.covenants), l = m[m.length - 1]; return l ? l.dscr : null; }

  // ---------- Today ----------
  function alerts() {
    const t = today(), A = [];
    for (const c of D().companies.filter(funded)) { const due = revalDue(c), d = DOM.daysBetween(t, due); if (d <= 14) A.push({ kind: "Revaluation", sev: d < 0 ? "bad" : "warn", text: c.name + (d < 0 ? ": revaluation overdue by " + ageTxt(-d) : ": revaluation due " + dmy(due)), link: "app-revaluations", sort: d }); }
    for (const x of D().sell_requests.filter((x) => SELL_OPEN.includes(x.status))) { const a = age(x.history[x.history.length - 1].at); if (a > 5) A.push({ kind: "Request", sev: "warn", text: who(x.investor_id) + " · " + co(x.company_id).name + ": resale request waiting " + ageTxt(a), link: "app-requests", sort: -a }); }
    for (const x of D().loan_transfers.filter((x) => !["completed", "rejected"].includes(x.status))) { const a = age(x.history[x.history.length - 1].at); if (a > 5) A.push({ kind: "Request", sev: "warn", text: who(x.from_lender_id) + ": loan transfer waiting " + ageTxt(a), link: "app-loantransfers", sort: -a }); }
    for (const c of D().companies) { const ck = c.checklist || {}; if (ck.allotment && !ck.pas3) { const due = DOM.addDays(ck.allotment, 15), d = DOM.daysBetween(t, due); A.push({ kind: "PAS-3", sev: d < 0 ? "bad" : "warn", text: c.name + ": PAS-3 " + (d < 0 ? "overdue since " : "due ") + dmy(due), link: "app-companyfile/" + c.id, sort: d }); } }
    for (const h of D().holdings.filter((h) => h.shares > 0)) { const u = DOM.lockUntil(h, set()), d = DOM.daysBetween(t, u); if (d > 0 && d <= 7) A.push({ kind: "Lock-in", sev: "", text: who(h.investor_id) + " · " + co(h.company_id).name + ": lock-in ends " + dmy(u), link: "app-companyfile/" + h.company_id, sort: d }); }
    for (const c of D().companies) {
      for (const sec of DOM.SECURITY_TYPES) { const n = used(c.id, sec); if (n >= set().offer_warn) A.push({ kind: "Limit", sev: n >= set().offer_limit ? "bad" : "warn", text: c.name + ": " + n + " of " + set().offer_limit + " " + sec + " offers used in FY " + fyNow(), link: "app-compliance", sort: -n }); }
      const m = mem(c.id); if (m >= set().member_warn) A.push({ kind: "Limit", sev: m >= set().member_limit ? "bad" : "warn", text: c.name + ": " + m + " of " + set().member_limit + " members", link: "app-compliance", sort: -m });
      const p = plat(c.id); if (p >= set().max_platform_investors - 1) A.push({ kind: "Limit", sev: p >= set().max_platform_investors ? "bad" : "warn", text: c.name + ": " + p + " of " + set().max_platform_investors + " platform investors", link: "app-compliance", sort: -p });
    }
    for (const l of D().loans.filter((l) => l.status === "disbursed")) {
      const c = co(l.company_id), s = DOM.loanSummary(l, t), d = dscrOf(c);
      if (s.overdue) A.push({ kind: "DSCR", sev: "bad", text: c.name + ": " + s.overdue + " overdue instalment" + (s.overdue === 1 ? "" : "s") + " to " + who(l.lender_id), link: "app-loansdesk", sort: -100 });
      if (d != null && d < 1.25) A.push({ kind: "DSCR", sev: "bad", text: c.name + ": DSCR " + UI.xx(d) + " is below the 1.25x covenant", link: "app-loansdesk", sort: -50 });
    }
    const seen = new Set();
    return A.filter((a) => (seen.has(a.text) ? false : seen.add(a.text)));
  }
  function todayPage() {
    const A = alerts(), tasks = D().notes.filter((n) => !n.done && n.due && n.due <= DOM.addDays(today(), 3)).sort((a, b) => (a.due < b.due ? -1 : 1));
    const openReq = D().sell_requests.filter((x) => SELL_OPEN.includes(x.status)).length + D().loan_transfers.filter((x) => !["completed", "rejected"].includes(x.status)).length;
    const groups = ["Revaluation", "Request", "PAS-3", "Lock-in", "Limit", "DSCR"];
    const inReview = D().reports.filter((r) => r.status === "in_review");
    return WS.head("Today", dmy(today()) + " · what needs you, most urgent first") +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Needs attention</small><b class="' + (A.some((a) => a.sev === "bad") ? "t-bad" : "") + '">' + KIT.figure("a-alerts", A.length, (y) => String(Math.round(y))) + '</b><span>' + A.filter((a) => a.sev === "bad").length + ' overdue or blocked</span></div>' +
      '<div class="kpi"><small>Open requests</small><b>' + openReq + '</b><span>resales and loan transfers</span></div><div class="kpi"><small>Reports to review</small><b>' + inReview.length + '</b></div><div class="kpi"><small>Tasks due</small><b>' + tasks.length + "</b><span>in the next 3 days</span></div></div>" +
      '<div class="today">' + groups.map((g) => { const L = A.filter((a) => a.kind === g).sort((a, b) => a.sort - b.sort); if (!L.length) return ""; const title = { Revaluation: "Revaluations", Request: "Requests waiting more than 5 days", "PAS-3": "PAS-3 filing deadlines", "Lock-in": "Lock-ins ending this week", Limit: "Companies near a limit", DSCR: "Repayment alerts" }[g];
        return '<section class="panel"><h2>' + title + '</h2><ul class="alerts" data-stagger>' + L.map((a) => '<li class="' + a.sev + '"><a href="#' + a.link + '">' + esc(a.text) + "</a></li>").join("") + "</ul></section>"; }).join("") +
      '<section class="panel"><h2>Tasks due</h2>' + (tasks.length ? '<ul class="alerts">' + tasks.map((n) => '<li class="' + (n.due < today() ? "bad" : "warn") + '"><label class="chk"><input type="checkbox" data-act="a-note-toggle" data-id="' + n.id + '"> ' + esc(n.text) + '</label><span class="muted small">' + subjectName(n) + " · due " + dmy(n.due) + "</span></li>").join("") + "</ul>" : '<p class="muted">Nothing due.</p>') + "</section>" +
      (inReview.length ? '<section class="panel"><h2>Reports to review</h2><ul class="alerts">' + inReview.map((r) => '<li><a href="#app-review">' + esc(co(r.company_id).name + ": " + r.title) + "</a></li>").join("") + "</ul></section>" : "") +
      (A.length ? "" : '<section class="panel">' + KIT.empty("All clear", "No overdue revaluations, waiting requests or limit warnings.") + "</section>") + "</div>";
  }

  // ---------- pipeline ----------
  function cardInfo(c) {
    const r = report(c.id), O = D().offers.filter((o) => o.company_id === c.id);
    return { r, interested: O.filter((o) => o.response === "interested").length, committed: O.filter((o) => o.response === "invested").length, days: c.stage_since ? DOM.daysBetween(c.stage_since, today()) : 0 };
  }
  function pipeline() {
    const view = S.pipeView || "board", L = D().companies;
    const toggle = '<div class="seg-t" role="group" aria-label="View"><button class="btn sm ' + (view === "board" ? "primary" : "ghost") + '" data-act="a-pipeview" data-id="board" aria-pressed="' + (view === "board") + '">Board</button><button class="btn sm ' + (view === "table" ? "primary" : "ghost") + '" data-act="a-pipeview" data-id="table" aria-pressed="' + (view === "table") + '">Table</button></div>';
    const cards = L.map((c) => { const k = cardInfo(c), mix = k.r ? pct(1 - k.r.summary.best_share) + " equity / " + pct(k.r.summary.best_share) + " debt" : "Mix after review";
      return { id: c.id, col: c.pipeline_stage || "applied", label: c.name, html: '<a href="#app-companyfile/' + c.id + '" class="kb-title">' + esc(c.name) + '</a><p class="small muted">' + rs(c.raise_paise, true) + " · " + mix + "</p>" +
        '<dl class="kb-facts"><div><dt>Offers FY</dt><dd>' + used(c.id) + "/" + set().offer_limit + "</dd></div><div><dt>Interested · committed</dt><dd>" + k.interested + " · " + k.committed + "</dd></div><div><dt>Platform investors</dt><dd>" + plat(c.id) + "/" + set().max_platform_investors + "</dd></div><div><dt>Members</dt><dd>" + mem(c.id) + "/" + set().member_limit + "</dd></div></dl>" +
        '<p class="small muted">' + ageTxt(k.days) + " in stage</p>" }; });
    return WS.head("Company pipeline", "Drag a company to move it, or use its Move menu. Every move is confirmed and logged.", toggle) +
      (view === "board" ? KIT.kanban("pipe", STAGES, cards, move)
        : '<section class="panel">' + KIT.table("a-pipe", { name: "pipeline", rows: L, filters: [{ k: "pipeline_stage", label: "Stage", options: STAGES }],
          columns: [{ k: "name", label: "Company", html: (c) => '<a href="#app-companyfile/' + c.id + '"><b>' + esc(c.name) + '</b></a><span class="muted small block">' + esc(c.sector) + "</span>" },
            { k: "pipeline_stage", label: "Stage", html: (c) => stageName(c.pipeline_stage) },
            { k: "raise", label: "Raise", num: true, val: (c) => c.raise_paise, csv: (c) => c.raise_paise / 100, html: (c) => rs(c.raise_paise, true) },
            { k: "mix", label: "Debt / equity", val: (c) => (cardInfo(c).r ? cardInfo(c).r.summary.best_share : null), html: (c) => (cardInfo(c).r ? pct(cardInfo(c).r.summary.best_share) + " / " + pct(1 - cardInfo(c).r.summary.best_share) : "–") },
            { k: "offers", label: "Offers FY", num: true, val: (c) => used(c.id), html: (c) => used(c.id) + "/" + set().offer_limit },
            { k: "int", label: "Interested", num: true, val: (c) => cardInfo(c).interested, html: (c) => String(cardInfo(c).interested) },
            { k: "com", label: "Committed", num: true, val: (c) => cardInfo(c).committed, html: (c) => String(cardInfo(c).committed) },
            { k: "plat", label: "Platform inv.", num: true, val: (c) => plat(c.id), html: (c) => plat(c.id) + "/" + set().max_platform_investors },
            { k: "mem", label: "Members", num: true, val: (c) => mem(c.id), html: (c) => mem(c.id) + "/" + set().member_limit },
            { k: "days", label: "Days in stage", num: true, val: (c) => cardInfo(c).days, html: (c) => String(cardInfo(c).days) }] }) + "</section>");
  }
  async function move(cid, stage) {
    const c = co(cid);
    if (c.pipeline_stage === stage) return;
    if (!(await KIT.confirm("Move " + c.name + "?", "<p>From <b>" + stageName(c.pipeline_stage) + "</b> to <b>" + stageName(stage) + "</b>. The move is recorded in the audit log.</p>", "Move company"))) return WS.render({ keepScroll: true });
    try { await WS.after(await API.act("set_stage", { company_id: cid, stage })); } catch (e) { WS.fail(e); WS.render({ keepScroll: true }); }
  }

  // ---------- company file ----------
  function companyFile(cid) {
    const c = co(cid);
    if (!c.name || c.name === cid) return WS.head("Company not found", '<a href="#app-pipeline">Back to the pipeline</a>');
    const fd = DOM.fdShares(D(), c.id), cap = D().cap_table.filter((e) => e.company_id === c.id);
    const H = D().holdings.filter((h) => h.company_id === c.id && h.shares > 0);
    const capRows = cap.map((e) => ({ id: e.id, name: e.holder_name, type: e.holder_type, holders: e.holders || 1, shares: e.shares, entry: e }))
      .concat(H.map((h) => ({ id: h.id, name: who(h.investor_id), type: "platform", holders: 1, shares: h.shares, h })));
    const O = D().offers.filter((o) => o.company_id === c.id).sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    const V = D().valuations.filter((v) => v.company_id === c.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const ck = c.checklist || {}, F = D().invoices.filter((f) => f.company_id === c.id), N = D().notes.filter((n) => n.subject_type === "company" && n.subject_id === c.id);
    const ext = ((c.external_offers || {})[fyNow()] || {});
    return WS.head(c.name, esc(c.sector) + " · " + esc(c.city || "") + " · " + chip("", stageName(c.pipeline_stage)) + ' · <a href="#app-pipeline">Back to the pipeline</a>',
      '<div class="row gap-s wrap">' + (["approved", "offering"].includes(c.pipeline_stage) ? '<a class="btn primary" href="#app-directory" data-act="a-pick-co" data-id="' + c.id + '">Share offer</a>' : "") + '<button class="btn ghost" data-act="a-update" data-id="' + c.id + '">Post update</button></div>') +
      '<div class="meters">' + offerMeter(c.id) + memberMeter(c.id) + platMeter(c.id) + "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Cap table</h2><button class="btn ghost sm" data-act="a-cap" data-id="' + c.id + '">Add founder or shareholder</button></div>' +
      KIT.table("a-cap-" + c.id, { name: "cap-table-" + c.name.split(" ")[0], rows: capRows, noSearch: true, pageSize: 50,
        columns: [{ k: "name", label: "Holder", html: (r) => "<b>" + esc(r.name) + "</b>" + (r.holders > 1 ? '<span class="muted small block">' + r.holders + " holders</span>" : "") },
          { k: "type", label: "Type", html: (r) => ({ founder: "Founder", existing: "Existing shareholder", platform: "Platform investor" })[r.type] },
          { k: "shares", label: "Shares", num: true, html: (r) => DOM.shares(r.shares) },
          { k: "pct", label: "% fully diluted", num: true, val: (r) => r.shares / fd, html: (r) => gx(pct(r.shares / fd, 2), { title: "Fully diluted ownership", formula: "Shares / (all shares on the cap table + unissued options and convertibles)", inputs: [["Shares", DOM.shares(r.shares), "cap table"], ["Fully diluted shares", DOM.shares(fd), "cap table"], ["of which options and convertibles", DOM.shares(c.fd_extra_shares || 0), "advisor"]] }) },
          { k: "act", label: "", sort: false, export: false, html: (r) => (r.entry ? '<button class="linkbtn small" data-act="a-cap" data-id="' + c.id + '" data-entry="' + r.entry.id + '">Edit</button>' : r.h && today() < DOM.lockUntil(r.h, set()) && !r.h.early_consent ? '<button class="linkbtn small" data-act="a-consent" data-id="' + r.h.id + '">Record founder consent</button>' : r.h && r.h.early_consent ? '<span class="muted small">Consent recorded</span>' : "") }] }) +
      '<p class="small muted">Fully diluted shares ' + DOM.shares(fd) + ", including " + DOM.shares(c.fd_extra_shares || 0) + ' unissued options and convertibles. <button class="linkbtn small" data-act="a-terms" data-id="' + c.id + '">Edit offer terms</button></p></section>' +
      '<div class="grid2"><section class="panel"><div class="panel-head"><h2>Offer log</h2><button class="btn ghost sm" data-act="a-external" data-id="' + c.id + '">Off-platform offers: ' + (ext[c.security_type || "equity"] || 0) + "</button></div>" +
      KIT.table("a-offers-" + c.id, { name: "offers-" + c.name.split(" ")[0], rows: O, pageSize: 10, filters: [{ k: "response", label: "Response", options: [["pending", "Pending"], ["interested", "Interested"], ["declined", "Declined"], ["invested", "Invested"]] }],
        empty: { title: "No offers yet", text: "Share the company from the investor directory once it is approved." },
        columns: [{ k: "inv", label: "Investor", val: (o) => who(o.investor_id), html: (o) => esc(who(o.investor_id)) }, { k: "sent_at", label: "Sent", html: (o) => dmy(o.sent_at.slice(0, 10)) },
          { k: "fy", label: "FY", html: (o) => esc(o.fy) }, { k: "security_type", label: "Security", html: (o) => esc(o.security_type) },
          { k: "response", label: "Response", html: (o) => chip(o.response === "invested" || o.response === "interested" ? "ok" : o.response === "declined" ? "bad" : "warn", o.response) + (o.response === "interested" ? ' <button class="linkbtn small" data-act="a-allot" data-id="' + o.id + '">Record allotment</button>' : "") }] }) + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Valuation history</h2>' + (funded(c) || V.length ? '<button class="btn ghost sm" data-act="a-reval" data-id="' + c.id + '">Publish revaluation</button>' : "") + "</div>" +
      (V.length > 1 ? lines(V.map((v) => my(v.date)), [{ name: "Price per share", color: C.mix, values: V.map((v) => v.price_per_share_paise / 100), endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 0), label: "Price per share", height: 170 }) : "") +
      (V.length ? '<ul class="docs">' + V.slice().reverse().map((v) => "<li><span>" + dmy(v.date) + " · " + esc(v.method) + " · " + esc(v.valuer) + "</span><b>" + rsPrice(v.price_per_share_paise) + "</b></li>").join("") + "</ul>" : '<p class="muted">No valuations yet.</p>') + "</section></div>" +
      '<div class="grid2"><section class="panel"><h2>Documents checklist</h2><ul class="checklist2">' + DOM.DOC_CHECKLIST.map(([k, l]) => { const done = ck[k], pas3 = k === "pas3" && ck.allotment && !done ? DOM.addDays(ck.allotment, 15) : null;
        return '<li class="' + (done ? "done" : "") + '"><label class="chk"><input type="checkbox" data-act="a-check" data-id="' + c.id + '" data-item="' + k + '"' + (done ? " checked" : "") + "> " + esc(l) + "</label>" + (done ? '<span class="muted small">' + dmy(done) + "</span>" : pas3 ? '<span class="small ' + (pas3 < today() ? "t-bad" : "t-warn") + '">due ' + dmy(pas3) + "</span>" : "") + "</li>"; }).join("") + "</ul></section>" +
      '<section class="panel"><div class="panel-head"><h2>Fees</h2><button class="btn ghost sm" data-act="a-invoice" data-id="' + c.id + '">Raise invoice</button></div>' + invoiceTable("a-fees-" + c.id, F, true) + "</section></div>" +
      '<section class="panel"><div class="panel-head"><h2>Notes and tasks</h2><button class="btn ghost sm" data-act="a-note" data-type="company" data-id="' + c.id + '">Add note</button></div>' + notesList(N) + "</section>";
  }

  // ---------- investor directory and offer sharing ----------
  const investors = () => (D().directory || []).filter((u) => u.role === "investor");
  function invStats(u) { const H = D().holdings.filter((h) => h.investor_id === u.id && h.shares > 0); return { invested: H.reduce((a, h) => a + h.cost_paise, 0), held: new Set(H.map((h) => h.company_id)).size }; }
  function directory() {
    const offerable = D().companies.filter((c) => ["approved", "offering"].includes(c.pipeline_stage) && report(c.id));
    if (!S.offerCo || !offerable.some((c) => c.id === S.offerCo)) S.offerCo = offerable[0] && offerable[0].id;
    const c = S.offerCo && co(S.offerCo), sec = c ? c.security_type || "equity" : "equity";
    const offered = new Set(c ? D().offers.filter((o) => o.company_id === c.id && o.fy === fyNow() && o.security_type === sec).map((o) => o.investor_id) : []);
    const rows = investors().map((u) => Object.assign({ st: invStats(u), fit: c ? GB.fitScore(Object.assign({}, c, { raise: (c.raise_paise || 0) / 1e9 }), u) : null }, u));
    const sel = KIT.selected("a-dir").filter((id) => !offered.has(id));
    const left = c ? set().offer_limit - used(c.id, sec) : 0;
    const sectors = [...new Set(investors().flatMap((u) => (u.mandate && u.mandate.sectors) || []))].sort();
    const bar = c ? '<div class="share-bar" id="share-bar"><label class="fld inline"><span>Company</span><span class="in"><select data-act="a-offer-co" aria-label="Company to offer">' + offerable.map((x) => '<option value="' + x.id + '"' + (x.id === c.id ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></span></label>" +
      '<div class="share-count"><b>Offers this year: ' + used(c.id, sec) + " / " + set().offer_limit + "</b><span class=\"small " + (left < 10 ? "t-bad" : left <= set().offer_limit - set().offer_warn ? "t-warn" : "muted") + "\">" + left + " left in FY " + fyNow() + " (" + sec + ")</span></div>" +
      '<button class="btn ghost sm" data-act="a-shortlist">Suggest a shortlist</button><button class="btn primary" data-act="a-share"' + (sel.length ? "" : " disabled") + ">Share offer with " + sel.length + " selected</button></div>"
      : '<div class="notice">No company is approved for offering yet. Approve a report in the review queue first.</div>';
    return WS.head("Investor directory", "Onboarded investors. Select investors, then share an approved company with them. Each investor offered counts towards the company's 200 offers this financial year.") +
      '<section class="panel">' + bar +
      KIT.table("a-dir", { name: "investor-directory", rows, select: true, pageSize: 30,
        search: (u) => [u.name, u.firm, ((u.mandate || {}).sectors || []).join(" ")].join(" "),
        filters: [{ k: "sector", label: "Sector", options: sectors.map((s) => [s, s]), match: (u, v) => ((u.mandate || {}).sectors || []).includes(v) },
          { k: "ticket", label: "Ticket", options: [["s", "Up to Rs 1 Cr"], ["m", "Rs 1-5 Cr"], ["l", "Rs 5 Cr and above"]], match: (u, v) => { const mx = (u.profile || {}).ticket_max_paise || 0; return v === "s" ? mx <= 1e9 : v === "m" ? mx > 1e9 && mx <= 5e9 : mx > 5e9; } },
          { k: "kyc", label: "KYC", options: [["verified", "Verified"], ["pending", "Pending"], ["not_started", "Not started"]], match: (u, v) => (u.profile || {}).kyc === v },
          { k: "acc", label: "Accredited", options: [["yes", "Yes"], ["no", "No"]], match: (u, v) => !!(u.profile || {}).accredited === (v === "yes") }],
        rowClass: (u) => (offered.has(u.id) ? "row-muted" : ""),
        columns: [
          { k: "name", label: "Investor", val: (u) => u.firm || u.name, html: (u) => "<b>" + esc(u.firm || u.name) + '</b><span class="muted small block">' + esc(u.name) + (offered.has(u.id) ? " · already offered this year" : "") + "</span>" },
          { k: "kyc", label: "KYC", val: (u) => (u.profile || {}).kyc, html: (u) => chip({ verified: "ok", pending: "warn" }[(u.profile || {}).kyc] || "bad", ({ verified: "Verified", pending: "Pending", not_started: "Not started" })[(u.profile || {}).kyc] || "Not started") + ' <button class="linkbtn small" data-act="a-kyc" data-id="' + u.id + '">Edit</button>' },
          { k: "nda", label: "NDA", val: (u) => (u.profile || {}).nda_signed_at, html: (u) => ((u.profile || {}).nda_signed_at ? "Yes · " + dmy(u.profile.nda_signed_at.slice(0, 10)) : "No") },
          { k: "acc", label: "Accredited", val: (u) => ((u.profile || {}).accredited ? 1 : 0), html: (u) => ((u.profile || {}).accredited ? "Yes" : "No") },
          { k: "sectors", label: "Sectors", sort: false, html: (u) => esc(((u.mandate || {}).sectors || []).join(", ")) },
          { k: "ticket", label: "Ticket", num: true, val: (u) => (u.profile || {}).ticket_max_paise, html: (u) => (u.profile ? rs(u.profile.ticket_min_paise, true) + "–" + rs(u.profile.ticket_max_paise, true).replace("Rs ", "") : "–") },
          { k: "inv", label: "Invested", num: true, val: (u) => u.st.invested, csv: (u) => u.st.invested / 100, html: (u) => rs(u.st.invested, true) },
          { k: "held", label: "Companies", num: true, val: (u) => u.st.held, html: (u) => String(u.st.held) },
          { k: "active", label: "Last active", val: (u) => (u.profile || {}).last_active, html: (u) => ((u.profile || {}).last_active ? dmy(u.profile.last_active.slice(0, 10)) : "–") },
          { k: "fit", label: "Fit", num: true, val: (u) => (u.fit ? u.fit.score : null), html: (u) => (u.fit ? gx(String(u.fit.score), { title: "Investor Fit Score for " + c.name, formula: "Sector, stage, ticket size and past deals, scored out of 100", inputs: u.fit.reasons.map((r) => [r, "", "engine"]) }) : "–") },
        ] }) + "</section>";
  }

  // ---------- resale requests ----------
  function requests() {
    const R = D().sell_requests.slice().sort((a, b) => (SELL_OPEN.includes(a.status) === SELL_OPEN.includes(b.status) ? (a.created_at < b.created_at ? 1 : -1) : SELL_OPEN.includes(a.status) ? -1 : 1));
    const hold = (x) => D().holdings.find((h) => h.id === x.holding_id) || { shares: 0, allotment_date: today() };
    const addsMember = (x) => !x.full;
    return WS.head("Resale requests", "Private, one-to-one resales. No listings, no prices shown to other investors, no bidding. Prefer full-stake sales: a part sale to a new buyer adds a member.") +
      '<section class="panel">' + KIT.table("a-req", { name: "resale-requests", rows: R, pageSize: 20,
        filters: [{ k: "status", label: "Status", options: SELL_STEPS.concat([["withdrawn", "Withdrawn"], ["rejected", "Rejected"]]) }],
        empty: { title: "No resale requests", text: "Investors' sell requests arrive here after the 6-month lock-in." },
        columns: [
          { k: "inv", label: "Investor", val: (x) => who(x.investor_id), html: (x) => "<b>" + esc(who(x.investor_id)) + '</b><span class="muted small block">' + esc(co(x.company_id).name) + "</span>" },
          { k: "shares", label: "Shares", num: true, val: (x) => x.shares, html: (x) => DOM.shares(x.shares) + '<span class="muted small block">' + pct(x.shares / DOM.fdShares(D(), x.company_id), 2) + " of company</span>" },
          { k: "full", label: "Sale", val: (x) => (x.full ? "Full" : "Partial"), html: (x) => (x.full ? "Full stake" : 'Partial <span class="chip warn" title="A new buyer becomes an extra member">Adds a member</span>') },
          { k: "elig", label: "Eligible from", val: (x) => DOM.lockUntil(hold(x), set()), html: (x) => dmy(DOM.lockUntil(hold(x), set())) },
          { k: "price", label: "Indicative price", num: true, val: (x) => x.indicative_price_paise, csv: (x) => (x.indicative_price_paise || 0) / 100, html: (x) => (x.indicative_price_paise ? rsPrice(x.indicative_price_paise) : "–") },
          { k: "status", label: "Status", val: (x) => x.status, html: (x) => chip(x.status === "completed" ? "ok" : ["rejected", "withdrawn"].includes(x.status) ? "bad" : "warn", x.status.replace(/_/g, " ")) + (x.status === "rofr" ? '<span class="muted small block">until ' + dmy(x.rofr_until) + "</span>" : x.buyer_investor_id ? '<span class="muted small block">buyer ' + esc(who(x.buyer_investor_id)) + "</span>" : "") },
          { k: "age", label: "Age", num: true, val: (x) => age(x.created_at), html: (x) => ageTxt(age(x.created_at)) },
          { k: "act", label: "Next step", sort: false, export: false, html: (x) => sellActions(x) },
        ] }) + "</section>";
  }
  function sellActions(x) {
    const b = (step, label, cls) => '<button class="btn ' + (cls || "ghost") + ' sm" data-act="a-sell" data-id="' + x.id + '" data-step="' + step + '">' + label + "</button>";
    const rej = b("reject", "Reject");
    return '<div class="row gap-s wrap">' + ({ submitted: b("review", "Start review", "primary") + rej, under_review: b("rofr", "Start first-refusal window", "primary") + rej, rofr: b("buyer", "Introduce buyer", "primary") + rej,
      buyer_introduced: b("spa", "Record SPA signed", "primary") + rej, spa_signed: b("complete", "Complete transfer", "primary") + rej }[x.status] || "") + "</div>";
  }
  function buyerOptions(x) {
    const h = D().holdings.find((y) => y.id === x.holding_id), holders = new Set(DOM.platformInvestors(D(), x.company_id));
    const leaving = x.full ? 1 : 0;
    return investors().filter((u) => u.id !== x.investor_id && (u.profile || {}).kyc === "verified").filter((u) => {
      if (holders.has(u.id)) return true;
      return holders.size + 1 - leaving <= set().max_platform_investors && mem(x.company_id) + 1 - leaving <= set().member_limit;
    }).map((u) => [u.id, (u.firm || u.name) + (holders.has(u.id) ? " (already a shareholder)" : "")]).concat(h ? [] : []);
  }

  // ---------- loans and transfers ----------
  const LT = [["submitted", "Requested"], ["eligibility", "Eligibility"], ["consent", "Borrower consent"], ["buyer_introduced", "Buyer introduced"], ["deed_signed", "Deed signed"], ["charge_updated", "Charge with ROC"], ["completed", "Complete"]];
  function loanTransfers() {
    const T = D().loan_transfers.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Loan transfers", "Transfers of loan exposures between regulated banks and NBFCs. Check eligibility, get the borrower's consent, introduce a regulated buyer, then record the deed, the ROC charge and the fee (0.3% to 0.5%).") +
      '<section class="panel">' + KIT.table("a-lt", { name: "loan-transfers", rows: T, empty: { title: "No transfer requests", text: "Lenders request transfers from their loan pages." },
        columns: [
          { k: "co", label: "Borrower", val: (t) => co(loan(t).company_id).name, html: (t) => "<b>" + esc(co(loan(t).company_id).name) + '</b><span class="muted small block">from ' + esc(who(t.from_lender_id)) + "</span>" },
          { k: "out", label: "Outstanding", num: true, val: (t) => DOM.loanSummary(loan(t), today()).principal_pending, csv: (t) => DOM.loanSummary(loan(t), today()).principal_pending / 100, html: (t) => rs(DOM.loanSummary(loan(t), today()).principal_pending, true) + (t.amount_paise ? '<span class="muted small block">transfer ' + rs(t.amount_paise, true) + "</span>" : "") },
          { k: "ten", label: "Remaining", num: true, val: (t) => DOM.loanSummary(loan(t), today()).remaining_months, html: (t) => DOM.loanSummary(loan(t), today()).remaining_months + " months" },
          { k: "dscr", label: "Latest DSCR", val: (t) => dscrOf(co(loan(t).company_id)), html: (t) => (WS.lender ? WS.lender.dscr(co(loan(t).company_id)).html : "") },
          { k: "status", label: "Status", html: (t) => KIT.timeline(LT, t.status === "rejected" ? (t.history.slice().reverse().find((h) => h.status !== "rejected") || {}).status : t.status, null, t.status === "rejected" ? { label: "Rejected", reason: t.reason } : null) },
          { k: "act", label: "Next step", sort: false, export: false, html: (t) => (["completed", "rejected"].includes(t.status) ? (t.fee_paise ? "Fee " + rs(t.fee_paise) : "") : '<div class="row gap-s wrap"><button class="btn primary sm" data-act="a-lt" data-id="' + t.id + '">' + esc((LT[LT.findIndex((s) => s[0] === t.status) + 1] || ["", ""])[1]) + '</button><button class="btn ghost sm" data-act="a-lt-reject" data-id="' + t.id + '">Reject</button></div>') },
        ] }) + "</section>";
  }
  const loan = (t) => D().loans.find((l) => l.id === t.loan_id);
  function loansDesk() {
    const L = D().loans.filter((l) => l.status === "disbursed");
    return WS.head("Loans and DSCR", "Every disbursed loan arranged through Aegis Ascend, with repayment status and the latest quarterly DSCR.") +
      '<section class="panel">' + KIT.table("a-loans", { name: "loans", rows: L,
        columns: [{ k: "co", label: "Borrower", val: (l) => co(l.company_id).name, html: (l) => "<b>" + esc(co(l.company_id).name) + "</b>" }, { k: "lender", label: "Lender", val: (l) => who(l.lender_id), html: (l) => esc(who(l.lender_id)) },
          { k: "amt", label: "Disbursed", num: true, val: (l) => l.amount_paise, csv: (l) => l.amount_paise / 100, html: (l) => rs(l.amount_paise, true) },
          { k: "out", label: "Outstanding", num: true, val: (l) => DOM.loanSummary(l, today()).principal_pending, csv: (l) => DOM.loanSummary(l, today()).principal_pending / 100, html: (l) => rs(DOM.loanSummary(l, today()).principal_pending, true) },
          { k: "next", label: "Next instalment", val: (l) => DOM.loanSummary(l, today()).next_due, html: (l) => dmy(DOM.loanSummary(l, today()).next_due) },
          { k: "od", label: "Overdue", num: true, val: (l) => DOM.loanSummary(l, today()).overdue, html: (l) => (DOM.loanSummary(l, today()).overdue ? chip("bad", DOM.loanSummary(l, today()).overdue + " overdue") : chip("ok", "Up to date")) },
          { k: "dscr", label: "Latest DSCR", val: (l) => dscrOf(co(l.company_id)), html: (l) => (WS.lender ? WS.lender.dscr(co(l.company_id)).html : "") }] }) + "</section>";
  }

  // ---------- revaluation centre ----------
  function revaluations() {
    const L = D().companies.filter(funded).map((c) => ({ c, v: lastVal(c.id), due: revalDue(c) })).sort((a, b) => (a.due < b.due ? -1 : 1));
    return WS.head("Revaluation centre", "Every funded company is revalued each quarter by a registered valuer. Publishing updates every investor's portfolio and notifies them.") +
      (L.length ? '<div class="reval-list" data-stagger>' + L.map(({ c, v, due }) => { const d = DOM.daysBetween(today(), due);
        return '<section class="panel reval ' + (d < 0 ? "overdue" : "") + '"><div class="panel-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + plat(c.id) + " platform investors · last " + (v ? rsPrice(v.price_per_share_paise) + " on " + dmy(v.date) + " (" + esc(v.method) + ")" : "none") + "</p></div>" +
          '<div class="reval-due"><b class="' + (d < 0 ? "t-bad" : d <= 14 ? "t-warn" : "") + '">' + (d < 0 ? "Overdue by " + ageTxt(-d) : "Due " + dmy(due)) + '</b><button class="btn ' + (d <= 14 ? "primary" : "ghost") + ' sm" data-act="a-reval" data-id="' + c.id + '">Revalue</button></div></div></section>'; }).join("") + "</div>"
        : '<section class="panel">' + KIT.empty("No funded companies", "Companies appear here once shares are allotted.") + "</section>");
  }

  // ---------- compliance ----------
  function compliance() {
    const C2 = D().companies.filter((c) => !["rejected", "closed"].includes(c.pipeline_stage));
    const locks = D().holdings.filter((h) => h.shares > 0 && today() < DOM.lockUntil(h, set())).sort((a, b) => (DOM.lockUntil(a, set()) < DOM.lockUntil(b, set()) ? -1 : 1));
    return WS.head("Compliance", "Section 42 offers, Section 2(68) members, platform investor caps, holding periods and filings, for every company.", '<a class="btn ghost" href="#app-activity">Open the audit log</a>') +
      '<div class="comp-grid" data-stagger>' + C2.map((c) => { const ck = c.checklist || {}, live = ["offering", "funded", "monitoring"].includes(c.pipeline_stage);
        const missing = live ? DOM.DOC_CHECKLIST.filter(([k]) => !ck[k] && !(c.pipeline_stage === "offering" && ["allotment", "pas3", "demat_credit"].includes(k))) : [];
        return '<section class="panel"><div class="panel-head"><h2><a href="#app-companyfile/' + c.id + '">' + esc(c.name) + "</a></h2>" + chip("", stageName(c.pipeline_stage)) + "</div>" +
          offerMeter(c.id) + memberMeter(c.id) + platMeter(c.id) +
          (missing.length ? '<p class="small"><b>Missing:</b> ' + missing.map(([, l]) => esc(l)).join("; ") + "</p>" : live ? '<p class="small t-good">Filings complete</p>' : "") + "</section>"; }).join("") + "</div>" +
      '<section class="panel"><h2>Holding-period timers</h2>' + KIT.table("a-locks", { name: "lock-ins", rows: locks, noSearch: true, empty: { title: "No holdings in lock-in", text: "" },
        columns: [{ k: "inv", label: "Investor", val: (h) => who(h.investor_id), html: (h) => esc(who(h.investor_id)) }, { k: "co", label: "Company", val: (h) => co(h.company_id).name, html: (h) => esc(co(h.company_id).name) },
          { k: "allot", label: "Allotted", val: (h) => h.allotment_date, html: (h) => dmy(h.allotment_date) }, { k: "until", label: "Locked until", val: (h) => DOM.lockUntil(h, set()), html: (h) => dmy(DOM.lockUntil(h, set())) },
          { k: "left", label: "Days left", num: true, val: (h) => DOM.daysBetween(today(), DOM.lockUntil(h, set())), html: (h) => String(DOM.daysBetween(today(), DOM.lockUntil(h, set()))) + (h.early_consent ? ' <span class="chip ok">Consent</span>' : "") }] }) + "</section>";
  }

  // ---------- audit log ----------
  function audit() {
    const rows = D().audit || [];
    const acts = [...new Set(rows.map((a) => a.action))].sort(), users = [...new Set(rows.map((a) => a.user_name))].sort();
    return WS.head("Audit log", "Append-only: every offer, revaluation, request, transfer and status change, with who, when, and the values before and after.") +
      '<section class="panel">' + KIT.table("a-audit", { name: "audit-log", rows, pageSize: 40,
        filters: [{ k: "action", label: "Action", options: acts.map((a) => [a, a.replace(/_/g, " ")]) }, { k: "user_name", label: "User", options: users.map((u) => [u, u]) }, { k: "company_id", label: "Company", options: D().companies.map((c) => [c.id, c.name]) }],
        columns: [{ k: "at", label: "When", html: (a) => UI.dt(a.at) }, { k: "user_name", label: "Who", html: (a) => esc(a.user_name) }, { k: "action", label: "Action", html: (a) => esc(a.action.replace(/_/g, " ")) },
          { k: "detail", label: "What changed", sort: false, csv: (a) => a.detail + (a.changes ? " | " + JSON.stringify(a.changes) : ""), html: (a) => esc(a.detail) + (a.changes && a.changes.length ? '<details class="diff"><summary>Before and after (' + a.changes.length + ")</summary>" + a.changes.map((ch) => '<div class="small"><b>' + esc(ch.collection) + " " + esc(ch.id) + "</b>" + Object.entries(ch.diff).map(([k, v]) => Array.isArray(v) ? '<div><code>' + esc(k) + "</code>: " + esc(short(v[0])) + " → " + esc(short(v[1])) + "</div>" : "<div>" + esc(k) + "</div>").join("") + "</div>").join("") + "</details>" : "") }] }) + "</section>";
  }
  const short = (v) => { const s = v === undefined ? "–" : JSON.stringify(v); return s.length > 90 ? s.slice(0, 87) + "..." : s; };

  // ---------- revenue ----------
  const KINDS = [["advisory", "Advisory fees"], ["success", "Success fees (2.5%)"], ["revenue_share", "Revenue share (0.4%)"], ["monitoring", "Debt monitoring"], ["transfer", "Transfer fees"]];
  function invoiceTable(id, F, compact) {
    return KIT.table(id, { name: "invoices", rows: F, noSearch: compact, pageSize: compact ? 8 : 25, empty: { title: "No invoices", text: "" },
      filters: compact ? [] : [{ k: "kind", label: "Fee", options: KINDS }, { k: "st", label: "Status", options: [["paid", "Paid"], ["due", "Due"], ["overdue", "Overdue"]], match: (f, v) => (f.paid_on ? "paid" : f.due < today() ? "overdue" : "due") === v }],
      columns: [{ k: "kind", label: "Fee", html: (f) => esc((KINDS.find((k) => k[0] === f.kind) || [f.kind, f.kind])[1]) + '<span class="muted small block">' + esc(compact ? f.period : co(f.company_id).name + " · " + f.period) + "</span>" },
        { k: "amount_paise", label: "Amount", num: true, csv: (f) => f.amount_paise / 100, html: (f) => rs(f.amount_paise) }, { k: "gst_paise", label: "GST 18%", num: true, csv: (f) => f.gst_paise / 100, html: (f) => rs(f.gst_paise) },
        { k: "due", label: "Due", html: (f) => dmy(f.due) },
        { k: "paid_on", label: "Status", val: (f) => f.paid_on || "", html: (f) => (f.paid_on ? chip("ok", "Paid " + dmy(f.paid_on)) : chip(f.due < today() ? "bad" : "warn", f.due < today() ? "Overdue" : "Due") + ' <button class="linkbtn small" data-act="a-paid" data-id="' + f.id + '">Mark paid</button>') }] });
  }
  function revenue() {
    const F = D().invoices, sum = (L) => L.reduce((a, f) => a + f.amount_paise, 0);
    const months = []; for (let k = -11; k <= 0; k++) months.push(DOM.addMonths(today().slice(0, 8) + "01", k).slice(0, 7));
    const ser = KINDS.map(([k, l], i) => ({ name: l, color: ["var(--s-equity)", "var(--s-mix)", "var(--gold-ink, #7B5C1F)", "var(--s-debt)", "var(--muted)"][i], values: months.map((m) => sum(F.filter((f) => f.kind === k && (f.paid_on || f.issued).slice(0, 7) === m)) / 1e7) }));
    return WS.head("Revenue", "Every fee Aegis Ascend earns, with GST at 18%. Revenue share is 0.4% of revenue for 5 years; monitoring 0.25% to 0.5% a year; transfers 0.3% to 0.5%.", '<button class="btn ghost" data-act="a-invoice">Raise invoice</button>') +
      '<div class="kpis k5" data-stagger>' + KINDS.map(([k, l]) => { const L = F.filter((f) => f.kind === k), paid = L.filter((f) => f.paid_on), due = L.filter((f) => !f.paid_on);
        return '<div class="kpi"><small>' + esc(l) + "</small><b>" + rs(sum(paid), true) + '</b><span>paid · ' + rs(sum(due), true) + " due</span></div>"; }).join("") + "</div>" +
      '<section class="panel"><h2>Fees by month</h2>' + UI.stack(months.map((m) => my(m + "-01")), ser, { fmt: (v) => "Rs " + UI.n(v, 2) + " L", yfmt: (y) => UI.n(y, 0) + " L", label: "Fees invoiced or received by month, Rs lakh", height: 240 }) + "</section>" +
      '<section class="panel"><h2>Invoices</h2>' + invoiceTable("a-rev", F.slice().sort((a, b) => (a.issued < b.issued ? 1 : -1)), false) + "</section>";
  }

  // ---------- notes and tasks ----------
  function subjectName(n) { return n.subject_type === "company" ? co(n.subject_id).name : who(n.subject_id); }
  function notesList(N) {
    return N.length ? '<ul class="notes2">' + N.map((n) => '<li class="' + (n.done ? "done" : n.due && n.due < today() ? "late" : "") + '"><label class="chk"><input type="checkbox" data-act="a-note-toggle" data-id="' + n.id + '"' + (n.done ? " checked" : "") + "> " + esc(n.text) + '</label><span class="muted small">' + (n.due ? "due " + dmy(n.due) : "no due date") + "</span></li>").join("") + "</ul>" : '<p class="muted">No notes yet.</p>';
  }
  function tasks() {
    const N = D().notes.slice().sort((a, b) => (a.done - b.done) || ((a.due || "9") < (b.due || "9") ? -1 : 1));
    return WS.head("Notes and tasks", "On any investor, lender or company. Tasks with a due date show on Today.", '<button class="btn primary" data-act="a-note">Add note</button>') +
      '<section class="panel">' + KIT.table("a-notes", { name: "notes", rows: N, filters: [{ k: "subject_type", label: "About", options: [["company", "Company"], ["investor", "Investor"], ["lender", "Lender"]] }, { k: "st", label: "Status", options: [["open", "Open"], ["done", "Done"]], match: (n, v) => (v === "done") === n.done }],
        empty: { title: "No notes yet", text: "Add a note or task about an investor, lender or company.", action: '<button class="btn primary" data-act="a-note">Add note</button>' },
        columns: [{ k: "text", label: "Note", html: (n) => '<label class="chk"><input type="checkbox" data-act="a-note-toggle" data-id="' + n.id + '"' + (n.done ? " checked" : "") + '> <span class="' + (n.done ? "muted strike" : "") + '">' + esc(n.text) + "</span></label>" },
          { k: "about", label: "About", val: (n) => subjectName(n), html: (n) => esc(subjectName(n)) + '<span class="muted small block">' + n.subject_type + "</span>" },
          { k: "due", label: "Due", val: (n) => n.due || "", html: (n) => (n.due ? '<span class="' + (!n.done && n.due < today() ? "t-bad" : "") + '">' + dmy(n.due) + "</span>" : "–") }] }) + "</section>";
  }

  // ---------- message templates ----------
  const TPL_KEY = "aegis_offer_templates_v1";
  const TPL_DEFAULT = { subject: "Private offer: {company_name}", body: "Dear {investor_name},\n\n{company_name} ({sector}) is raising {raise}. Its debt vs equity report has been reviewed and signed off by our advisors, and you can read it in your Aegis Ascend workspace under Opportunities.\n\nThis is a private offer made to you personally. Please do not forward it.\n\nRegards,\n{advisor_name}\nAegis Ascend Financial Advisors" };
  function loadTpl() { try { return Object.assign({}, TPL_DEFAULT, JSON.parse(localStorage.getItem(TPL_KEY) || "{}")); } catch (e) { return Object.assign({}, TPL_DEFAULT); } }
  function fill(t, u, c) { return t.replace(/\{investor_name\}/g, u.name).replace(/\{investor_firm\}/g, u.firm || u.name).replace(/\{company_name\}/g, c.name).replace(/\{sector\}/g, c.sector).replace(/\{raise\}/g, rs(c.raise_paise, true)).replace(/\{offer_price\}/g, c.offer_price_paise ? rsPrice(c.offer_price_paise) : "the offer price").replace(/\{advisor_name\}/g, S.user.name); }
  function templates() {
    const t = loadTpl(), offered = D().offers.filter((o) => o.fy === fyNow()).sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    const cid = S.tplCo || (offered[0] && offered[0].company_id) || (D().companies[0] || {}).id, c = co(cid);
    const recips = offered.filter((o) => o.company_id === cid).map((o) => person(o.investor_id)).filter((u) => u.id);
    return WS.head("Message templates", "Write once, then send individually addressed private messages to investors who already have the offer in their workspace. Nothing is sent from here: each button opens your email or WhatsApp with one message for one person.") +
      '<div class="grid2"><section class="panel"><h2>Template</h2><form class="form" data-form="a-tpl"><label class="fld"><span>Email subject</span><span class="in"><input name="subject" value="' + esc(t.subject) + '"></span></label>' +
      '<label class="fld"><span>Message</span><span class="in"><textarea name="body" rows="11">' + esc(t.body) + "</textarea></span></label>" +
      '<p class="small muted">Placeholders: {investor_name} {investor_firm} {company_name} {sector} {raise} {offer_price} {advisor_name}</p><div class="row gap-s"><button class="btn primary" type="submit">Save template</button><button class="btn ghost" type="button" data-act="a-tpl-reset">Restore default</button></div></form></section>' +
      '<section class="panel"><h2>Send for a company</h2><label class="fld"><span>Company</span><span class="in"><select data-act="a-tpl-co">' + D().companies.map((x) => '<option value="' + x.id + '"' + (x.id === cid ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></span></label>" +
      (recips.length ? '<ul class="msgs">' + recips.map((u) => { const body = fill(t.body, u, c), sub = fill(t.subject, u, c);
        return "<li><div><b>" + esc(u.firm || u.name) + '</b><span class="muted small block">' + esc(u.name) + (u.email ? " · " + esc(u.email) : "") + '</span></div><div class="row gap-s"><a class="btn ghost sm" href="mailto:' + encodeURIComponent(u.email || "") + "?subject=" + encodeURIComponent(sub) + "&body=" + encodeURIComponent(body) + '">Email</a><a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(body) + '">WhatsApp</a><button class="btn ghost sm" data-act="a-copy" data-text="' + esc(body) + '">Copy</button></div></li>'; }).join("") + "</ul>"
        : KIT.empty("Nobody to message yet", "Share the offer from the investor directory first; messages go only to investors who already hold this company's offer.")) + "</section></div>";
  }

  // ---------- settings ----------
  function settingsPage() {
    const s = set();
    return WS.head("Settings", "Limits the platform enforces on the server for every action.") +
      '<section class="panel"><form class="form" data-form="a-settings"><div class="fields f3"><label class="fld"><span>Platform investors per company</span><span class="in"><input name="max" type="number" min="1" max="200" value="' + s.max_platform_investors + '"></span><small class="muted">Default 20. Changing it is recorded in the audit log.</small></label></div><button class="btn primary" type="submit">Save</button></form>' +
      '<ul class="ticks"><li>Offers: warn at ' + s.offer_warn + ", block at " + s.offer_limit + " per company per financial year per security type (Section 42)</li><li>Members: warn at " + s.member_warn + ", block at " + s.member_limit + " (Section 2(68))</li><li>Minimum holding: " + s.lock_months + " months from allotment, unless the founder consents in writing</li></ul></section>";
  }

  // ---------- actions ----------
  const act = (name, p, msg) => API.act(name, p).then((r) => WS.after(r, msg));
  Object.assign(WS.clicks, {
    "a-pipeview": (b, id) => { S.pipeView = id; return WS.render({ keepScroll: true }); },
    "a-pick-co": (b, id) => { S.offerCo = id; },
    "a-shortlist": () => {
      const c = co(S.offerCo), sec = c.security_type || "equity", offered = new Set(D().offers.filter((o) => o.company_id === c.id && o.fy === fyNow() && o.security_type === sec).map((o) => o.investor_id));
      const left = set().offer_limit - used(c.id, sec);
      const top = investors().filter((u) => (u.profile || {}).kyc === "verified" && !offered.has(u.id)).map((u) => ({ u, f: GB.fitScore(Object.assign({}, c, { raise: (c.raise_paise || 0) / 1e9 }), u).score })).filter((x) => x.f >= 60).sort((a, b) => b.f - a.f).slice(0, Math.min(10, left));
      const t = top.map((x) => x.u.id);
      KIT.select("a-dir", t);
      KIT.toast(t.length ? "Selected " + t.length + " verified investors with a fit score of 60 or more who have not had this offer." : "No new verified investors score 60 or more for this company.");
      return WS.render({ keepScroll: true });
    },
    "a-share": async () => {
      const c = co(S.offerCo), sec = c.security_type || "equity", ids = KIT.selected("a-dir"), n = used(c.id, sec), lim = set().offer_limit;
      const offered = new Set(D().offers.filter((o) => o.company_id === c.id && o.fy === fyNow() && o.security_type === sec).map((o) => o.investor_id));
      const fresh = ids.filter((i) => !offered.has(i)), unverified = fresh.filter((i) => (person(i).profile || {}).kyc !== "verified");
      if (unverified.length) return KIT.toast(unverified.map(who).join(", ") + (unverified.length === 1 ? " has" : " have") + " not completed KYC. Deselect them first.", "bad");
      const over = n + fresh.length > lim;
      if (!(await KIT.dialog({ title: "Share " + c.name + " with " + fresh.length + " investor" + (fresh.length === 1 ? "" : "s") + "?", confirm: over ? "Blocked" : "Share offer", danger: over,
        text: '<p>Offers this financial year (' + fyNow() + ", " + sec + "): <b>" + n + " / " + lim + "</b> now, <b>" + (n + fresh.length) + " / " + lim + "</b> after sending.</p>" +
          (over ? '<p class="t-bad">Blocked: this would exceed the Section 42 limit of ' + lim + " offers. Select at most " + (lim - n) + ".</p>" : n + fresh.length >= set().offer_warn ? '<p class="t-warn">Above ' + set().offer_warn + ": plan the remaining offers carefully.</p>" : "") +
          '<ul class="small">' + fresh.map((i) => "<li>" + esc(who(i)) + "</li>").join("") + "</ul><p class=\"small muted\">Each investor gets a private offer in their workspace. Nothing is published.</p>",
        validate: () => (over ? "Too many investors selected: " + (lim - n) + " offers left this year." : null) }))) return;
      await act("share_offer", { company_id: c.id, investor_ids: fresh, security_type: sec });
      KIT.clearSel("a-dir"); WS.render({ keepScroll: true });
    },
    "a-kyc": async (b, id) => {
      const u = person(id), v = await KIT.dialog({ title: "KYC and accreditation: " + (u.firm || u.name), confirm: "Save",
        fields: [{ name: "kyc", label: "KYC status", type: "select", value: (u.profile || {}).kyc || "not_started", options: [["verified", "Verified"], ["pending", "Pending"], ["not_started", "Not started"]] }, { name: "acc", label: "Accredited investor", type: "checkbox", value: !!(u.profile || {}).accredited }] });
      if (v) return act("set_investor_profile", { investor_id: id, kyc: v.kyc, accredited: v.acc });
    },
    "a-sell": async (b, id) => {
      const x = D().sell_requests.find((y) => y.id === id), step = b.dataset.step, c = co(x.company_id);
      if (step === "review") return act("sell_step", { request_id: id, step });
      if (step === "rofr") { const v = await KIT.dialog({ title: "Start the first-refusal window", text: "<p>The company's nominees and existing shareholders get first right to buy " + DOM.shares(x.shares) + " shares, as the SHA requires.</p>", confirm: "Start window", fields: [{ name: "days", label: "Window length", type: "number", value: 21, min: 15, max: 30, unit: "days", hint: "15 to 30 days" }], validate: (v) => (+v.days >= 15 && +v.days <= 30 ? null : "Choose 15 to 30 days") }); if (v) return act("sell_step", { request_id: id, step, days: +v.days }); return; }
      if (step === "buyer") {
        const opts = buyerOptions(x), early = today() < x.rofr_until;
        if (!opts.length) return KIT.toast("No verified investor can buy without breaking the 20-investor or 200-member limit.", "bad");
        const v = await KIT.dialog({ title: "Introduce a buyer", confirm: "Introduce", text: "<p>Introductions are one to one and do not count as a Section 42 offer. Only investors who keep the company within its limits are listed.</p>" + (!x.full ? '<p class="t-warn">This is a part sale: a new buyer adds a member (' + mem(c.id) + " / " + set().member_limit + " now).</p>" : "") + (early ? '<p class="t-warn">The first-refusal window runs until ' + dmy(x.rofr_until) + ". Tick the waiver only if every rights-holder has waived in writing.</p>" : ""),
          fields: [{ name: "buyer", label: "Buyer", type: "select", options: opts }].concat(early ? [{ name: "waived", label: "Rights-holders have waived first refusal in writing", type: "checkbox" }] : []), validate: (v) => (early && !v.waived ? "Wait for the window to end, or record a written waiver" : null) });
        if (v) return act("sell_step", { request_id: id, step, buyer_investor_id: v.buyer, waived: !!v.waived });
        return;
      }
      if (step === "spa") { const v = await KIT.dialog({ title: "Record the signed SPA", confirm: "Record SPA", fields: [{ name: "date", label: "SPA date", type: "date", value: today(), max: today() }, { name: "price", label: "Agreed price per share", type: "number", min: 0, step: "0.01", unit: "Rs", value: x.indicative_price_paise ? x.indicative_price_paise / 100 : "" }], validate: (v) => (+v.price > 0 ? null : "Enter the agreed price") }); if (v) return act("sell_step", { request_id: id, step, spa_date: v.date, price_paise: Math.round(+v.price * 100) }); return; }
      if (step === "complete") {
        const h = D().holdings.find((y) => y.id === x.holding_id), full = h && h.shares === x.shares, newBuyer = !DOM.platformInvestors(D(), c.id).includes(x.buyer_investor_id);
        const m2 = mem(c.id) + (newBuyer ? 1 : 0) - (full ? 1 : 0), p2 = plat(c.id) + (newBuyer ? 1 : 0) - (full ? 1 : 0);
        if (await KIT.confirm("Complete the transfer?", "<p>" + DOM.shares(x.shares) + " shares move from " + esc(who(x.investor_id)) + " to " + esc(who(x.buyer_investor_id)) + " at " + rsPrice(x.price_paise) + ". Both portfolios, the cap table and the member count update.</p><p>After the transfer: members <b>" + m2 + " / " + set().member_limit + "</b>, platform investors <b>" + p2 + " / " + set().max_platform_investors + "</b>.</p><p class=\"small muted\">This cannot be undone.</p>", "Complete transfer")) return act("sell_step", { request_id: id, step });
        return;
      }
      if (step === "reject") { const v = await KIT.dialog({ title: "Reject this request", danger: true, confirm: "Reject", fields: [{ name: "reason", label: "Reason (shared with the investor)", type: "textarea", required: true }], validate: (v) => (v.reason.trim() ? null : "Give a reason") }); if (v) return act("sell_step", { request_id: id, step, reason: v.reason }); }
    },
    "a-consent": async (b, id) => { const v = await KIT.dialog({ title: "Record the founder's written consent", text: "<p>Allows this investor to request a sale before the 6-month minimum holding. Keep the signed letter on file.</p>", confirm: "Record consent", fields: [{ name: "note", label: "Who signed, and the letter's date", type: "text", required: true }], validate: (v) => (v.note.trim() ? null : "Describe the consent") }); if (v) return act("record_consent", { holding_id: id, note: v.note }); },
    "a-lt": async (b, id) => {
      const t = D().loan_transfers.find((x) => x.id === id), next = LT[LT.findIndex((s) => s[0] === t.status) + 1][0];
      if (next === "buyer_introduced") { const opts = (D().directory || []).filter((u) => u.role === "lender" && u.id !== t.from_lender_id && (u.profile || {}).regulated).map((u) => [u.id, u.firm + " (" + ((u.profile || {}).lender_type || "") + ")"]); const v = await KIT.dialog({ title: "Introduce a buyer lender", text: "<p>Regulated banks and NBFCs only.</p>", confirm: "Introduce", fields: [{ name: "buyer", label: "Buyer", type: "select", options: opts }] }); if (v) return act("loan_transfer_step", { transfer_id: id, step: next, buyer_lender_id: v.buyer }); return; }
      if (next === "completed") { const l = loan(t), base = t.amount_paise || DOM.loanSummary(l, today()).principal_pending; const v = await KIT.dialog({ title: "Complete the transfer", text: "<p>The loan moves to " + esc(who(t.buyer_lender_id)) + "'s book. Transfer amount " + rs(base) + ".</p>", confirm: "Complete transfer", fields: [{ name: "rate", label: "Transfer fee", type: "number", value: 0.4, min: 0.3, max: 0.5, step: "0.05", unit: "%", hint: "0.3% to 0.5%, paid by the selling lender, plus GST" }], validate: (v) => (+v.rate >= 0.3 && +v.rate <= 0.5 ? null : "The fee is 0.3% to 0.5%") }); if (v) return act("loan_transfer_step", { transfer_id: id, step: next, fee_rate: +v.rate / 100 }); return; }
      const label = { eligibility: "Check eligibility: regulated seller, RBI minimum holding period met?", consent: "Record the borrower's consent?", deed_signed: "Record the signed deed of assignment?", charge_updated: "Record the charge updated with the ROC?" }[next];
      if (await KIT.confirm(label, "", "Confirm")) return act("loan_transfer_step", { transfer_id: id, step: next });
    },
    "a-lt-reject": async (b, id) => { const v = await KIT.dialog({ title: "Reject this transfer", danger: true, confirm: "Reject", fields: [{ name: "reason", label: "Reason", type: "textarea" }], validate: (v) => (v.reason.trim() ? null : "Give a reason") }); if (v) return act("loan_transfer_step", { transfer_id: id, step: "reject", reason: v.reason }); },
    "a-reval": async (b, id) => {
      const c = co(id), v0 = lastVal(id);
      const v = await KIT.dialog({ title: "Revalue " + c.name, confirm: "Review and publish",
        text: "<p>Last valuation: " + (v0 ? rsPrice(v0.price_per_share_paise) + " on " + dmy(v0.date) + " (" + esc(v0.method) + ")" : "none") + ".</p>",
        fields: [{ name: "date", label: "Valuation date", type: "date", value: today(), max: today() }, { name: "method", label: "Method", type: "select", value: "DCF", options: [["DCF", "Discounted cash flow (DCF)"], ["Market multiples", "Market multiples"]] },
          { name: "price", label: "Price per share", type: "number", min: 0, step: "0.01", unit: "Rs" }, { name: "valuer", label: "Registered valuer", type: "text", value: v0 ? v0.valuer : "" }, { name: "file", label: "Valuer's report (PDF)", type: "file", accept: ".pdf,.xlsx,.docx" }],
        validate: (x) => (!(+x.price > 0) ? "Enter the price per share" : !x.valuer.trim() ? "Enter the registered valuer" : !x.date || x.date > today() ? "The date cannot be in the future" : null) });
      if (!v) return;
      const p = Math.round(+v.price * 100), H = D().holdings.filter((h) => h.company_id === id && h.shares > 0), delta = v0 ? H.reduce((a, h) => a + h.shares, 0) * (p - v0.price_per_share_paise) : 0;
      if (!(await KIT.confirm("Publish this valuation?", "<p>" + rsPrice(p) + " a share" + (v0 ? " (" + (p >= v0.price_per_share_paise ? "+" : "") + pct(p / v0.price_per_share_paise - 1, 1) + ")" : "") + ". " + H.length + " investors' portfolios change by " + rs(delta, true) + " in total, and each is notified.</p>", "Publish"))) return;
      let fileId = null;
      if (v.file) fileId = (await API.upload(v.file, { company_id: id, purpose: "valuation_report" })).id;
      return act("publish_valuation", { company_id: id, date: v.date, method: v.method, price_per_share_paise: p, valuer: v.valuer, file_id: fileId });
    },
    "a-allot": async (b, id) => {
      const o = D().offers.find((x) => x.id === id), c = co(o.company_id), price = c.offer_price_paise || 0, isNew = !DOM.platformInvestors(D(), c.id).includes(o.investor_id);
      const v = await KIT.dialog({ title: "Record allotment: " + who(o.investor_id), confirm: "Record allotment",
        text: "<p>After this allotment: platform investors <b>" + (plat(c.id) + (isNew ? 1 : 0)) + " / " + set().max_platform_investors + "</b>, members <b>" + (mem(c.id) + (isNew ? 1 : 0)) + " / " + set().member_limit + "</b>.</p>",
        fields: [{ name: "shares", label: "Shares allotted", type: "number", min: 1, step: 1 }, { name: "amount", label: "Amount received", type: "number", min: 0, step: "0.01", unit: "Rs", hint: price ? "At the offer price of " + rsPrice(price) + " a share" : "" }, { name: "date", label: "Allotment date (shares credited to demat)", type: "date", value: today(), max: today() }],
        validate: (x) => (!(+x.shares > 0) ? "Enter the shares" : !(+x.amount > 0) ? "Enter the amount received" : null) });
      if (v) return act("allot_shares", { offer_id: id, shares: +v.shares, amount_paise: Math.round(+v.amount * 100), allotment_date: v.date });
    },
    "a-cap": async (b, id) => {
      const e = b.dataset.entry && D().cap_table.find((x) => x.id === b.dataset.entry);
      const v = await KIT.dialog({ title: e ? "Edit " + e.holder_name : "Add a founder or existing shareholder", confirm: "Save",
        fields: [{ name: "name", label: "Holder (or group, e.g. Employees)", value: e ? e.holder_name : "" }, { name: "type", label: "Type", type: "select", value: e ? e.holder_type : "existing", options: [["founder", "Founder"], ["existing", "Existing shareholder"]] },
          { name: "shares", label: "Shares", type: "number", min: 0, step: 1, value: e ? e.shares : "" }, { name: "holders", label: "Number of holders in this row", type: "number", min: 1, step: 1, value: e ? e.holders || 1 : 1, hint: "Each holder counts as a member towards the 200 limit" }],
        validate: (x) => (!x.name.trim() || !(+x.shares >= 0) || !(+x.holders >= 1) ? "Enter the holder, shares and number of holders" : null) });
      if (v) return act("save_cap_entry", { company_id: id, entry_id: e ? e.id : null, holder_name: v.name, holder_type: v.type, shares: +v.shares, holders: +v.holders });
    },
    "a-terms": async (b, id) => {
      const c = co(id), v = await KIT.dialog({ title: "Offer terms: " + c.name, confirm: "Save",
        fields: [{ name: "price", label: "Offer price per share", type: "number", min: 0, step: "0.01", unit: "Rs", value: (c.offer_price_paise || 0) / 100 }, { name: "sec", label: "Security offered", type: "select", value: c.security_type || "equity", options: DOM.SECURITY_TYPES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)]) },
          { name: "extra", label: "Unissued options and convertibles (for fully diluted shares)", type: "number", min: 0, step: 1, value: c.fd_extra_shares || 0 }] });
      if (v) return act("save_company", { company_id: id, patch: { offer_price_paise: Math.round(+v.price * 100), security_type: v.sec, fd_extra_shares: +v.extra } });
    },
    "a-external": async (b, id) => {
      const c = co(id), sec = c.security_type || "equity", cur = (((c.external_offers || {})[fyNow()]) || {})[sec] || 0;
      const v = await KIT.dialog({ title: "Offers made outside the platform", text: "<p>The Section 42 limit of " + set().offer_limit + " counts every person " + esc(c.name) + " offered " + sec + " to in FY " + fyNow() + ", including offers it made directly.</p>", confirm: "Save",
        fields: [{ name: "n", label: "Off-platform offers in FY " + fyNow(), type: "number", min: 0, step: 1, value: cur }] });
      if (v) return act("set_external_offers", { company_id: id, fy: fyNow(), security_type: sec, count: +v.n });
    },
    "a-check": async (b) => {
      const id = b.dataset.id, item = b.dataset.item, on = b.checked;
      if (on) { const v = await KIT.dialog({ title: (DOM.DOC_CHECKLIST.find((x) => x[0] === item) || [])[1], confirm: "Mark done", fields: [{ name: "date", label: "Date", type: "date", value: today(), max: today() }] }); if (!v) { b.checked = false; return; } return act("set_checklist", { company_id: id, item, date: v.date }); }
      return act("set_checklist", { company_id: id, item, date: null });
    },
    "a-update": async (b, id) => { const v = await KIT.dialog({ title: "Post a company update", text: "<p>Shareholders on the platform are notified.</p>", confirm: "Post", fields: [{ name: "text", label: "Update", type: "textarea" }], validate: (x) => (x.text.trim() ? null : "Write the update") }); if (v) return act("post_update", { company_id: id, text: v.text }); },
    "a-invoice": async (b, id) => {
      const lenders = (D().directory || []).filter((u) => u.role === "lender");
      const v = await KIT.dialog({ title: "Raise an invoice", confirm: "Raise invoice", fields: [{ name: "co", label: "Company", type: "select", value: id || "", options: D().companies.map((c) => [c.id, c.name]) }, { name: "kind", label: "Fee", type: "select", options: KINDS },
        { name: "lender", label: "Payer lender (monitoring and transfer fees)", type: "select", options: lenders.map((u) => [u.id, u.firm]) }, { name: "period", label: "Period or description" }, { name: "amount", label: "Amount before GST", type: "number", min: 0, step: "0.01", unit: "Rs" }, { name: "due", label: "Due date", type: "date", value: DOM.addDays(today(), 15) }],
        validate: (x) => (+x.amount > 0 ? null : "Enter the amount") });
      if (v) return act("save_invoice", { company_id: v.co, kind: v.kind, payer_id: v.lender, period: v.period, amount_paise: Math.round(+v.amount * 100), due: v.due });
    },
    "a-paid": async (b, id) => { if (await KIT.confirm("Mark this invoice paid today?", "", "Mark paid")) return act("mark_invoice_paid", { invoice_id: id }); },
    "a-note": async (b, id) => {
      const opts = [["company", "Company"], ["investor", "Investor"], ["lender", "Lender"]];
      const subjects = D().companies.map((c) => ["company:" + c.id, "Company · " + c.name]).concat((D().directory || []).filter((u) => u.role === "investor" || u.role === "lender").map((u) => [u.role + ":" + u.id, (u.role === "investor" ? "Investor · " : "Lender · ") + (u.firm || u.name)]));
      const v = await KIT.dialog({ title: "Add a note or task", confirm: "Add", fields: [{ name: "about", label: "About", type: "select", value: id ? (b.dataset.type || "company") + ":" + id : subjects[0][0], options: subjects }, { name: "text", label: "Note", type: "textarea" }, { name: "due", label: "Due date (optional, makes it a task)", type: "date" }], validate: (x) => (x.text.trim() ? null : "Write the note") });
      if (!v) return; const [t, sid] = v.about.split(":"); void opts;
      return act("save_note", { subject_type: t, subject_id: sid, text: v.text, due: v.due || null });
    },
    "a-note-toggle": (b, id) => act("toggle_note", { note_id: id }),
    "a-copy": async (b) => { try { await navigator.clipboard.writeText(b.dataset.text); KIT.toast("Message copied."); } catch (e) { KIT.toast("Copy is blocked here; select the text in the template instead.", "bad"); } },
    "a-tpl-reset": () => { try { localStorage.removeItem(TPL_KEY); } catch (e) { /* storage blocked */ } return WS.render({ keepScroll: true }); },
  });
  Object.assign(WS.forms, {
    "a-tpl": (f, v) => { try { localStorage.setItem(TPL_KEY, JSON.stringify({ subject: v.subject, body: v.body })); KIT.toast("Template saved in this browser."); } catch (e) { KIT.toast("Could not save the template here.", "bad"); } return WS.render({ keepScroll: true }); },
    "a-settings": (f, v) => act("save_settings", { max_platform_investors: +v.max }),
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('[data-act="a-offer-co"]')) { S.offerCo = e.target.value; WS.render({ keepScroll: true }); }
    if (e.target.matches('[data-act="a-tpl-co"]')) { S.tplCo = e.target.value; WS.render({ keepScroll: true }); }
  });
  document.addEventListener("dt-change", (e) => {
    if (e.detail.id !== "a-dir") return;
    const btn = document.querySelector('[data-act="a-share"]'); if (!btn) return;
    const n = e.detail.selected.length; btn.disabled = !n; btn.textContent = "Share offer with " + n + " selected";
  });
  Object.assign(WS.PAGES.advisor, { app: todayPage, "app-pipeline": pipeline, "app-companyfile": companyFile, "app-directory": directory, "app-requests": requests, "app-revaluations": revaluations,
    "app-loantransfers": loanTransfers, "app-loansdesk": loansDesk, "app-compliance": compliance, "app-revenue": revenue, "app-tasks": tasks, "app-templates": templates, "app-activity": audit, "app-settings": settingsPage });
})(typeof globalThis !== "undefined" ? globalThis : this);
