"""Tables and files: the all-mixes table, Excel / CSV export, scenario JSON, PDF summary."""
from __future__ import annotations

import io
import json
from datetime import date

import pandas as pd

from . import __version__
from .formatting import inr, mix_label, pct, ratio
from .model import METRICS, Inputs, Result

# Indian digit grouping for Excel: 1,23,45,678
XL_INR = '[>=10000000]"₹"##\\,##\\,##\\,##0;[>=100000]"₹"##\\,##\\,##0;"₹"##,##0'


def mixes_frame(r: Result) -> pd.DataFrame:
    """One row per equity share, in rupees (unformatted, so it sorts and exports cleanly)."""
    pr = r.projection
    df = pd.DataFrame({
        "Equity %": (pr.equity_share * 100).round(0).astype(int),
        "Debt %": (100 - pr.equity_share * 100).round(0).astype(int),
        "Equity raised": pr.equity_amount.round(0),
        "Loan": pr.debt_amount.round(0),
        "Investor ownership %": (pr.investor_own * 100).round(2),
        "Founder ownership %": (pr.founder_own * 100).round(2),
        "EMI per month": pr.emi_month.round(0),
        "Founder cash per month, year 1": (pr.founder_cash[:, 0] / 12).round(0),
        "Total founder cash": pr.total_cash.round(0),
        "PV of founder cash": pr.npv_cash.round(0),
        "Founder exit stake": pr.exit_stake.round(0),
        "Exit-inclusive wealth": pr.wealth.round(0),
        "PV of wealth": pr.npv_wealth.round(0),
        "Lowest DSCR": [None if v == float("inf") else round(float(v), 2) for v in pr.min_dscr],
        "Years DSCR < 1.25": pr.years_below_risky,
        "Allowed": r.feasible,
        "Beats 100% equity in cash from year": [int(v) if v else None for v in r.breakeven_vs_equity],
    })
    df["Best"] = False
    df.loc[r.best, "Best"] = True
    return df


def yearly_frame(r: Result, idx: int) -> pd.DataFrame:
    pr = r.projection
    return pd.DataFrame({
        "Year": pr.years, "Profit": pr.profit[idx].round(0), "EMI": pr.emi[idx].round(0), "Interest": pr.interest[idx].round(0),
        "Principal": pr.principal[idx].round(0), "Tax": pr.tax[idx].round(0), "Tax shield": pr.tax_shield[idx].round(0),
        "Left after debt": pr.after_debt[idx].round(0), "Investor share": pr.investor_cash[idx].round(0),
        "Founder cash": pr.founder_cash[idx].round(0), "Founder cash per month": (pr.founder_cash[idx] / 12).round(0),
        "Cumulative founder cash": pr.cum_founder_cash[idx].round(0),
        "DSCR": [None if v == float("inf") else round(float(v), 2) for v in pr.dscr[idx]],
        "Loan outstanding": pr.outstanding[idx].round(0),
    })


def inputs_frame(p: Inputs) -> pd.DataFrame:
    rows = [("Amount to raise", inr(p.amount)), ("Pre-money valuation", inr(p.pre_money)), ("Profit per month today", inr(p.profit_month)),
            ("Profit growth, year 1", pct(p.growth_y1)), ("Profit growth, year 2+", pct(p.growth_y2)), ("Loan interest", pct(p.interest_rate)),
            ("Loan tenure", f"{p.tenure_years} years"), ("Horizon", f"{p.horizon_years} years"), ("Tax rate", pct(p.tax_rate)),
            ("Exit multiple", f"{p.exit_multiple:g}x annual profit"), ("Discount rate", pct(p.discount_rate)), ("Loan processing fee", pct(p.debt_fee)),
            ("Equity transaction cost", pct(p.equity_cost)), ("Payout ratio", pct(p.payout_ratio, 0)), ("Growth boost, equity", pct(p.growth_boost_equity)),
            ("Growth boost, debt", pct(p.growth_boost_debt)), ("Minimum DSCR accepted", f"{p.min_dscr_required:.2f}x"), ("Ranked by", METRICS[p.metric])]
    return pd.DataFrame(rows, columns=["Input", "Value"])


MONEY_COLS = {"Equity raised", "Loan", "EMI per month", "Founder cash per month, year 1", "Total founder cash", "PV of founder cash",
              "Founder exit stake", "Exit-inclusive wealth", "PV of wealth", "Profit", "EMI", "Interest", "Principal", "Tax", "Tax shield",
              "Left after debt", "Investor share", "Founder cash", "Founder cash per month", "Cumulative founder cash", "Loan outstanding"}


def to_excel(r: Result, idx: int) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        inputs_frame(r.inputs).to_excel(xw, sheet_name="Inputs", index=False)
        mixes_frame(r).to_excel(xw, sheet_name="All mixes", index=False)
        yearly_frame(r, r.best).to_excel(xw, sheet_name="Best mix by year", index=False)
        if idx != r.best:
            yearly_frame(r, idx).to_excel(xw, sheet_name=f"{round(r.projection.equity_share[idx] * 100)}% equity by year", index=False)
        for ws in xw.book.worksheets:
            header = [c.value for c in ws[1]]
            for j, h in enumerate(header, start=1):
                ws.column_dimensions[ws.cell(1, j).column_letter].width = max(12, min(len(str(h)) + 2, 34))
                if h in MONEY_COLS:
                    for row in ws.iter_rows(min_row=2, min_col=j, max_col=j):
                        row[0].number_format = XL_INR
            ws.freeze_panes = "A2"
    return buf.getvalue()


