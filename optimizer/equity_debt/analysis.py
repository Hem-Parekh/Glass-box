"""What-if analyses built on the core model: longer horizons, sensitivity, heatmap,
a downside case, and a step-by-step calculation the founder can check by hand."""
from __future__ import annotations

from dataclasses import replace

import numpy as np

from .formatting import inr, mix_label, pct, ratio
from .model import MIX_STEPS, Inputs, amortization_schedule, emi, investor_ownership, mix_index, optimize

HORIZONS = (3, 5, 7, 10, 15, 20)


def horizon_table(p: Inputs, horizons=HORIZONS) -> list[dict]:
    """Best mix and the gap between options for several horizons (everything else unchanged)."""
    rows = []
    for h in horizons:
        r = optimize(replace(p, horizon_years=h))
        pr, m = r.projection, r.projection.metric()
        rows.append(dict(horizon=h, best_equity=r.best_equity, best_score=float(m[r.best]),
                         all_equity=float(m[-1]), all_debt=float(m[0]) if r.feasible[0] else None,
                         gap_vs_equity=float(m[r.best] - m[-1]),
                         gap_debt_vs_equity=float(m[0] - m[-1]),
                         breakeven_cash_year=r.breakeven_cash_year))
    return rows


def horizon_explanation(rows: list[dict]) -> str:
    first, last = rows[0], rows[-1]
    flips = [r["horizon"] for a, r in zip(rows, rows[1:]) if round(a["best_equity"], 2) != round(r["best_equity"], 2)]
    s = (f"Over {first['horizon']} years the best mix is {mix_label(first['best_equity'])}; over {last['horizon']} years it is "
         f"{mix_label(last['best_equity'])}. ")
    if first["gap_debt_vs_equity"] < last["gap_debt_vs_equity"]:
        s += ("The longer the horizon, the more debt is worth to the founder. A loan costs a fixed amount and stops when the tenure ends, "
              "but shares sold to investors carry on taking their slice of every year's profit and of the exit value for as long as the company grows. ")
    else:
        s += "Over this range a longer horizon does not favour debt more, usually because the loan runs past the horizon or growth is low. "
    if flips:
        s += f"The recommendation changes at a horizon of {', '.join(str(h) for h in flips)} years."
    return s


SENSITIVITY_CASES = [
    ("Profit growth", "-10 pts", lambda p: replace(p, growth_y1=p.growth_y1 - 0.10, growth_y2=p.growth_y2 - 0.10)),
    ("Profit growth", "-5 pts", lambda p: replace(p, growth_y1=p.growth_y1 - 0.05, growth_y2=p.growth_y2 - 0.05)),
    ("Profit growth", "+5 pts", lambda p: replace(p, growth_y1=p.growth_y1 + 0.05, growth_y2=p.growth_y2 + 0.05)),
    ("Profit growth", "+10 pts", lambda p: replace(p, growth_y1=p.growth_y1 + 0.10, growth_y2=p.growth_y2 + 0.10)),
    ("Interest rate", "-2 pts", lambda p: replace(p, interest_rate=max(p.interest_rate - 0.02, 0.0))),
    ("Interest rate", "+2 pts", lambda p: replace(p, interest_rate=p.interest_rate + 0.02)),
    ("Valuation", "-20%", lambda p: replace(p, pre_money=p.pre_money * 0.8)),
    ("Valuation", "+20%", lambda p: replace(p, pre_money=p.pre_money * 1.2)),
    ("Loan tenure", "-2 yrs", lambda p: replace(p, tenure_years=max(p.tenure_years - 2, 1))),
    ("Loan tenure", "+2 yrs", lambda p: replace(p, tenure_years=p.tenure_years + 2)),
]


def sensitivity(p: Inputs) -> dict:
    """How the best mix and the founder's best outcome move when one input changes."""
    base = optimize(p)
    base_score = base.score(base.best)
    rows = []
    for var, label, fn in SENSITIVITY_CASES:
        q = fn(p)
        if q.growth_y1 <= -1 or q.growth_y2 <= -1:
            continue
        r = optimize(q)
        s = r.score(r.best)
        rows.append(dict(variable=var, case=label, best_equity=r.best_equity, best_score=s, change=s - base_score,
                         change_pct=(s - base_score) / abs(base_score) if base_score else 0.0,
                         mix_moved=round(r.best_equity - base.best_equity, 2)))
    return dict(base_equity=base.best_equity, base_score=base_score, rows=rows)


def heatmap(p: Inputs, rates=None, growths=None) -> dict:
    """Best equity share for a grid of interest rates x year-2+ growth.
    Year-1 growth moves with year-2+ growth so the gap between them stays as entered."""
    rates = np.round(np.arange(0.09, 0.2401, 0.015), 4) if rates is None else np.asarray(rates)
    growths = np.round(np.arange(0.0, 0.3001, 0.05), 4) if growths is None else np.asarray(growths)
    gap = p.growth_y1 - p.growth_y2
    best = np.zeros((len(growths), len(rates)))
    for i, g in enumerate(growths):
        for j, r in enumerate(rates):
            best[i, j] = optimize(replace(p, interest_rate=float(r), growth_y2=float(g), growth_y1=float(g + gap))).best_equity
    return dict(rates=rates, growths=growths, best_equity=best)


