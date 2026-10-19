/* Sign-in pages, the role-based workspace, and the page router. */
(function (root) {
  "use strict";
  const UI = root.UI;
  const { esc, n, cr, lakh, pct, xx, date, dt, gx, hbars, lines, vbars, meter, chip, C } = UI;
  const KIT = root.KIT;
  const GB = root.GB, PUB = root.PUB;
  const API = root.GB_API;
  const S = { user: null, data: null, flash: "", twinDraft: {}, sim: null, tsTab: "loan" };
  const $ = (s, el) => (el || document).querySelector(s);
  const app = () => document.getElementById("site");

  // ---------- auth pages ----------
  function login(err) {
    const demo = API.mode === "demo";
    return PUB.page("login", null, '<div class="auth"><div class="auth-card">' +
      "<h1>Sign in</h1><p class=\"muted\">Founders, investors, lenders and advisors each see their own workspace.</p>" +
      (err ? '<div class="notice bad" role="alert">' + esc(err) + "</div>" : "") +
      '<form class="form" data-form="login" novalidate>' +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="l_email" type="email" autocomplete="username" required></span></label>' +
      '<label class="fld"><span>Password</span><span class="in"><input name="password" id="l_password" type="password" autocomplete="current-password" required></span></label>' +
      '<button class="btn primary lg block" type="submit">Sign in</button></form>' +
      '<p class="small muted">New here? <a href="#signup">Create an account</a></p>' +
      (demo ? '<div class="demo-box"><b>Demo accounts</b><p class="small muted">This demo keeps accounts and data in your browser only. Pick a role to sign in instantly (password <code>' + esc(API.demoPassword) + "</code>).</p>" +
        '<div class="demo-roles">' + [["founder@demo.in", "Founder", "Priya Nair, Kalyan Polymers"], ["investor@demo.in", "Investor", "Meera Iyer, Konkan Growth"], ["advisor@demo.in", "Advisor", "CA Neha Joshi, Aegis Ascend"], ["lender@demo.in", "Lender", "Suresh Pillai, Harbour Bank"]].map(([e, r, w]) => '<button type="button" class="role-btn" data-act="demo-login" data-email="' + e + '"><b>' + r + "</b><span>" + w + "</span></button>").join("") + "</div></div>" : "") +
      "</div></div>");
  }
  function signup(err) {
    return PUB.page("signup", null, '<div class="auth"><div class="auth-card">' +
      "<h1>Create an account</h1>" + (err ? '<div class="notice bad" role="alert">' + esc(err) + "</div>" : "") +
      '<form class="form" data-form="signup" novalidate>' +
      '<fieldset class="seg"><legend>I am a</legend>' + [["founder", "Founder"], ["investor", "Investor"], ["lender", "Lender"]].map(([v, l], i) => '<label><input type="radio" name="role" value="' + v + '"' + (i ? "" : " checked") + "><span>" + l + "</span></label>").join("") + "</fieldset>" +
      '<label class="fld"><span>Your name</span><span class="in"><input name="name" id="s_name" autocomplete="name" required></span></label>' +
      '<label class="fld"><span>Company, fund or bank</span><span class="in"><input name="org" id="s_org" autocomplete="organization"></span></label>' +
      '<label class="fld"><span>Sector</span><span class="in"><select name="sector" id="s_sector">' + SECTORS.map((s) => "<option>" + s + "</option>").join("") + "</select></span></label>" +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="s_email" type="email" autocomplete="email" required></span></label>' +
      '<label class="fld"><span>Password (8 characters or more)</span><span class="in"><input name="password" id="s_password" type="password" autocomplete="new-password" required minlength="8"></span></label>' +
      '<button class="btn primary lg block" type="submit">Create account</button></form>' +
      '<p class="small muted">Already registered? <a href="#login">Sign in</a>. Advisor accounts are created by Aegis Ascend.</p></div></div>');
  }
  const SECTORS = ["Plastics & packaging", "Auto components", "Chemicals", "Food processing", "Textiles", "Engineering", "Pharma", "Electronics"];

  // ---------- workspace shell ----------
  // A string on its own starts a group in the rail.
  const NAVS = {
    founder: [["app", "Overview"], "Fundraise", ["app-fundraise", "Fundraise tracker"], ["app-captable", "Cap table"], ["app-dataroom", "Data room"], ["app-revshare", "Revenue share"],
      "Analysis", ["app-twin", "Funding Twin"], ["app-optimizer", "Equity vs Debt Optimizer"], ["app-cma", "CMA funding report"], ["app-readiness", "Readiness Score"], ["app-termsheet", "Term Sheet Analyser"],
      "Debt", ["app-loans", "Loans & monitoring"], ["app-fees", "Fees"], "Account", ["app-company", "Company profile"], ["app-notifications", "Notifications"], ["app-activity", "Activity log"]],
    investor: [["app", "Portfolio"], ["app-opportunities", "Opportunities"], ["app-sells", "Sell requests"], ["app-notifications", "Notifications"], ["app-activity", "Activity log"]],
    advisor: [["app", "Today"], "Deals", ["app-pipeline", "Company pipeline"], ["app-directory", "Investor directory"], ["app-requests", "Resale requests"], ["app-revaluations", "Revaluation centre"],
      "Debt", ["app-loantransfers", "Loan transfers"], ["app-loansdesk", "Loans & DSCR"], "Practice", ["app-review", "Review queue"], ["app-compliance", "Compliance"], ["app-revenue", "Revenue"], ["app-tasks", "Notes & tasks"], ["app-templates", "Message templates"],
      "Tools", ["app-optimizer", "Equity vs Debt Optimizer"], ["app-cma", "CMA funding report"], ["app-twin", "Funding Twin"], "Admin", ["app-enquiries", "Enquiries"], ["app-activity", "Audit log"], ["app-settings", "Settings"]],
    lender: [["app", "Loan book"], ["app-applications", "Applications"], ["app-monitor", "Monitoring"], ["app-ltransfers", "Loan transfers"], ["app-lfees", "Fees"], ["app-notifications", "Notifications"], ["app-activity", "Activity log"]],
  };
  function shell(route, body) {
    const u = S.user, nav = NAVS[u.role];
    const who = u.firm ? u.firm : companyName() || "";
    const unread = S.data ? (S.data.notifications || []).filter((x) => !x.read).length : 0;
    const base = route.split("/")[0], parent = { "app-holding": "app", "app-loan": "app", "app-companyfile": "app-pipeline" }[base] || base;
    return '<div class="ws"><aside class="ws-rail">' + PUB.wordmark("#home") +
      '<nav class="ws-nav" aria-label="Workspace">' + nav.map((it) => (typeof it === "string" ? '<span class="group">' + it + "</span>" : '<a href="#' + it[0] + '"' + (parent === it[0] ? ' aria-current="page"' : "") + ">" + it[1] + (it[0] === "app-notifications" && unread ? ' <span class="badge" aria-label="' + unread + ' unread">' + unread + "</span>" : "") + "</a>")).join("") + "</nav>" +
      '<div class="rail-foot"><div><b>' + esc(u.name) + "</b><br><span>" + esc(roleName(u.role)) + (who ? " · " + esc(who) : "") + "</span></div>" +
      '<div class="row gap-s"><button class="btn ghost sm" data-act="logout">Sign out</button>' + (API.mode === "demo" ? '<button class="linkbtn" data-act="reset-demo">Reset demo data</button>' : "") + "</div></div></aside>" +
      '<main class="ws-main" id="ws-main">' + (API.mode === "demo" ? '<span class="ws-demo">Demo: fictional companies and people, kept in this browser</span>' : "") +
      (S.flash ? '<div class="notice ok" role="status">' + esc(S.flash) + "</div>" : "") + body + "</main></div>";
  }
  const roleName = (r) => ({ founder: "Founder", investor: "Investor", advisor: "Advisor", lender: "Lender" })[r];
  const myCompany = () => S.data.companies.find((c) => c.id === S.user.company_id);
  const companyName = () => { const c = S.user.company_id && S.data && S.data.companies.find((x) => x.id === S.user.company_id); return c && c.name; };
  const userName = (id) => { const u = (S.data.directory || []).concat(S.data.founders || []).find((x) => x.id === id); return u ? (u.firm && u.role !== "advisor" ? u.firm : u.name) : id === S.user.id ? S.user.name : "Aegis Ascend user"; };
  const companyById = (id) => S.data.companies.find((c) => c.id === id);
  const statusChip = (s) => chip({ approved: "ok", in_review: "warn", changes: "bad", draft: "", requested: "warn", granted: "ok", declined: "bad", applied: "warn", sanctioned: "ok", disbursed: "ok", consent_needed: "warn", completed: "ok", open: "warn" }[s] || "", ({ in_review: "In review", changes: "Changes requested", consent_needed: "Needs founder consent", first_refusal: "First refusal", buyer_intro: "Buyer introduction", spa: "SPA", open: "In progress" })[s] || s.charAt(0).toUpperCase() + s.slice(1));
  const stamp = (r) => (r && r.status === "approved" ? '<span class="stamp">Reviewed by ' + esc(userName(r.reviewed_by)) + " · " + date(r.reviewed_at) + "</span>" : "");
  const latestReport = (cid) => S.data.reports.filter((r) => r.company_id === cid).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const head = (title, sub, extra) => '<div class="pg-head"><div><h1>' + esc(title) + "</h1>" + (sub ? '<p class="muted">' + sub + "</p>" : "") + "</div>" + (extra || "") + "</div>";
  const empty = (t, d) => '<div class="empty"><b>' + esc(t) + "</b><p>" + d + "</p></div>";

  // ---------- FOUNDER ----------
  function founderHome() {
    const c = myCompany(), rep = latestReport(c.id), rd = GB.readiness(c.readiness), t = GB.twin(Object.assign({}, c.twin, { raise: c.raise }));
    const mon = GB.monitor(c.quarters, c.covenants), last = mon[mon.length - 1];
    const offers = S.data.offers || [], keen = offers.filter((o) => o.response === "interested" || o.response === "invested");
    const steps = [
      ["Fill in the Funding Twin", Object.keys(c.twin || {}).length > 0, "app-twin"],
      ["Check your Readiness Score", Object.keys(c.readiness || {}).length > 0, "app-readiness"],
      ["Submit the report for advisor review", !!rep, "app-twin"],
      ["Advisor sign-off", rep && rep.status === "approved", "app-twin"],
      ["Advisor shares the offer with investors", offers.length > 0, "app-fundraise"],
      ["Investors commit and shares are allotted", (S.data.holdings || []).length > 0, "app-captable"],
    ];
    return head(c.name, esc(c.sector) + " · " + esc(c.city) + " · revenue " + cr(c.revenue, 0) + " · raising " + cr(c.raise, 0)) +
      '<div class="kpis k4">' +
      '<div class="kpi"><small>Recommended mix</small><b>' + pct(t.best.share) + " debt</b><span>" + pct(1 - t.best.share) + " equity · " + cr(t.best.loan) + " loan</span></div>" +
      '<div class="kpi"><small>Debt readiness</small><b>' + rd.debt.score + "/100</b><span>" + rd.debt.verdict + "</span></div>" +
      '<div class="kpi"><small>Equity readiness</small><b>' + rd.equity.score + "/100</b><span>" + rd.equity.verdict + "</span></div>" +
      '<div class="kpi"><small>Report</small><b>' + (rep ? statusChip(rep.status) : "Not submitted") + "</b><span>" + (rep ? esc(rep.title) : "Run the Funding Twin first") + "</span></div></div>" +
      '<div class="grid2"><section class="panel"><h2>Next steps</h2><ol class="checklist">' + steps.map(([t, ok, r]) => '<li class="' + (ok ? "done" : "") + '"><a href="#' + r + '">' + t + "</a></li>").join("") + "</ol>" + stamp(rep) + "</section>" +
      '<section class="panel"><h2>Fundraise</h2><p>' + (offers.length ? "Your advisor has shared the offer with <b>" + offers.length + "</b> investor" + (offers.length === 1 ? "" : "s") + "; <b>" + keen.length + "</b> interested or committed." : "Your advisor shares the offer with investors once your report is signed off.") + ' <a href="#app-fundraise">Open the tracker</a></p>' +
      (last ? '<h3>Latest covenant check</h3><p>' + esc(last.q) + ": DSCR " + xx(last.dscr) + " " + chip(last.state === "ok" ? "ok" : last.state === "watch" ? "warn" : "bad", last.state === "ok" ? "Within covenants" : last.state === "watch" ? "Close to limit" : "Breach") + ' <a href="#app-loans">Details</a></p>' : "") +
      "</section></div>";
  }

  const TWIN_FIELDS = [
    ["raise", "Amount to raise", "Rs cr", "num", "founder"], ["pre_money", "Company value today (pre-money)", "Rs cr", "num", "founder"],
    ["value_growth", "Company value growth a year", "%", "pct", "founder"], ["horizon", "Years to compare over", "yrs", "int", "founder"],
    ["ebitda0", "EBITDA this year", "Rs cr", "num", "founder"], ["ebitda_growth", "EBITDA growth a year", "%", "pct", "benchmark"],
    ["existing_ds", "Existing debt service a year", "Rs cr", "num", "founder"], ["loan_rate", "Loan interest rate", "%", "pct", "benchmark"],
    ["tenor", "Loan tenor", "yrs", "int", "benchmark"], ["moratorium", "Moratorium", "yrs", "int", "benchmark"],
    ["tax_rate", "Tax rate", "%", "pct", "benchmark"], ["discount_rate", "Discount rate", "%", "pct", "advisor"],
    ["dscr_min", "Minimum DSCR", "x", "num", "advisor"], ["growth_sigma", "Range: growth up or down by", "%", "pct", "advisor"],
  ];
  function twinTarget() {
    if (S.user.role === "founder") return myCompany();
    const id = S.twinCompany || (S.data.companies[0] && S.data.companies[0].id);
    return companyById(id);
  }
  function twinInputs(c) {
    const base = Object.assign({}, GB.TWIN_DEFAULTS, { raise: c.raise }, c.twin || {});
    return Object.assign(base, S.twinDraft[c.id] || {});
  }
  function twinPage() {
    const c = twinTarget(); if (!c) return empty("No company", "There is no company to model yet.");
    const q = twinInputs(c);
    const sel = S.user.role === "advisor" ? '<label class="fld inline"><span>Company</span><span class="in"><select data-act="twin-company">' + S.data.companies.map((x) => "<option value=\"" + x.id + '"' + (x.id === c.id ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></span></label>" : "";
    const fv = (k, kind) => kind === "pct" ? +(q[k] * 100).toFixed(4) : q[k];
    return head("Funding Twin", "A live copy of " + esc(c.name) + "'s finances. Change any input and every number below updates. Click a number to see how it is calculated.", sel) +
      '<div class="twin"><form class="panel twin-in" data-form="twin" data-company="' + c.id + '" novalidate><h2>Assumptions</h2>' +
      '<div class="fields f2">' + TWIN_FIELDS.map(([k, l, u, kind, src]) => '<label class="fld" for="t_' + k + '"><span>' + esc(l) + ' <i class="src src-' + src + '">' + src + '</i></span><span class="in"><input id="t_' + k + '" name="' + k + '" data-kind="' + kind + '" value="' + esc(fv(k, kind)) + '" inputmode="decimal"><em>' + u + "</em></span></label>").join("") + "</div>" +
      '<h3>Stress slider</h3><label class="slider" for="t_sales_drop"><span>Sales fall by <b id="sv_sales">' + pct(q.sales_drop) + '</b></span><input type="range" id="t_sales_drop" name="sales_drop" data-kind="pct" min="0" max="40" step="1" value="' + Math.round(q.sales_drop * 100) + '"></label>' +
      '<label class="slider" for="t_rate_shock"><span>Interest rises by <b id="sv_rate">' + (q.rate_shock * 100).toFixed(1) + ' points</b></span><input type="range" id="t_rate_shock" name="rate_shock" data-kind="pct" min="0" max="4" step="0.25" value="' + q.rate_shock * 100 + '"></label>' +
      '<div class="row gap-s"><button class="btn primary" type="button" data-act="twin-save">Save assumptions</button><button class="btn ghost" type="button" data-act="twin-reset">Reset to saved</button></div>' +
      '</form><div class="twin-out" id="twin-out">' + twinResults(c, q) + "</div></div>";
  }
  function twinResults(c, q) {
    const t = GB.twin(q), b = t.best, disc = Math.pow(1 + q.discount_rate, q.horizon);
    const bestNet = (b.value - t.equity.value) / disc;
    const stressExp = GB.dscrPath(q, b.loan), stressNow = GB.dscrPath(q, b.loan, { salesDrop: q.sales_drop, rateShock: q.rate_shock });
    const minS = Math.min(...stressNow.map((r) => r.dscr));
    const fvInfo = (label, L, E, f) => ({ title: "Founder value at year " + q.horizon + ": " + label, formula: "Company value at year N = (pre-money + raise) x (1 + growth)^N\nDebt cost = payments made - interest tax shield + loan still outstanding\nStake sold = equity raised / (pre-money + equity raised)\nFounder value = (1 - stake sold) x (company value - debt cost)",
      inputs: [["Pre-money value", cr(q.pre_money), "founder"], ["Raise", cr(q.raise), "founder"], ["Growth a year", pct(q.value_growth), "founder"], ["Years", q.horizon, "founder"], ["Loan", cr(L), "engine"], ["Equity raised", cr(E), "engine"], ["Company value at year " + q.horizon, cr(f.Vn), "engine"], ["Debt cost", cr(f.debtCost), "engine"], ["Stake sold", pct(f.stake, 1), "engine"]] });
    const fvDebt = GB.founderValue(q, q.raise, 0), fvEq = GB.founderValue(q, 0, q.raise), fvBest = GB.founderValue(q, b.loan, b.equity);
    // plain-language summary built from engine output, then checked number by number
    const facts = { best: pct(b.share), eq: pct(1 - b.share), net: n(bestNet), be: n(t.break_even, 0), beg: pct(t.break_even_growth, 1), dscr: b.dscr.toFixed(2), years: String(q.horizon) };
    const narrative = "We recommend raising " + facts.best + " as debt and " + facts.eq + " as equity. Over " + facts.years + " years this leaves you about Rs " + facts.net + " crore better off in today's money than raising it all as equity. " +
      "Debt wins outright if the company is worth more than Rs " + facts.be + " crore in year " + facts.years + ", which needs value growth of " + facts.beg + " a year. At this mix the lowest repayment safety ratio is " + facts.dscr + ".";
    const found = narrative.match(/\d+(?:,\d{2,3})*(?:\.\d+)?%?/g) || [], allowed = new Set(Object.values(facts));
    const verified = found.filter((x) => allowed.has(x)).length;
    const rep = latestReport(c.id);
    const stressRows = stressNow.map((r) => r.dscr);
    return '<div class="kpis k4">' +
      '<div class="kpi accent"><small>Best mix</small><b>' + gx(pct(b.share) + " debt", { title: "Best mix", formula: "Test debt share 0% to 100% in 5% steps.\nKeep mixes with lowest DSCR >= " + q.dscr_min + " (expected case) and >= 1.00 (sales -20%, rate +2 points).\nPick the highest founder value.", inputs: [["Feasible mixes", t.mixes.filter((m) => m.ok).length + " of 21", "engine"], ["Founder value at best mix", cr(b.value), "engine"], ["Lowest DSCR", xx(b.dscr), "engine"], ["Lowest DSCR under stress", xx(b.dscr_stress), "engine"]] }) + "</b><span>" + cr(b.loan) + " loan + " + cr(b.equity) + " equity</span></div>" +
      '<div class="kpi"><small>Better off than all-equity</small><b>' + gx(cr(bestNet), { title: "Net effect, today's money", formula: "(Founder value at best mix - founder value with all equity) / (1 + discount rate)^N", inputs: [["Founder value, best mix", cr(b.value), "engine"], ["Founder value, all equity", cr(t.equity.value), "engine"], ["Discount rate", pct(q.discount_rate), "advisor"], ["Years", q.horizon, "founder"]] }) + "</b><span>Expected case</span></div>" +
      '<div class="kpi"><small>Break-even value</small><b>' + gx(cr(t.break_even, 0), { title: "Break-even company value", formula: "All-debt and all-equity give the founder the same value when\n(1 - stake sold) x V = V - debt cost\nso V = debt cost / stake sold", inputs: [["Debt cost (all-debt)", cr(t.debt.debtCost), "engine"], ["Stake sold (all-equity)", pct(t.equity.stake, 1), "engine"], ["Needed value growth a year", pct(t.break_even_growth, 1), "engine"]] }) + "</b><span>in year " + q.horizon + "</span></div>" +
      '<div class="kpi"><small>Lowest DSCR, your stress</small><b class="' + (minS < 1 ? "t-bad" : minS < q.dscr_min ? "t-warn" : "") + '">' + gx(xx(minS), { title: "Lowest DSCR under your stress settings", formula: "EBITDA falls by sales drop x operating leverage (" + q.op_leverage + ")\nDSCR = (EBITDA - tax) / (existing debt service + loan payment)", inputs: [["Loan at best mix", cr(b.loan), "engine"], ["Sales drop", pct(q.sales_drop), "founder"], ["Rate rise", (q.rate_shock * 100).toFixed(1) + " points", "founder"], ["Operating leverage", q.op_leverage, "benchmark"]] }) + "</b><span>at the best mix loan</span></div></div>" +
      '<section class="panel"><h2>Net Effect Bridge</h2><p class="muted">What your share is worth in year ' + q.horizon + " under each route (expected case).</p>" +
      hbars([{ label: "All equity", value: t.equity.value, color: C.equity }, { label: "All debt", value: t.debt.value, color: C.debt }, { label: "Best mix (" + pct(b.share) + " debt)", value: b.value, color: C.mix }], { label: "Founder value by route" }) +
      '<p>Founder value: all equity ' + gx(cr(fvEq.value), fvInfo("all equity", 0, q.raise, fvEq)) + ", all debt " + gx(cr(fvDebt.value), fvInfo("all debt", q.raise, 0, fvDebt)) + ", best mix " + gx(cr(fvBest.value), fvInfo("best mix", b.loan, b.equity, fvBest)) + ".</p></section>" +
      '<section class="panel"><h2>Break-even Value</h2><p class="rule">If ' + esc(c.name) + " is worth more than <b>" + cr(t.break_even, 0) + "</b> in " + q.horizon + " years, debt wins. Below that, equity wins.</p><p class=\"muted\">That needs company value to grow " + pct(t.break_even_growth, 1) + " a year from " + cr(q.pre_money + q.raise, 0) + ". Your assumption is " + pct(q.value_growth) + ".</p>" +
      '<div class="tw"><table class="tbl"><thead><tr><th>Case</th><th class="num">Value growth</th><th class="num">Founder value, all debt</th><th class="num">Founder value, all equity</th><th class="num">Net effect today</th></tr></thead><tbody>' +
      ["best", "expected", "worst"].map((k) => { const r = t.range[k]; return "<tr><td>" + k.charAt(0).toUpperCase() + k.slice(1) + '</td><td class="num">' + pct(r.growth) + '</td><td class="num">' + cr(r.debt) + '</td><td class="num">' + cr(r.equity) + '</td><td class="num ' + (r.net < 0 ? "t-bad" : "") + '">' + cr(r.net) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      '<section class="panel"><h2>Stress Slider: repayment safety by year</h2><p class="muted">Loan at the best mix (' + cr(b.loan) + "). Move the sliders on the left.</p>" +
      lines(stressExp.map((r) => "Y" + r.year), [{ name: "Expected", color: C.debt, values: stressExp.map((r) => r.dscr) }, { name: "Your stress", color: C.equity, values: stressRows, dash: true }], { refs: [{ y: q.dscr_min, label: "Minimum " + q.dscr_min.toFixed(2) + "x", color: "var(--warn)" }, { y: 1, label: "1.00x: cash just covers payments", color: "var(--bad)" }], yfmt: (v) => v.toFixed(2) + "x", label: "DSCR by year", max: Math.max(4, q.dscr_min * 2) }) +
      "<p>Cash left after debt service in the worst stressed year: <b>" + cr(Math.min(...stressNow.map((r) => r.cash_after))) + "</b>.</p></section>" +
      '<section class="panel"><h2>Best mix search</h2><p class="muted">Founder value for every debt share from 0% to 100%. Hollow points fail the DSCR tests.</p>' +
      lines(t.mixes.map((m) => pct(m.share)), [{ name: "Founder value", color: C.mix, values: t.mixes.map((m) => m.value), hollow: t.mixes.map((m) => !m.ok), dots: true, endLabel: false }], { yfmt: (v) => "Rs " + n(v, 0), label: "Founder value by debt share", min: Math.min(...t.mixes.map((m) => m.value)) * 0.95, marks: [{ i: Math.round(b.share * 20), v: b.value, label: "Best" }] }) + "</section>" +
      '<section class="panel"><h2>Break-even as a probability</h2>' + (S.sim && S.sim.key === JSON.stringify(q) ? simBlock(S.sim.res) : '<p class="muted">Run 2,000 futures with random growth and earnings shocks. The seed is fixed, so the same inputs always give the same answer.</p><button class="btn primary" data-act="simulate">Run 2,000 simulations</button>') + "</section>" +
      '<section class="panel"><h2>Loan schedule (all-debt case)</h2><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th class="num">Opening</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Payment</th><th class="num">Closing</th></tr></thead><tbody>' +
      t.schedule.map((r) => "<tr><td>Y" + r.year + '</td><td class="num">' + n(r.opening, 2) + '</td><td class="num">' + n(r.interest, 2) + '</td><td class="num">' + n(r.principal, 2) + '</td><td class="num">' + n(r.payment, 2) + '</td><td class="num">' + n(Math.abs(r.closing) < 1e-9 ? 0 : r.closing, 2) + "</td></tr>").join("") +
      '</tbody></table></div><p class="muted small">Yearly instalment = P x r / (1 - (1 + r)^-n) = ' + gx(cr(t.payment, 2), { title: "Yearly loan instalment", formula: "P x r / (1 - (1 + r)^-n)", inputs: [["P (loan)", cr(q.raise), "founder"], ["r (rate)", pct(q.loan_rate, 2), "benchmark"], ["n (years)", q.tenor, "benchmark"]] }) + ". Total repaid " + cr(t.total_repaid, 2) + ".</p></section>" +
      '<section class="panel"><h2>Plain-language summary</h2><p class="narr">' + esc(narrative) + '</p><p class="small ' + (verified === found.length ? "t-good" : "t-bad") + '">Number check: ' + verified + " of " + found.length + " numbers in this summary match the engine output.</p>" +
      (S.user.role === "founder" ? submitBlock(c, rep, t, q, verified === found.length) : "") + "</section>";
  }
  function simBlock(s) {
    return '<div class="kpis k3"><div class="kpi"><small>Debt leaves you better off</small><b>' + pct(s.p_debt_better) + '</b><span>of simulated futures (all-debt vs all-equity)</span></div><div class="kpi"><small>Risk of a year with DSCR below 1</small><b class="' + (s.p_default > 0.1 ? "t-bad" : "") + '">' + pct(s.p_default) + '</b><span>with the whole raise as debt</span></div><div class="kpi"><small>Net effect range (10th-90th)</small><b>' + cr(s.p10, 0) + " to " + cr(s.p90, 0) + "</b><span>median " + cr(s.p50, 0) + " (year-N value)</span></div></div><p class=\"muted small\">" + s.runs.toLocaleString("en-IN") + " runs, seed " + s.seed + ".</p>";
  }
  function submitBlock(c, rep, t, q, verifierOk) {
    if (rep && rep.status === "in_review") return '<div class="notice">Your report "' + esc(rep.title) + '" is with the advisor for review.</div>';
    const valid = q.raise > 0 && q.pre_money > 0 && q.horizon >= 3 && q.loan_rate > 0 && q.loan_rate < 0.3 && q.ebitda0 > 0 && q.tenor >= 1;
    return (rep ? '<p>Latest report: ' + statusChip(rep.status) + " " + stamp(rep) + (rep.review_note ? ' <span class="muted">"' + esc(rep.review_note) + '"</span>' : "") + "</p>" : "") +
      '<h3>Release checklist</h3><ul class="checks"><li class="' + (valid ? "done" : "") + '">Validation checks ' + (valid ? "passed" : "failed: check raise, value, rate, EBITDA and tenor") + '</li><li class="done">Engine version recorded: ' + esc(t.version) + '</li><li class="' + (verifierOk ? "done" : "") + '">Number check by the verifier ' + (verifierOk ? "passed" : "failed") + '</li><li><label><input type="checkbox" id="confirm_data"> I confirm the figures above are correct for ' + esc(c.name) + "</label></li><li>Advisor review and sign-off (next)</li></ul>" +
      '<button class="btn primary" data-act="submit-report"' + (valid && verifierOk ? "" : " disabled") + ">Submit for advisor review</button>";
  }

  const READY_FIELDS = [["dscr", "DSCR (repayment safety)", "x", "num"], ["collateral_cover", "Collateral cover", "x", "num"], ["gst_on_time", "GST returns on time, last 12 months", "of 12", "int"], ["audited_years", "Years of audited accounts", "yrs", "int"], ["credit_score", "Company credit score", "", "int"], ["debt_to_ebitda", "Debt / EBITDA", "x", "num"], ["revenue_growth", "Revenue growth a year", "%", "pct"], ["ebitda_positive_years", "Years of positive EBITDA", "yrs", "int"]];
  const READY_CHECKS = [["board_in_place", "Board meets regularly and ROC filings are current"], ["clean_cap_table", "Cap table is documented and clean"], ["data_room_ready", "Data room is ready"], ["team_complete", "A finance lead is in place"], ["market_story", "Use-of-funds and market note written"]];
  function readinessPage() {
    const c = S.user.role === "founder" ? myCompany() : twinTarget();
    const a = Object.assign({}, GB.READINESS_DEFAULTS, c.readiness || {});
    return head("Funding Readiness Score", "How ready " + esc(c.name) + " is to raise debt and equity today, and what to fix first.") +
      '<div class="twin"><form class="panel twin-in" data-form="readiness" data-company="' + c.id + '" novalidate><h2>Your answers</h2><div class="fields f2">' +
      READY_FIELDS.map(([k, l, u, kind]) => '<label class="fld"><span>' + esc(l) + '</span><span class="in"><input name="' + k + '" id="rd_' + k + '" data-kind="' + kind + '" value="' + (kind === "pct" ? +(a[k] * 100).toFixed(2) : a[k]) + '" inputmode="decimal">' + (u ? "<em>" + u + "</em>" : "") + "</span></label>").join("") + "</div>" +
      '<div class="checkset">' + READY_CHECKS.map(([k, l]) => '<label><input type="checkbox" name="' + k + '" id="rd_' + k + '"' + (a[k] ? " checked" : "") + "> " + esc(l) + "</label>").join("") + "</div>" +
      '<button class="btn primary" type="submit">Save answers</button></form><div id="ready-out">' + readyResults(a) + "</div></div>";
  }
  function readyResults(a) {
    const r = GB.readiness(a);
    const list = (s) => '<ul class="factors">' + s.items.map((x) => '<li><span>' + esc(x.name) + '</span><span class="pts ' + (x.ok ? "t-good" : "t-warn") + '">' + x.pts + "/" + x.max + "</span></li>").join("") + "</ul>";
    return '<div class="grid2"><section class="panel">' + meter(r.debt.score, "Debt readiness") + "<p>" + chip(r.debt.score >= 75 ? "ok" : r.debt.score >= 55 ? "warn" : "bad", r.debt.verdict) + "</p>" + list(r.debt) + "</section>" +
      '<section class="panel">' + meter(r.equity.score, "Equity readiness") + "<p>" + chip(r.equity.score >= 75 ? "ok" : r.equity.score >= 55 ? "warn" : "bad", r.equity.verdict) + "</p>" + list(r.equity) + "</section></div>" +
      '<section class="panel"><h2>Fix-it plan</h2>' + (r.plan.length ? '<ol class="steps">' + r.plan.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ol>" : '<p class="t-good">Nothing to fix. You are ready to raise.</p>') + "</section>";
  }

  function cmaPage() {
    const forWho = S.user.role === "advisor" ? "a client company's" : "your company's";
    return head("CMA funding report", "Upload " + forWho + " CMA workbook and project details to get a one-page debt vs equity recommendation sized on DSCR, as a PDF for lenders.") +
      '<section class="panel tool-launch"><div><p>The tool reads the Indian bank CMA format (Form II operating statement, Form III balance sheet), finds the base year, sizes the debt the project can carry at the target DSCR, applies the lender\'s minimum own contribution, stress-tests it, and writes a one-page A4 report.</p></div>' +
      '<ul class="ticks"><li>First sheet read; rows found by the label in column A</li><li>Years in columns B to E, status row below</li><li>NET SALES, PBIT, PROFIT BEFORE TAX and PAT required</li><li>The workbook stays in your browser</li></ul>' +
      '<div><a class="btn primary lg" href="' + esc(root.GB_CMA_URL || "fundmix.html") + '">Open the CMA funding report</a></div></section>';
  }

  // ---------- Equity vs Debt Optimizer (founders and advisors) ----------
  const EDO = root.EDO;
  const OPT_FIELDS = [ // key, label, unit, help
    ["amount", "Amount to raise", "cr", "The total money you want to raise now."],
    ["pre_money", "Valuation today (pre-money)", "cr", "What the company is worth before the new money. Investors' share = their money / (this + their money)."],
    ["profit_month", "Profit per month today", "lakh", "Profit in a typical month. This pays the EMI and the shareholders."],
    ["growth_y1", "Profit growth, year 1", "pct", "Growth in the first year after the money comes in."],
    ["growth_y2", "Profit growth, year 2 on", "pct", "Steady growth each year after year 1."],
    ["interest_rate", "Loan interest", "pct", "Annual rate; EMI is worked out monthly at this rate / 12."],
    ["tenure_years", "Loan tenure", "int", "Years to repay; EMI stops after this."],
    ["horizon_years", "Years to compare over", "int", "1 to 20 years. Equity costs a share every year; debt only until the tenure ends."],
  ];
  const OPT_ADV = [
    ["tax_rate", "Tax rate", "pct", "Leave at 0 if profit is already after tax; otherwise interest saves tax."],
    ["exit_multiple", "Exit value (x annual profit)", "num", "Company value at the end of the horizon, as a multiple of that year's profit."],
    ["discount_rate", "Discount rate", "pct", "Future cash is divided by (1 + this rate) for each year of waiting."],
    ["debt_fee", "Loan processing fee", "pct", "One-time, paid in year 1."],
    ["equity_cost", "Equity transaction cost", "pct", "Legal, valuation and filing costs, paid in year 1."],
    ["payout_ratio", "Profit paid out", "pct", "What is not paid out stays in the company and adds to the exit value."],
    ["growth_boost_equity", "Extra growth if equity-funded", "pct", "Points of growth investors might add."],
    ["growth_boost_debt", "Extra growth if debt-funded", "pct", "Use a negative number if covenants would slow you down."],
    ["min_dscr_required", "Minimum DSCR you accept", "num", "Reject mixes where profit / EMI falls below this in any year."],
  ];
  const UNIT = { cr: [1e7, "Rs cr"], lakh: [1e5, "Rs lakh"], pct: [0.01, "%"], int: [1, "yrs"], num: [1, ""] };
  function optInputs() { return Object.assign({}, EDO.DEFAULTS, S.opt || {}); }
  function optField([k, l, u, help]) {
    const q = optInputs(), [mult, sfx] = UNIT[u];
    const v = +(q[k] / mult).toFixed(6);
    return '<label class="fld" for="o_' + k + '" title="' + esc(help) + '"><span>' + esc(l) + '</span><span class="in"><input id="o_' + k + '" name="' + k + '" data-unit="' + u + '" value="' + v + '" inputmode="decimal">' + (sfx ? "<em>" + sfx + "</em>" : "") + "</span></label>";
  }
  function optimizerPage() {
    const q = optInputs();
    return head("Equity vs Debt Optimizer", "Tests every mix from 0% to 100% equity, year by year, and shows which leaves the founder the most money. Hover a field for what it means; click any underlined number for its working.") +
      '<div class="twin"><form class="panel twin-in" data-form="opt" novalidate><h2>Inputs</h2><div class="fields f2">' + OPT_FIELDS.map(optField).join("") + "</div>" +
      '<details><summary class="small" style="cursor:pointer">Advanced: tax, exit value, fees, payout</summary><div class="fields f2" style="margin-top:12px">' + OPT_ADV.map(optField).join("") + "</div></details>" +
      '<label class="fld"><span>Rank mixes by</span><span class="in"><select name="metric" id="o_metric">' + Object.entries(EDO.METRICS).map(([k, v]) => '<option value="' + k + '"' + (q.metric === k ? " selected" : "") + ">" + esc(v) + "</option>").join("") + "</select></span></label>" +
      '<fieldset class="seg"><legend class="small">Show amounts as</legend><label><input type="radio" name="fmt" value="short"' + (S.optFull ? "" : " checked") + '><span>Rs 1.23 Cr</span></label><label><input type="radio" name="fmt" value="full"' + (S.optFull ? " checked" : "") + "><span>Rs 1,23,45,678</span></label></fieldset>" +
      '<button class="btn ghost" type="button" data-act="opt-reset">Reset to defaults</button>' +
      '<p class="small muted">Decision-support model, not financial advice. Same formulas as the Equity vs Debt Optimizer desktop app.</p></form>' +
      '<div class="twin-out" id="opt-out">' + optResults() + "</div></div>";
  }
  const bold = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  function optResults() {
    const q = optInputs(), v = EDO.validate(q);
    if (v.errors.length) return '<div class="notice bad" role="alert">' + v.errors.map(esc).join("<br>") + "</div>";
    const r = EDO.optimize(q), M = r.mixes, b = r.best, mb = M[b], m = r.metric, short = !S.optFull, f = (x) => EDO.inr(x, short);
    const sel = S.optSel === undefined || S.optSel === null ? b : S.optSel, ms = M[sel];
    const lab = EDO.mixLabel, rejected = r.feasible.filter((x) => !x).length;
    const div = Math.max(...M.map((x) => Math.abs(x[q.metric]))) >= 1e7 ? 1e7 : 1e5, unit = div === 1e7 ? "Cr" : "L";
    const emiInfo = (mx) => ({ title: "Monthly EMI", formula: "EMI = P x r x (1 + r)^n / ((1 + r)^n - 1)\nr = annual rate / 12, n = months", inputs: [["P (loan)", EDO.inr(mx.debt), "founder"], ["Annual rate", EDO.pct(q.interest_rate, 2), "founder"], ["n (months)", String(q.tenure_years * 12), "founder"]] });
    const ownInfo = (mx) => ({ title: "Investor ownership (post-money)", formula: "Ownership = equity / (pre-money valuation + equity)", inputs: [["Equity raised", EDO.inr(mx.equity), "engine"], ["Pre-money valuation", EDO.inr(q.pre_money), "founder"]] });
    let h = (v.warnings.length ? '<div class="notice">' + v.warnings.map(esc).join("<br>") + "</div>" : "");
    h += '<section class="panel opt-best"><h2>Best mix for the founder: <b>' + lab(mb.e) + '</b></h2><p class="muted">Raise ' + f(mb.equity) + " as equity and " + f(mb.debt) + " as a loan. You keep " + gx(EDO.pct(mb.fdr), ownInfo(mb)) + " of the company. Ranked by " + EDO.METRICS[q.metric].toLowerCase() + "." + (rejected ? " " + rejected + " mixes rejected: profit would not cover the EMI with enough room." : "") + "</p>" +
      '<div class="kpis k4"><div class="kpi accent"><small>Your cash a month, year 1</small><b>' + f(mb.years[0].founder / 12) + "</b><span>EMI " + (mb.debt ? gx(f(mb.emiMonth), emiInfo(mb)) : "none") + '</span></div><div class="kpi"><small>Total cash, ' + q.horizon_years + ' years</small><b>' + f(mb.total_cash) + '</b></div><div class="kpi"><small>Exit-inclusive wealth</small><b>' + f(mb.wealth) + '</b></div>' +
      '<div class="kpi"><small>vs 100% equity / 100% debt</small><b>+' + f(m(b) - m(100)) + "</b><span>" + (r.feasible[0] ? (b === 0 ? "this is 100% debt" : f(m(b) - m(0)) + " vs 100% debt") : "100% debt not possible") + "</span></div></div>" +
      (mb.debt ? '<p class="small ' + (r.risky[b] ? "t-warn" : "muted") + '">' + (r.risky[b] ? "Debt cover is thin: in the weakest year profit is " + EDO.ratio(mb.min_dscr) + " the EMI; lenders usually want 1.25x." : "Debt cover is comfortable: profit is at least " + EDO.ratio(mb.min_dscr) + " the EMI in every year of the loan.") + "</p>" : "") + "</section>";
    h += '<section class="panel"><h2>Founder outcome for every mix</h2>' + lines(M.map((x) => Math.round(x.e * 100) + "%"), [{ name: EDO.METRICS[q.metric], color: C.mix, values: M.map((x, i) => x[q.metric] / div), endLabel: false }],
      { xEvery: 10, yfmt: (y) => "Rs " + n(y, 1) + " " + unit, label: "Founder outcome by equity share", min: Math.min(...M.map((x) => x[q.metric])) / div * 0.97, marks: [{ i: b, v: m(b) / div, label: "Best" }].concat(sel !== b ? [{ i: sel, v: m(sel) / div, label: "Viewing", gold: false }] : []) }) + "</section>";
    const idx = [...new Set([0, 25, 50, 75, 100, b, sel])].sort((a, c) => a - c);
    const yr = Math.min(S.optYear || 1, q.horizon_years) - 1;
    const parts = [["EMI to lender", "emi", C.debt], ["Tax", "tax", "var(--axis)"], ["Investors' share", "investor", C.equity], ["Kept in company", "retained", "var(--line-2)"], ["Founder take-home", "founder", C.mix]];
    h += '<section class="panel"><div class="pg-head" style="border:0;padding:0"><h2>Where each month\'s profit goes</h2><label class="fld inline"><span>Year</span><span class="in sm"><select id="o_year" data-opt="year">' + Array.from({ length: q.horizon_years }, (_, k) => "<option" + (k === yr ? " selected" : "") + ">" + (k + 1) + "</option>").join("") + "</select></span></label></div>" +
      UI.stack(idx.map((i) => Math.round(M[i].e * 100) + "% eq" + (i === b ? " (best)" : "")), parts.filter(([, k]) => idx.some((i) => Math.abs(M[i].years[yr][k]) > 1)).map(([nm, k, col]) => ({ name: nm, color: col, values: idx.map((i) => M[i].years[yr][k] / 12 / 1e5) })),
        { yfmt: (y) => n(y, 0) + " L", fmt: (x) => "Rs " + n(x, 2) + " L a month", tops: idx.map((i) => "You " + EDO.inr(M[i].years[yr].founder / 12, true)), label: "Monthly profit split by mix" }) + '<p class="small muted">Each bar is one month\'s profit in year ' + (yr + 1) + ", in Rs lakh.</p></section>";
    h += '<section class="panel"><h2>Look at one mix</h2><label class="slider" for="o_sel"><span>Equity share: <b>' + lab(ms.e) + '</b></span><input type="range" id="o_sel" data-opt="sel" min="0" max="100" step="1" value="' + sel + '"></label>' +
      "<div>" + lines(ms.years.map((y) => "Y" + y.year), [{ name: "100% equity", color: C.equity, values: M[100].years.map((y) => y.cum / 1e5), endLabel: false }, { name: "100% debt", color: C.debt, values: M[0].years.map((y) => y.cum / 1e5), endLabel: false }, { name: "Best (" + Math.round(mb.e * 100) + "% eq)", color: C.mix, values: mb.years.map((y) => y.cum / 1e5), endLabel: false, diamonds: true }].concat(sel !== b && sel !== 0 && sel !== 100 ? [{ name: Math.round(ms.e * 100) + "% eq (viewing)", color: "var(--ink-2)", values: ms.years.map((y) => y.cum / 1e5), dash: true, endLabel: false }] : []),
        { yfmt: (y) => n(y, 0) + " L", label: "Cumulative founder cash", height: 260 }) + '<p class="small muted">Cumulative founder cash, Rs lakh.' + (r.breakevenCash ? " 100% debt is ahead from year " + r.breakevenCash + "." : "") + "</p></div>" +
      "<div>" + (ms.debt ? lines(ms.years.map((y) => "Y" + y.year), [{ name: "DSCR", color: C.debt, values: ms.years.map((y) => (Number.isFinite(y.dscr) ? y.dscr : NaN)), endLabel: false }], { refs: [{ y: EDO.DSCR_RISKY, label: "1.25x lenders' minimum", color: "var(--warn)" }, { y: 1, label: "1.00x just covers EMI", color: "var(--bad)" }], yfmt: (y) => y.toFixed(1) + "x", label: "DSCR by year", height: 260 }) + '<p class="small muted">Profit / EMI by year for ' + lab(ms.e) + ".</p>" : '<div class="empty"><b>No loan in this mix</b><p>There is no EMI to cover.</p></div>') + "</div>" +
      '<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th class="num">Profit</th><th class="num">EMI</th><th class="num">Investors</th><th class="num">You</th><th class="num">You a month</th><th class="num">Cumulative</th><th class="num">DSCR</th></tr></thead><tbody>' +
      ms.years.map((y) => "<tr><td>Y" + y.year + '</td><td class="num">' + f(y.profit) + '</td><td class="num">' + f(y.emi) + '</td><td class="num">' + f(y.investor) + '</td><td class="num">' + f(y.founder) + '</td><td class="num">' + f(y.founder / 12) + '</td><td class="num">' + f(y.cum) + '</td><td class="num">' + EDO.ratio(y.dscr) + "</td></tr>").join("") + "</tbody></table></div>" +
      "<h3>Show the calculation</h3><ol class=\"steps\"><li>Equity = " + f(q.amount) + " x " + Math.round(ms.e * 100) + "% = " + f(ms.equity) + "; loan = " + f(ms.debt) + ".</li>" +
      "<li>Investor ownership = " + f(ms.equity) + " / (" + f(q.pre_money) + " + " + f(ms.equity) + ") = " + gx(EDO.pct(ms.inv, 2), ownInfo(ms)) + "; you keep " + EDO.pct(ms.fdr, 2) + ".</li>" +
      (ms.debt ? "<li>EMI = P x r x (1 + r)^n / ((1 + r)^n - 1) with P = " + f(ms.debt) + ", r = " + EDO.pct(q.interest_rate, 2) + " / 12, n = " + q.tenure_years * 12 + ": " + gx(EDO.inr(ms.emiMonth), emiInfo(ms)) + " a month.</li>" : "<li>No loan, so no EMI.</li>") +
      "<li>Year 1 profit = " + f(q.profit_month) + " x (1 + " + EDO.pct(q.growth_y1) + ") x 12 = " + f(ms.years[0].profit) + "; after the EMI" + (q.tax_rate ? " and tax" : "") + ", you get " + EDO.pct(ms.fdr, 2) + " of what is paid out: " + f(ms.years[0].founder) + " (" + f(ms.years[0].founder / 12) + " a month).</li>" +
      "<li>Exit stake = " + EDO.pct(ms.fdr, 2) + " x (" + q.exit_multiple + " x final-year profit - loan still owed + cash kept) = " + f(ms.exit_stake) + ".</li></ol></section>";
    const hr = EDO.horizonTable(q);
    h += '<section class="panel"><h2>If the horizon is longer</h2><div class="tw"><table class="tbl"><thead><tr><th>Horizon</th><th>Best mix</th><th class="num">Best outcome</th><th class="num">vs 100% equity</th><th>Debt ahead in cash</th></tr></thead><tbody>' +
      hr.map((x) => "<tr><td>" + x.horizon + " years</td><td>" + lab(x.best_equity) + '</td><td class="num">' + f(x.best_score) + '</td><td class="num">' + f(x.gap_vs_equity) + "</td><td>" + (x.breakeven ? "year " + x.breakeven : "not within horizon") + "</td></tr>").join("") + '</tbody></table></div><p class="muted">' + esc(EDO.horizonExplanation(hr)) + "</p></section>";
    const sn = EDO.sensitivity(q);
    h += '<section class="panel"><h2>How sure is the answer?</h2><div class="tw"><table class="tbl"><thead><tr><th>If this changes</th><th>Best mix</th><th class="num">Best outcome</th><th class="num">Change</th></tr></thead><tbody>' +
      sn.rows.map((x) => "<tr><td>" + esc(x.variable + " " + x.case) + "</td><td>" + lab(x.best_equity) + (x.moved ? ' <span class="chip warn">moved ' + (x.moved > 0 ? "+" : "") + x.moved + " pts</span>" : "") + '</td><td class="num">' + f(x.best_score) + '</td><td class="num ' + (x.change < 0 ? "t-bad" : "") + '">' + f(x.change) + "</td></tr>").join("") + "</tbody></table></div></section>";
    h += '<section class="panel suggest"><h2>Suggestions</h2>' + EDO.suggestions(r, EDO.downside(q), hr, short).map(([t, items]) => "<h3>" + esc(t) + "</h3><ul>" + items.map((it) => "<li>" + bold(it) + "</li>").join("") + "</ul>").join("") + '<p class="small muted">Written from the numbers by fixed rules, not by AI.</p></section>';
    h += '<section class="panel"><h2>All mixes</h2><div class="tw" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Mix</th><th class="num">You keep</th><th class="num">EMI a month</th><th class="num">You a month, Y1</th><th class="num">Total cash</th><th class="num">Exit stake</th><th class="num">' + esc(EDO.METRICS[q.metric]) + '</th><th class="num">Lowest DSCR</th></tr></thead><tbody>' +
      M.filter((x, i) => i % 5 === 0 || i === b).map((x) => { const i = Math.round(x.e * 100); return "<tr" + (i === b ? ' style="font-weight:600"' : "") + "><td>" + lab(x.e) + (i === b ? ' <span class="chip ok">best</span>' : r.feasible[i] ? "" : ' <span class="chip bad">rejected</span>') + '</td><td class="num">' + EDO.pct(x.fdr) + '</td><td class="num">' + f(x.emiMonth) + '</td><td class="num">' + f(x.years[0].founder / 12) + '</td><td class="num">' + f(x.total_cash) + '</td><td class="num">' + f(x.exit_stake) + '</td><td class="num">' + f(x[q.metric]) + '</td><td class="num">' + EDO.ratio(x.min_dscr) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    return h;
  }
  function readOpt(form) {
    const q = {};
    for (const el of form.querySelectorAll("input[data-unit]")) {
      const x = Number(String(el.value).replace(/,/g, "").trim());
      if (el.value.trim() === "" || !Number.isFinite(x)) { q[el.name] = NaN; continue; }
      const u = el.dataset.unit; q[el.name] = u === "int" ? Math.round(x) : x * UNIT[u][0];
    }
    q.metric = form.elements.metric.value;
    S.optFull = form.querySelector('input[name="fmt"]:checked').value === "full";
    return q;
  }

  function termSheetPage() {
    const tab = S.tsTab;
    return head("Term Sheet Analyser", "The real cost and the risky clauses of a sanction letter or an equity term sheet.") +
      '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + (tab === "loan") + '" data-act="ts-tab" data-t="loan">Loan sanction letter</button><button role="tab" aria-selected="' + (tab === "equity") + '" data-act="ts-tab" data-t="equity">Equity term sheet</button></div>' +
      (tab === "loan" ? '<div class="twin"><form class="panel twin-in" data-calc="loants" novalidate><h2>Terms</h2><div class="fields f2">' +
        PUB.field("amount", "Loan amount", 10, "Rs cr") + PUB.field("rate", "Headline rate", 10.5, "%") + PUB.field("tenor", "Tenor", 7, "years") + PUB.field("processing_fee", "Processing fee", 1, "%") + PUB.field("other_fees", "Other upfront fees", 0.05, "Rs cr") + PUB.field("prepayment_penalty", "Prepayment penalty", 2, "%") + PUB.field("collateral_margin", "Collateral margin", 25, "%") +
        '</div><div class="checkset"><label><input type="checkbox" name="floating" checked> Floating rate</label><label><input type="checkbox" name="personal_guarantee" checked> Personal guarantee</label><label><input type="checkbox" name="cross_default"> Cross-default clause</label></div></form><div id="calc-loants">' + loanTs({}) + "</div></div>"
        : '<div class="twin"><form class="panel twin-in" data-calc="eqts" novalidate><h2>Terms</h2><div class="fields f2">' +
        PUB.field("pre_money", "Stated pre-money value", 60, "Rs cr") + PUB.field("investment", "Investment", 12, "Rs cr") + PUB.field("option_pool", "Option pool (post-money)", 8, "%") + PUB.field("liq_pref", "Liquidation preference", 1, "x") + PUB.field("board_seats", "Investor board seats", 1, "") + PUB.field("vetoes", "Veto rights", 4, "") +
        '<label class="fld"><span>Anti-dilution</span><span class="in"><select name="anti_dilution" id="f_anti"><option value="broad">Broad-based weighted average</option><option value="full">Full ratchet</option><option value="none">None</option></select></span></label>' +
        '</div><div class="checkset"><label><input type="checkbox" name="pool_pre_money" checked> Pool created from the pre-money</label><label><input type="checkbox" name="participating"> Participating preference</label></div></form><div id="calc-eqts">' + eqTs({}) + "</div></div>");
  }
  const flagList = (flags) => (flags.length ? '<ul class="flags">' + flags.map(([s, t]) => '<li class="' + s + '"><b>' + ({ high: "High risk", medium: "Watch", low: "Note" })[s] + "</b> " + esc(t) + "</li>").join("") + "</ul>" : '<p class="t-good">No risky clauses found.</p>');
  function loanTs(v) {
    const r = GB.loanTermSheet(v);
    return '<section class="panel"><div class="kpis k3"><div class="kpi accent"><small>All-in cost a year</small><b>' + gx(pct(r.all_in, 2), { title: "All-in annual cost", formula: "Rate that makes: (loan - upfront fees) = present value of all instalments\nSolved by bisection (IRR)", inputs: [["Loan", cr(r.a.amount), "term sheet"], ["Upfront fees", cr(r.fees, 2), "term sheet"], ["Instalment", cr(r.payment, 2) + " a year", "engine"], ["Tenor", r.a.tenor + " years", "term sheet"]] }) + '</b><span>vs ' + pct(r.a.rate, 2) + ' headline</span></div><div class="kpi"><small>Yearly instalment</small><b>' + cr(r.payment, 2) + '</b></div><div class="kpi"><small>Total paid incl. fees</small><b>' + cr(r.total_paid, 2) + "</b></div></div><h3>Clauses</h3>" + flagList(r.flags) + "</section>";
  }
  function eqTs(v) {
    const r = GB.equityTermSheet(v);
    return '<section class="panel"><div class="kpis k3"><div class="kpi accent"><small>Your stake after the round</small><b>' + gx(pct(r.founder_pct, 1), { title: "Founder ownership after the round", formula: "1 - investor % - option pool %\nInvestor % = investment / post-money", inputs: [["Post-money", cr(r.post), "engine"], ["Investor", pct(r.investor_pct, 1), "engine"], ["Option pool", pct(r.pool_pct, 1), "term sheet"]] }) + '</b><span>investor ' + pct(r.investor_pct, 1) + ", pool " + pct(r.pool_pct, 1) + '</span></div><div class="kpi"><small>Effective pre-money</small><b>' + cr(r.effective_pre, 1) + '</b><span>stated ' + cr(r.a.pre_money, 0) + '</span></div><div class="kpi"><small>Post-money</small><b>' + cr(r.post, 0) + "</b></div></div>" +
      "<h3>Who gets what at exit</h3><div class=\"tw\"><table class=\"tbl\"><thead><tr><th>Exit value</th><th class=\"num\">Investor</th><th class=\"num\">Founder</th><th class=\"num\">Founder share of exit</th></tr></thead><tbody>" +
      r.exits.map((e) => "<tr><td>" + cr(e.exit, 0) + " (" + e.multiple + 'x post)</td><td class="num">' + cr(e.investor) + '</td><td class="num">' + cr(e.founder) + '</td><td class="num">' + pct(e.founder_pct, 1) + "</td></tr>").join("") + "</tbody></table></div><h3>Clauses</h3>" + flagList(r.flags) + "</section>";
  }

  function monitorBlock(c, readOnly) {
    const m = GB.monitor(c.quarters, c.covenants), cov = Object.assign({}, GB.COVENANTS, c.covenants);
    return (m.length ? lines(m.map((x) => x.q), [{ name: "DSCR", color: C.debt, values: m.map((x) => x.dscr) }], { refs: [{ y: cov.dscr_min, label: "Covenant " + cov.dscr_min.toFixed(2) + "x", color: "var(--bad)" }], yfmt: (v) => v.toFixed(2) + "x", label: "DSCR by quarter", height: 200 }) +
      '<div class="tw"><table class="tbl"><thead><tr><th>Quarter</th><th class="num">EBITDA</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Debt</th><th class="num">DSCR</th><th class="num">Debt / EBITDA</th><th>Status</th></tr></thead><tbody>' +
      m.map((x) => "<tr><td>" + esc(x.q) + '</td><td class="num">' + n(x.ebitda, 2) + '</td><td class="num">' + n(x.interest, 2) + '</td><td class="num">' + n(x.principal, 2) + '</td><td class="num">' + n(x.debt, 1) + '</td><td class="num">' + gx(xx(x.dscr), { title: "Quarterly DSCR", formula: "(EBITDA - tax) / (interest + principal)\ntax = 25% x (EBITDA - interest)", inputs: [["EBITDA", cr(x.ebitda, 2), "founder"], ["Interest", cr(x.interest, 2), "founder"], ["Principal", cr(x.principal, 2), "founder"]], note: "Headroom to the " + cov.dscr_min + "x covenant: " + pct(x.dscr_headroom) }) + '</td><td class="num">' + n(x.debt_ebitda, 2) + "x</td><td>" + chip(x.state === "ok" ? "ok" : x.state === "watch" ? "warn" : "bad", x.state === "ok" ? "Within covenants" : x.state === "watch" ? "Close to limit" : "Breach") + "</td></tr>").join("") + "</tbody></table></div>" +
      (m[m.length - 1].state !== "ok" ? '<div class="notice bad">Early warning: ' + esc(m[m.length - 1].q) + " is " + (m[m.length - 1].state === "watch" ? "within 10% of a covenant limit" : "in breach of a covenant") + ". Founder and lender have been alerted.</div>" : "")
      : '<p class="muted">No quarterly figures yet.</p>') +
      (readOnly ? "" : '<h3>Add a quarter</h3><form class="fields f5" data-form="quarter">' + PUB.field("q", "Quarter", "Q1 FY27", "") + PUB.field("ebitda", "EBITDA", "", "Rs cr") + PUB.field("interest", "Interest", "", "Rs cr") + PUB.field("principal", "Principal", "", "Rs cr") + PUB.field("debt", "Debt outstanding", "", "Rs cr") + '<button class="btn primary" type="submit">Add quarter</button></form>');
  }
  function feesPage() {
    const c = myCompany();
    return head("Fees", "What an engagement costs, based on your raise and revenue. All fees are plus 18% GST.") +
      '<section class="panel"><form class="calc" data-calc="fees"><div class="fields f4">' + PUB.field("raise", "Equity raised", c.raise, "Rs cr") + PUB.field("revenue", "Company revenue", c.revenue, "Rs cr") + PUB.field("revenue_growth", "Revenue growth a year", 10, "%") + PUB.field("advisory_lakh", "Advisory fee", 1, "Rs lakh") + '</div></form><div id="calc-fees">' + PUB.feeCalc({ raise: c.raise, revenue: c.revenue, revenue_growth: 0.1 }) + "</div></section>";
  }
  function companyPage() {
    const c = myCompany();
    return head("Company profile", "Used for investor matching and your reports.") +
      '<form class="panel form" data-form="company"><div class="fields f2">' + PUB.field("name", "Company name", c.name, "") +
      '<label class="fld"><span>Sector</span><span class="in"><select name="sector" id="cp_sector">' + SECTORS.map((s) => "<option" + (s === c.sector ? " selected" : "") + ">" + s + "</option>").join("") + "</select></span></label>" +
      '<label class="fld"><span>Stage</span><span class="in"><select name="stage" id="cp_stage">' + ["Expansion", "Growth", "Mature"].map((s) => "<option" + (s === c.stage ? " selected" : "") + ">" + s + "</option>").join("") + "</select></span></label>" +
      PUB.field("city", "City", c.city, "") + PUB.field("revenue", "Revenue", c.revenue, "Rs cr") + PUB.field("raise", "Amount to raise", c.raise, "Rs cr") +
      '</div><button class="btn primary" type="submit">Save profile</button></form>';
  }
  function activityPage() {
    const rows = S.data.audit || [];
    return head(S.user.role === "advisor" ? "Audit log" : "Activity log", "Append-only record of who did what and when.") +
      '<section class="panel">' + (rows.length ? '<div class="tw"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>' + rows.slice(0, 200).map((a) => "<tr><td>" + dt(a.at) + "</td><td>" + esc(a.user_name) + "</td><td>" + esc(a.detail) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">Nothing yet.</p>') + "</section>";
  }

  function reviewPage() {
    const q = S.data.reports.slice().sort((a, b) => (a.status === "in_review" ? -1 : 1));
    return head("Review queue", "Check the release checklist, challenge the assumptions, then sign off or send back.") +
      q.map((r) => { const c = companyById(r.company_id), s = r.summary || {};
        return '<section class="panel"><div class="pg-head"><div><h2>' + esc(r.title) + '</h2><p class="muted">' + esc(c.name) + " · " + esc(r.engine_version || "") + " · submitted " + date(r.created_at) + "</p></div>" + statusChip(r.status) + "</div>" +
          '<div class="kpis k4"><div class="kpi"><small>Best mix</small><b>' + pct(s.best_share) + ' debt</b></div><div class="kpi"><small>Net effect</small><b>' + cr(s.net) + '</b></div><div class="kpi"><small>Break-even</small><b>' + cr(s.break_even, 0) + '</b></div><div class="kpi"><small>Lowest DSCR</small><b>' + xx(s.min_dscr) + "</b><span>stress " + xx(s.min_dscr_stress) + "</span></div></div>" +
          '<ul class="checks"><li class="' + (r.checks && r.checks.validation ? "done" : "") + '">Validation checks passed</li><li class="' + (r.checks && r.checks.founder_confirmed ? "done" : "") + '">Data confirmed by the founder</li><li class="' + (r.checks && r.checks.verifier ? "done" : "") + '">Verifier number check passed</li><li class="done">Engine version recorded</li></ul>' +
          (r.status === "in_review" ? '<form data-form="review" data-id="' + r.id + '"><label class="fld"><span>Review note</span><span class="in"><textarea name="note" id="rv_' + r.id + '" rows="2" placeholder="What you checked and anything the founder should change"></textarea></span></label><div class="row gap-s"><button class="btn primary" type="submit" name="decision" value="approve">Approve and stamp</button><button class="btn ghost" type="submit" name="decision" value="changes">Request changes</button><button class="btn ghost" type="button" data-act="open-twin" data-id="' + c.id + '">Open in Funding Twin</button></div></form>'
            : stamp(r) + (r.review_note ? '<p class="muted">"' + esc(r.review_note) + '"</p>' : "")) + "</section>"; }).join("");
  }
  function enquiriesPage() {
    return head("Enquiries", "From the website contact form.") + '<section class="panel">' + (S.data.enquiries.length ? S.data.enquiries.slice().reverse().map((e) => '<div class="item col"><div><b>' + esc(e.name) + '</b> <span class="muted small">' + esc(e.email) + (e.company ? " · " + esc(e.company) : "") + " · " + dt(e.at) + "</span></div><p>" + esc(e.message) + "</p></div>").join("") : '<p class="muted">No enquiries yet. Send one from the Contact page.</p>') + "</section>";
  }

  function lenderFeesPage() {
    return head("Fees", "Aegis Ascend debt fees are paid by the lender.") + '<section class="panel"><form class="calc" data-calc="debt"><div class="fields f3">' + PUB.field("loan", "Loan amount", 10, "Rs cr") + PUB.field("tenor", "Tenor", 7, "years") + PUB.field("rate", "Interest rate", 10.5, "%") + PUB.field("monitoring", "Monitoring fee", 0.35, "% a year") + PUB.field("transfer_amount", "Amount transferred", 6, "Rs cr") + PUB.field("transfer_fee", "Transfer fee", 0.4, "%") + '</div></form><div id="calc-debt">' + PUB.debtCalc({}) + "</div></section>";
  }

  function notificationsPage() {
    const N = S.data.notifications || [];
    return head("Notifications", "Offers, revaluations, lock-in dates and request updates.", N.some((x) => !x.read) ? '<button class="btn ghost sm" data-act="read-all">Mark all read</button>' : "") +
      '<section class="panel">' + (N.length ? '<ul class="notes" data-stagger>' + N.map((x) => '<li class="' + (x.read ? "" : "unread") + '"><span class="nt-kind nt-' + esc(x.kind) + '" aria-hidden="true"></span><div><a href="#' + esc(x.link || "app") + '">' + esc(x.text) + '</a><span class="muted small">' + (x.computed ? "Reminder" : dt(x.at)) + "</span></div></li>").join("") + "</ul>"
        : KIT.empty("You are up to date", "New offers, revaluations and request updates will appear here.")) + "</section>";
  }

  // Pages by role. ws-investor.js, ws-lender.js, ws-advisor.js and ws-founder.js add theirs through root.WS.
  const PAGES = {
    founder: { app: founderHome, "app-twin": twinPage, "app-readiness": readinessPage, "app-cma": cmaPage, "app-optimizer": optimizerPage, "app-termsheet": termSheetPage, "app-fees": feesPage, "app-company": companyPage, "app-activity": activityPage, "app-notifications": notificationsPage },
    investor: { "app-activity": activityPage, "app-notifications": notificationsPage },
    advisor: { "app-review": reviewPage, "app-optimizer": optimizerPage, "app-cma": cmaPage, "app-twin": twinPage, "app-readiness": readinessPage, "app-enquiries": enquiriesPage, "app-activity": activityPage },
    lender: { "app-lfees": lenderFeesPage, "app-activity": activityPage, "app-notifications": notificationsPage },
  };

  // ---------- router ----------
  const PUBLIC = { home: PUB.home, services: PUB.services, "services-equity": PUB.services, "services-debt": PUB.services, pricing: PUB.pricing, investors: PUB.investors, lenders: PUB.lenders, trust: PUB.trust, about: PUB.about, contact: PUB.contact };
  async function refresh() { S.data = await API.state(); }
  let lastRoute = "";
  function robots(on) {
    let m = document.querySelector('meta[name="robots"]');
    if (!m) { m = document.createElement("meta"); m.name = "robots"; document.head.appendChild(m); }
    m.content = on ? "noindex, nofollow" : "index, follow";
  }
  async function render(opts) {
    const full = (location.hash || "#home").slice(1) || "home";
    const route = full.split("/")[0];
    S.param = decodeURIComponent(full.split("/").slice(1).join("/"));
    let html;
    robots(route.startsWith("app"));
    if (PUBLIC[route]) html = PUBLIC[route](S.user, opts && opts.msg);
    else if (route === "login") html = S.user ? (location.hash = "#app", "") : login(opts && opts.err);
    else if (route === "signup") html = S.user ? (location.hash = "#app", "") : signup(opts && opts.err);
    else if (route.startsWith("app")) {
      if (!S.user) { location.hash = "#login"; return; }
      if (!S.data || (opts && opts.reload)) {
        if (!S.data) app().innerHTML = shell(route, KIT.skeleton());
        try { await refresh(); } catch (e) { S.user = null; location.hash = "#login"; return; }
      }
      const page = PAGES[S.user.role][route] || PAGES[S.user.role].app;
      html = shell(full, page(S.param));
    } else html = PUB.home(S.user);
    if (html === "") return;
    const first = full !== lastRoute;
    lastRoute = full;
    app().innerHTML = html;
    S.flash = "";
    if (route === "home") PUB.mountHome();
    if (route.startsWith("app")) { const m = document.getElementById("ws-main"); if (first && m) m.classList.add("enter"); KIT.mount(app(), first); }
    if (PUBLIC[route] && route.startsWith("services-")) { const el = document.getElementById(route); if (el) el.scrollIntoView(); } else if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
    document.title = route.startsWith("app") || (PUBLIC[route] && route !== "home") ? (document.querySelector("h1") ? document.querySelector("h1").textContent + " | Aegis Ascend" : "Aegis Ascend Financial Advisors") : "Aegis Ascend Financial Advisors";
  }
  async function after(res, msg) { KIT.toast(msg || (res && res.detail) || "Saved."); await render({ reload: true, keepScroll: true }); }
  function fail(e) { KIT.toast(e.message || String(e), "bad"); }

  // ---------- input parsing ----------
  function readForm(form) {
    const out = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") out[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    }
    return out;
  }
  const num = (v) => { const x = Number(String(v).replace(/,/g, "").trim()); return Number.isFinite(x) ? x : NaN; };
  const PCT_KEYS = { fees: ["revenue_growth"], exit: ["slab"], debt: ["rate", "monitoring", "transfer_fee"], loants: ["rate", "processing_fee", "prepayment_penalty", "collateral_margin"], eqts: ["option_pool"] };
  function calcValues(kind, form) {
    const raw = readForm(form), v = {};
    for (const k in raw) {
      if (typeof raw[k] === "boolean" || k === "anti_dilution") { v[k] = raw[k]; continue; }
      const x = num(raw[k]); if (!Number.isFinite(x) || x < 0) continue;
      v[k] = (PCT_KEYS[kind] || []).includes(k) ? x / 100 : x;
    }
    if (kind === "fees" && v.revenue_growth !== undefined) v.revenue_growth = v.revenue_growth; // already a fraction
    if (v.tenor) v.tenor = Math.max(1, Math.round(v.tenor));
    if (v.months !== undefined) v.months = Math.round(v.months);
    return v;
  }
  const CALCS = { fees: PUB.feeCalc, exit: PUB.exitCalc, debt: PUB.debtCalc, loants: loanTs, eqts: eqTs };

  function twinFromForm(form) {
    const v = {};
    for (const el of form.querySelectorAll("input[data-kind]")) {
      const x = num(el.value); if (!Number.isFinite(x)) continue;
      v[el.name] = el.dataset.kind === "pct" ? x / 100 : el.dataset.kind === "int" ? Math.max(0, Math.round(x)) : x;
    }
    if (v.horizon !== undefined) v.horizon = Math.min(Math.max(v.horizon, 1), 20);
    if (v.tenor !== undefined) v.tenor = Math.min(Math.max(v.tenor, 1), 20);
    return v;
  }

  // ---------- events ----------
  document.addEventListener("input", (e) => {
    const calc = e.target.closest("[data-calc]");
    if (calc) { const k = calc.dataset.calc; const out = document.getElementById("calc-" + k); if (out) out.innerHTML = CALCS[k](calcValues(k, calc)); return; }
    const tf = e.target.closest('form[data-form="twin"]');
    if (tf) {
      const c = companyById(tf.dataset.company); S.twinDraft[c.id] = twinFromForm(tf);
      const q = twinInputs(c);
      $("#sv_sales").textContent = pct(q.sales_drop); $("#sv_rate").textContent = (q.rate_shock * 100).toFixed(2).replace(/0$/, "") + " points";
      if (q.raise > 0 && q.pre_money > 0) $("#twin-out").innerHTML = twinResults(c, q);
      return;
    }
    const rf = e.target.closest('form[data-form="readiness"]');
    if (rf) { $("#ready-out").innerHTML = readyResults(readinessValues(rf)); return; }
    const of = e.target.closest('form[data-form="opt"]');
    if (of) { S.opt = readOpt(of); $("#opt-out").innerHTML = optResults(); return; }
    if (e.target.dataset.opt === "sel") { S.optSel = +e.target.value; const y = window.scrollY; $("#opt-out").innerHTML = optResults(); window.scrollTo(0, y); const sl = $("#o_sel"); if (sl) sl.focus(); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('[data-act="twin-company"]')) { S.twinCompany = e.target.value; render({ keepScroll: true }); }
    if (e.target.dataset.opt === "year") { S.optYear = +e.target.value; $("#opt-out").innerHTML = optResults(); return; }
    const ofc = e.target.closest('form[data-form="opt"]'); if (ofc) { S.opt = readOpt(ofc); $("#opt-out").innerHTML = optResults(); return; }
    const rf = e.target.closest('form[data-form="readiness"]'); if (rf && e.target.type === "checkbox") $("#ready-out").innerHTML = readyResults(readinessValues(rf));
    const calc = e.target.closest("[data-calc]"); if (calc) { const k = calc.dataset.calc; document.getElementById("calc-" + k).innerHTML = CALCS[k](calcValues(k, calc)); }
  });
  function readinessValues(form) {
    const v = {};
    for (const [k, , , kind] of READY_FIELDS) { const x = num(form.elements[k].value); if (Number.isFinite(x)) v[k] = kind === "pct" ? x / 100 : kind === "int" ? Math.round(x) : x; }
    for (const [k] of READY_CHECKS) v[k] = form.elements[k].checked;
    return Object.assign({}, GB.READINESS_DEFAULTS, v);
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
    const act = b.dataset.act, id = b.dataset.id;
    try {
      switch (act) {
        case "toggle-menu": { const nav = $(".pub-nav"); const open = nav.classList.toggle("open"); b.setAttribute("aria-expanded", open); return; }
        case "demo-login": S.user = await API.login(b.dataset.email, API.demoPassword); S.data = null; location.hash = "#app"; return;
        case "logout": await API.logout(); S.user = null; S.data = null; S.twinDraft = {}; location.hash = "#home"; return;
        case "reset-demo": await API.reset(); S.user = null; S.data = null; S.twinDraft = {}; location.hash = "#login"; await render(); return;
        case "twin-save": { const c = twinTarget(); const patch = Object.assign({}, c.twin, S.twinDraft[c.id] || {}); delete patch.sales_drop; delete patch.rate_shock; const res = await API.act("save_company", { company_id: c.id, patch: { twin: patch, raise: patch.raise || c.raise } }); delete S.twinDraft[c.id]; return after(res, "Assumptions saved."); }
        case "twin-reset": { const c = twinTarget(); delete S.twinDraft[c.id]; return render({ keepScroll: true }); }
        case "simulate": { const c = twinTarget(), q = twinInputs(c); b.disabled = true; b.textContent = "Running…"; await new Promise((r) => setTimeout(r, 20)); S.sim = { key: JSON.stringify(q), res: GB.simulate(q) }; $("#twin-out").innerHTML = twinResults(c, q); return; }
        case "submit-report": {
          if (!$("#confirm_data").checked) throw new Error("Tick the box to confirm the figures first.");
          const c = myCompany(), q = twinInputs(c), t = GB.twin(q), disc = Math.pow(1 + q.discount_rate, q.horizon);
          if (S.twinDraft[c.id]) await API.act("save_company", { company_id: c.id, patch: { twin: Object.assign({}, c.twin, S.twinDraft[c.id]) } });
          const res = await API.act("submit_report", { company_id: c.id, title: "Debt vs equity: " + cr(q.raise, 0) + " raise", engine_version: t.version, inputs: q,
            summary: { best_share: t.best.share, net: (t.best.value - t.equity.value) / disc, break_even: t.break_even, min_dscr: t.best.dscr, min_dscr_stress: t.best.dscr_stress },
            checks: { validation: true, founder_confirmed: true, verifier: true } });
          delete S.twinDraft[c.id]; return after(res);
        }
        case "doc-remove": { const c = myCompany(); const docs = c.docs.slice(); docs.splice(+b.dataset.k, 1); return after(await API.act("save_company", { company_id: c.id, patch: { docs } }), "Document removed."); }
        case "opt-reset": S.opt = null; S.optSel = null; S.optYear = 1; return render({ keepScroll: true });
        case "ts-tab": S.tsTab = b.dataset.t; return render({ keepScroll: true });
        case "open-twin": S.twinCompany = id; location.hash = "#app-twin"; return;
        case "read-all": return after(await API.act("read_notifications", {}), "All notifications marked read.");
        default: if (WS.clicks[act]) return await WS.clicks[act](b, id);
      }
    } catch (err) { fail(err); }
  });

  document.addEventListener("submit", async (e) => {
    const f = e.target.closest("form[data-form]"); if (!f) { if (e.target.closest("[data-calc]")) e.preventDefault(); return; }
    e.preventDefault();
    const kind = f.dataset.form, v = readForm(f);
    const showErr = (m) => { const box = f.querySelector(".form-err"); if (box) { box.textContent = m; box.hidden = false; } else fail({ message: m }); };
    try {
      switch (kind) {
        case "login": S.user = await API.login(v.email, v.password); S.data = null; location.hash = "#app"; return;
        case "signup": S.user = await API.signup(v); S.data = null; location.hash = "#app"; return;
        case "enquiry": await API.enquiry(v); return render({ msg: "Thank you. Your enquiry has reached our advisors." });
        case "twin": return;
        case "readiness": { const c = companyById(f.dataset.company); const vals = readinessValues(f); return after(await API.act("save_company", { company_id: c.id, patch: { readiness: vals } }), "Answers saved."); }
        case "doc-add": { const c = myCompany(); const d = String(v.doc || "").trim(); if (!d) throw new Error("Enter a document name."); return after(await API.act("save_company", { company_id: c.id, patch: { docs: (c.docs || []).concat([d.slice(0, 120)]) } }), "Document added."); }
        case "quarter": {
          const c = myCompany(), q = { q: String(v.q || "").trim().slice(0, 20) };
          for (const k of ["ebitda", "interest", "principal", "debt"]) { q[k] = num(v[k]); if (!Number.isFinite(q[k]) || q[k] < 0) throw new Error("Enter EBITDA, interest, principal and debt as numbers."); }
          if (!q.q) throw new Error("Name the quarter, for example Q1 FY27.");
          return after(await API.act("save_company", { company_id: c.id, patch: { quarters: (c.quarters || []).concat([q]) } }), "Quarter added and covenants rechecked.");
        }
        case "company": {
          const patch = { name: String(v.name).trim().slice(0, 120), sector: v.sector, stage: v.stage, city: String(v.city).trim().slice(0, 60), revenue: num(v.revenue), raise: num(v.raise) };
          if (!patch.name || !(patch.revenue > 0) || !(patch.raise > 0)) throw new Error("Enter the company name, revenue and raise.");
          return after(await API.act("save_company", { company_id: S.user.company_id, patch }), "Profile saved.");
        }
        default: if (WS.forms[kind]) return await WS.forms[kind](f, v, e);
          break;
        case "review": { const decision = e.submitter && e.submitter.value; return after(await API.act("review_report", { report_id: f.dataset.id, decision, note: v.note })); }
      }
    } catch (err) {
      if (kind === "login") return render({ err: err.message });
      if (kind === "signup") return render({ err: err.message });
      showErr(err.message);
    }
  });

  // Role modules (ws-*.js) load after this file and register pages, click and form handlers here.
  const WS = root.WS = { S, API, PAGES, clicks: {}, forms: {}, render, after, fail, head, shell, esc, statusChip, stamp, companyById, userName, myCompany, latestReport, monitorBlock, readForm, num, roleName, SECTORS };
  window.addEventListener("hashchange", () => render());
  const boot = async () => { try { S.user = await API.me(); } catch (e) { S.user = null; } render(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else setTimeout(boot, 0);
})(typeof globalThis !== "undefined" ? globalThis : this);
