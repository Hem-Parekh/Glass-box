/* Debt vs equity engine, browser port of engine.py. Same rules, same numbers.
   All money in Rs crore unless noted. No network calls: the CMA never leaves the browser. */
(function (root) {
  "use strict";

  // ---------- 1. CMA parsing ----------
  const LABELS = {
    net_sales: [/^NET SALES/i],
    pbit: [/^PROFIT BEFORE INTEREST & TAX/i],
    dep: [/Depreciation/i],
    interest: [/^Interest & Other Financial Charges/i],
    pbt: [/^PROFIT BEFORE TAX/i],
    tax: [/^Current Tax/i],
    pat: [/^NET PROFIT/i],
    dividend: [/Dividend Paid \(i\) Amt/i],
    cop: [/^COST OF PRODUCTION:/i],
    rm: [/^B\. Indigenous/i, /^A\. Imported/i],
    stock_trade: [/^A\. Stock in Trade/i],
    packing: [/^B\. Packing Material/i],
    power: [/Power & Fuel/i],
    labour: [/Direct Labour/i],
    cost_services: [/Cost of services/i],
    other_exp: [/^\(ix\) Other Expenses/i],
    sga: [/^Selling, General/i],
    net_worth: [/^NET WORTH/i],
    term_loans: [/^Term Loans/i],
    tl_current: [/^Instalments of Term loans/i],
    st_bank: [/^\(i\) from applicant bank/i, /^\(ii\) from other banks/i],
    cash: [/^Cash and Bank Balances/i],
    liquid1: [/Govt\. & other securities/i],
    liquid2: [/Fixed deposits with banks/i],
    tcl: [/^TOTAL CURRENT LIABILITIES/i],
    ttl: [/^TOTAL TERM LIABILITIES/i],
  };
  const SUMMED = new Set(["rm", "st_bank"]);
  const REQUIRED = {
    net_sales: "NET SALES", pbit: "PROFIT BEFORE INTEREST & TAX (PBIT)",
    pbt: "PROFIT BEFORE TAX", pat: "NET PROFIT/LOSS (PAT)",
  };
  const STRESS_FLOOR = 1.2; // minimum DSCR under stress (EBITDA -20%, rate +2 points)

  function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /** grid: rows of cell values, grid[0][0] is cell A1 (null for blanks/errors). */
  function parseCMA(grid, sheetName) {
    const cell = (r, c) => (grid[r - 1] && grid[r - 1][c - 1] !== undefined ? grid[r - 1][c - 1] : null);
    let years = [], status = [];
    const cols = [2, 3, 4, 5];
    for (let r = 1; r < 12; r++) {
      const vals = cols.map((c) => cell(r, c));
      if (vals.every((v) => typeof v === "number" && v > 1990 && v < 2100)) {
        years = vals.map((v) => Math.trunc(v));
        status = cols.map((c) => String(cell(r + 1, c) || ""));
        break;
      }
    }
    if (!years.length) throw new Error("Could not find the year header row (4-digit years in columns B to E, within the first 11 rows) in sheet '" + sheetName + "'");
    const data = {};
    for (const [key, pats] of Object.entries(LABELS)) {
      const tot = cols.map(() => 0);
      let found = false;
      for (let r = 1; r <= grid.length; r++) {
        const lab = String(cell(r, 1) == null ? "" : cell(r, 1)).trim();
        if (pats.some((p) => p.test(lab))) {
          found = true;
          cols.forEach((c, i) => { tot[i] += num(cell(r, c)) || 0; });
          if (!SUMMED.has(key)) break;
        }
      }
      if (!found && REQUIRED[key]) throw new Error("The CMA has no '" + REQUIRED[key] + "' row in column A of sheet '" + sheetName + "'");
      data[key] = tot;
    }
    if (!data.net_sales.some((v) => v > 0)) throw new Error("The 'NET SALES' row has no positive value in any year column");
    let baseI = 0;
    data.net_sales.forEach((v, i) => { if (v > 0) baseI = i; });
    const hist = {}, base = {};
    for (const k in data) { hist[k] = data[k].slice(0, baseI + 1); base[k] = data[k][baseI]; }
    const s = hist.net_sales;
    const g = s.length > 1 && s[0] > 0 ? Math.pow(s[s.length - 1] / s[0], 1 / (s.length - 1)) - 1 : 0.05;
    return { years: years.slice(0, baseI + 1), status: status.slice(0, baseI + 1), hist, base, growth: g, sheet: sheetName };
  }

  // ---------- 2. Industry presets (editable defaults) ----------
  const PRESETS = {
    manufacturing: { min_equity: 0.25, dscr_target: 1.5, tenor: 7, moratorium: 1, asset_life: 15, unit_label: "units/yr",
      units: "tonnes, pieces, litres",
      note: "Asset-heavy: plant & machinery is bankable security, so lenders fund up to ~75% of project cost." },
    service: { min_equity: 0.4, dscr_target: 1.6, tenor: 5, moratorium: 0, asset_life: 8, unit_label: "billable units/yr",
      units: "billable hours, beds, seats, rooms",
      note: "Asset-light: little hard collateral, so lenders expect more promoter equity and stronger cover." },
    other: { min_equity: 0.3, dscr_target: 1.5, tenor: 5, moratorium: 0, asset_life: 10, unit_label: "units/yr",
      units: "units sold, stores, sq ft",
      note: "Trading/retail: funding is mostly working capital; term debt sized on cash flow, WC limits on drawing power." },
  };

  // ---------- 3. Model ----------
  function schedule(L, rate, tenor, morat) {
    const n = morat + tenor, rows = [];
    let bal = L;
    for (let t = 1; t <= n; t++) {
      const interest = bal * rate;
      const principal = t > morat ? L / tenor : 0;
      rows.push({ year: t, opening: bal, interest, principal, closing: bal - principal });
      bal -= principal;
    }
    return rows;
  }

  function run(cma, p) {
    let b = cma.base;
    const pre = PRESETS[p.industry];
    if (!pre) throw new Error("Unknown industry '" + p.industry + "'");
    const q = Object.assign({}, pre);
    for (const k in p) if (p[k] !== null && p[k] !== undefined) q[k] = p[k];
    const rate = q.rate, tenor = Math.trunc(q.tenor), morat = Math.trunc(q.moratorium);
    if (tenor < 1) throw new Error("Repayment period must be at least 1 year");
    if (!q.ramp || !q.ramp.length) throw new Error("Enter at least one utilisation percentage");
    const taxRate = b.pbt > 0 ? Math.min(Math.max(b.tax / b.pbt, 0.15), 0.35) : 0.25;
    const g = q.growth !== undefined && q.growth !== null ? q.growth : cma.growth;

    const units0 = q.existing_capacity * q.current_util;
    if (!(units0 > 0)) throw new Error("Existing capacity and utilisation must be above zero");
    const cop = b.cop > 0 ? b.cop : Math.max(b.net_sales - b.pbit - b.sga, 0);
    let var0 = q.industry === "service" ? b.cost_services + b.labour : b.rm + b.stock_trade + b.packing + b.power;
    if (var0 <= 0) var0 = 0.6 * cop; // fallback when the CMA has no cost split
    b = Object.assign({}, b, { cop });
    const price = b.net_sales / units0;
    const vc0 = var0 / units0, cpu0 = b.cop / units0;
    const vcNew = vc0 * (1 - q.efficiency_gain);
    const capex = q.project_cost - q.wc_margin;
    const sgaRatio = b.net_sales ? b.sga / b.net_sales : 0;
    const depP = capex / q.asset_life;
    const sgaShare = q.sga_variable_share !== undefined ? q.sga_variable_share : 0.7;

    function project(L, ebitdaShock, rateShock) {
      ebitdaShock = ebitdaShock || 0; rateShock = rateShock || 0;
      return schedule(L, rate + rateShock, tenor, morat).map((row, i) => {
        const util = q.ramp[Math.min(i, q.ramp.length - 1)];
        const units = q.new_capacity * util;
        const revenue = units * price;
        const sgaVar = revenue * sgaRatio * sgaShare;
        const ebitda = (units * (price - vcNew) - sgaVar - q.plant_fixed_cost) * (1 - ebitdaShock);
        const pbt = ebitda - depP - row.interest;
        const tax = Math.max(pbt, 0) * taxRate;
        const pat = pbt - tax;
        const cfads = pat + depP + row.interest;
        const ds = row.interest + row.principal;
        return Object.assign({}, row, { util, units, revenue, ebitda, pat, cfads, ds,
          dscr: ds > 0 ? cfads / ds : null, fcf_after_ds: cfads - ds });
      });
    }
    function minDscr(rows) {
      const vals = rows.filter((r) => r.dscr !== null && r.principal > 0).map((r) => r.dscr);
      return vals.length ? Math.min.apply(null, vals) : Infinity;
    }
    const baseCfads = b.pat + b.dep + b.interest;
    function company(L) {
      return project(L).map((r, i) => {
        const f = Math.pow(1 + g, i + 1);
        const cf = baseCfads * f + r.cfads;
        const ds = b.interest + b.tl_current + r.ds;
        return { year: r.year, cfads: cf, ds, dscr: ds ? cf / ds : null, after_div: cf - b.dividend * f - ds };
      });
    }

    // largest project-level loan with min DSCR >= target (ring-fenced: the project carries its own debt)
    let lo = 0, hi = q.project_cost * 50;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (minDscr(project(mid)) >= q.dscr_target) lo = mid; else hi = mid;
    }
    const capProject = lo;
    const capPolicy = q.project_cost * (1 - q.min_equity);
    let debt = Math.floor(Math.min(capProject, capPolicy) / 5) * 5; // round down to Rs 5 cr
    let stressCut = 0;
    while (debt > 0 && minDscr(project(debt, 0.2, 0.02)) < STRESS_FLOOR) { debt -= 5; stressCut += 5; }
    const equity = q.project_cost - debt;

    const rows = project(debt), comp = company(debt), stress = project(debt, 0.2, 0.02);
    const liquid = b.cash + b.liquid1 + b.liquid2;
    const internal = Math.max(liquid - (q.cash_buffer || 0), 0);
    const newEquity = Math.max(equity - internal, 0);

    const ss = rows[rows.length - 1];
    const cpuNew = (b.cop + ss.units * vcNew + q.plant_fixed_cost + depP) / (units0 + ss.units);
    const afterTaxKd = rate * (1 - taxRate);
    const tYield = q.treasury_yield !== undefined ? q.treasury_yield : 0.07;
    const ke = q.cost_of_equity !== undefined ? q.cost_of_equity : 0.12;
    let binding = capProject < capPolicy ? "cash flow (DSCR)" : "minimum promoter equity";
    if (stressCut) binding = "stress test";
    const compDscr = comp.map((c) => c.dscr).filter((v) => v !== null);
    return {
      q, tax_rate: taxRate, growth: g, price, vc0, vc_new: vcNew, cpu0, cpu_new: cpuNew,
      units0, units_ss: ss.units, capex, dep_p: depP,
      cap_project: capProject, cap_policy: capPolicy, debt, equity,
      debt_pct: debt / q.project_cost, equity_pct: equity / q.project_cost,
      internal, new_equity: newEquity, rows, company: comp, stress,
      min_dscr: minDscr(rows), min_dscr_stress: minDscr(stress),
      min_dscr_company: compDscr.length ? Math.min.apply(null, compDscr) : Infinity,
      ebitda0: b.pbit + b.dep, cap_increase: q.new_capacity / q.existing_capacity,
      cum_fcf: rows.reduce((a, r) => a + r.fcf_after_ds, 0), ss_cfads: ss.cfads,
      payback: q.project_cost / (rows.reduce((a, r) => a + r.cfads, 0) / rows.length),
      after_tax_kd: afterTaxKd, after_tax_cash: tYield * (1 - taxRate), ke, binding, stress_cut: stressCut, liquid,
      base_cfads: baseCfads, cf_uplift: ss.cfads / (baseCfads * Math.pow(1 + g, rows.length)), sga_ratio: sgaRatio,
      ebitda_margin_ss: ss.revenue ? ss.ebitda / ss.revenue : 0,
    };
  }

  const api = { LABELS, REQUIRED, PRESETS, STRESS_FLOOR, parseCMA, schedule, run };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FundMix = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