def downside(p: Inputs):
    """The same plan if profit grows at half the expected rate."""
    return optimize(replace(p, growth_y1=p.growth_y1 / 2, growth_y2=p.growth_y2 / 2))


def explain(p: Inputs, equity_share: float, short: bool = False) -> dict:
    """Every step for one mix, with the numbers substituted, so the founder can check it by hand."""
    r = optimize(p)
    i = mix_index(equity_share)
    pr = r.projection
    e = pr.equity_share[i]
    E, D = p.amount * e, p.amount * (1 - e)
    own = float(investor_ownership(E, p.pre_money))
    f = lambda x: inr(x, short)
    steps = [
        ("Split the raise", "Equity = amount x equity share; Debt = amount - equity",
         f"Equity = {f(p.amount)} x {pct(e, 0)} = {f(E)}; Debt = {f(p.amount)} - {f(E)} = {f(D)}"),
        ("Investor ownership (post-money)", "Ownership = equity / (pre-money valuation + equity)",
         f"{f(E)} / ({f(p.pre_money)} + {f(E)}) = {pct(own, 2)}. Founder keeps {pct(1 - own, 2)}." if E > 0 else "No equity sold, so the founder keeps 100%."),
    ]
    if D > 0:
        r_m, n = p.interest_rate / 12, p.tenure_years * 12
        pay = float(emi(D, p.interest_rate, p.tenure_years))
        steps.append(("Monthly EMI", "EMI = P x r x (1 + r)^n / ((1 + r)^n - 1), r = annual rate / 12, n = months",
                      f"P = {f(D)}, r = {pct(p.interest_rate, 2)} / 12 = {r_m:.6f}, n = {n}. EMI = {f(pay)} a month, {f(pay * 12)} a year."
                      if r_m else f"0% interest, so EMI = P / n = {f(D)} / {n} = {f(pay)}"))
        sched = amortization_schedule(D, p.interest_rate, p.tenure_years)
        steps.append(("Total cost of the loan", "Total paid = EMI x months; interest = total paid - principal",
                      f"{f(pay)} x {n} = {f(pay * n)}; interest = {f(pay * n - D)}. First EMI: {f(sched[0]['interest'])} interest + {f(sched[0]['principal'])} principal."))
    else:
        steps.append(("Monthly EMI", "No loan in this mix", "EMI = 0"))
    steps.append(("Profit each year", "Year 1 = monthly profit x (1 + year-1 growth) x 12; later years grow at the year-2+ rate",
                  f"Year 1 = {f(p.profit_month)} x {1 + p.growth_y1:.2f} x 12 = {f(pr.profit[i, 0])}"))
    tax_txt = f"; tax = {pct(p.tax_rate, 1)} x (profit - interest)" if p.tax_rate else ""
    steps.append(("Founder's cash each year", "Left after debt = profit - EMI" + (" - tax" if p.tax_rate else "") + " - one-time fees; founder gets founder % x payout x what is left" + tax_txt,
                  f"Year 1: {f(pr.profit[i, 0])} - {f(pr.emi[i, 0])}" + (f" - {f(pr.tax[i, 0])}" if p.tax_rate else "") + (f" - {f(pr.fees[i, 0])}" if pr.fees[i, 0] else "")
                  + f" = {f(pr.after_debt[i, 0])}; x {pct(p.payout_ratio, 0)} payout x {pct(pr.founder_own[i], 2)} = {f(pr.founder_cash[i, 0])} ({f(pr.founder_cash[i, 0] / 12)} a month)"))
    steps.append(("Exit stake", "Founder % x (exit multiple x final-year profit - loan still owed + cash kept in the company)",
                  f"{pct(pr.founder_own[i], 2)} x ({p.exit_multiple:g} x {f(pr.profit[i, -1])} - {f(pr.outstanding[i, -1])} + {f(pr.retained[i].sum())}) = {f(pr.exit_stake[i])}"))
    steps.append(("Present value", f"Each year's cash / (1 + {pct(p.discount_rate, 1)})^year, plus the exit stake discounted from year {p.horizon_years}",
                  f"Cash {f(pr.npv_cash[i])} + exit {f(pr.exit_stake[i] / (1 + p.discount_rate) ** p.horizon_years)} = {f(pr.npv_wealth[i])}"))
    years = [dict(year=int(y), profit=pr.profit[i, k], emi=pr.emi[i, k], interest=pr.interest[i, k], principal=pr.principal[i, k],
                  tax=pr.tax[i, k], tax_shield=pr.tax_shield[i, k], after_debt=pr.after_debt[i, k], investor=pr.investor_cash[i, k],
                  founder=pr.founder_cash[i, k], founder_month=pr.founder_cash[i, k] / 12, cumulative=pr.cum_founder_cash[i, k],
                  dscr=pr.dscr[i, k], outstanding=pr.outstanding[i, k]) for k, y in enumerate(pr.years)]
    return dict(index=i, label=mix_label(e), steps=steps, years=years, min_dscr=ratio(pr.min_dscr[i]))
