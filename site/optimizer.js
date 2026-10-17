/* Equity vs Debt Optimizer: browser port of optimizer/equity_debt (model.py, analysis.py, advice.py).
   Same formulas and same numbers as the Python package; tests compare the two.
   Money in rupees; rates as fractions. No network, no AI. */
(function (root) {
  "use strict";
  const MIX = Array.from({ length: 101 }, (_, i) => i / 100);
  const DSCR_RISKY = 1.25, DSCR_DEFAULT = 1.0;
  const METRICS = {
    npv_wealth: "Present value of founder wealth (cash + exit stake)",
    total_cash: "Total founder cash over the horizon",
    wealth: "Exit-inclusive wealth (cash + exit stake, not discounted)",
    npv_cash: "Present value of founder cash only",
  };
  const DEFAULTS = {
    amount: 3e7, pre_money: 6e7, profit_month: 12e5, growth_y1: 0.30, growth_y2: 0.15, interest_rate: 0.15,
    tenure_years: 5, horizon_years: 10, tax_rate: 0, exit_multiple: 5, discount_rate: 0.12, debt_fee: 0, equity_cost: 0,
    payout_ratio: 1, growth_boost_equity: 0, growth_boost_debt: 0, min_dscr_required: 1.0, metric: "npv_wealth",
  };

  // ---------- Indian formatting ----------
  function groupIndian(n) {
    const s = String(Math.abs(Math.round(n)));
    if (s.length <= 3) return s;
    let head = s.slice(0, -3); const tail = s.slice(-3); const parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    return parts.join(",") + "," + tail;
  }
  function inr(x, short, d = 2, sym = "Rs ") {
    if (x === null || x === undefined || Number.isNaN(x)) return "-";
    if (!Number.isFinite(x)) return "n/a";
    const sign = x < 0 ? "-" : "", a = Math.abs(x);
    const f = (v) => v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
    if (short) { if (a >= 1e7) return sign + sym + f(a / 1e7) + " Cr"; if (a >= 1e5) return sign + sym + f(a / 1e5) + " L"; }
    return sign + sym + groupIndian(a);
  }
  const mixLabel = (e) => { const p = Math.round(e * 100); return p + "% equity / " + (100 - p) + "% debt"; };
  const ratio = (x) => (Number.isFinite(x) ? x.toFixed(2) + "x" : "no loan");
  const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";

  // ---------- validation ----------
  function validate(p) {
    const errors = [], warnings = [];
    if (!(p.amount > 0)) errors.push("The amount to raise must be more than zero.");
    if (!(p.pre_money > 0)) errors.push("The pre-money valuation must be more than zero.");
    if (p.profit_month < 0) errors.push("Profit per month cannot be negative. If the company makes a loss, this model does not apply.");
    for (const [n, v] of [["Year-1 growth", p.growth_y1], ["Year-2+ growth", p.growth_y2]]) {
      if (!(v > -1)) errors.push(n + " must be above -100%."); else if (v > 2) warnings.push(n + " of " + pct(v, 0) + " a year is very high. Check it is not a typo.");
    }
    if (!(p.interest_rate >= 0 && p.interest_rate <= 1)) errors.push("The interest rate must be between 0% and 100%.");
    if (!(p.tenure_years >= 1 && p.tenure_years <= 30)) errors.push("The loan tenure must be between 1 and 30 years.");
    if (!(p.horizon_years >= 1 && p.horizon_years <= 20)) errors.push("The analysis horizon must be between 1 and 20 years.");
    if (!(p.tax_rate >= 0 && p.tax_rate < 1)) errors.push("The tax rate must be between 0% and 100%.");
    if (p.exit_multiple < 0) errors.push("The exit multiple cannot be negative.");
    if (!(p.discount_rate > -0.5 && p.discount_rate <= 1)) errors.push("The discount rate must be between -50% and 100%.");
    if (!(p.debt_fee >= 0 && p.debt_fee < 1) || !(p.equity_cost >= 0 && p.equity_cost < 1)) errors.push("Fees must be between 0% and 100%.");
    if (!(p.payout_ratio >= 0 && p.payout_ratio <= 1)) errors.push("The payout ratio must be between 0% and 100%.");
    if (!(p.min_dscr_required >= 1 && p.min_dscr_required <= 3)) errors.push("The minimum DSCR you accept must be between 1.00 and 3.00.");
    if (!METRICS[p.metric]) errors.push("Unknown ranking metric.");
    if (errors.length) return { errors, warnings };
    if (p.amount > p.pre_money) warnings.push("You are raising more than the company is worth today. All-equity would hand investors over half the company.");
    if (p.tenure_years > p.horizon_years) warnings.push("The loan runs past the analysis horizon. The unpaid balance is deducted from the exit value.");
    if (p.interest_rate > 0.24) warnings.push("Interest above 24% a year is unusually expensive for a business loan.");
    return { errors, warnings };
  }

  // ---------- building blocks ----------
  /** Post-money ownership: equity / (pre-money + equity). */
  const investorOwnership = (eq, pre) => (eq > 0 ? eq / (pre + eq) : 0);
  /** EMI = P x r x (1+r)^n / ((1+r)^n - 1), r = annual / 12, n = months; P / n at 0%. */
  function emi(P, annual, years) {
    const n = Math.round(years * 12), r = annual / 12;
    if (n <= 0) throw new Error("tenure must be at least one month");
    if (r === 0) return P / n;
    const g = Math.pow(1 + r, n);
    return (P * r * g) / (g - 1);
  }
  function amortization(P, annual, years) {
    const n = years * 12, r = annual / 12, pay = emi(P, annual, years), rows = [];
    let bal = P;
    for (let m = 1; m <= n; m++) {
      const i = bal * r, p = m < n ? pay - i : bal;
      rows.push({ month: m, opening: bal, emi: i + p, interest: i, principal: p, closing: bal - p });
      bal -= p;
    }
    return rows;
  }
  /** Yearly interest / principal / EMI / closing balance for one loan over the horizon. */
  function yearlyDebt(D, annual, tenure, H) {
    const nm = tenure * 12, r = annual / 12, pay = emi(D, annual, tenure);
    const interest = new Array(H).fill(0), principal = new Array(H).fill(0), closing = new Array(H).fill(0);
    let bal = D;
    for (let m = 1; m <= H * 12; m++) {
      const y = Math.floor((m - 1) / 12);
      if (m <= nm) { const i = bal * r, p = m === nm ? bal : pay - i; interest[y] += i; principal[y] += p; bal -= p; }
      if (m % 12 === 0) closing[y] = bal;
    }
    return { emiMonth: pay, interest, principal, emi: interest.map((v, k) => v + principal[k]), closing };
  }

  // ---------- projection for one mix ----------
  function projectMix(p, e) {
    const H = p.horizon_years, E = p.amount * e, D = p.amount - E;
    const inv = investorOwnership(E, p.pre_money), fdr = 1 - inv;
    const boost = e * p.growth_boost_equity + (1 - e) * p.growth_boost_debt;
    const g1 = p.growth_y1 + boost, g2 = p.growth_y2 + boost;
    const ds = yearlyDebt(D, p.interest_rate, p.tenure_years, H);
    const disc = (y) => Math.pow(1 + p.discount_rate, -y);
    const yrs = [];
    let cum = 0, retCum = 0, npvCash = 0;
    for (let k = 0; k < H; k++) {
      const profit = 12 * p.profit_month * (1 + g1) * Math.pow(1 + g2, k);
      const interest = ds.interest[k], principal = ds.principal[k], emiY = ds.emi[k];
      const tax = p.tax_rate * Math.max(profit - interest, 0);
      const shield = p.tax_rate * profit - tax;
      const fees = k === 0 ? p.debt_fee * D + p.equity_cost * E : 0;
      const after = profit - emiY - tax - fees;
      const pos = Math.max(after, 0), shortfall = Math.min(after, 0);
      const dist = p.payout_ratio * pos, retained = pos - dist;
      const investor = inv * dist, founder = fdr * dist + shortfall;
      cum += founder; retCum += retained; npvCash += founder * disc(k + 1);
      const value = p.exit_multiple * profit - ds.closing[k] + retCum;
      yrs.push({ year: k + 1, profit, interest, principal, emi: emiY, tax, shield, fees, after, dist, retained, investor, founder, shortfall,
        cum, outstanding: ds.closing[k], value, wealthToDate: cum + fdr * Math.max(value, 0), dscr: emiY > 0 ? profit / emiY : Infinity });
    }
    const last = yrs[H - 1];
    const exitStake = fdr * Math.max(last.value, 0);
    const minDscr = Math.min(...yrs.map((y) => y.dscr));
    return { e, equity: E, debt: D, inv, fdr, emiMonth: ds.emiMonth, years: yrs, total_cash: cum, npv_cash: npvCash, exit_stake: exitStake,
      wealth: cum + exitStake, npv_wealth: npvCash + exitStake * disc(H), min_dscr: minDscr,
      years_below_risky: yrs.filter((y) => y.dscr < DSCR_RISKY).length, years_below_one: yrs.filter((y) => y.dscr < DSCR_DEFAULT).length };
  }

  function firstLastingLead(a, b) {
    const ahead = a.map((v, i) => v >= b[i] - 1e-6);
    if (!ahead[ahead.length - 1]) return null;
    let y = ahead.length;
    while (y > 0 && ahead[y - 1]) y--;
    return y + 1;
  }

  /** Test every equity share 0..100% and pick the founder's best allowed mix. */
  function optimize(input) {
    const p = Object.assign({}, DEFAULTS, input || {});
    const { errors } = validate(p);
    if (errors.length) throw new Error(errors[0]);
    const mixes = MIX.map((e) => projectMix(p, e));
    const req = Math.max(DSCR_DEFAULT, p.min_dscr_required) - 1e-12;
    const feasible = mixes.map((m) => m.min_dscr >= req);
    const risky = mixes.map((m, i) => feasible[i] && m.min_dscr < DSCR_RISKY);
    let best = 0, bestScore = -Infinity;
    mixes.forEach((m, i) => { if (feasible[i] && m[p.metric] > bestScore) { bestScore = m[p.metric]; best = i; } });
    const eq = mixes[100], dt = mixes[0];
    return {
      p, mixes, best, feasible, risky, metric: (i) => mixes[i][p.metric],
      breakevenCash: firstLastingLead(dt.years.map((y) => y.cum), eq.years.map((y) => y.cum)),
      breakevenWealth: firstLastingLead(dt.years.map((y) => y.wealthToDate), eq.years.map((y) => y.wealthToDate)),
    };
  }

  // ---------- analyses ----------
  const HORIZONS = [3, 5, 7, 10, 15, 20];
  function horizonTable(p) {
    return HORIZONS.map((h) => {
      const r = optimize(Object.assign({}, p, { horizon_years: h })), m = r.metric;
      return { horizon: h, best_equity: MIX[r.best], best_score: m(r.best), all_equity: m(100), all_debt: r.feasible[0] ? m(0) : null,
        gap_vs_equity: m(r.best) - m(100), gap_debt_vs_equity: m(0) - m(100), breakeven: r.breakevenCash };
    });
  }
  function horizonExplanation(rows) {
    const a = rows[0], b = rows[rows.length - 1];
    let s = "Over " + a.horizon + " years the best mix is " + mixLabel(a.best_equity) + "; over " + b.horizon + " years it is " + mixLabel(b.best_equity) + ". ";
    s += a.gap_debt_vs_equity < b.gap_debt_vs_equity
      ? "The longer the horizon, the more debt is worth to the founder. A loan costs a fixed amount and stops when the tenure ends, but shares sold to investors keep taking their slice of every year's profit and of the exit value."
      : "Over this range a longer horizon does not favour debt more, usually because the loan runs past the horizon or growth is low.";
    return s;
  }
  const SENS = [
    ["Profit growth", "-10 pts", (p) => ({ growth_y1: p.growth_y1 - 0.1, growth_y2: p.growth_y2 - 0.1 })],
    ["Profit growth", "-5 pts", (p) => ({ growth_y1: p.growth_y1 - 0.05, growth_y2: p.growth_y2 - 0.05 })],
    ["Profit growth", "+5 pts", (p) => ({ growth_y1: p.growth_y1 + 0.05, growth_y2: p.growth_y2 + 0.05 })],
    ["Profit growth", "+10 pts", (p) => ({ growth_y1: p.growth_y1 + 0.1, growth_y2: p.growth_y2 + 0.1 })],
    ["Interest rate", "-2 pts", (p) => ({ interest_rate: Math.max(p.interest_rate - 0.02, 0) })],
    ["Interest rate", "+2 pts", (p) => ({ interest_rate: p.interest_rate + 0.02 })],
    ["Valuation", "-20%", (p) => ({ pre_money: p.pre_money * 0.8 })],
    ["Valuation", "+20%", (p) => ({ pre_money: p.pre_money * 1.2 })],
    ["Loan tenure", "-2 yrs", (p) => ({ tenure_years: Math.max(p.tenure_years - 2, 1) })],
    ["Loan tenure", "+2 yrs", (p) => ({ tenure_years: p.tenure_years + 2 })],
  ];
  function sensitivity(p) {
    const base = optimize(p), bs = base.metric(base.best);
    const rows = [];
    for (const [v, c, fn] of SENS) {
      const q = Object.assign({}, p, fn(p));
      if (q.growth_y1 <= -1 || q.growth_y2 <= -1) continue;
      const r = optimize(q), s = r.metric(r.best);
      rows.push({ variable: v, case: c, best_equity: MIX[r.best], best_score: s, change: s - bs, moved: Math.round((MIX[r.best] - MIX[base.best]) * 100) });
    }
    return { base_equity: MIX[base.best], base_score: bs, rows };
  }
  const downside = (p) => optimize(Object.assign({}, p, { growth_y1: p.growth_y1 / 2, growth_y2: p.growth_y2 / 2 }));

  /** Plain-English suggestions from the numbers (mirror of advice.py). */
  function suggestions(r, down, hrows, short = true) {
    const p = r.p, b = r.best, M = r.mixes, mb = M[b], m = r.metric, f = (x) => inr(x, short);
    const out = [];
    const why = ["Best mix: **" + mixLabel(mb.e) + "**, ranked by " + METRICS[p.metric].toLowerCase() + "."];
    if (b === 0) why.push("All debt wins because the loan costs " + pct(p.interest_rate) + " a year for " + p.tenure_years + " years and then stops, while selling equity would hand investors " + pct(M[100].inv) + " of every year's profit and of the exit value, forever.");
    else if (b === 100) why.push("All equity wins: with these numbers the EMI eats too much of the profit, or the loan breaks your minimum repayment cover, so giving away shares costs the founder less than servicing the debt.");
    else why.push("This is the most debt your profit can safely carry (lowest DSCR " + ratio(mb.min_dscr) + " against your minimum of " + Math.max(1, p.min_dscr_required).toFixed(2) + "x). More debt would be cheaper still, but would leave a year where profit does not cover the EMI with enough room.");
    why.push("Against 100% equity the founder is better off by **" + f(m(b) - m(100)) + "**" + (r.feasible[0] && b !== 0 ? "; against 100% debt by **" + f(m(b) - m(0)) + "**." : "."));
    why.push("Why the answer is usually at one end: each extra rupee of equity dilutes you a little less than the one before (ownership = equity / (valuation + equity)), so mixing rarely beats the better pure option. A mix wins when the loan has to be capped by cash flow, or when the two routes change growth differently.");
    if (p.tax_rate) why.push("Interest is tax-deductible: at " + pct(p.tax_rate) + " tax the loan saves " + f(mb.years.reduce((a, y) => a + y.shield, 0)) + " of tax over the horizon.");
    if (r.breakevenCash) why.push("Pure equity gives more cash in the early years; 100% debt overtakes it in cumulative founder cash from year " + r.breakevenCash + ".");
    out.push(["Why this mix wins", why]);
    const risks = [], db = down.mixes[b];
    if (mb.debt > 0) {
      risks.push(mb.min_dscr < DSCR_RISKY ? "Repayment cover is thin: in the weakest year profit is only " + ratio(mb.min_dscr) + " the EMI. Lenders usually want 1.25x or more." : "Repayment cover is healthy: profit is at least " + ratio(mb.min_dscr) + " the EMI in every year of the loan.");
      risks.push(db.min_dscr < 1 ? "**Growth miss:** if profit grows at half the rate you expect, this mix cannot pay its EMI in some years (DSCR " + ratio(db.min_dscr) + "). You would have to put in " + f(-db.years.reduce((a, y) => a + y.shortfall, 0)) + " of your own money." : "**Growth miss:** at half the expected growth, cover drops to " + ratio(db.min_dscr) + " but the EMI is still paid.");
      risks.push("**Interest-rate risk:** if the loan is on a floating rate, a 2-point rise adds about " + f(mb.debt * 0.02 * p.tenure_years / 2) + " of interest over the loan.");
      risks.push("A term loan usually needs collateral and often a personal guarantee from the founder.");
    }
    if (mb.equity > 0) {
      risks.push("**Dilution:** investors would own " + pct(mb.inv) + " for good; you keep " + pct(mb.fdr) + ".");
      risks.push("**Investor rights:** read the term sheet for board seats, veto rights, liquidation preference and anti-dilution clauses.");
    }
    out.push(["Risks", risks]);
    const fund = ["Debt is cheaper when profit is stable and growth is predictable: the cost is fixed and ends with the tenure.",
      "Equity is safer for uncertain or early businesses: there is no EMI to pay in a bad year.",
      "Keep DSCR above 1.25 in every year so a bad quarter does not become a default.",
      "In India, more than 50% of the votes controls ordinary resolutions, and more than 25% can block special resolutions (which need 75%). Avoid dropping below 51%, and never below 26%, if you want to keep control."];
    if (!p.tax_rate) fund.push("Tax is set to 0%, so the tax shield on interest is not counted. Enter your tax rate under Advanced to include it.");
    if (mb.fdr < 0.51) fund.push("Warning: this mix leaves you " + pct(mb.fdr) + ", below 51%. You would lose sole control of ordinary resolutions.");
    if (mb.fdr <= 0.26) fund.push("Warning: " + pct(mb.fdr) + " is at or below 26%. You could no longer block special resolutions.");
    out.push(["Fundamentals", fund]);
    const dm = (i) => down.mixes[i][p.metric];
    const dd = ["If profit grows at half your expectation (" + pct(p.growth_y1 / 2) + " in year 1, " + pct(p.growth_y2 / 2) + " after), the best mix becomes **" + mixLabel(MIX[down.best]) + "**.",
      "The recommended mix would then give " + f(dm(b)) + " instead of " + f(m(b)) + " (" + f(dm(b) - m(b)) + ")."];
    if (db.years_below_one) dd.push("In " + db.years_below_one + " year(s) profit would not cover the EMI.");
    out.push(["Downside: growth at half the plan", dd]);
    if (hrows) out.push(["If the horizon changes", [horizonExplanation(hrows)]]);
    return out;
  }

  const api = { MIX, METRICS, DEFAULTS, DSCR_RISKY, DSCR_DEFAULT, groupIndian, inr, mixLabel, ratio, pct, validate, investorOwnership, emi,
    amortization, yearlyDebt, projectMix, optimize, firstLastingLead, horizonTable, horizonExplanation, sensitivity, downside, suggestions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EDO = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
