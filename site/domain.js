/* Business arithmetic for the browser: a line-for-line mirror of server/domain.py
   (server/tests/test_parity.py checks both give the same numbers). Money is integer paise. */
(function (root) {
  "use strict";
  const SETTINGS_DEFAULT = { id: "settings", max_platform_investors: 20, offer_limit: 200, offer_warn: 150, member_limit: 200, member_warn: 180, lock_months: 6 };
  const SECURITY_TYPES = ["equity", "preference", "debentures"];
  const PIPELINE = ["applied", "under_review", "approved", "offering", "funded", "monitoring", "closed", "rejected"];
  const DOC_CHECKLIST = [["valuation_report", "Registered valuer's report"], ["mgt14", "Special resolution filed (MGT-14)"], ["pas4", "PAS-4 offer letters issued"],
    ["bank_account", "Separate bank account for the issue"], ["allotment", "Shares allotted"], ["pas3", "PAS-3 filed (within 15 days of allotment)"], ["demat_credit", "Shares credited to demat"]];

  // ---------- dates (ISO "YYYY-MM-DD", calendar arithmetic in UTC) ----------
  const pad = (x) => String(x).padStart(2, "0");
  const iso = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
  const parts = (s) => [+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10)];
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const mdays = (y, m) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  function addMonths(s, n) {
    const [y0, m0, d0] = parts(s);
    const m = m0 - 1 + n, y = y0 + Math.floor(m / 12), mm = ((m % 12) + 12) % 12 + 1;
    return iso(y, mm, Math.min(d0, mdays(y, mm)));
  }
  const ord = (s) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d) / 86400000; };
  function addDays(s, n) { const t = new Date((ord(s) + n) * 86400000); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  const daysBetween = (a, b) => ord(b) - ord(a);
  function fy(s) { const [y0, m] = parts(s); const y = m >= 4 ? y0 : y0 - 1; return y + "-" + pad((y + 1) % 100); }
  const halfUp = (x) => Math.floor(x + 0.5);
  function todayISO() { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); }

  // ---------- loans ----------
  function schedule(loan, today) {
    const P = +loan.amount_paise, bps = +loan.rate_bps, T = +loan.tenor_months, M = +(loan.moratorium_months || 0);
    const start = loan.disbursal_date, paid = loan.payments || {};
    if (!start || P <= 0 || T <= 0) return [];
    const r = bps / 120000, n = T - M;
    let f = 1;
    for (let i = 0; i < n; i++) f = f * (1 + r);
    const emi = n > 0 && r > 0 ? halfUp(P * r * f / (f - 1)) : n > 0 ? halfUp(P / n) : 0;
    const rows = []; let opening = P;
    for (let k = 1; k <= T; k++) {
      const due = addMonths(start, k), interest = halfUp(opening * bps / 120000);
      const principal = k <= M ? 0 : k === T ? opening : Math.min(emi - interest, opening);
      const closing = opening - principal;
      const status = paid[due] ? "paid" : due < today ? "overdue" : "pending";
      rows.push({ n: k, due, opening, interest, principal, payment: interest + principal, closing, status, paid_on: paid[due] || null });
      opening = closing;
    }
    return rows;
  }
  function loanSummary(loan, today) {
    const rows = schedule(loan, today), paid = rows.filter((r) => r.status === "paid"), unpaid = rows.filter((r) => r.status !== "paid");
    const month = today.slice(0, 7), nxt = unpaid[0] || null, repaid = paid.reduce((a, r) => a + r.principal, 0);
    return {
      disbursed: rows.length ? +loan.amount_paise : 0, principal_repaid: repaid, principal_pending: rows.length ? +loan.amount_paise - repaid : 0,
      interest_earned: paid.reduce((a, r) => a + r.interest, 0), interest_this_month: rows.filter((r) => r.due.slice(0, 7) === month).reduce((a, r) => a + r.interest, 0),
      monthly_interest: nxt ? nxt.interest : 0, next_due: nxt && nxt.due, next_amount: nxt && nxt.payment,
      overdue: rows.filter((r) => r.status === "overdue").length, remaining_months: unpaid.length,
    };
  }
  const minHoldingMonths = (loan) => (+loan.tenor_months <= 24 ? 3 : 6);

  // ---------- cap table and counters ----------
  const platformInvestors = (st, cid) => [...new Set(st.holdings.filter((h) => h.company_id === cid && h.shares > 0).map((h) => h.investor_id))].sort();
  const members = (st, cid) => st.cap_table.filter((e) => e.company_id === cid && e.shares > 0).reduce((a, e) => a + (+e.holders || 1), 0) + platformInvestors(st, cid).length;
  function fdShares(st, cid) {
    const c = st.companies.find((x) => x.id === cid);
    if (c && c.fd_shares !== undefined && !st.cap_table) return c.fd_shares; // investor view: the server sends the total
    return st.cap_table.filter((e) => e.company_id === cid).reduce((a, e) => a + e.shares, 0) + st.holdings.filter((h) => h.company_id === cid).reduce((a, h) => a + h.shares, 0) + (+(c && c.fd_extra_shares) || 0);
  }
  function offersUsed(st, cid, year, sec) {
    const c = st.companies.find((x) => x.id === cid);
    const on = new Set(st.offers.filter((o) => o.company_id === cid && o.fy === year && o.security_type === sec).map((o) => o.investor_id));
    return on.size + (+((((c && c.external_offers) || {})[year] || {})[sec]) || 0);
  }
  function latestValuation(st, cid, on) {
    const v = st.valuations.filter((x) => x.company_id === cid && (on == null || x.date <= on));
    return v.length ? v.reduce((a, b) => (b.date > a.date ? b : a)) : null;
  }
  const lockUntil = (h, s) => addMonths(h.allotment_date, s.lock_months);
  function holdingView(st, h, today, s) {
    const v = latestValuation(st, h.company_id), cost = +h.cost_paise;
    const price = v ? v.price_per_share_paise : h.shares ? Math.floor(cost / h.shares) : 0;
    const value = h.shares * price, unlock = lockUntil(h, s);
    return { id: h.id, company_id: h.company_id, shares: h.shares, cost, avg_cost: h.shares ? cost / h.shares : 0, price, valuation_date: v && v.date, value,
      gain: value - cost, gain_pct: cost ? (value - cost) / cost : 0, ownership: h.shares / fdShares(st, h.company_id), lock_until: unlock, eligible: today >= unlock || !!h.early_consent };
  }
  function portfolio(st, investorId, today, s) {
    const rows = st.holdings.filter((h) => h.investor_id === investorId && h.shares > 0).map((h) => holdingView(st, h, today, s));
    const inv = rows.reduce((a, r) => a + r.cost, 0), val = rows.reduce((a, r) => a + r.value, 0);
    return { rows, invested: inv, value: val, gain: val - inv, gain_pct: inv ? (val - inv) / inv : 0, companies: rows.length };
  }
  function capitalGainsEstimate(h, view, today) {
    const months = daysBetween(h.allotment_date, today) / 30.4375, long = months >= 24;
    return { months, long_term: long, gain: view.gain, tax: long ? halfUp(Math.max(view.gain, 0) * 0.125) : null };
  }

  // ---------- returns ----------
  /** XIRR by bisection on [-99%, +1000%]; flows: [{date, amount}] with at least one negative and one positive. */
  function xirr(flows) {
    if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
    const t0 = flows[0].date, npv = (r) => flows.reduce((a, f) => a + f.amount / Math.pow(1 + r, daysBetween(t0, f.date) / 365), 0);
    let lo = -0.99, hi = 10, flo = npv(lo), fhi = npv(hi);
    if (flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = npv(mid); if (Math.abs(fm) < 1e-6) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }

  // ---------- money and dates for people ----------
  function group(n) { const s = String(n); if (s.length <= 3) return s; const head = s.slice(0, -3), tail = s.slice(-3); return head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + tail; }
  /** Rs 1,23,45,678 (full) or Rs 1.23 Cr / Rs 45.6 L (short). */
  function rs(paise, short) {
    if (paise === null || paise === undefined || !Number.isFinite(+paise)) return "–";
    const neg = paise < 0, r = Math.abs(paise) / 100;
    let out;
    if (short && r >= 1e7) out = "Rs " + (r / 1e7).toFixed(r >= 1e9 ? 0 : 2) + " Cr";
    else if (short && r >= 1e5) out = "Rs " + (r / 1e5).toFixed(r >= 1e7 ? 1 : 2) + " L";
    else { const whole = Math.floor(r + 1e-9), ps = Math.round((r - whole) * 100); out = "Rs " + group(whole) + (ps ? "." + pad(ps) : ""); }
    return (neg ? "-" : "") + out;
  }
  const rsPrice = (paise) => "Rs " + group(Math.floor(paise / 100)) + "." + pad(paise % 100);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dmy = (s) => { if (!s) return "–"; const [y, m, d] = parts(s); return d + " " + MON[m - 1] + " " + y; };
  const shares = (n) => group(Math.round(n));

  root.DOM = { SETTINGS_DEFAULT, SECURITY_TYPES, PIPELINE, DOC_CHECKLIST, addMonths, addDays, daysBetween, fy, halfUp, todayISO, schedule, loanSummary, minHoldingMonths,
    platformInvestors, members, fdShares, offersUsed, latestValuation, lockUntil, holdingView, portfolio, capitalGainsEstimate, xirr, rs, rsPrice, dmy, shares, group, MON };
  if (typeof module !== "undefined" && module.exports) module.exports = root.DOM;
})(typeof globalThis !== "undefined" ? globalThis : this);
