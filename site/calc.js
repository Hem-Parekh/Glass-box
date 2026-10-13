/* Glass-Box Advisory calculation engine (browser and Node).
   Deterministic: no network, no AI, no randomness except a seeded generator for simulations.
   Money in Rs crore unless a name says otherwise. */
(function (root) {
  "use strict";
  const ENGINE_VERSION = "gb-engine 1.0.0";

  // ---------- small helpers ----------
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(rand) { // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- loans ----------
  /** Equal yearly instalment: P x r / (1 - (1 + r)^-n). */
  function annuity(P, r, n) {
    if (n <= 0) return 0;
    return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  }
  /** Yearly schedule with optional interest-only moratorium. Repays to exactly zero. */
  function loanSchedule(P, r, tenor, moratorium = 0) {
    const rows = [];
    let bal = P;
    const pay = annuity(P, r, tenor);
    for (let t = 1; t <= moratorium + tenor; t++) {
      const interest = bal * r;
      let principal = t > moratorium ? pay - interest : 0;
      if (t === moratorium + tenor) principal = bal; // close rounding drift
      rows.push({ year: t, opening: bal, interest, principal, payment: interest + principal, closing: bal - principal });
      bal -= principal;
    }
    return rows;
  }
  /** Internal rate of return of yearly cash flows cf[0..n] by bisection. */
  function irr(cf) {
    const npv = (r) => cf.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 5;
    if (npv(lo) * npv(hi) > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  // ---------- Funding Twin ----------
  const TWIN_DEFAULTS = {
    raise: 12, pre_money: 60, value_growth: 0.18, horizon: 7, loan_rate: 0.11, tenor: 7, moratorium: 0,
    tax_rate: 0.25, discount_rate: 0.14, ebitda0: 5, ebitda_growth: 0.12, existing_ds: 1.5, dscr_min: 1.25,
    cash: 3, growth_sigma: 0.08, sales_drop: 0.2, rate_shock: 0.02, op_leverage: 1.5,
  };

  /** Cash flow test for a loan L: DSCR each year = CFADS / (existing debt service + loan payment). */
  function dscrPath(q, L, opt = {}) {
    const drop = opt.salesDrop || 0, shock = opt.rateShock || 0, egr = opt.ebitdaGrowth !== undefined ? opt.ebitdaGrowth : q.ebitda_growth;
    const sch = loanSchedule(L, q.loan_rate + shock, q.tenor, q.moratorium);
    const years = Math.max(q.horizon, sch.length);
    const out = [];
    for (let t = 1; t <= years; t++) {
      const row = sch[t - 1] || { interest: 0, principal: 0, payment: 0, closing: 0 };
      const ebitda = q.ebitda0 * Math.pow(1 + egr, t) * (1 - clamp(drop * q.op_leverage, 0, 1));
      const tax = q.tax_rate * Math.max(ebitda - row.interest, 0);
      const cfads = ebitda - tax;
      const ds = q.existing_ds + row.payment;
      out.push({ year: t, ebitda, tax, cfads, interest: row.interest, principal: row.principal, ds, dscr: ds > 0 ? cfads / ds : Infinity, cash_after: cfads - ds, outstanding: row.closing });
    }
    return out;
  }
  const minDscr = (path) => Math.min(...path.map((r) => r.dscr));

  /** Founder value at the horizon for a given loan L and equity E (founder starts at 100%). */
  function founderValue(q, L, E, valueGrowth) {
    const g = valueGrowth !== undefined ? valueGrowth : q.value_growth;
    const Vn = (q.pre_money + q.raise) * Math.pow(1 + g, q.horizon);
    const sch = loanSchedule(L, q.loan_rate, q.tenor, q.moratorium);
    const inHorizon = sch.slice(0, q.horizon);
    const paid = sum(inHorizon.map((r) => r.payment));
    const shield = sum(inHorizon.map((r) => r.interest)) * q.tax_rate;
    const outstanding = inHorizon.length ? inHorizon[inHorizon.length - 1].closing : L;
    const debtCost = paid - shield + outstanding; // cash the company gives up for the loan
    const stake = E > 0 ? E / (q.pre_money + E) : 0;
    return { Vn, debtCost, paid, shield, outstanding, stake, value: (1 - stake) * (Vn - debtCost) };
  }

  function twin(input) {
    const q = Object.assign({}, TWIN_DEFAULTS, input || {});
    const A = q.raise;
    const sch = loanSchedule(A, q.loan_rate, q.tenor, q.moratorium);
    const debt = founderValue(q, A, 0), eq = founderValue(q, 0, A);
    const disc = Math.pow(1 + q.discount_rate, q.horizon);
    const net = (debt.value - eq.value) / disc;
    // break-even company value: (1 - s) V = V - C  =>  V = C / s
    const breakEven = eq.stake > 0 ? debt.debtCost / eq.stake : Infinity;
    const breakEvenGrowth = Math.pow(breakEven / (q.pre_money + A), 1 / q.horizon) - 1;
    const cases = {
      best: q.value_growth + q.growth_sigma, expected: q.value_growth, worst: q.value_growth - q.growth_sigma,
    };
    const range = {};
    for (const k in cases) {
      const d = founderValue(q, A, 0, cases[k]), e = founderValue(q, 0, A, cases[k]);
      range[k] = { growth: cases[k], debt: d.value, equity: e.value, net: (d.value - e.value) / disc };
    }
    // DSCR paths for all-debt
    const expPath = dscrPath(q, A);
    const stressPath = dscrPath(q, A, { salesDrop: q.sales_drop, rateShock: q.rate_shock });
    // Best mix: debt share 0..100% in 5% steps
    const mixes = [];
    for (let i = 0; i <= 20; i++) {
      const share = i / 20, L = A * share, E = A - L;
      const fv = founderValue(q, L, E);
      const exp = minDscr(dscrPath(q, L)), str = minDscr(dscrPath(q, L, { salesDrop: 0.2, rateShock: 0.02 }));
      mixes.push({ share, loan: L, equity: E, value: fv.value, stake: fv.stake, dscr: exp, dscr_stress: str, ok: exp >= q.dscr_min && str >= 1.0 });
    }
    const feasible = mixes.filter((m) => m.ok);
    const best = feasible.length ? feasible.reduce((a, b) => (b.value > a.value ? b : a)) : mixes[0];
    return {
      q, version: ENGINE_VERSION, schedule: sch, payment: annuity(A, q.loan_rate, q.tenor),
      total_repaid: sum(sch.map((r) => r.payment)), total_interest: sum(sch.map((r) => r.interest)),
      debt, equity: eq, net, break_even: breakEven, break_even_growth: breakEvenGrowth, range,
      dscr_expected: expPath, dscr_stress: stressPath, min_dscr: minDscr(expPath), min_dscr_stress: minDscr(stressPath),
      mixes, best,
    };
  }

  /** Seeded simulation: chance that all-debt beats all-equity, and chance of a year with DSCR below 1. */
  function simulate(input, runs = 2000, seed = 20261013) {
    const q = Object.assign({}, TWIN_DEFAULTS, input || {});
    const rand = mulberry32(seed);
    let debtWins = 0, defaults = 0, bestWins = 0;
    const t = twin(q), bestL = t.best.loan;
    const nets = [];
    for (let i = 0; i < runs; i++) {
      const g = q.value_growth + q.growth_sigma * normal(rand);
      const eg = q.ebitda_growth + q.growth_sigma * normal(rand);
      const shock = clamp(0.1 * normal(rand), -0.5, 0.5); // one-off level shock to EBITDA
      const d = founderValue(q, q.raise, 0, g).value, e = founderValue(q, 0, q.raise, g).value;
      nets.push(d - e);
      if (d > e) debtWins++;
      const qq = Object.assign({}, q, { ebitda0: q.ebitda0 * (1 + shock) });
      if (minDscr(dscrPath(qq, q.raise, { ebitdaGrowth: eg })) < 1) defaults++;
      const bm = founderValue(q, bestL, q.raise - bestL, g).value;
      if (bm > e) bestWins++;
    }
    nets.sort((a, b) => a - b);
    const pick = (p) => nets[Math.min(nets.length - 1, Math.floor(p * nets.length))];
    return { runs, seed, p_debt_better: debtWins / runs, p_default: defaults / runs, p_bestmix_better: bestWins / runs,
      p10: pick(0.1), p50: pick(0.5), p90: pick(0.9) };
  }

  // ---------- Funding Readiness Score ----------
  const READINESS_DEFAULTS = {
    dscr: 1.4, collateral_cover: 1.2, gst_on_time: 10, audited_years: 3, credit_score: 760, debt_to_ebitda: 2.4,
    revenue_growth: 0.22, ebitda_positive_years: 3, board_in_place: true, clean_cap_table: true,
    data_room_ready: false, team_complete: true, market_story: true,
  };
  function readiness(input) {
    const a = Object.assign({}, READINESS_DEFAULTS, input || {});
    const debt = [], eq = [];
    const add = (list, name, pts, max, ok, fix) => list.push({ name, pts, max, ok, fix });
    add(debt, "Repayment safety (DSCR " + a.dscr.toFixed(2) + ")", a.dscr >= 1.5 ? 25 : a.dscr >= 1.25 ? 18 : a.dscr >= 1 ? 8 : 0, 25, a.dscr >= 1.25,
      "Lift DSCR above 1.25: cut the loan size, lengthen the tenor or improve operating cash flow.");
    add(debt, "Collateral cover " + a.collateral_cover.toFixed(2) + "x", a.collateral_cover >= 1.5 ? 20 : a.collateral_cover >= 1 ? 12 : 4, 20, a.collateral_cover >= 1.25,
      "Raise collateral cover to 1.25x or more, or apply for a CGTMSE-backed loan.");
    add(debt, "GST returns filed on time (" + a.gst_on_time + " of 12 months)", Math.round(15 * clamp(a.gst_on_time, 0, 12) / 12), 15, a.gst_on_time >= 11,
      "File every GST return on time for the next 6 months; lenders check the last 12.");
    add(debt, "Audited accounts (" + a.audited_years + " years)", a.audited_years >= 3 ? 10 : a.audited_years === 2 ? 6 : 2, 10, a.audited_years >= 3,
      "Complete 3 years of audited accounts before applying.");
    add(debt, "Credit score " + a.credit_score, a.credit_score >= 750 ? 15 : a.credit_score >= 700 ? 10 : 3, 15, a.credit_score >= 750,
      "Clear overdue accounts and keep utilisation of existing limits below 70% to lift the credit score above 750.");
    add(debt, "Debt / EBITDA " + a.debt_to_ebitda.toFixed(1) + "x", a.debt_to_ebitda <= 2 ? 15 : a.debt_to_ebitda <= 3.5 ? 9 : 2, 15, a.debt_to_ebitda <= 3,
      "Bring debt to EBITDA below 3x before adding new term debt.");
    add(eq, "Revenue growth " + Math.round(a.revenue_growth * 100) + "% a year", a.revenue_growth >= 0.25 ? 25 : a.revenue_growth >= 0.15 ? 18 : a.revenue_growth >= 0.08 ? 10 : 3, 25, a.revenue_growth >= 0.15,
      "Show a credible plan for 15%+ growth; investors price equity on growth.");
    add(eq, "EBITDA positive for " + a.ebitda_positive_years + " years", a.ebitda_positive_years >= 2 ? 15 : a.ebitda_positive_years === 1 ? 8 : 0, 15, a.ebitda_positive_years >= 2,
      "Reach two years of positive EBITDA, or present a clear path to it.");
    add(eq, "Board and statutory compliance", a.board_in_place ? 15 : 3, 15, !!a.board_in_place, "Hold regular board meetings and bring ROC filings up to date.");
    add(eq, "Clean cap table", a.clean_cap_table ? 15 : 3, 15, !!a.clean_cap_table, "Settle informal promises of shares and document every shareholder.");
    add(eq, "Data room ready", a.data_room_ready ? 10 : 2, 10, !!a.data_room_ready, "Put audited accounts, GST returns, key contracts and the cap table in the data room.");
    add(eq, "Management team complete", a.team_complete ? 10 : 4, 10, !!a.team_complete, "Name a finance lead who can answer investor diligence.");
    add(eq, "Market and use-of-funds story", a.market_story ? 10 : 3, 10, !!a.market_story, "Write a one-page use-of-funds and market note.");
    const score = (l) => sum(l.map((x) => x.pts));
    const verdict = (s) => (s >= 75 ? "Ready" : s >= 55 ? "Nearly ready" : "Not yet ready");
    return { debt: { items: debt, score: score(debt), verdict: verdict(score(debt)) }, equity: { items: eq, score: score(eq), verdict: verdict(score(eq)) },
      plan: debt.concat(eq).filter((x) => !x.ok).map((x) => x.fix) };
  }

  // ---------- Term Sheet Analyser ----------
  const LOAN_TS_DEFAULTS = { amount: 10, rate: 0.105, tenor: 7, processing_fee: 0.01, other_fees: 0.05, prepayment_penalty: 0.02,
    floating: true, personal_guarantee: true, cross_default: false, collateral_margin: 0.25 };
  function loanTermSheet(input) {
    const a = Object.assign({}, LOAN_TS_DEFAULTS, input || {});
    const pay = annuity(a.amount, a.rate, a.tenor);
    const fees = a.amount * a.processing_fee + a.other_fees;
    const cf = [a.amount - fees].concat(Array(a.tenor).fill(-pay));
    const allIn = irr(cf);
    const flags = [];
    if (a.personal_guarantee) flags.push(["high", "Personal guarantee: the founder's own assets are at risk if the company defaults."]);
    if (a.cross_default) flags.push(["high", "Cross-default: a missed payment on any other loan triggers default on this one."]);
    if (a.prepayment_penalty > 0.02) flags.push(["medium", "Prepayment penalty above 2% makes refinancing expensive."]);
    if (a.floating) flags.push(["medium", "Floating rate: a 1-point rise adds about Rs " + (a.amount * 0.01 * a.tenor / 2).toFixed(2) + " cr over the loan."]);
    if (a.collateral_margin > 0.25) flags.push(["medium", "Collateral margin above 25% ties up more assets than usual."]);
    if (allIn - a.rate > 0.005) flags.push(["low", "Fees add " + ((allIn - a.rate) * 100).toFixed(2) + " points to the headline rate."]);
    return { a, payment: pay, fees, all_in: allIn, total_paid: pay * a.tenor + fees, flags };
  }
  const EQ_TS_DEFAULTS = { pre_money: 60, investment: 12, option_pool: 0.08, pool_pre_money: true, liq_pref: 1, participating: false,
    anti_dilution: "broad", board_seats: 1, vetoes: 4 };
  function equityTermSheet(input) {
    const a = Object.assign({}, EQ_TS_DEFAULTS, input || {});
    const post = a.pre_money + a.investment;
    const inv = a.investment / post;
    const pool = a.option_pool;
    const founder = 1 - inv - pool;
    const effPre = a.pool_pre_money ? a.pre_money - pool * post : a.pre_money;
    const pref = a.liq_pref * a.investment;
    const exits = [0.5, 1, 2, 3, 5].map((m) => {
      const exit = post * m;
      let investor;
      if (a.participating) investor = Math.min(exit, pref) + inv * Math.max(exit - pref, 0);
      else investor = Math.max(Math.min(exit, pref), inv * exit);
      const rest = Math.max(exit - investor, 0);
      const founderGets = rest * founder / (founder + pool);
      return { multiple: m, exit, investor, founder: founderGets, founder_pct: exit > 0 ? founderGets / exit : 0 };
    });
    const flags = [];
    if (a.participating) flags.push(["high", "Participating preference: the investor takes the preference and then shares in the rest (double dip)."]);
    if (a.liq_pref > 1) flags.push(["high", a.liq_pref + "x liquidation preference: the investor gets " + a.liq_pref + " times their money first."]);
    if (a.anti_dilution === "full") flags.push(["high", "Full-ratchet anti-dilution: a lower future price resets the investor's whole stake."]);
    if (a.pool_pre_money && pool > 0) flags.push(["medium", "Option pool carved from the pre-money: the effective pre-money is Rs " + effPre.toFixed(1) + " cr, not Rs " + a.pre_money + " cr."]);
    if (pool > 0.1) flags.push(["medium", "Option pool above 10% dilutes the founder more than most SME deals need."]);
    if (a.board_seats >= 2) flags.push(["medium", a.board_seats + " investor board seats can shift control."]);
    if (a.vetoes > 6) flags.push(["medium", a.vetoes + " veto rights: day-to-day decisions may need investor consent."]);
    return { a, post, investor_pct: inv, pool_pct: pool, founder_pct: founder, effective_pre: effPre, exits, flags };
  }

  // ---------- Post-funding monitoring ----------
  const COVENANTS = { dscr_min: 1.25, debt_ebitda_max: 3.5 };
  function monitor(quarters, cov) {
    const c = Object.assign({}, COVENANTS, cov || {});
    return (quarters || []).map((q) => {
      const ds = q.interest + q.principal;
      const tax = (q.tax_rate || 0.25) * Math.max(q.ebitda - q.interest, 0);
      const dscr = ds > 0 ? (q.ebitda - tax) / ds : Infinity;
      const lev = q.ebitda > 0 ? q.debt / (q.ebitda * 4) : Infinity;
      const h1 = dscr / c.dscr_min - 1, h2 = 1 - lev / c.debt_ebitda_max;
      const state = (h) => (h < 0 ? "breach" : h < 0.1 ? "watch" : "ok");
      const worst = [state(h1), state(h2)].includes("breach") ? "breach" : [state(h1), state(h2)].includes("watch") ? "watch" : "ok";
      return Object.assign({}, q, { dscr, debt_ebitda: lev, dscr_headroom: h1, lev_headroom: h2, state: worst });
    });
  }

  // ---------- Investor Fit Score ----------
  function fitScore(company, inv) {
    const m = inv.mandate || {}, reasons = [];
    let s = 0;
    if ((m.sectors || []).includes(company.sector)) { s += 35; reasons.push("Invests in " + company.sector); }
    else if ((m.past_sectors || []).includes(company.sector)) { s += 15; reasons.push("Has a past deal in " + company.sector); }
    else reasons.push("Sector outside mandate");
    if ((m.stages || []).includes(company.stage)) { s += 20; reasons.push("Backs " + company.stage + " companies"); }
    const r = company.raise;
    if (r >= m.ticket_min && r <= m.ticket_max) { s += 25; reasons.push("Ticket Rs " + m.ticket_min + "-" + m.ticket_max + " cr fits Rs " + r + " cr"); }
    else if (r >= m.ticket_min * 0.75 && r <= m.ticket_max * 1.25) { s += 10; reasons.push("Ticket close to Rs " + r + " cr"); }
    else reasons.push("Ticket Rs " + m.ticket_min + "-" + m.ticket_max + " cr does not fit");
    if ((m.instruments || []).includes(company.instrument || "equity")) { s += 10; reasons.push("Takes " + (company.instrument || "equity")); }
    if ((m.past_sectors || []).includes(company.sector) && (m.sectors || []).includes(company.sector)) { s += 10; reasons.push("Track record in the sector"); }
    return { score: s, reasons };
  }

  // ---------- Fees ----------
  function dealFees(input) {
    const a = Object.assign({ raise: 10, revenue: 50, revenue_growth: 0, advisory_lakh: 1, success_rate: 0.025, rev_share: 0.004, years: 5, gst: 0.18 }, input || {});
    const years = [];
    for (let y = 1; y <= a.years; y++) years.push({ year: y, revenue: a.revenue * Math.pow(1 + a.revenue_growth, y - 1), fee_lakh: a.revenue * Math.pow(1 + a.revenue_growth, y - 1) * a.rev_share * 100 });
    const success = a.raise * a.success_rate * 100;
    const share = sum(years.map((y) => y.fee_lakh));
    const total = a.advisory_lakh + success + share;
    return { a, advisory: a.advisory_lakh, success, share, years, total, gst: total * a.gst };
  }
  function debtFees(input) {
    const a = Object.assign({ loan: 10, tenor: 7, rate: 0.105, monitoring: 0.0035, transfer_amount: 6, transfer_fee: 0.004 }, input || {});
    const sch = loanSchedule(a.loan, a.rate, a.tenor);
    const mon = sch.map((r) => ({ year: r.year, outstanding: r.opening, fee_lakh: r.opening * a.monitoring * 100 }));
    return { a, monitoring: mon, monitoring_total: sum(mon.map((m) => m.fee_lakh)), transfer_lakh: a.transfer_amount * a.transfer_fee * 100 };
  }

  // ---------- Early exit tax view ----------
  function exitTax(input) {
    const a = Object.assign({ cost: 1, sale: 1.4, months: 14, slab: 0.3, fmv: 1.4 }, input || {});
    const gain = a.sale - a.cost, longTerm = a.months >= 24;
    const rate = longTerm ? 0.125 : a.slab;
    const notes = [];
    if (a.months < 6) notes.push("Minimum holding is 6 months; an earlier sale needs the founder's written consent.");
    if (a.sale < a.fmv) notes.push("Sale below fair market value: sections 50CA and 56(2)(x) can tax seller and buyer on the gap of Rs " + (a.fmv - a.sale).toFixed(2) + " cr.");
    return { a, gain, long_term: longTerm, rate, tax: Math.max(gain, 0) * rate, net: a.sale - Math.max(gain, 0) * rate, notes };
  }

  const api = { ENGINE_VERSION, TWIN_DEFAULTS, READINESS_DEFAULTS, LOAN_TS_DEFAULTS, EQ_TS_DEFAULTS, COVENANTS,
    annuity, loanSchedule, irr, twin, simulate, dscrPath, founderValue, readiness, loanTermSheet, equityTermSheet, monitor, fitScore, dealFees, debtFees, exitTax };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GB = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
