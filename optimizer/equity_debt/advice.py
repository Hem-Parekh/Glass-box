"""Plain-English suggestions written from the model's numbers (no AI, just rules)."""
from __future__ import annotations

from .formatting import inr, mix_label, pct, ratio
from .model import DSCR_RISKY, METRICS, Result


def suggestions(r: Result, down: Result, horizon_rows: list[dict] | None = None, short: bool = True) -> list[tuple[str, list[str]]]:
    p, pr, b = r.inputs, r.projection, r.best
    f = lambda x: inr(x, short)
    m = pr.metric()
    eq, debt = len(m) - 1, 0
    out = []

    # 1. why this mix wins
    why = [f"Best mix: **{mix_label(pr.equity_share[b])}**, ranked by {METRICS[p.metric].lower()}."]
    if b == 0:
        why.append(f"All debt wins because the loan costs {pct(p.interest_rate, 1)} a year for {p.tenure_years} years and then stops, "
                   f"while selling equity would hand investors {pct(pr.investor_own[eq], 1)} of every year's profit and of the exit value, forever.")
    elif b == eq:
        why.append("All equity wins: with these numbers the EMI eats too much of the profit, or the loan breaks your minimum repayment cover, "
                   "so giving away shares costs the founder less than servicing the debt.")
    else:
        why.append(f"This is the most debt your profit can safely carry (lowest DSCR {ratio(pr.min_dscr[b])} against your minimum of "
                   f"{max(1.0, p.min_dscr_required):.2f}x). More debt would be cheaper still, but would leave a year where profit does not cover the EMI with enough room.")
    why.append(f"Against 100% equity the founder is better off by **{f(m[b] - m[eq])}**" +
               (f"; against 100% debt by **{f(m[b] - m[debt])}**." if r.feasible[debt] and b != debt else "."))
    why.append("Why the answer is usually at one end: each extra rupee of equity dilutes you a little less than the one before "
               "(ownership = equity / (valuation + equity)), so mixing rarely beats the better pure option. A mix wins when the loan has to be capped "
               "by cash flow, or when the two routes change growth differently.")
    if p.tax_rate:
        shield = pr.tax_shield[b].sum()
        why.append(f"Interest is tax-deductible: at {pct(p.tax_rate, 1)} tax the loan saves {f(shield)} of tax over the horizon.")
    if r.breakeven_cash_year:
        why.append(f"Pure equity gives more cash in the early years; 100% debt overtakes it in cumulative founder cash from year {r.breakeven_cash_year}.")
    out.append(("Why this mix wins", why))

    # 2. risks
    risks = []
    md = pr.min_dscr[b]
    if pr.debt_amount[b] > 0:
        if md < DSCR_RISKY:
            risks.append(f"Repayment cover is thin: in the weakest year profit is only {ratio(md)} the EMI. Lenders usually want 1.25x or more.")
        else:
            risks.append(f"Repayment cover is healthy: profit is at least {ratio(md)} the EMI in every year of the loan.")
        dpr = down.projection
        if dpr.min_dscr[b] < 1:
            risks.append(f"**Growth miss:** if profit grows at half the rate you expect, this mix cannot pay its EMI in some years (DSCR {ratio(dpr.min_dscr[b])}). "
                         f"You would have to put in {f(-dpr.shortfall[b].sum())} of your own money.")
        else:
            risks.append(f"**Growth miss:** at half the expected growth, cover drops to {ratio(dpr.min_dscr[b])} but the EMI is still paid.")
        risks.append(f"**Interest-rate risk:** if the loan is on a floating rate, a 2-point rise adds about {f(pr.debt_amount[b] * 0.02 * p.tenure_years / 2)} of interest over the loan.")
        risks.append("A term loan usually needs collateral and often a personal guarantee from the founder.")
    if pr.equity_amount[b] > 0:
        risks.append(f"**Dilution:** investors would own {pct(pr.investor_own[b], 1)} for good; you keep {pct(pr.founder_own[b], 1)}.")
        risks.append("**Investor rights:** read the term sheet for board seats, veto rights, liquidation preference (investors paid first on a sale) and anti-dilution clauses.")
    out.append(("Risks", risks))

    # 3. fundamentals
    fund = [
        "Debt is cheaper when profit is stable and growth is predictable: the cost is fixed and ends with the tenure.",
        "Equity is safer for uncertain or early businesses: there is no EMI to pay in a bad year.",
        "Keep DSCR above 1.25 in every year so a bad quarter does not become a default.",
        "In India, more than 50% of the votes controls ordinary resolutions, and more than 25% can block special resolutions (which need 75%). "
        "Avoid dropping below 51%, and never below 26%, if you want to keep control.",
    ]
    if p.tax_rate == 0:
        fund.append("Tax is set to 0%, so the tax shield on interest is not counted. Enter your tax rate under Advanced to include it.")
    fo = pr.founder_own[b]
    if fo < 0.51:
        fund.append(f"Warning: this mix leaves you {pct(fo, 1)}, below 51%. You would lose sole control of ordinary resolutions.")
    if fo <= 0.26:
        fund.append(f"Warning: {pct(fo, 1)} is at or below 26%. You could no longer block special resolutions.")
    out.append(("Fundamentals", fund))

    # 4. downside
    dpr = down.projection
    dd = [f"If profit grows at half your expectation ({pct(p.growth_y1 / 2, 1)} in year 1, {pct(p.growth_y2 / 2, 1)} after), "
          f"the best mix becomes **{mix_label(dpr.equity_share[down.best])}**."]
    dm = dpr.metric()
    dd.append(f"The recommended mix would then give {f(dm[b])} instead of {f(m[b])} ({f(dm[b] - m[b])}).")
    if dpr.years_below_one[b]:
        dd.append(f"In {int(dpr.years_below_one[b])} year(s) profit would not cover the EMI.")
    out.append(("Downside: growth at half the plan", dd))

    if horizon_rows:
        from .analysis import horizon_explanation
        out.append(("If the horizon changes", [horizon_explanation(horizon_rows)]))
    return out
