/* Sign-in pages, the role-based workspace, and the page router. */
(function (root) {
  "use strict";
  const { esc, n, cr, lakh, pct, xx, date, dt, gx, hbars, lines, vbars, meter, chip, C } = root.UI;
  const GB = root.GB, PUB = root.PUB;
  const API = root.GB_API;
  const S = { user: null, data: null, flash: "", twinDraft: {}, sim: null, tsTab: "loan" };
  const $ = (s, el) => (el || document).querySelector(s);
  const app = () => document.getElementById("site");

  // ---------- auth pages ----------
  function login(err) {
    const demo = API.mode === "demo";
    return PUB.header("login", null) + '<main class="auth"><div class="auth-card">' +
      "<h1>Sign in</h1><p class=\"muted\">Founders, investors, lenders and advisors each see their own workspace.</p>" +
      (err ? '<div class="notice bad">' + esc(err) + "</div>" : "") +
      '<form class="form" data-form="login" novalidate>' +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="l_email" type="email" autocomplete="username" required></span></label>' +
      '<label class="fld"><span>Password</span><span class="in"><input name="password" id="l_password" type="password" autocomplete="current-password" required></span></label>' +
      '<button class="btn primary lg block" type="submit">Sign in</button></form>' +
      '<p class="small">New here? <a href="#signup">Create an account</a></p>' +
      (demo ? '<div class="demo-box"><b>Demo accounts</b><p class="small muted">This demo keeps accounts and data in your browser only. Pick a role to sign in instantly (password <code>' + esc(API.demoPassword) + "</code>).</p>" +
        '<div class="demo-roles">' + [["founder@demo.in", "Founder", "Priya Nair, Kalyan Polymers"], ["investor@demo.in", "Investor", "Meera Iyer, Konkan Growth Partners"], ["advisor@demo.in", "Advisor", "CA Neha Joshi, Glass-Box"], ["lender@demo.in", "Lender", "Suresh Pillai, Harbour Bank"]].map(([e, r, w]) => '<button type="button" class="role-btn" data-act="demo-login" data-email="' + e + '"><b>' + r + "</b><span>" + w + "</span></button>").join("") + "</div></div>" : "") +
      "</div></main>" + PUB.footer();
  }
  function signup(err) {
    return PUB.header("signup", null) + '<main class="auth"><div class="auth-card">' +
      "<h1>Create an account</h1>" + (err ? '<div class="notice bad">' + esc(err) + "</div>" : "") +
      '<form class="form" data-form="signup" novalidate>' +
      '<fieldset class="seg"><legend>I am a</legend>' + [["founder", "Founder"], ["investor", "Investor"], ["lender", "Lender"]].map(([v, l], i) => '<label><input type="radio" name="role" value="' + v + '"' + (i ? "" : " checked") + "><span>" + l + "</span></label>").join("") + "</fieldset>" +
      '<label class="fld"><span>Your name</span><span class="in"><input name="name" id="s_name" autocomplete="name" required></span></label>' +
      '<label class="fld"><span>Company, fund or bank</span><span class="in"><input name="org" id="s_org" autocomplete="organization"></span></label>' +
      '<label class="fld"><span>Sector</span><span class="in"><select name="sector" id="s_sector">' + SECTORS.map((s) => "<option>" + s + "</option>").join("") + "</select></span></label>" +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="s_email" type="email" autocomplete="email" required></span></label>' +
      '<label class="fld"><span>Password (8 characters or more)</span><span class="in"><input name="password" id="s_password" type="password" autocomplete="new-password" required minlength="8"></span></label>' +
      '<button class="btn primary lg block" type="submit">Create account</button></form>' +
      '<p class="small">Already registered? <a href="#login">Sign in</a>. Advisor accounts are created by Glass-Box.</p></div></main>' + PUB.footer();
  }
  const SECTORS = ["Plastics & packaging", "Auto components", "Chemicals", "Food processing", "Textiles", "Engineering", "Pharma", "Electronics"];

  // ---------- workspace shell ----------
  const NAVS = {
    founder: [["app", "Overview"], ["app-twin", "Funding Twin"], ["app-readiness", "Readiness Score"], ["app-cma", "CMA funding report"], ["app-termsheet", "Term Sheet Analyser"], ["app-investors", "Investors"], ["app-dealroom", "Deal room"], ["app-loans", "Loans & monitoring"], ["app-fees", "Fees"], ["app-company", "Company profile"], ["app-activity", "Activity log"]],
    investor: [["app", "Overview"], ["app-deals", "Curated deals"], ["app-rooms", "Deal rooms"], ["app-portfolio", "Portfolio & exits"], ["app-activity", "Activity log"]],
    advisor: [["app", "Overview"], ["app-review", "Review queue"], ["app-companies", "Companies"], ["app-twin", "Funding Twin"], ["app-dealsdesk", "Deals & exits"], ["app-transfers", "Loan transfers"], ["app-enquiries", "Enquiries"], ["app-activity", "Audit log"]],
    lender: [["app", "Overview"], ["app-lender", "Applications & loans"], ["app-monitor", "Monitoring"], ["app-lfees", "Fees"], ["app-activity", "Activity log"]],
  };
  function shell(route, body) {
    const u = S.user, nav = NAVS[u.role];
    return '<div class="ws">' +
      '<header class="ws-top"><a href="#home" class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Glass-Box <b>Advisory</b></span></a>' +
      (API.mode === "demo" ? '<span class="chip warn">Demo: fictional data, kept in this browser</span>' : "") +
      '<div class="ws-user"><span><b>' + esc(u.name) + "</b><small>" + esc(roleName(u.role)) + (u.firm ? " · " + esc(u.firm) : companyName() ? " · " + esc(companyName()) : "") + '</small></span><button class="btn ghost sm" data-act="logout">Sign out</button></div></header>' +
      '<nav class="ws-nav" aria-label="Workspace">' + nav.map(([k, l]) => '<a href="#' + k + '"' + (route === k ? ' aria-current="page"' : "") + ">" + l + "</a>").join("") +
      (API.mode === "demo" ? '<button class="linkbtn small" data-act="reset-demo">Reset demo data</button>' : "") + "</nav>" +
      '<main class="ws-main">' + (S.flash ? '<div class="notice ok" role="status">' + esc(S.flash) + "</div>" : "") + body + "</main></div>";
  }
  const roleName = (r) => ({ founder: "Founder", investor: "Investor", advisor: "Advisor", lender: "Lender" })[r];
  const myCompany = () => S.data.companies.find((c) => c.id === S.user.company_id);
  const companyName = () => { const c = S.user.company_id && S.data && S.data.companies.find((x) => x.id === S.user.company_id); return c && c.name; };
  const userName = (id) => { const u = (S.data.directory || []).concat(S.data.founders || []).find((x) => x.id === id); return u ? (u.firm && u.role !== "advisor" ? u.firm : u.name) : id === S.user.id ? S.user.name : "Glass-Box user"; };
  const companyById = (id) => S.data.companies.find((c) => c.id === id);
  const statusChip = (s) => chip({ approved: "ok", in_review: "warn", changes: "bad", draft: "", requested: "warn", granted: "ok", declined: "bad", applied: "warn", sanctioned: "ok", disbursed: "ok", consent_needed: "warn", completed: "ok", open: "warn" }[s] || "", ({ in_review: "In review", changes: "Changes requested", consent_needed: "Needs founder consent", first_refusal: "First refusal", buyer_intro: "Buyer introduction", spa: "SPA", open: "In progress" })[s] || s.charAt(0).toUpperCase() + s.slice(1));
  const stamp = (r) => (r && r.status === "approved" ? '<span class="stamp">Reviewed by ' + esc(userName(r.reviewed_by)) + " · " + date(r.reviewed_at) + "</span>" : "");
  const latestReport = (cid) => S.data.reports.filter((r) => r.company_id === cid).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const head = (title, sub, extra) => '<div class="pg-head"><div><h1>' + esc(title) + "</h1>" + (sub ? '<p class="muted">' + sub + "</p>" : "") + "</div>" + (extra || "") + "</div>";
  const empty = (t, d) => '<div class="empty"><b>' + esc(t) + "</b><p>" + d + "</p></div>";

  // ---------- FOUNDER ----------
  function founderHome() {
    const c = myCompany(), rep = latestReport(c.id), rd = GB.readiness(c.readiness), t = GB.twin(Object.assign({}, c.twin, { raise: c.raise }));
    const reqs = S.data.intros.filter((i) => i.status === "requested"), cons = S.data.exits.filter((x) => x.status === "consent_needed");
    const mon = GB.monitor(c.quarters, c.covenants), last = mon[mon.length - 1];
    const steps = [
      ["Fill in the Funding Twin", Object.keys(c.twin || {}).length > 0, "app-twin"],
      ["Check your Readiness Score", Object.keys(c.readiness || {}).length > 0, "app-readiness"],
      ["Submit the report for advisor review", !!rep, "app-twin"],
      ["Advisor sign-off", rep && rep.status === "approved", "app-twin"],
      ["Approve investor introductions", S.data.intros.some((i) => i.status === "granted"), "app-investors"],
    ];
    return head(c.name, esc(c.sector) + " · " + esc(c.city) + " · revenue " + cr(c.revenue, 0) + " · raising " + cr(c.raise, 0)) +
      '<div class="kpis k4">' +
      '<div class="kpi"><small>Recommended mix</small><b>' + pct(t.best.share) + " debt</b><span>" + pct(1 - t.best.share) + " equity · " + cr(t.best.loan) + " loan</span></div>" +
      '<div class="kpi"><small>Debt readiness</small><b>' + rd.debt.score + "/100</b><span>" + rd.debt.verdict + "</span></div>" +
      '<div class="kpi"><small>Equity readiness</small><b>' + rd.equity.score + "/100</b><span>" + rd.equity.verdict + "</span></div>" +
      '<div class="kpi"><small>Report</small><b>' + (rep ? statusChip(rep.status) : "Not submitted") + "</b><span>" + (rep ? esc(rep.title) : "Run the Funding Twin first") + "</span></div></div>" +
      '<div class="grid2"><section class="panel"><h2>Next steps</h2><ol class="checklist">' + steps.map(([t, ok, r]) => '<li class="' + (ok ? "done" : "") + '"><a href="#' + r + '">' + t + "</a></li>").join("") + "</ol>" + stamp(rep) + "</section>" +
      '<section class="panel"><h2>Needs your decision</h2>' +
      (reqs.length || cons.length ? reqs.map((i) => '<div class="item"><div><b>' + esc(userName(i.investor_id)) + '</b><span class="muted small">asked for access to your deal room · ' + date(i.created_at) + '</span></div><div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div></div>').join("") +
        cons.map((x) => '<div class="item"><div><b>' + esc(userName(x.investor_id)) + '</b><span class="muted small">wants to sell after ' + x.months + ' months (under the 6-month minimum)</span></div><button class="btn primary sm" data-act="consent-exit" data-id="' + x.id + '">Give written consent</button></div>').join("")
        : '<p class="muted">Nothing waiting. Investor requests and exit consents appear here.</p>') +
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
    return head("CMA funding report", "Upload the company's CMA workbook and project details to get a one-page debt vs equity recommendation sized on DSCR, as a PDF for lenders.") +
      '<section class="panel"><p>The CMA tool reads the Indian bank CMA format (Form II operating statement, Form III balance sheet), finds the base year, sizes the debt the project can carry at the target DSCR, applies the lender\'s minimum own contribution, stress-tests it, and writes a one-page A4 report.</p>' +
      '<ul class="ticks"><li>First sheet read; rows found by the label in column A</li><li>Years in columns B to E, status row below</li><li>NET SALES, PBIT, PROFIT BEFORE TAX and PAT required</li><li>The CMA stays in your browser</li></ul>' +
      '<a class="btn primary lg" href="' + esc(root.GB_CMA_URL || "fundmix.html") + '">Open the CMA funding report tool</a></section>';
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

  function investorsPage() {
    const c = myCompany(), approved = S.data.reports.some((r) => r.status === "approved");
    const invs = S.data.directory.filter((u) => u.role === "investor").map((u) => Object.assign({ fit: GB.fitScore(c, u) }, u)).sort((a, b) => b.fit.score - a.fit.score);
    const introOf = (id) => S.data.intros.find((i) => i.investor_id === id);
    return head("Investors", "Ranked by Investor Fit Score. You approve every introduction; nothing is shared without your permission.") +
      (approved ? "" : '<div class="notice">Introductions open once an advisor approves your debt vs equity report. <a href="#app-twin">Go to the Funding Twin</a></div>') +
      '<div class="cards">' + invs.map((u) => { const i = introOf(u.id); return '<article class="card"><div class="card-top"><div><b>' + esc(u.firm) + '</b><span class="muted small">' + esc(u.name) + '</span></div><div class="score" title="Investor Fit Score">' + u.fit.score + "<small>/100</small></div></div>" +
        '<ul class="reasons">' + u.fit.reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
        (i ? "<p>" + statusChip(i.status) + (i.nda_signed_at ? " " + chip("ok", "NDA signed") : "") + "</p>" + (i.status === "requested" ? '<div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div>' : "")
          : '<button class="btn primary sm" data-act="invite" data-id="' + u.id + '"' + (approved ? "" : " disabled") + ">Approve introduction</button>") + "</article>"; }).join("") + "</div>";
  }

  function dealRoomPage() {
    const c = myCompany(), views = S.data.intros.flatMap((i) => (i.views || []).map((v) => Object.assign({ who: userName(i.investor_id) }, v))).sort((a, b) => (a.at < b.at ? 1 : -1));
    return head("Deal room", "Documents investors can open after you grant access and they sign the NDA. Every view is watermarked and logged.") +
      '<div class="grid2"><section class="panel"><h2>Documents</h2><ul class="docs">' + (c.docs || []).map((d, k) => '<li><span>' + esc(d) + '</span><button class="linkbtn small" data-act="doc-remove" data-k="' + k + '">Remove</button></li>').join("") + "</ul>" +
      '<form class="row gap-s" data-form="doc-add"><span class="in grow"><input name="doc" id="doc_name" placeholder="Document name, e.g. Board resolution"></span><button class="btn ghost" type="submit">Add</button></form></section>' +
      '<section class="panel"><h2>Who viewed what</h2>' + (views.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Investor</th><th>Document</th><th>When</th></tr></thead><tbody>' + views.map((v) => "<tr><td>" + esc(v.who) + "</td><td>" + esc(v.doc) + "</td><td>" + dt(v.at) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No views yet.</p>') + "</section></div>";
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
  function loansPage() {
    const c = myCompany(), lenders = S.data.directory.filter((u) => u.role === "lender");
    return head("Loans & monitoring", "Your loans, applications and quarterly covenant checks. Lenders pay all Glass-Box debt fees.") +
      '<section class="panel"><h2>Loans</h2>' + (S.data.loans.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Lender</th><th class="num">Amount</th><th class="num">Rate</th><th class="num">Tenor</th><th>Status</th></tr></thead><tbody>' + S.data.loans.map((l) => "<tr><td>" + esc(userName(l.lender_id)) + '</td><td class="num">' + cr(l.amount, 1) + '</td><td class="num">' + pct(l.rate, 2) + '</td><td class="num">' + l.tenor + " yrs</td><td>" + statusChip(l.status) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No loans yet.</p>') +
      '<h3>Apply through Glass-Box</h3><form class="fields f5" data-form="apply-loan"><label class="fld"><span>Lender</span><span class="in"><select name="lender_id" id="al_lender">' + lenders.map((l) => '<option value="' + l.id + '">' + esc(l.firm) + "</option>").join("") + "</select></span></label>" + PUB.field("amount", "Amount", c.raise, "Rs cr") + PUB.field("rate", "Expected rate", 10.5, "%") + PUB.field("tenor", "Tenor", 7, "years") + '<button class="btn primary" type="submit">Send application</button></form></section>' +
      '<section class="panel"><h2>Covenant monitoring</h2>' + monitorBlock(c, false) + "</section>";
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

  // ---------- INVESTOR ----------
  function investorHome() {
    const m = S.user.mandate || {};
    const deals = S.data.companies.filter((c) => c.teaser || S.data.intros.some((i) => i.company_id === c.id));
    return head("Welcome, " + S.user.name.split(" ")[0], esc(S.user.firm)) +
      '<div class="kpis k4"><div class="kpi"><small>Curated deals</small><b>' + deals.length + '</b><span>advisor-approved</span></div><div class="kpi"><small>Open deal rooms</small><b>' + S.data.intros.filter((i) => i.status === "granted").length + '</b></div><div class="kpi"><small>Holdings</small><b>' + S.data.holdings.length + '</b><span>' + cr(S.data.holdings.reduce((a, h) => a + h.amount, 0)) + ' invested</span></div><div class="kpi"><small>Exits in progress</small><b>' + S.data.exits.filter((x) => x.status !== "completed").length + "</b></div></div>" +
      '<section class="panel"><h2>Your mandate</h2><p>Sectors: <b>' + esc((m.sectors || []).join(", ")) + "</b> · Stage: <b>" + esc((m.stages || []).join(", ")) + "</b> · Ticket: <b>Rs " + m.ticket_min + "-" + m.ticket_max + " cr</b> · Instruments: <b>" + esc((m.instruments || []).join(", ")) + '</b></p><a class="btn primary" href="#app-deals">See curated deals</a></section>';
  }
  function dealsPage() {
    const list = S.data.companies.map((c) => Object.assign({ fit: GB.fitScore(c, S.user) }, c)).sort((a, b) => b.fit.score - a.fit.score);
    return head("Curated deals", "Only companies that passed validation, the engine and an advisor's sign-off.") +
      (list.length ? '<div class="cards">' + list.map((c) => { const i = S.data.intros.find((x) => x.company_id === c.id); const s = c.report_summary;
        return '<article class="card"><div class="card-top"><div><b>' + esc(c.name) + '</b><span class="muted small">' + esc(c.sector) + " · " + esc(c.stage) + " · " + esc(c.city) + '</span></div><div class="score" title="Investor Fit Score">' + c.fit.score + "<small>/100</small></div></div>" +
          '<p>Raising <b>' + cr(c.raise, 0) + "</b> · revenue " + cr(c.revenue, 0) + "</p>" + (s ? '<p class="small">Engine view: best mix ' + pct(s.best_share) + " debt · lowest DSCR " + xx(s.min_dscr) + " (stress " + xx(s.min_dscr_stress) + ")</p>" : "") +
          (c.reviewed_by ? '<span class="stamp">Reviewed by ' + esc(userName(c.reviewed_by)) + "</span>" : "") +
          '<ul class="reasons">' + c.fit.reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
          (i ? "<p>" + statusChip(i.status) + (i.status === "granted" ? ' <a href="#app-rooms">Open deal room</a>' : "") + "</p>" : '<button class="btn primary sm" data-act="request-intro" data-id="' + c.id + '">Request introduction</button>') + "</article>"; }).join("") + "</div>" : empty("No deals yet", "Approved deals that match the panel appear here."));
  }
  function roomsPage() {
    const mine = S.data.intros.filter((i) => i.status === "granted");
    return head("Deal rooms", "Sign the NDA to open documents. Each document is watermarked with your name and every view is logged for the founder.") +
      (mine.length ? mine.map((i) => { const c = companyById(i.company_id), rep = S.data.reports.find((r) => r.company_id === i.company_id);
        return '<section class="panel"><h2>' + esc(c.name) + "</h2>" + (!i.nda_signed_at ? '<div class="nda"><p>By signing you agree to keep all information about ' + esc(c.name) + " confidential, use it only to evaluate this investment, and not to contact the company's customers, lenders or staff without permission.</p><label><input type=\"checkbox\" id=\"nda_" + i.id + '"> I agree to the NDA</label> <button class="btn primary sm" data-act="sign-nda" data-id="' + i.id + '">Sign NDA</button></div>'
          : '<p>' + chip("ok", "NDA signed " + date(i.nda_signed_at)) + "</p>" + (rep ? '<div class="kpis k4"><div class="kpi"><small>Best mix</small><b>' + pct(rep.summary.best_share) + ' debt</b></div><div class="kpi"><small>Net effect vs equity</small><b>' + cr(rep.summary.net) + '</b></div><div class="kpi"><small>Break-even value</small><b>' + cr(rep.summary.break_even, 0) + '</b></div><div class="kpi"><small>Lowest DSCR</small><b>' + xx(rep.summary.min_dscr) + "</b><span>stress " + xx(rep.summary.min_dscr_stress) + "</span></div></div>" + stamp(rep) : "") +
            '<h3>Documents</h3><ul class="docs">' + (c.docs || []).map((d) => "<li><span>" + esc(d) + '</span><button class="btn ghost sm" data-act="view-doc" data-id="' + i.id + '" data-doc="' + esc(d) + '">Open</button></li>').join("") + "</ul>") + "</section>"; }).join("") : empty("No open deal rooms", "Request an introduction from Curated deals. The founder decides who gets access."));
  }
  function portfolioPage() {
    const MONTH = 30.44 * 24 * 3600 * 1000;
    return head("Portfolio & exits", "Exit after a 6-month minimum holding, or earlier with the founder's written consent. Sales are private and negotiated.") +
      '<section class="panel"><h2>Holdings</h2>' + (S.data.holdings.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Company</th><th class="num">Invested</th><th class="num">Stake</th><th>Since</th><th class="num">Months</th><th>Exit</th></tr></thead><tbody>' +
        S.data.holdings.map((h) => { const c = companyById(h.company_id), mo = Math.floor((Date.now() - new Date(h.invested_at)) / MONTH), x = S.data.exits.find((e) => e.holding_id === h.id && e.status !== "completed");
          return "<tr><td>" + esc(c ? c.name : h.company_id) + '</td><td class="num">' + cr(h.amount, 1) + '</td><td class="num">' + pct(h.stake, 1) + "</td><td>" + date(h.invested_at) + '</td><td class="num">' + mo + "</td><td>" + (x ? statusChip(x.status) : '<form class="row gap-s" data-form="exit" data-id="' + h.id + '"><span class="in sm"><input name="price" id="px_' + h.id + '" placeholder="Asking Rs cr" inputmode="decimal"></span><button class="btn ghost sm" type="submit">Request exit</button></form>') + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted">No holdings yet.</p>') + "</section>" +
      '<section class="panel"><h2>Exit tax view</h2><form class="calc" data-calc="exit"><div class="fields f5">' + PUB.field("cost", "Amount invested", 1, "Rs cr") + PUB.field("sale", "Sale price", 1.4, "Rs cr") + PUB.field("months", "Months held", 14, "months") + PUB.field("slab", "Your slab rate", 30, "%") + PUB.field("fmv", "Fair market value", 1.4, "Rs cr") + '</div></form><div id="calc-exit">' + PUB.exitCalc({}) + "</div></section>";
  }

  // ---------- ADVISOR ----------
  function advisorHome() {
    const q = S.data.reports.filter((r) => r.status === "in_review");
    return head("Advisor desk", "Every report shared with an investor or lender carries your review.") +
      '<div class="kpis k4"><div class="kpi"><small>Waiting for review</small><b>' + q.length + '</b></div><div class="kpi"><small>Companies</small><b>' + S.data.companies.length + '</b></div><div class="kpi"><small>Open exits</small><b>' + S.data.exits.filter((x) => x.status !== "completed").length + '</b></div><div class="kpi"><small>New enquiries</small><b>' + S.data.enquiries.length + "</b></div></div>" +
      '<section class="panel"><h2>Review queue</h2>' + (q.length ? q.map((r) => '<div class="item"><div><b>' + esc(r.title) + '</b><span class="muted small">' + esc(companyById(r.company_id).name) + " · submitted " + date(r.created_at) + '</span></div><a class="btn primary sm" href="#app-review">Review</a></div>').join("") : '<p class="muted">Nothing waiting.</p>') + "</section>";
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
  function companiesPage() {
    return head("Companies", "All client companies.") + '<section class="panel"><div class="tw"><table class="tbl"><thead><tr><th>Company</th><th>Sector</th><th class="num">Revenue</th><th class="num">Raise</th><th class="num">Debt ready</th><th class="num">Equity ready</th><th>Report</th><th></th></tr></thead><tbody>' +
      S.data.companies.map((c) => { const r = GB.readiness(c.readiness), rep = latestReport(c.id); return "<tr><td><b>" + esc(c.name) + "</b></td><td>" + esc(c.sector) + '</td><td class="num">' + cr(c.revenue, 0) + '</td><td class="num">' + cr(c.raise, 0) + '</td><td class="num">' + r.debt.score + '</td><td class="num">' + r.equity.score + "</td><td>" + (rep ? statusChip(rep.status) : "None") + '</td><td><button class="linkbtn" data-act="open-twin" data-id="' + c.id + '">Funding Twin</button></td></tr>'; }).join("") + "</tbody></table></div></section>";
  }
  function dealsDeskPage() {
    const steps = ["first_refusal", "buyer_intro", "valuation", "spa", "transfer", "completed"];
    return head("Deals & exits", "Record closed investments (at most 3 investors per deal) and move private resales forward.") +
      '<section class="panel"><h2>Introductions</h2><div class="tw"><table class="tbl"><thead><tr><th>Company</th><th>Investor</th><th>Status</th><th>NDA</th><th class="num">Doc views</th><th>Record investment</th></tr></thead><tbody>' +
      S.data.intros.map((i) => "<tr><td>" + esc(companyById(i.company_id).name) + "</td><td>" + esc(userName(i.investor_id)) + "</td><td>" + statusChip(i.status) + "</td><td>" + (i.nda_signed_at ? date(i.nda_signed_at) : "-") + '</td><td class="num">' + (i.views || []).length + "</td><td>" + (i.status === "granted" ? '<form class="row gap-s" data-form="invest" data-id="' + i.id + '"><span class="in sm"><input name="amount" placeholder="Rs cr" inputmode="decimal" id="ia_' + i.id + '"></span><span class="in sm"><input name="stake" placeholder="Stake %" inputmode="decimal" id="is_' + i.id + '"></span><button class="btn ghost sm" type="submit">Record</button></form>' : "") + "</td></tr>").join("") + "</tbody></table></div></section>" +
      '<section class="panel"><h2>Early exits</h2>' + (S.data.exits.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Company</th><th>Seller</th><th class="num">Asking</th><th>Stage</th><th></th></tr></thead><tbody>' + S.data.exits.map((x) => "<tr><td>" + esc(companyById(x.company_id).name) + "</td><td>" + esc(userName(x.investor_id)) + '</td><td class="num">' + (x.price ? cr(x.price, 2) : "-") + "</td><td>" + statusChip(x.status) + '<div class="progress">' + steps.map((s, k) => '<i class="' + (steps.indexOf(x.status) >= k ? "on" : "") + '"></i>').join("") + "</div></td><td>" + (x.status !== "completed" && x.status !== "consent_needed" ? '<button class="btn ghost sm" data-act="advance-exit" data-id="' + x.id + '">Next step</button>' : "") + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No exits yet.</p>') + "</section>";
  }
  const TRANSFER_STEPS = ["Request", "Eligibility under RBI rules", "Borrower consent", "Buyer search", "Deed of assignment", "Security updated with ROC", "Repayments redirected", "Fees invoiced"];
  function transfersPage() {
    const open = S.data.loans.filter((l) => l.transfer);
    return head("Loan transfers", "Transfers of loan exposures between regulated lenders.") +
      (open.length ? open.map((l) => '<section class="panel"><h2>' + esc(companyById(l.company_id).name) + " · " + cr(l.transfer.amount) + "</h2><p class=\"muted\">Seller: " + esc(userName(l.lender_id)) + " · " + statusChip(l.transfer.status) + '</p><ol class="tsteps">' + TRANSFER_STEPS.map((s, k) => '<li class="' + (k <= l.transfer.step ? "done" : "") + '">' + s + "</li>").join("") + "</ol>" + (l.transfer.status === "open" ? '<button class="btn primary sm" data-act="advance-transfer" data-id="' + l.id + '">Mark next step done</button>' : "") + "</section>").join("") : empty("No transfers", "When a lender asks to transfer a loan, it appears here."));
  }
  function enquiriesPage() {
    return head("Enquiries", "From the website contact form.") + '<section class="panel">' + (S.data.enquiries.length ? S.data.enquiries.slice().reverse().map((e) => '<div class="item col"><div><b>' + esc(e.name) + '</b> <span class="muted small">' + esc(e.email) + (e.company ? " · " + esc(e.company) : "") + " · " + dt(e.at) + "</span></div><p>" + esc(e.message) + "</p></div>").join("") : '<p class="muted">No enquiries yet. Send one from the Contact page.</p>') + "</section>";
  }

  // ---------- LENDER ----------
  function lenderHome() {
    const L = S.data.loans;
    return head("Lender desk", esc(S.user.firm)) + '<div class="kpis k4"><div class="kpi"><small>New applications</small><b>' + L.filter((l) => l.status === "applied").length + '</b></div><div class="kpi"><small>Loans monitored</small><b>' + L.filter((l) => l.status === "disbursed").length + '</b></div><div class="kpi"><small>Book</small><b>' + cr(L.filter((l) => l.status === "disbursed").reduce((a, l) => a + l.amount, 0)) + '</b></div><div class="kpi"><small>Covenant alerts</small><b>' + L.filter((l) => { const c = companyById(l.company_id); const m = c ? GB.monitor(c.quarters, c.covenants) : []; return m.length && m[m.length - 1].state !== "ok"; }).length + "</b></div></div>" +
      '<section class="panel"><p>Every applicant arrives with founder-confirmed data, an engine-run DSCR analysis and an advisor\'s sign-off. <a href="#app-lender">Review applications</a></p></section>';
  }
  function lenderPage() {
    return head("Applications & loans", "The lender-side view: the same glass-box analysis the founder sees.") +
      (S.data.loans.length ? S.data.loans.map((l) => { const c = companyById(l.company_id), rep = S.data.reports.find((r) => r.company_id === l.company_id), rd = GB.readiness(c.readiness), t = GB.twin(Object.assign({}, c.twin, { raise: c.raise }));
        return '<section class="panel"><div class="pg-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.sector) + " · revenue " + cr(c.revenue, 0) + " · asks " + cr(l.amount, 1) + " at " + pct(l.rate, 2) + " for " + l.tenor + " years</p></div>" + statusChip(l.status) + "</div>" +
          '<div class="kpis k4"><div class="kpi"><small>Debt readiness</small><b>' + rd.debt.score + '/100</b><span>' + rd.debt.verdict + '</span></div><div class="kpi"><small>Lowest DSCR, all-debt</small><b>' + gx(xx(t.min_dscr), { title: "Lowest DSCR if the whole raise is debt", formula: "(EBITDA - tax) / (existing debt service + instalment)", inputs: [["EBITDA", cr(t.q.ebitda0), "founder"], ["Existing debt service", cr(t.q.existing_ds), "founder"], ["Instalment", cr(t.payment, 2), "engine"]] }) + '</b><span>stress ' + xx(t.min_dscr_stress) + '</span></div><div class="kpi"><small>Engine best mix</small><b>' + pct(t.best.share) + ' debt</b></div><div class="kpi"><small>Advisor report</small><b>' + (rep ? "Approved" : "None") + "</b>" + (rep ? "<span>" + date(rep.reviewed_at) + "</span>" : "") + "</div></div>" +
          (l.status === "applied" ? '<div class="row gap-s"><button class="btn primary sm" data-act="lender" data-id="' + l.id + '" data-d="sanction">Sanction</button><button class="btn ghost sm" data-act="lender" data-id="' + l.id + '" data-d="decline">Decline</button></div>' : l.status === "sanctioned" ? '<button class="btn primary sm" data-act="lender" data-id="' + l.id + '" data-d="disburse">Mark disbursed</button>' : l.status === "disbursed" && !l.transfer ? '<button class="btn ghost sm" data-act="transfer" data-id="' + l.id + '">Ask Glass-Box to find a buyer for this loan</button>' : l.transfer ? "<p>Transfer: " + statusChip(l.transfer.status) + " · step " + (l.transfer.step + 1) + " of 8 (" + TRANSFER_STEPS[Math.min(l.transfer.step, 7)] + ")</p>" : "") + "</section>"; }).join("") : empty("No applications", "Applications sent to you through Glass-Box appear here."));
  }
  function monitorPage() {
    const L = S.data.loans.filter((l) => l.status === "disbursed");
    return head("Monitoring", "Quarterly covenant checks for loans you hold.") + (L.length ? L.map((l) => '<section class="panel"><h2>' + esc(companyById(l.company_id).name) + " · " + cr(l.amount, 1) + "</h2>" + monitorBlock(companyById(l.company_id), true) + "</section>").join("") : empty("No disbursed loans", "Monitoring starts at disbursal."));
  }
  function lenderFeesPage() {
    return head("Fees", "Glass-Box debt fees are paid by the lender.") + '<section class="panel"><form class="calc" data-calc="debt"><div class="fields f3">' + PUB.field("loan", "Loan amount", 10, "Rs cr") + PUB.field("tenor", "Tenor", 7, "years") + PUB.field("rate", "Interest rate", 10.5, "%") + PUB.field("monitoring", "Monitoring fee", 0.35, "% a year") + PUB.field("transfer_amount", "Amount transferred", 6, "Rs cr") + PUB.field("transfer_fee", "Transfer fee", 0.4, "%") + '</div></form><div id="calc-debt">' + PUB.debtCalc({}) + "</div></section>";
  }

  const PAGES = {
    founder: { app: founderHome, "app-twin": twinPage, "app-readiness": readinessPage, "app-cma": cmaPage, "app-termsheet": termSheetPage, "app-investors": investorsPage, "app-dealroom": dealRoomPage, "app-loans": loansPage, "app-fees": feesPage, "app-company": companyPage, "app-activity": activityPage },
    investor: { app: investorHome, "app-deals": dealsPage, "app-rooms": roomsPage, "app-portfolio": portfolioPage, "app-activity": activityPage },
    advisor: { app: advisorHome, "app-review": reviewPage, "app-companies": companiesPage, "app-twin": twinPage, "app-readiness": readinessPage, "app-dealsdesk": dealsDeskPage, "app-transfers": transfersPage, "app-enquiries": enquiriesPage, "app-activity": activityPage },
    lender: { app: lenderHome, "app-lender": lenderPage, "app-monitor": monitorPage, "app-lfees": lenderFeesPage, "app-activity": activityPage },
  };

  // ---------- router ----------
  const PUBLIC = { home: PUB.home, services: PUB.services, "services-equity": PUB.services, "services-debt": PUB.services, pricing: PUB.pricing, investors: PUB.investors, lenders: PUB.lenders, trust: PUB.trust, about: PUB.about, contact: PUB.contact };
  async function refresh() { S.data = await API.state(); }
  async function render(opts) {
    const route = (location.hash || "#home").slice(1) || "home";
    let html;
    if (PUBLIC[route]) html = PUBLIC[route](S.user, opts && opts.msg);
    else if (route === "login") html = S.user ? (location.hash = "#app", "") : login(opts && opts.err);
    else if (route === "signup") html = S.user ? (location.hash = "#app", "") : signup(opts && opts.err);
    else if (route.startsWith("app")) {
      if (!S.user) { location.hash = "#login"; return; }
      if (!S.data || (opts && opts.reload)) { try { await refresh(); } catch (e) { S.user = null; location.hash = "#login"; return; } }
      const page = PAGES[S.user.role][route] || PAGES[S.user.role].app;
      html = shell(route, page());
    } else html = PUB.home(S.user);
    if (html === "") return;
    app().innerHTML = html;
    S.flash = "";
    if (PUBLIC[route] && route.startsWith("services-")) { const el = document.getElementById(route); if (el) el.scrollIntoView(); } else if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
    document.title = "Glass-Box Advisory";
  }
  async function after(res, msg) { S.flash = msg || (res && res.detail) || "Saved."; await render({ reload: true, keepScroll: true }); }
  function fail(e) { const box = document.createElement("div"); box.className = "notice bad toast"; box.setAttribute("role", "alert"); box.textContent = e.message || String(e); document.body.appendChild(box); setTimeout(() => box.remove(), 4500); }

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
    if (rf) $("#ready-out").innerHTML = readyResults(readinessValues(rf));
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('[data-act="twin-company"]')) { S.twinCompany = e.target.value; render({ keepScroll: true }); }
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
        case "decide-intro": return after(await API.act("decide_intro", { intro_id: id, decision: b.dataset.d }));
        case "consent-exit": return after(await API.act("consent_exit", { exit_id: id }));
        case "invite": return after(await API.act("invite_investor", { company_id: S.user.company_id, investor_id: id }));
        case "doc-remove": { const c = myCompany(); const docs = c.docs.slice(); docs.splice(+b.dataset.k, 1); return after(await API.act("save_company", { company_id: c.id, patch: { docs } }), "Document removed."); }
        case "ts-tab": S.tsTab = b.dataset.t; return render({ keepScroll: true });
        case "request-intro": return after(await API.act("request_intro", { company_id: id }), "Introduction requested. The founder decides who gets access.");
        case "sign-nda": if (!$("#nda_" + id).checked) throw new Error("Tick the box to agree to the NDA first."); return after(await API.act("sign_nda", { intro_id: id }), "NDA signed. The deal room is open.");
        case "view-doc": { const res = await API.act("view_doc", { intro_id: id, doc: b.dataset.doc }); return after(res, "Opened \"" + b.dataset.doc + "\". Watermarked with your name; the view is logged for the founder. (File previews are not part of this demo.)"); }
        case "open-twin": S.twinCompany = id; location.hash = "#app-twin"; return;
        case "advance-exit": return after(await API.act("advance_exit", { exit_id: id }));
        case "advance-transfer": return after(await API.act("advance_transfer", { loan_id: id }));
        case "lender": return after(await API.act("lender_decide", { loan_id: id, decision: b.dataset.d }));
        case "transfer": return after(await API.act("request_transfer", { loan_id: id }));
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
        case "apply-loan": return after(await API.act("apply_loan", { company_id: S.user.company_id, lender_id: v.lender_id, amount: num(v.amount), rate: num(v.rate) / 100, tenor: num(v.tenor) }));
        case "company": {
          const patch = { name: String(v.name).trim().slice(0, 120), sector: v.sector, stage: v.stage, city: String(v.city).trim().slice(0, 60), revenue: num(v.revenue), raise: num(v.raise) };
          if (!patch.name || !(patch.revenue > 0) || !(patch.raise > 0)) throw new Error("Enter the company name, revenue and raise.");
          return after(await API.act("save_company", { company_id: S.user.company_id, patch }), "Profile saved.");
        }
        case "review": { const decision = e.submitter && e.submitter.value; return after(await API.act("review_report", { report_id: f.dataset.id, decision, note: v.note })); }
        case "invest": return after(await API.act("record_investment", { intro_id: f.dataset.id, amount: num(v.amount), stake: num(v.stake) / 100, round: "2026" }));
        case "exit": return after(await API.act("request_exit", { holding_id: f.dataset.id, price: num(v.price) || null }));
      }
    } catch (err) {
      if (kind === "login") return render({ err: err.message });
      if (kind === "signup") return render({ err: err.message });
      showErr(err.message);
    }
  });

  window.addEventListener("hashchange", () => render());
  (async () => { try { S.user = await API.me(); } catch (e) { S.user = null; } render(); })();
})(typeof globalThis !== "undefined" ? globalThis : this);
