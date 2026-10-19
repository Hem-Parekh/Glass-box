/* Lender workspace: loan book, loan detail with the repayment schedule, applications, monitoring and loan transfers. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT, GB = root.GB;
  const { esc, gx, pct, chip, lines, vbars, C } = UI;
  const { rs, dmy } = DOM;
  const S = WS.S;
  const today = () => S.data.today;
  const co = (id) => WS.companyById(id) || { name: id, quarters: [] };
  const my = (s) => DOM.MON[+s.slice(5, 7) - 1] + " '" + s.slice(2, 4);
  const LT_STEPS = [["submitted", "Requested"], ["eligibility", "Eligibility checked"], ["consent", "Borrower consent"], ["buyer_introduced", "Buyer lender introduced"], ["deed_signed", "Assignment deed signed"], ["charge_updated", "Charge updated with ROC"], ["completed", "Transfer complete"]];

  /** Latest quarterly DSCR and its band: green >= 1.5, amber 1.25 to 1.5, red below 1.25. */
  function dscr(c) {
    const m = GB.monitor(c.quarters || [], c.covenants), last = m[m.length - 1];
    if (!last) return { v: null, html: '<span class="muted small">No quarters yet</span>' };
    const band = last.dscr >= 1.5 ? "ok" : last.dscr >= 1.25 ? "warn" : "bad";
    return { v: last.dscr, band, q: last.q, html: chip(band, UI.xx(last.dscr)) + '<span class="muted small block">' + esc(last.q) + "</span>" };
  }
  function rowsOf(L) { return L.map((l) => Object.assign({ l, c: co(l.company_id), s: DOM.loanSummary(l, today()) }, {})); }
  const tenorTxt = (l) => Math.round(l.tenor_months / 12 * 10) / 10 + " yrs" + (l.moratorium_months ? " · " + l.moratorium_months + " mo moratorium" : "");
  const rate = (l) => (l.rate_bps / 100).toFixed(2) + "%";

  function earnings(loans) {
    const t = today(), months = [];
    for (let k = -12; k < 12; k++) months.push(DOM.addMonths(t.slice(0, 8) + "01", k).slice(0, 7));
    const earned = {}, planned = {};
    for (const l of loans) for (const r of DOM.schedule(l, t)) { const m = r.due.slice(0, 7); if (r.status === "paid") earned[m] = (earned[m] || 0) + r.interest; else planned[m] = (planned[m] || 0) + r.interest; }
    const cur = t.slice(0, 7);
    return { cats: months.map((m) => my(m + "-01")), vals: months.map((m) => ((m < cur ? earned[m] || 0 : (earned[m] || 0) + (planned[m] || 0)) / 1e7)), colors: months.map((m) => (m < cur ? C.debt : "color-mix(in srgb, var(--s-debt) 42%, transparent)")) };
  }

  // ---------- loan book ----------
  function book() {
    const L = S.data.loans.filter((l) => l.status === "disbursed"), R = rowsOf(L);
    const sum = (k) => R.reduce((a, r) => a + (r.s[k] || 0), 0);
    const next = R.filter((r) => r.s.next_due).sort((a, b) => (a.s.next_due < b.s.next_due ? -1 : 1))[0];
    const e = earnings(L), overdue = R.filter((r) => r.s.overdue);
    return WS.head("Loan book", esc(S.user.firm || "") + " · every figure is worked out from each loan's repayment schedule") +
      (overdue.length ? '<div class="notice bad" role="status">' + overdue.length + " loan" + (overdue.length === 1 ? " has" : "s have") + " an overdue instalment: " + overdue.map((r) => '<a href="#app-loan/' + r.l.id + '">' + esc(r.c.name) + "</a>").join(", ") + ".</div>" : "") +
      '<div class="kpis k6" data-stagger>' +
      '<div class="kpi"><small>Total lent</small><b>' + KIT.figure("l-lent", sum("disbursed"), (y) => rs(y, true)) + "</b></div>" +
      '<div class="kpi"><small>Principal outstanding</small><b>' + gx(rs(sum("principal_pending"), true), { title: "Principal outstanding", formula: "Sum over loans of (amount disbursed - principal in instalments received)", inputs: R.map((r) => [r.c.name, rs(r.s.principal_pending), "schedule"]) }) + "</b></div>" +
      '<div class="kpi"><small>Interest earned to date</small><b class="t-good">' + KIT.figure("l-int", sum("interest_earned"), (y) => rs(y, true)) + "</b></div>" +
      '<div class="kpi"><small>Interest due this month</small><b>' + rs(sum("interest_this_month"), true) + "</b></div>" +
      '<div class="kpi"><small>Next repayment</small><b>' + (next ? rs(next.s.next_amount, true) : "–") + "</b><span>" + (next ? dmy(next.s.next_due) + " · " + esc(next.c.name.split(" ")[0]) : "") + "</span></div>" +
      '<div class="kpi"><small>Active loans</small><b>' + KIT.figure("l-n", L.length, (y) => String(Math.round(y))) + "</b></div></div>" +
      '<section class="panel"><div class="panel-head"><h2>Loans</h2><span class="muted small">DSCR from the latest quarterly accounts: green 1.5x or more, amber 1.25x to 1.5x, red below 1.25x.</span></div>' +
      KIT.table("l-book", { name: "loan-book", rows: R, key: (r) => r.l.id, empty: { title: "No active loans", text: "Disbursed loans appear here with their schedules." },
        filters: [{ k: "band", label: "DSCR", options: [["ok", "Green"], ["warn", "Amber"], ["bad", "Red"]], match: (r, v) => dscr(r.c).band === v }],
        columns: [
          { k: "co", label: "Borrower", val: (r) => r.c.name, html: (r) => '<a href="#app-loan/' + r.l.id + '"><b>' + esc(r.c.name) + "</b></a>" + (r.s.overdue ? ' <span class="chip bad">Overdue</span>' : "") },
          { k: "dates", label: "Sanctioned / disbursed", val: (r) => r.l.disbursal_date, html: (r) => dmy(r.l.sanction_date) + '<span class="muted small block">' + dmy(r.l.disbursal_date) + "</span>" },
          { k: "amt", label: "Disbursed", num: true, val: (r) => r.s.disbursed, csv: (r) => r.s.disbursed / 100, html: (r) => rs(r.s.disbursed, true) },
          { k: "rate", label: "Rate", num: true, val: (r) => r.l.rate_bps, html: (r) => rate(r.l) },
          { k: "tenor", label: "Tenor", val: (r) => r.l.tenor_months, html: (r) => tenorTxt(r.l) },
          { k: "repaid", label: "Principal repaid", num: true, val: (r) => r.s.principal_repaid, csv: (r) => r.s.principal_repaid / 100, html: (r) => rs(r.s.principal_repaid, true) },
          { k: "pending", label: "Principal pending", num: true, val: (r) => r.s.principal_pending, csv: (r) => r.s.principal_pending / 100, html: (r) => rs(r.s.principal_pending, true) },
          { k: "int", label: "Interest earned", num: true, val: (r) => r.s.interest_earned, csv: (r) => r.s.interest_earned / 100, html: (r) => rs(r.s.interest_earned, true) },
          { k: "mint", label: "Monthly interest", num: true, val: (r) => r.s.monthly_interest, csv: (r) => r.s.monthly_interest / 100, html: (r) => rs(r.s.monthly_interest, true) },
          { k: "next", label: "Next instalment", val: (r) => r.s.next_due, html: (r) => (r.s.next_due ? dmy(r.s.next_due) + '<span class="muted small block">' + rs(r.s.next_amount, true) + "</span>" : "Repaid") },
          { k: "dscr", label: "Latest DSCR", val: (r) => dscr(r.c).v, csv: (r) => dscr(r.c).v, html: (r) => dscr(r.c).html },
        ] }) + "</section>" +
      '<section class="panel"><h2>Interest income by month</h2>' + vbars(e.cats, e.vals, e.colors, { fmt: (v) => "Rs " + UI.n(v, 1) + " L", label: "Interest income by month, last 12 months earned and next 12 projected", height: 230, values: false, xEvery: 3 }) +
      '<p class="small muted"><span class="key solid"></span>Earned (instalments received) <span class="key light"></span>Projected from the schedules. Rs lakh.</p></section>';
  }

  // ---------- loan detail ----------
  function detail(id) {
    const l = S.data.loans.find((x) => x.id === id);
    if (!l) return WS.head("Loan not found", '<a href="#app">Back to the loan book</a>');
    const c = co(l.company_id), rows = DOM.schedule(l, today()), s = DOM.loanSummary(l, today());
    const tr = (S.data.loan_transfers || []).filter((t) => t.loan_id === l.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const openT = tr && !["completed", "rejected"].includes(tr.status);
    const paid = rows.filter((r) => r.status === "paid").slice(-18);
    const mine = l.lender_id === S.user.id;
    return WS.head(c.name, rs(l.amount_paise, true) + " at " + rate(l) + " · " + tenorTxt(l) + ' · <a href="#app">Back to the loan book</a>',
      mine && l.status === "disbursed" && !openT ? '<button class="btn ghost" data-act="l-transfer" data-id="' + l.id + '">Request loan transfer</button>' : "") +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Outstanding</small><b>' + rs(s.principal_pending, true) + "</b><span>of " + rs(s.disbursed, true) + ' disbursed</span></div><div class="kpi"><small>Interest earned</small><b class="t-good">' + rs(s.interest_earned, true) + "</b></div>" +
      '<div class="kpi"><small>Next instalment</small><b>' + (s.next_due ? rs(s.next_amount, true) : "–") + "</b><span>" + (s.next_due ? dmy(s.next_due) : "Fully repaid") + '</span></div><div class="kpi"><small>Latest DSCR</small><b>' + dscr(c).html + "</b></div></div>" +
      (tr ? '<section class="panel"><h2>Loan transfer</h2>' + transferTimeline(tr) + "</section>" : "") +
      '<div class="grid2"><section class="panel"><h2>Outstanding balance</h2>' + lines(rows.map((r) => my(r.due)), [{ name: "Outstanding", color: C.debt, values: rows.map((r) => r.closing / 1e9), endLabel: false }], { xEvery: Math.ceil(rows.length / 8), yfmt: (y) => "Rs " + UI.n(y, 1) + " Cr", label: "Outstanding principal after each instalment", height: 210, marks: s.next_due ? [{ i: Math.max(rows.findIndex((r) => r.due === s.next_due), 0), v: rows[Math.max(rows.findIndex((r) => r.due === s.next_due), 0)].closing / 1e9, label: "Now" }] : [] }) + "</section>" +
      '<section class="panel"><h2>Interest earned by month</h2>' + (paid.length ? vbars(paid.map((r) => my(r.due)), paid.map((r) => r.interest / 1e7), C.debt, { fmt: (v) => UI.n(v, 2) + " L", label: "Interest received each month", height: 210, values: false, xEvery: 3 }) : KIT.empty("No instalments received yet", "")) + "</section></div>" +
      '<section class="panel"><h2>Repayment schedule</h2>' + KIT.table("l-sched-" + l.id, { name: "schedule-" + c.name.split(" ")[0], rows, key: (r) => String(r.n), pageSize: 24, noSearch: true,
        filters: [{ k: "status", label: "Status", options: [["paid", "Paid"], ["pending", "Pending"], ["overdue", "Overdue"]] }],
        rowClass: (r) => (r.status === "overdue" ? "row-bad" : ""),
        columns: [
          { k: "n", label: "#", num: true, val: (r) => r.n, html: (r) => String(r.n) },
          { k: "due", label: "Due", val: (r) => r.due, html: (r) => dmy(r.due) },
          { k: "opening", label: "Opening", num: true, val: (r) => r.opening, csv: (r) => r.opening / 100, html: (r) => rs(r.opening) },
          { k: "interest", label: "Interest", num: true, val: (r) => r.interest, csv: (r) => r.interest / 100, html: (r) => gx(rs(r.interest), { title: "Interest for instalment " + r.n, formula: "Opening balance x annual rate / 12, rounded to the paisa", inputs: [["Opening balance", rs(r.opening), "schedule"], ["Annual rate", rate(l), "sanction letter"]] }) },
          { k: "principal", label: "Principal", num: true, val: (r) => r.principal, csv: (r) => r.principal / 100, html: (r) => rs(r.principal) },
          { k: "closing", label: "Closing", num: true, val: (r) => r.closing, csv: (r) => r.closing / 100, html: (r) => rs(r.closing) },
          { k: "status", label: "Status", val: (r) => r.status, html: (r) => chip(r.status === "paid" ? "ok" : r.status === "overdue" ? "bad" : "", r.status === "paid" ? "Paid " + dmy(r.paid_on) : r.status.charAt(0).toUpperCase() + r.status.slice(1)) +
            (mine && r.status !== "paid" && r.due <= DOM.addDays(today(), 31) ? ' <button class="linkbtn small" data-act="l-paid" data-id="' + l.id + '" data-due="' + r.due + '">Mark received</button>' : "") },
        ] }) +
      '<p class="small muted">Interest-only during the moratorium, then a level EMI: P x r x (1 + r)^n / ((1 + r)^n - 1), with r the monthly rate. The last instalment clears the balance.</p></section>' +
      '<section class="panel"><h2>Quarterly monitoring</h2>' + WS.monitorBlock(c, true) + "</section>" +
      '<section class="panel"><h2>Documents</h2><ul class="docs">' + ["Sanction letter", "Loan agreement", "Hypothecation deed", "CMA data and projections"].map((d) => "<li><span>" + d + '</span><span class="muted small">Held by Aegis Ascend</span></li>').join("") +
      (S.data.files || []).filter((f) => f.company_id === c.id).map((f) => "<li><span>" + esc(f.name) + '</span><button class="linkbtn" data-act="file" data-id="' + f.id + '">Download</button></li>').join("") + "</ul></section>";
  }
  function transferTimeline(t) {
    const at = {}; (t.history || []).forEach((h) => (at[h.status] = h.at));
    const stop = t.status === "rejected" ? { label: "Rejected", reason: t.reason } : null;
    const cur = stop ? (t.history.slice().reverse().find((h) => h.status !== "rejected") || { status: "submitted" }).status : t.status;
    return KIT.timeline(LT_STEPS, cur, at, stop) + '<p class="small muted">' + (t.amount_paise ? rs(t.amount_paise) : "Full outstanding") + (t.buyer_lender_id ? " · buyer: " + esc(WS.userName(t.buyer_lender_id)) : "") + (t.fee_paise ? " · transfer fee " + rs(t.fee_paise) + " (" + pct(t.fee_rate, 1) + ")" : "") + (t.note ? " · " + esc(t.note) : "") + "</p>";
  }

  // ---------- lender desk (overview) ----------
  function desk() {
    const L = S.data.loans, live = L.filter((l) => l.status === "disbursed");
    const alerts = live.filter((l) => { const m = GB.monitor(co(l.company_id).quarters || [], co(l.company_id).covenants); return m.length && m[m.length - 1].state !== "ok"; });
    return WS.head("Lender desk", esc(S.user.firm || "")) +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>New applications</small><b>' + L.filter((l) => l.status === "applied").length + '</b></div><div class="kpi"><small>Loans monitored</small><b>' + live.length + '</b></div>' +
      '<div class="kpi"><small>Book</small><b>' + rs(live.reduce((a, l) => a + l.amount_paise, 0), true) + '</b><span>disbursed</span></div><div class="kpi"><small>Covenant alerts</small><b class="' + (alerts.length ? "t-bad" : "") + '">' + alerts.length + "</b></div></div>" +
      '<section class="panel"><p>Every applicant arrives with founder-confirmed data, an engine-run DSCR analysis and an advisor\'s sign-off. <a href="#app-applications">Review applications</a> · <a href="#app-monitor">Monitoring</a> · <a href="#app">Loan book</a></p>' +
      (alerts.length ? '<ul class="alerts">' + alerts.map((l) => '<li class="bad"><a href="#app-loan/' + l.id + '">' + esc(co(l.company_id).name) + ": latest quarter is close to or in breach of a covenant</a></li>").join("") + "</ul>" : "") + "</section>";
  }

  // ---------- applications ----------
  function applications() {
    const L = S.data.loans.filter((l) => ["applied", "sanctioned", "declined"].includes(l.status));
    return WS.head("Applications", "Each applicant arrives with founder-confirmed data, the engine's DSCR analysis and an advisor's sign-off.") +
      (L.length ? L.map((l) => { const c = co(l.company_id), rep = S.data.reports.find((r) => r.company_id === l.company_id), rd = GB.readiness(c.readiness), t = GB.twin(Object.assign({}, c.twin, { raise: c.raise }));
        return '<section class="panel"><div class="panel-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.sector) + " · asks " + rs(l.amount_paise, true) + " at " + rate(l) + " for " + tenorTxt(l) + "</p></div>" + WS.statusChip(l.status) + "</div>" +
          '<div class="kpis k4"><div class="kpi"><small>Debt readiness</small><b>' + rd.debt.score + "/100</b><span>" + rd.debt.verdict + '</span></div><div class="kpi"><small>Lowest DSCR, all-debt</small><b>' + UI.xx(t.min_dscr) + "</b><span>stress " + UI.xx(t.min_dscr_stress) + '</span></div><div class="kpi"><small>Engine best mix</small><b>' + pct(t.best.share) + ' debt</b></div><div class="kpi"><small>Advisor report</small><b>' + (rep ? "Approved" : "None") + "</b></div></div>" +
          (l.status === "applied" ? '<div class="row gap-s"><button class="btn primary sm" data-act="l-decide" data-id="' + l.id + '" data-d="sanction">Sanction</button><button class="btn ghost sm" data-act="l-decide" data-id="' + l.id + '" data-d="decline">Decline</button></div>' : l.status === "sanctioned" ? '<button class="btn primary sm" data-act="l-decide" data-id="' + l.id + '" data-d="disburse">Mark disbursed</button>' : "") + "</section>"; }).join("")
        : '<section class="panel">' + KIT.empty("No applications", "Applications sent to you through Aegis Ascend appear here.") + "</section>");
  }
  function monitoring() {
    const L = S.data.loans.filter((l) => l.status === "disbursed");
    return WS.head("Monitoring", "Quarterly covenant checks for loans you hold. Alerts reach you and the founder before a breach.") +
      (L.length ? L.map((l) => '<section class="panel"><h2>' + esc(co(l.company_id).name) + " · " + rs(l.amount_paise, true) + "</h2>" + WS.monitorBlock(co(l.company_id), true) + "</section>").join("") : '<section class="panel">' + KIT.empty("No disbursed loans", "Monitoring starts at disbursal.") + "</section>");
  }
  function transfers() {
    const T = (S.data.loan_transfers || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Loan transfers", "Loans move only between regulated banks and NBFCs, arranged by Aegis Ascend. Request one from a loan's page.") +
      (T.length ? T.map((t) => { const l = S.data.loans.find((x) => x.id === t.loan_id); return '<section class="panel"><div class="panel-head"><h2>' + esc(co(l ? l.company_id : "").name) + "</h2>" + chip(t.status === "completed" ? "ok" : t.status === "rejected" ? "bad" : "warn", t.status.replace("_", " ")) + "</div>" + transferTimeline(t) + "</section>"; }).join("")
        : '<section class="panel">' + KIT.empty("No transfer requests", "Open a loan to request a transfer to another regulated lender.", '<a class="btn primary" href="#app">Open the loan book</a>') + "</section>");
  }
  function fees() {
    const F = S.data.invoices || [];
    return WS.head("Fees", "Aegis Ascend debt fees are paid by the lender: monitoring 0.25% to 0.5% a year, transfers 0.3% to 0.5%. All plus 18% GST.") +
      '<section class="panel"><h2>Your invoices</h2>' + KIT.table("l-fees", { name: "fees", rows: F, noSearch: true, empty: { title: "No invoices yet", text: "Monitoring and transfer fees appear here." },
        columns: [{ k: "kind", label: "Fee", html: (f) => esc(f.kind.replace("_", " ")) + '<span class="muted small block">' + esc(f.period) + "</span>" }, { k: "amount_paise", label: "Amount", num: true, csv: (f) => f.amount_paise / 100, html: (f) => rs(f.amount_paise) },
          { k: "gst_paise", label: "GST 18%", num: true, csv: (f) => f.gst_paise / 100, html: (f) => rs(f.gst_paise) }, { k: "due", label: "Due", html: (f) => dmy(f.due) }, { k: "paid_on", label: "Status", html: (f) => (f.paid_on ? chip("ok", "Paid " + dmy(f.paid_on)) : f.due < today() ? chip("bad", "Overdue") : chip("warn", "Due")) }] }) + "</section>" +
      WS.PAGES.lender["app-lfees-calc"]();
  }

  Object.assign(WS.clicks, {
    "l-decide": async (b, id) => {
      const d = b.dataset.d, words = { sanction: "Sanction this loan?", decline: "Decline this application?", disburse: "Mark this loan as disbursed today?" };
      if (await KIT.confirm(words[d], d === "disburse" ? "<p>The repayment schedule starts from today.</p>" : "", d === "decline" ? "Decline" : "Confirm", d === "decline")) return WS.after(await WS.API.act("lender_decide", { loan_id: id, decision: d }));
    },
    "l-paid": async (b, id) => {
      if (await KIT.confirm("Record this instalment as received?", "<p>Instalment due " + dmy(b.dataset.due) + ". This updates interest earned and principal outstanding.</p>", "Record payment")) return WS.after(await WS.API.act("record_repayment", { loan_id: id, due: b.dataset.due }));
    },
    "l-transfer": async (b, id) => {
      const l = S.data.loans.find((x) => x.id === id), s = DOM.loanSummary(l, today());
      const v = await KIT.dialog({ title: "Request a loan transfer", confirm: "Send to Aegis Ascend",
        text: "<p>Aegis Ascend checks eligibility (RBI minimum holding: " + DOM.minHoldingMonths(l) + " months for this loan), gets the borrower's consent and introduces regulated buyers only.</p>",
        fields: [{ name: "amount", label: "Amount to transfer (blank for the full outstanding " + rs(s.principal_pending) + ")", type: "number", min: 0, step: "0.01", unit: "Rs" }, { name: "note", label: "Note (optional)", type: "textarea" }],
        validate: (x) => (x.amount && !(+x.amount > 0 && Math.round(+x.amount * 100) <= s.principal_pending) ? "Enter an amount up to " + rs(s.principal_pending) : null) });
      if (v) return WS.after(await WS.API.act("request_loan_transfer", { loan_id: id, amount_paise: v.amount ? Math.round(+v.amount * 100) : null, note: v.note }), "Transfer request sent to Aegis Ascend.");
    },
  });

  const calc = WS.PAGES.lender["app-lfees"];
  WS.PAGES.lender["app-lfees-calc"] = () => calc().replace(/^[\s\S]*?<section/, "<section");
  Object.assign(WS.PAGES.lender, { "app-desk": desk, app: book, "app-loan": detail, "app-applications": applications, "app-monitor": monitoring, "app-ltransfers": transfers, "app-lfees": fees });
  WS.lender = { dscr, transferTimeline, LT_STEPS, rate, tenorTxt };
})(typeof globalThis !== "undefined" ? globalThis : this);