def to_csv(r: Result) -> bytes:
    return mixes_frame(r).to_csv(index=False).encode("utf-8")


def scenario_json(p: Inputs, name: str = "") -> bytes:
    return json.dumps({"app": "equity-debt-optimizer", "version": __version__, "name": name, "saved": date.today().isoformat(),
                       "inputs": p.to_dict()}, indent=2).encode("utf-8")


def load_scenario(data: bytes | str) -> tuple[str, Inputs]:
    d = json.loads(data)
    if not isinstance(d, dict):
        raise ValueError("This file is not a scenario.")
    inputs = d.get("inputs", d)
    return str(d.get("name") or ""), Inputs.from_dict(inputs)


def to_pdf(r: Result, sections: list[tuple[str, list[str]]]) -> bytes:
    """One- to two-page printable summary. Uses 'Rs' because the standard PDF fonts have no rupee sign."""
    from reportlab.graphics.charts.lineplots import LinePlot
    from reportlab.graphics.shapes import Drawing, String
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    p, pr, b = r.inputs, r.projection, r.best
    rs = lambda x: inr(x, short=True, symbol="Rs ")
    st = getSampleStyleSheet()
    body = st["BodyText"]; body.fontSize = 9; body.leading = 12
    h1, h2 = st["Title"], st["Heading3"]
    navy = colors.HexColor("#1F3A5F")
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                            title="Equity vs Debt Optimizer summary")
    m = pr.metric()
    story = [Paragraph("Equity vs Debt: recommendation", h1),
             Paragraph(f"Prepared {date.today():%d %b %Y}. Raising {rs(p.amount)} at a {rs(p.pre_money)} pre-money valuation; "
                       f"profit {rs(p.profit_month)} a month today. Horizon {p.horizon_years} years.", body), Spacer(1, 6),
             Paragraph(f"<b>Best mix for the founder: {mix_label(pr.equity_share[b])}</b>", st["Heading2"]),
             Paragraph(f"Founder cash in year 1: {rs(pr.founder_cash[b, 0] / 12)} a month. Total cash over {p.horizon_years} years: {rs(pr.total_cash[b])}. "
                       f"Exit-inclusive wealth: {rs(pr.wealth[b])}. Ranked by {METRICS[p.metric].lower()}: {rs(m[b])} "
                       f"({rs(m[b] - m[-1])} more than 100% equity).", body), Spacer(1, 6)]
    keys = sorted({0, 25, 50, 75, 100, b})
    rows = [["Mix", "EMI / month", "Founder / month (Y1)", "Total cash", "Exit stake", "PV of wealth", "Lowest DSCR"]]
    for i in keys:
        rows.append([mix_label(pr.equity_share[i]) + (" (best)" if i == b else ""), rs(pr.emi_month[i]), rs(pr.founder_cash[i, 0] / 12),
                     rs(pr.total_cash[i]), rs(pr.exit_stake[i]), rs(pr.npv_wealth[i]), ratio(pr.min_dscr[i])])
    t = Table(rows, repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), navy), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTSIZE", (0, 0), (-1, -1), 8),
                           ("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#C9D3DD")),
                           ("BACKGROUND", (0, 1 + keys.index(b)), (-1, 1 + keys.index(b)), colors.HexColor("#E3F2F0"))]))
    story += [t, Spacer(1, 8)]
    # chart: founder wealth vs equity %
    d = Drawing(170 * mm, 60 * mm)
    lp = LinePlot(); lp.x, lp.y, lp.width, lp.height = 14 * mm, 8 * mm, 150 * mm, 46 * mm
    lp.data = [[(float(pr.equity_share[i] * 100), float(m[i]) / 1e7) for i in range(len(m))]]
    lp.lines[0].strokeColor = colors.HexColor("#139A8F"); lp.lines[0].strokeWidth = 1.5
    lp.xValueAxis.valueMin, lp.xValueAxis.valueMax, lp.xValueAxis.valueStep = 0, 100, 25
    lp.xValueAxis.labels.fontSize = lp.yValueAxis.labels.fontSize = 7
    d.add(lp)
    d.add(String(14 * mm, 56 * mm, f"{METRICS[p.metric]} (Rs Cr) by equity %", fontSize=8))
    story += [d, Spacer(1, 6)]
    for title, items in sections:
        story.append(Paragraph(title, h2))
        for it in items:
            story.append(Paragraph("• " + it.replace("**", "").replace("₹", "Rs "), body))
    story += [Spacer(1, 8), Paragraph("<i>Decision-support model, not financial advice. Estimates depend on the inputs above; "
                                      "check with a qualified advisor before raising money.</i>", body)]
    doc.build(story)
    return buf.getvalue()
