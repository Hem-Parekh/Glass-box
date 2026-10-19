/* Investor workspace: portfolio (demat-style), holding detail, sell requests and private offers. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT;
  const { esc, gx, pct, chip, lines, C } = UI;
  const { rs, rsPrice, dmy } = DOM;
  const S = WS.S;
  const my = (s) => DOM.MON[+s.slice(5, 7) - 1] + " '" + s.slice(2, 4);
  const settings = () => S.data.settings || DOM.SETTINGS_DEFAULT;
  const today = () => S.data.today;
  const co = (id) => WS.companyById(id) || { name: id, sector: "" };
  const gainCls = (x) => (x > 0 ? "t-good" : x < 0 ? "t-bad" : "");
  const signed = (p, short) => (p > 0 ? "+" : "") + rs(p, short);
  const signedPct = (x) => (x > 0 ? "+" : "") + pct(x, 2);
  const SELL_STEPS = [["submitted", "Submitted"], ["under_review", "Under review"], ["rofr", "First-refusal window"], ["buyer_introduced", "Buyer introduced"], ["spa_signed", "SPA signed"], ["completed", "Transfer complete"]];
  const OPEN = ["submitted", "under_review", "rofr", "buyer_introduced", "spa_signed"];
  const openSell = (hid) => S.data.sell_requests.find((x) => x.holding_id === hid && OPEN.includes(x.status));

  function views() {
    const st = { companies: S.data.companies, holdings: S.data.holdings, valuations: S.data.valuations };
    return DOM.portfolio(st, S.user.id, today(), settings()).rows.map((v) => Object.assign(v, { h: S.data.holdings.find((h) => h.id === v.id), c: co(v.company_id) }));
  }
  function xirrOf(rows) {
    const flows = rows.map((r) => ({ date: r.h.invested_at || r.h.allotment_date, amount: -r.cost })).concat([{ date: today(), amount: rows.reduce((a, r) => a + r.value, 0) }]).sort((a, b) => (a.date < b.date ? -1 : 1));
    return DOM.xirr(flows);
  }
  function lockBadge(v) {
    if (v.eligible) return chip("ok", v.h.early_consent && today() < v.lock_until ? "Eligible: founder consent" : "Eligible to sell");
    return chip("warn", "Locked until " + dmy(v.lock_until));
  }
  function sellButton(v, cls) {
    const open = openSell(v.id);
    if (open) return '<a class="btn ghost sm ' + (cls || "") + '" href="#app-sells">Request ' + esc(open.status.replace("_", " ")) + "</a>";
    return v.eligible ? '<button class="btn primary sm ' + (cls || "") + '" data-act="inv-sell" data-id="' + v.id + '">Request to sell</button>'
      : '<button class="btn ghost sm ' + (cls || "") + '" disabled title="You can request to sell from ' + dmy(v.lock_until) + '">Request to sell</button>';
  }
  const valueInfo = (v) => ({ title: "Current value of your " + v.c.name + " shares", formula: "Shares held x latest price per share", inputs: [["Shares", DOM.shares(v.shares), "allotment"], ["Price per share", rsPrice(v.price), "registered valuer"], ["Valuation date", dmy(v.valuation_date), "advisor"]] });

  // ---------- portfolio ----------
  function portfolio() {
    const rows = views(), inv = rows.reduce((a, r) => a + r.cost, 0), val = rows.reduce((a, r) => a + r.value, 0), g = val - inv, x = rows.length ? xirrOf(rows) : null;
    const curve = valueCurve(rows);
    return WS.head("Portfolio", esc(S.user.firm || "") + " · shares held directly in your name, valued at the latest registered valuation") +
      '<div class="kpis k5" data-stagger>' +
      '<div class="kpi"><small>Total invested</small><b>' + gx(rs(inv, true), { title: "Total invested", formula: "Sum of the amount paid for every holding", inputs: rows.map((r) => [r.c.name, rs(r.cost), "allotment"]) }) + "</b></div>" +
      '<div class="kpi"><small>Current value</small><b>' + KIT.figure("inv-val", val, (y) => rs(y, true)) + "</b><span>at latest valuations</span></div>" +
      '<div class="kpi"><small>Gain or loss</small><b class="' + gainCls(g) + '">' + KIT.figure("inv-gain", g, (y) => signed(y, true)) + '</b><span class="' + gainCls(g) + '">' + signedPct(inv ? g / inv : 0) + "</span></div>" +
      '<div class="kpi"><small>Companies held</small><b>' + KIT.figure("inv-n", rows.length, (y) => String(Math.round(y))) + "</b></div>" +
      '<div class="kpi"><small>XIRR</small><b class="' + gainCls(x || 0) + '">' + (x == null ? "–" : gx(signedPct(x), { title: "XIRR (annualised return)", formula: "The yearly rate r that makes the present value of every cash flow zero:\nsum of amount / (1 + r)^(days since first investment / 365) = 0\nInvestments are outflows; today's value is the final inflow.", inputs: rows.map((r) => ["Invested in " + r.c.name + " on " + dmy(r.h.invested_at), rs(-r.cost), "allotment"]).concat([["Value today", rs(val), "latest valuations"]]) })) + "</b><span>annualised</span></div></div>" +
      '<section class="panel"><div class="panel-head"><h2>Holdings</h2><span class="muted small">Ownership is shares / fully diluted shares. Click a company for its valuations, documents and tax view.</span></div>' +
      KIT.table("inv-holdings", {
        name: "holdings", rows, pageSize: 20, noSearch: rows.length < 6,
        empty: { title: "No holdings yet", text: "Private offers from your advisor appear under Opportunities.", action: '<a class="btn primary" href="#app-opportunities">See opportunities</a>' },
        columns: [
          { k: "company", label: "Company", val: (r) => r.c.name, html: (r) => '<a href="#app-holding/' + r.id + '"><b>' + esc(r.c.name) + '</b></a><span class="muted small block">' + esc(r.c.sector) + "</span>" },
          { k: "invested_at", label: "Invested", val: (r) => r.h.invested_at, html: (r) => dmy(r.h.invested_at) },
          { k: "allotment", label: "Allotted", val: (r) => r.h.allotment_date, html: (r) => dmy(r.h.allotment_date) },
          { k: "shares", label: "Shares", num: true, val: (r) => r.shares, html: (r) => DOM.shares(r.shares) },
          { k: "own", label: "Ownership", num: true, val: (r) => r.ownership, html: (r) => gx(pct(r.ownership, 2), { title: "Ownership", formula: "Shares held / total fully diluted shares", inputs: [["Shares held", DOM.shares(r.shares), "allotment"], ["Fully diluted shares", DOM.shares(r.c.fd_shares), "cap table"]] }) },
          { k: "cost", label: "Invested", num: true, val: (r) => r.cost, csv: (r) => r.cost / 100, html: (r) => rs(r.cost, true) },
          { k: "avg", label: "Avg cost / share", num: true, val: (r) => r.avg_cost, csv: (r) => r.avg_cost / 100, html: (r) => rsPrice(Math.round(r.avg_cost)) },
          { k: "price", label: "Latest price", num: true, val: (r) => r.price, csv: (r) => r.price / 100, html: (r) => rsPrice(r.price) + '<span class="muted small block">' + dmy(r.valuation_date) + "</span>" },
          { k: "value", label: "Current value", num: true, val: (r) => r.value, csv: (r) => r.value / 100, html: (r) => gx(rs(r.value, true), valueInfo(r)) },
          { k: "gain", label: "Gain / loss", num: true, val: (r) => r.gain, csv: (r) => r.gain / 100, html: (r) => '<span class="' + gainCls(r.gain) + '">' + signed(r.gain, true) + '<span class="small block">' + signedPct(r.gain_pct) + "</span></span>" },
          { k: "status", label: "Status", val: (r) => (r.eligible ? "Eligible" : "Locked " + r.lock_until), html: lockBadge },
          { k: "act", label: "Action", sort: false, export: false, html: (r) => sellButton(r) },
        ],
      }) + "</section>" +
      (curve.labels.length > 1 ? '<section class="panel"><h2>Portfolio value at each valuation</h2>' + lines(curve.labels, [{ name: "Value", color: C.mix, values: curve.values, endLabel: false }, { name: "Invested", color: C.equity, values: curve.cost, dash: true, endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 1) + " Cr", label: "Portfolio value by valuation date", height: 220 }) + "</section>" : "");
  }
  function valueCurve(rows) {
    const dates = [...new Set(S.data.valuations.filter((v) => rows.some((r) => r.company_id === v.company_id)).map((v) => v.date))].sort();
    const at = (d) => rows.filter((r) => r.h.allotment_date <= d).reduce((a, r) => { const v = DOM.latestValuation(S.data, r.company_id, d); return a + (v ? r.shares * v.price_per_share_paise : r.cost); }, 0);
    const cost = (d) => rows.filter((r) => r.h.allotment_date <= d).reduce((a, r) => a + r.cost, 0);
    return { labels: dates.map((d) => my(d)), values: dates.map((d) => at(d) / 1e9), cost: dates.map((d) => cost(d) / 1e9) };
  }

  // ---------- holding detail ----------
  const DOCS = ["Share Subscription Agreement (SSA)", "Shareholders' Agreement (SHA)", "Allotment letter", "PAS-4 private placement offer letter"];
  function holding(id) {
    const v = views().find((x) => x.id === id);
    if (!v) return WS.head("Holding not found", '<a href="#app">Back to the portfolio</a>');
    const c = v.c, vals = S.data.valuations.filter((x) => x.company_id === c.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const own = vals.filter((x) => x.date >= v.h.allotment_date || x === vals[0]);
    const tax = DOM.capitalGainsEstimate(v.h, v, today()), open = openSell(v.id);
    const files = S.data.files || [];
    return WS.head(c.name, esc(c.sector) + " · " + esc(c.city || "") + ' · <a href="#app">Back to the portfolio</a>', sellButton(v)) +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Shares</small><b>' + DOM.shares(v.shares) + "</b><span>" + pct(v.ownership, 2) + ' of the company</span></div><div class="kpi"><small>Current value</small><b>' + gx(rs(v.value, true), valueInfo(v)) + "</b><span>" + rsPrice(v.price) + " a share</span></div>" +
      '<div class="kpi"><small>Gain or loss</small><b class="' + gainCls(v.gain) + '">' + signed(v.gain, true) + '</b><span class="' + gainCls(v.gain) + '">' + signedPct(v.gain_pct) + '</span></div><div class="kpi"><small>Holding status</small><b>' + lockBadge(v) + "</b><span>Allotted " + dmy(v.h.allotment_date) + "</span></div></div>" +
      (open ? '<section class="panel"><h2>Your sell request</h2>' + sellTimeline(open) + "</section>" : "") +
      '<div class="grid2"><section class="panel"><h2>Valuation history</h2>' + lines(vals.map((x) => my(x.date)), [{ name: "Price per share", color: C.mix, values: vals.map((x) => x.price_per_share_paise / 100), endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 0), label: "Price per share at each quarterly valuation", height: 200 }) + "</section>" +
      '<section class="panel"><h2>Your value over time</h2>' + lines(own.map((x) => my(x.date)), [{ name: "Your value", color: C.mix, values: own.map((x) => v.shares * x.price_per_share_paise / 1e7), endLabel: false }, { name: "Invested", color: C.equity, values: own.map(() => v.cost / 1e7), dash: true, endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 1) + " L", label: "Value of your shares", height: 200 }) + "</section></div>" +
      '<section class="panel"><h2>Valuations</h2><div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Method</th><th>Registered valuer</th><th class="num">Price per share</th><th>Report</th></tr></thead><tbody>' +
      vals.slice().reverse().map((x) => { const f = x.report_file && files.find((y) => y.id === x.report_file); return "<tr><td>" + dmy(x.date) + "</td><td>" + esc(x.method) + "</td><td>" + esc(x.valuer) + '</td><td class="num">' + rsPrice(x.price_per_share_paise) + "</td><td>" + (f ? '<button class="linkbtn" data-act="file" data-id="' + f.id + '">Download</button>' : '<span class="muted small">Held by Aegis Ascend</span>') + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      '<div class="grid2"><section class="panel"><h2>Tax view if sold today <span class="chip warn">Estimate</span></h2>' +
      '<p>Held <b>' + Math.floor(tax.months) + " months</b> since allotment: " + (tax.long_term ? "<b>long-term</b> capital gain (24 months or more)." : "<b>short-term</b> capital gain (under 24 months).") + "</p>" +
      '<p>Gain at today\'s valuation: <b class="' + gainCls(tax.gain) + '">' + signed(tax.gain) + "</b>.</p>" +
      (tax.long_term ? "<p>Estimated tax at 12.5%: <b>" + gx(rs(tax.tax), { title: "Estimated long-term capital gains tax", formula: "max(gain, 0) x 12.5%", inputs: [["Gain", rs(tax.gain), "valuation"], ["Rate", "12.5%", "Income-tax Act, unlisted shares"]], note: "Before any indexation, exemptions or surcharge. Confirm with your tax adviser." }) + "</b>.</p>" : "<p>Short-term gains on unlisted shares are added to your income and taxed at your slab rate.</p>") +
      '<p class="small muted">An estimate for planning only, using the latest valuation as the sale price. It is not tax advice.</p></section>' +
      '<section class="panel"><h2>Documents</h2><ul class="docs">' + DOCS.map((d) => "<li><span>" + esc(d) + '</span><button class="btn ghost sm" data-act="inv-doc" data-id="' + v.id + '" data-doc="' + esc(d) + '">Download</button></li>').join("") + "</ul>" +
      '<p class="small muted">Signed originals are held by Aegis Ascend; the download is a summary of the key terms.</p></section></div>' +
      '<section class="panel"><h2>Company updates</h2>' + ((c.updates || []).length ? '<ul class="updates">' + c.updates.map((u) => "<li><span class=\"muted small\">" + dmy(u.date) + "</span><p>" + esc(u.text) + "</p></li>").join("") + "</ul>" : '<p class="muted">No updates yet.</p>') + "</section>";
  }

  // ---------- sell requests ----------
  function sellTimeline(x) {
    const at = {}; (x.history || []).forEach((h) => (at[h.status] = h.at));
    const stop = x.status === "withdrawn" ? { label: "Withdrawn" } : x.status === "rejected" ? { label: "Rejected", reason: x.reason } : null;
    const cur = stop ? (x.history.slice().reverse().find((h) => !["withdrawn", "rejected"].includes(h.status)) || { status: "submitted" }).status : x.status;
    return KIT.timeline(SELL_STEPS, cur, at, stop) +
      '<p class="small muted">' + (x.full ? "Full stake" : "Part sale") + ": " + DOM.shares(x.shares) + " shares" + (x.indicative_price_paise ? " · your indicative price " + rsPrice(x.indicative_price_paise) + " (seen only by the advisor)" : "") +
      (x.status === "rofr" ? " · first-refusal window until " + dmy(x.rofr_until) : "") + (x.price_paise ? " · agreed price " + rsPrice(x.price_paise) : "") + "</p>" +
      (["submitted", "under_review", "rofr"].includes(x.status) ? '<button class="btn ghost sm" data-act="inv-withdraw" data-id="' + x.id + '">Withdraw request</button>' : "");
  }
  function sells() {
    const L = S.data.sell_requests.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Sell requests", "Resales are private: your advisor introduces buyers one to one. Nothing is listed or shown to other investors.") +
      (L.length ? L.map((x) => '<section class="panel"><div class="panel-head"><h2>' + esc(co(x.company_id).name) + "</h2>" + chip(x.status === "completed" ? "ok" : x.status === "rejected" || x.status === "withdrawn" ? "bad" : "warn", x.status.replace("_", " ")) + "</div>" + sellTimeline(x) + "</section>").join("")
        : '<section class="panel">' + KIT.empty("No sell requests", "Holdings become eligible 6 months after allotment. Request a sale from the portfolio.", '<a class="btn primary" href="#app">Go to the portfolio</a>') + "</section>");
  }

  // ---------- opportunities ----------
  function opportunities() {
    const O = S.data.offers.filter((o) => o.response !== "invested").sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    return WS.head("Opportunities", "Private offers your advisor has shared with you alone.") +
      '<div class="notice private" role="note"><b>Private offer.</b> Each offer is made to you personally under a private placement. Do not forward it or share its documents.</div>' +
      (O.length ? '<div class="offer-list" data-stagger>' + O.map(offerCard).join("") + "</div>" : '<section class="panel">' + KIT.empty("No offers right now", "When your advisor shares a company that fits your mandate, it appears here.") + "</section>");
  }
  function offerCard(o) {
    const c = co(o.company_id), r = c.report, s = (r && r.summary) || {};
    return '<article class="panel offer"><div class="panel-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.sector) + " · " + esc(c.city || "") + " · " + esc(o.security_type) + " · offered " + dmy(o.sent_at.slice(0, 10)) + "</p></div>" +
      chip(o.response === "interested" ? "ok" : o.response === "declined" ? "bad" : "warn", o.response === "pending" ? "Awaiting your reply" : o.response === "interested" ? "Interest expressed" : "Declined") + "</div>" +
      '<div class="kpis k4"><div class="kpi"><small>Raising</small><b>' + rs(c.raise_paise, true) + '</b></div><div class="kpi"><small>Offer price</small><b>' + (c.offer_price_paise ? rsPrice(c.offer_price_paise) : "–") + "</b><span>a share</span></div>" +
      '<div class="kpi"><small>Engine best mix</small><b>' + pct(s.best_share) + ' debt</b></div><div class="kpi"><small>Lowest DSCR</small><b>' + UI.xx(s.min_dscr) + "</b><span>stress " + UI.xx(s.min_dscr_stress) + "</span></div></div>" +
      (r ? '<p><span class="stamp">Reviewed by ' + esc(WS.userName(r.reviewed_by)) + " · " + UI.date(r.reviewed_at) + "</span> " + (r.review_note ? '<span class="muted">"' + esc(r.review_note) + '"</span>' : "") + "</p>" : "") +
      '<div class="row gap-s wrap"><button class="btn ghost sm" data-act="inv-report" data-id="' + o.id + '">Read the advisor-reviewed report</button>' +
      (o.response === "pending" || o.response === "declined" ? '<button class="btn primary sm" data-act="inv-interest" data-id="' + o.id + '">Express interest</button>' : "") +
      (o.response === "pending" || o.response === "interested" ? '<button class="btn ghost sm" data-act="inv-decline" data-id="' + o.id + '">Decline</button>' : "") + "</div></article>";
  }

  // ---------- actions ----------
  Object.assign(WS.clicks, {
    "inv-sell": async (b, id) => {
      const v = views().find((x) => x.id === id);
      const vals = await KIT.dialog({ title: "Request to sell: " + v.c.name, confirm: "Send request",
        text: "<p>You hold <b>" + DOM.shares(v.shares) + "</b> shares. Selling the full stake is simplest: a part sale to a new buyer adds a shareholder, which the company's 200-member limit may not allow.</p><p class=\"small muted\">Your advisor runs the first-refusal window and introduces buyers one to one. Nothing is listed publicly.</p>",
        fields: [{ name: "kind", label: "What to sell", type: "select", value: "full", options: [["full", "Full stake (" + DOM.shares(v.shares) + " shares)"], ["part", "Part of my shares"]] },
          { name: "shares", label: "Shares to sell (part sale only)", type: "number", min: 1, max: v.shares, step: 1 },
          { name: "price", label: "Indicative price per share (optional, seen only by your advisor)", type: "number", min: 0, step: "0.01", unit: "Rs" },
          { name: "note", label: "Note for your advisor (optional)", type: "textarea" }],
        validate: (x) => (x.kind === "part" && !(+x.shares > 0 && +x.shares < v.shares) ? "Enter between 1 and " + (v.shares - 1) + " shares for a part sale" : x.price && !(+x.price > 0) ? "The indicative price must be positive" : null) });
      if (!vals) return;
      if (!(await KIT.confirm("Confirm your sell request", "<p>" + (vals.kind === "full" ? "Full stake: " + DOM.shares(v.shares) : DOM.shares(+vals.shares)) + " shares of " + esc(v.c.name) + (vals.price ? " at an indicative " + rsPrice(Math.round(+vals.price * 100)) + " a share" : "") + ".</p>", "Confirm and send"))) return;
      return WS.after(await WS.API.act("request_sell", { holding_id: id, shares: vals.kind === "full" ? null : +vals.shares, indicative_price_paise: vals.price ? Math.round(+vals.price * 100) : null, note: vals.note }), "Sell request sent. Track it under Sell requests.");
    },
    "inv-withdraw": async (b, id) => { if (await KIT.confirm("Withdraw this sell request?", "<p>Your advisor will stop looking for a buyer.</p>", "Withdraw", true)) return WS.after(await WS.API.act("withdraw_sell", { request_id: id })); },
    "inv-interest": async (b, id) => {
      const c = co(S.data.offers.find((o) => o.id === id).company_id);
      const v = await KIT.dialog({ title: "Express interest in " + c.name, confirm: "Express interest", text: "<p>Your advisor will contact you about ticket size and documents. Nothing is binding until you sign the SSA and SHA.</p>",
        fields: [{ name: "share", label: "Share my name with the founder", type: "checkbox", value: true, hint: "Founders see interested investors' names only with consent." }] });
      if (v) return WS.after(await WS.API.act("respond_offer", { offer_id: id, response: "interested", share_identity: v.share }), "Interest sent to your advisor.");
    },
    "inv-decline": async (b, id) => { if (await KIT.confirm("Decline this offer?", "<p>Your advisor will be told. You can change your mind while the offer is open.</p>", "Decline offer", true)) return WS.after(await WS.API.act("respond_offer", { offer_id: id, response: "declined" })); },
    "inv-report": async (b, id) => {
      const o = S.data.offers.find((x) => x.id === id), c = co(o.company_id), r = c.report || {}, s = r.summary || {};
      await WS.API.act("view_doc", { offer_id: id, doc: "Advisor-reviewed report" });
      await KIT.dialog({ title: r.title || "Advisor-reviewed report", confirm: "Close", cancel: "Back",
        text: "<p class=\"small muted\">Watermarked: " + esc(S.user.name) + " · " + dmy(today()) + ". Private, do not forward.</p><ul class=\"ticks\"><li>Best mix: " + pct(s.best_share) + " debt, " + pct(1 - s.best_share) + " equity</li><li>Founder better off than all-equity by " + UI.cr(s.net) + " (today's money)</li><li>Debt wins above a company value of " + UI.cr(s.break_even, 0) + "</li><li>Lowest DSCR " + UI.xx(s.min_dscr) + ", stress case " + UI.xx(s.min_dscr_stress) + "</li></ul>" +
          (r.review_note ? "<p>Advisor's note: \"" + esc(r.review_note) + "\"</p>" : "") + "<p class=\"small muted\">Every number comes from the calculation engine and was checked by the advisor before sign-off.</p>" });
      return WS.render({ reload: true, keepScroll: true });
    },
    "inv-doc": (b, id) => {
      const v = views().find((x) => x.id === id), d = b.dataset.doc;
      const text = d + "\n\nSummary prepared by Aegis Ascend Financial Advisors (demo data, fictional)\n\nInvestor: " + S.user.name + (S.user.firm ? " (" + S.user.firm + ")" : "") + "\nCompany: " + v.c.name +
        "\nShares: " + DOM.shares(v.shares) + "\nAmount paid: " + rs(v.cost) + "\nAllotment date: " + dmy(v.h.allotment_date) + "\nMinimum holding: 6 months, until " + dmy(v.lock_until) + "\n\nThe signed original is held by Aegis Ascend.";
      KIT.save(d.replace(/[^\w]+/g, "-").toLowerCase() + "-" + v.c.name.split(" ")[0].toLowerCase() + ".txt", new Blob([text], { type: "text/plain" }));
    },
  });

  Object.assign(WS.PAGES.investor, { app: portfolio, "app-holding": holding, "app-sells": sells, "app-opportunities": opportunities });
})(typeof globalThis !== "undefined" ? globalThis : this);
