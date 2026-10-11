"""Builds the charts and the one-page PDF report from engine results."""
import io, datetime
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import ParagraphStyle

NAVY, TEAL, OR, GR, ALT = "#12263F", "#1AA6A0", "#F2A541", "#5B6B7C", "#F2F6FA"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8})

def fmt(x, d=0):
    return f"{x:,.{d}f}"

def money(x):
    if x >= 1e7: return f"Rs {x/1e7:,.2f} cr"
    if x >= 1e5: return f"Rs {x/1e5:,.2f} lakh"
    return f"Rs {x:,.0f}"

def _style(ax):
    for s in ["top", "right"]: ax.spines[s].set_visible(False)
    ax.spines["left"].set_color("#ccc"); ax.spines["bottom"].set_color("#ccc")
    ax.tick_params(colors=GR); ax.yaxis.grid(True, color="#eee"); ax.set_axisbelow(True)

def chart_cashflow(r):
    rows = r["rows"]; yrs = [f"Y{x['year']}" for x in rows]
    fig, ax = plt.subplots(figsize=(4.2, 3.2), dpi=200)
    ax.bar(yrs, [x["cfads"] for x in rows], color=TEAL, width=0.55, label="Plant cash flow (CFADS)")
    ax.plot(yrs, [x["ds"] for x in rows], color=OR, marker="o", lw=2, ms=4, label="Debt service")
    for i, x in enumerate(rows):
        if x["dscr"] is not None and x["principal"] > 0:
            ax.text(i, x["cfads"] + max(1, r["ss_cfads"]) * 0.03, f'{x["dscr"]:.1f}x', ha="center", fontsize=6.5, color=NAVY, fontweight="bold")
    ax.axhline(0, color="#999", lw=0.6)
    ax.set_ylabel("Rs crore", color=GR); _style(ax)
    ax.set_ylim(min(0, min(x["cfads"] for x in rows) * 1.2), max(x["cfads"] for x in rows) * 1.32)
    ax.legend(frameon=False, fontsize=6.5, loc="upper left", ncol=2)
    fig.tight_layout(); b = io.BytesIO(); fig.savefig(b, format="png"); plt.close(fig); b.seek(0); return b

def chart_repay(r):
    rows = r["rows"]; yrs = [f"Y{x['year']}" for x in rows]
    fig, ax = plt.subplots(figsize=(4.2, 3.2), dpi=200)
    p = [x["principal"] for x in rows]; it = [x["interest"] for x in rows]
    ax.bar(yrs, p, color=NAVY, width=0.55, label="Principal")
    ax.bar(yrs, it, bottom=p, color=OR, width=0.55, label="Interest")
    ax2 = ax.twinx(); ax2.plot(yrs, [x["closing"] for x in rows], color=TEAL, marker="o", lw=2, ms=4, label="Loan outstanding")
    ax2.set_ylim(0, r["debt"] * 1.15 if r["debt"] else 1); ax2.tick_params(colors=GR)
    for s in ["top"]: ax2.spines[s].set_visible(False)
    ax.set_ylabel("Repayment, Rs crore", color=GR); ax2.set_ylabel("Outstanding, Rs crore", color=GR); _style(ax)
    h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
    ax.set_ylim(0, max(a + b for a, b in zip(p, it)) * 1.35)
    ax.legend(h1 + h2, l1 + l2, frameon=False, fontsize=6.5, loc="upper right", ncol=3)
    fig.tight_layout(); b = io.BytesIO(); fig.savefig(b, format="png"); plt.close(fig); b.seek(0); return b

def reasons(r):
    q = r["q"]; out = []
    out.append(f"<b>The plant can carry the debt.</b> Its own cash flow covers loan payments at least <b>{r['min_dscr']:.2f}x</b> "
               f"against a {q['dscr_target']:.2f}x target, and still <b>{r['min_dscr_stress']:.2f}x</b> if earnings fall 20% and rates rise 2 points.")
    if r.get("stress_cut"):
        out.append(f"<b>Debt trimmed for the stress case.</b> At Rs {fmt(r['debt'] + r['stress_cut'])} cr, cover would fall below 1.20x if earnings dropped 20% "
                   f"and rates rose 2 points, so debt is cut by Rs {fmt(r['stress_cut'])} cr to Rs {fmt(r['debt'])} cr.")
    elif r["binding"].startswith("minimum"):
        out.append(f"<b>Debt is capped by prudence, not cash flow.</b> Cash flow alone could support about Rs {fmt(r['cap_project'])} cr, "
                   f"but lenders expect at least {q['min_equity']:.0%} own contribution, so debt is set at {r['debt_pct']:.0%}.")
    else:
        out.append(f"<b>Cash flow sets the limit.</b> Debt is sized at the maximum the plant's cash flow supports at {q['dscr_target']:.2f}x cover; "
                   f"the rest must come from equity.")
    out.append(f"<b>Debt is the cheaper external money.</b> After tax it costs about {r['after_tax_kd']:.1%} a year, versus roughly {r['ke']:.0%} expected by new equity investors, "
               f"and it keeps ownership undiluted.")
    if r["new_equity"] <= 0:
        out.append(f"<b>No new shares needed.</b> The {r['equity_pct']:.0%} equity portion (Rs {fmt(r['equity'])} cr) comes from internal accruals; "
                   f"liquid reserves of Rs {fmt(r['liquid'])} cr cover it while keeping a Rs {fmt(q.get('cash_buffer',0))} cr safety buffer.")
    else:
        out.append(f"<b>Fresh equity required.</b> Internal funds cover Rs {fmt(r['internal'])} cr; the remaining <b>Rs {fmt(r['new_equity'])} cr</b> should be raised as new equity.")
    if r["after_tax_cash"] < r["after_tax_kd"] and r["internal"] >= q["project_cost"]:
        extra = r["debt"] * (r["after_tax_kd"] - r["after_tax_cash"])
        out.append(f"<b>Alternative:</b> surplus cash could fund the whole plant and save about Rs {fmt(extra)} cr a year in net interest, "
                   f"at the cost of reducing liquid reserves by Rs {fmt(r['debt'])} cr. The recommended mix preserves liquidity and dividend capacity.")
    return out

def build_pdf(r, meta, path_or_buf):
    q = r["q"]; W, H = A4; c = canvas.Canvas(path_or_buf, pagesize=A4)
    unit = q.get("unit_name", "units"); m = 36
    # header
    c.setFillColor(HexColor(NAVY)); c.rect(0, H - 92, W, 92, fill=1, stroke=0)
    c.setFillColor(HexColor(TEAL)); c.rect(0, H - 96, W, 4, fill=1, stroke=0)
    c.setFillColor(HexColor(OR)); c.rect(0, H - 96, 160, 4, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 17); c.drawString(m, H - 40, "Funding Recommendation: Debt vs Equity")
    c.setFont("Helvetica", 9.5); c.setFillColor(HexColor("#BFD3E6"))
    c.drawString(m, H - 58, f"{meta['company']}  |  {meta['purpose']}")
    c.drawString(m, H - 72, f"Industry: {q['industry'].title()}  |  Project cost Rs {fmt(q['project_cost'])} crore  |  Base year: FY{meta['base_year']} ({meta['base_status']})  |  {datetime.date.today():%d %b %Y}")
    c.setFont("Helvetica-Bold", 8); c.drawRightString(W - m, H - 40, "GLASS-BOX ADVISORY")

    # recommendation strip
    y = H - 156; sh = 52
    c.setFillColor(HexColor(ALT)); c.rect(m, y, W - 2 * m, sh, fill=1, stroke=0)
    c.setFillColor(HexColor(TEAL)); c.rect(m, y, 4, sh, fill=1, stroke=0)
    c.setFillColor(HexColor(NAVY)); c.setFont("Helvetica-Bold", 11); c.drawString(m + 14, y + 33, "Recommended funding mix")
    c.setFont("Helvetica", 7.6); c.setFillColor(HexColor(GR))
    eq_src = "internal accruals (no new share issue)" if r["new_equity"] <= 0 else f"Rs {fmt(r['new_equity'])} cr new equity"
    c.drawString(m + 14, y + 20, f"Debt: term loan, {q['tenor']} yrs + {q['moratorium']} yr moratorium @ {q['rate']:.1%}")
    c.drawString(m + 14, y + 9, f"Equity: {eq_src}")
    bx = m + 250; bwid = W - m - 10 - bx
    c.setFillColor(HexColor(NAVY)); c.rect(bx, y + 22, bwid * r["debt_pct"], 18, fill=1, stroke=0)
    c.setFillColor(HexColor(OR)); c.rect(bx + bwid * r["debt_pct"], y + 22, bwid * r["equity_pct"], 18, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9)
    if r["debt_pct"] > 0.2:
        c.setFillColor(white); c.drawString(bx + 6, y + 28, f"{r['debt_pct']:.0%} DEBT")
    if r["equity_pct"] > 0.2:
        c.setFillColor(HexColor(NAVY)); c.drawRightString(bx + bwid - 6, y + 28, f"{r['equity_pct']:.0%} EQUITY")
    c.setFont("Helvetica-Bold", 8.5); c.setFillColor(HexColor(NAVY))
    c.drawString(bx, y + 9, f"Debt Rs {fmt(r['debt'])} cr ({r['debt_pct']:.0%})")
    c.drawRightString(bx + bwid, y + 9, f"Equity Rs {fmt(r['equity'])} cr ({r['equity_pct']:.0%})")

    # KPI boxes
    y2 = y - 64; kw = (W - 2 * m - 3 * 8) / 4
    cpu0, cpu1 = r["cpu0"] * 1e7, r["cpu_new"] * 1e7
    kpis = [("Capacity added", f"+{r['cap_increase']:.0%}", f"+{fmt(q['new_capacity'])} {unit}/yr"),
            ("Cost per unit", f"{(cpu1/cpu0-1):+.1%}", f"{money(cpu0)} to {money(cpu1)} per {unit[:-1] if unit.endswith('s') else unit}"),
            ("Extra cash flow a year", f"Rs {fmt(r['ss_cfads'])} cr/yr", f"+{r['cf_uplift']:.1%} on company cash flow"),
            ("Debt the plant can bear", f"Rs {fmt(r['cap_project'])} cr", f"min DSCR {r['min_dscr']:.2f}x (stress {r['min_dscr_stress']:.2f}x)")]
    for i, (t, v, s) in enumerate(kpis):
        x = m + i * (kw + 8)
        c.setStrokeColor(HexColor("#D9DEE5")); c.setFillColor(white); c.roundRect(x, y2, kw, 52, 4, fill=1, stroke=1)
        c.setFillColor(HexColor(GR)); c.setFont("Helvetica", 7.2); c.drawString(x + 8, y2 + 40, t.upper())
        c.setFillColor(HexColor(NAVY)); c.setFont("Helvetica-Bold", 13); c.drawString(x + 8, y2 + 22, v)
        c.setFillColor(HexColor(GR)); c.setFont("Helvetica", 6.6); c.drawString(x + 8, y2 + 9, s)

    # charts
    y3 = y2 - 18
    c.setFillColor(HexColor(TEAL)); c.setFont("Helvetica-Bold", 9.5)
    c.drawString(m, y3, "Plant cash flow vs debt service (DSCR labelled)"); c.drawString(W / 2 + 4, y3, "How the loan is repaid")
    cw = (W - 2 * m - 10) / 2; ch = cw * 3.2 / 4.2
    c.drawImage(ImageReader(chart_cashflow(r)), m, y3 - 6 - ch, cw, ch)
    c.drawImage(ImageReader(chart_repay(r)), m + cw + 10, y3 - 6 - ch, cw, ch)

    # reasons + sources/uses
    y4 = y3 - 6 - ch - 14
    c.setFillColor(HexColor(TEAL)); c.setFont("Helvetica-Bold", 9.5); c.drawString(m, y4, "Why this mix")
    st = ParagraphStyle("b", fontName="Helvetica", fontSize=7.4, leading=9.2, textColor=HexColor("#222222"), bulletIndent=0, leftIndent=9, spaceAfter=3)
    paras = [Paragraph(t, st, bulletText="\u2022") for t in reasons(r)]
    fw = (W - 2 * m) * 0.62
    Frame(m, 64 + 14 * len(r["rows"]) + 30, fw, y4 - (64 + 14 * len(r["rows"]) + 30), leftPadding=0, rightPadding=6, topPadding=4, bottomPadding=0, showBoundary=0).addFromList(paras, c)

    # sources & uses table
    tx = m + fw + 10; tw = W - m - tx
    c.setFillColor(HexColor(TEAL)); c.setFont("Helvetica-Bold", 9.5); c.drawString(tx, y4, "Uses and sources (Rs cr)")
    rows = [("USES", None), ("Plant & machinery, civil", r["capex"]), ("Working capital margin", q["wc_margin"]), ("Total project cost", q["project_cost"]),
            ("SOURCES", None), ("Term loan", r["debt"]), ("Internal accruals", min(r["equity"], r["internal"])), ("New equity", r["new_equity"]), ("Total", q["project_cost"])]
    yy = y4 - 16
    for lab, val in rows:
        if val is None:
            c.setFillColor(HexColor(NAVY)); c.rect(tx, yy - 3, tw, 13, fill=1, stroke=0)
            c.setFillColor(white); c.setFont("Helvetica-Bold", 7.2); c.drawString(tx + 5, yy + 1, lab)
        else:
            bold = lab.startswith("Total")
            c.setFillColor(HexColor("#222222")); c.setFont("Helvetica-Bold" if bold else "Helvetica", 7.4)
            c.drawString(tx + 5, yy + 1, lab); c.drawRightString(tx + tw - 5, yy + 1, fmt(val))
            c.setStrokeColor(HexColor("#D9DEE5")); c.line(tx, yy - 3, tx + tw, yy - 3)
        yy -= 12.5
    c.setFont("Helvetica", 6.6); c.setFillColor(HexColor(GR))
    c.drawString(tx, yy, f"Payback {r['payback']:.1f} yrs  |  Company DSCR (min) {r['min_dscr_company']:.1f}x")

    # year-by-year table
    yt = 64; cols = ["Year", "Utilisation", "Revenue", "EBITDA", "CFADS", "Interest", "Principal", "DSCR", "Outstanding"]
    c.setFillColor(HexColor(TEAL)); c.setFont("Helvetica-Bold", 9.5); c.drawString(m, yt + 14 + 14 * len(r["rows"]), "Year by year (Rs crore)")
    cwid = (W - 2 * m) / len(cols); ytop = yt + 14 * len(r["rows"])
    c.setFillColor(HexColor(NAVY)); c.rect(m, ytop - 2, W - 2 * m, 13, fill=1, stroke=0)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 6.8)
    for j, h in enumerate(cols): c.drawRightString(m + (j + 1) * cwid - 4, ytop + 2, h) if j else c.drawString(m + 4, ytop + 2, h)
    for i, x in enumerate(r["rows"]):
        yy2 = ytop - 14 * (i + 1)
        if i % 2: c.setFillColor(HexColor(ALT)); c.rect(m, yy2 - 2, W - 2 * m, 14, fill=1, stroke=0)
        vals = [f"Y{x['year']}", f"{x['util']:.0%}", fmt(x["revenue"]), fmt(x["ebitda"]), fmt(x["cfads"]), fmt(x["interest"]),
                fmt(x["principal"]), (f"{x['dscr']:.2f}x" if x["dscr"] is not None and x["principal"] > 0 else "-"), fmt(x["closing"])]
        c.setFillColor(HexColor("#222222")); c.setFont("Helvetica", 6.9)
        for j, v in enumerate(vals): c.drawRightString(m + (j + 1) * cwid - 4, yy2 + 2, v) if j else c.drawString(m + 4, yy2 + 2, v)

    # footer
    c.setStrokeColor(HexColor("#D9DEE5")); c.line(m, 52, W - m, 52)
    st2 = ParagraphStyle("f", fontName="Helvetica", fontSize=6, leading=7.4, textColor=HexColor(GR))
    foot = (f"Method: company figures from the CMA (FY{meta['base_year']} {meta['base_status']}); sales grown at {r['growth']:.1%} a year; tax {r['tax_rate']:.0%}. "
            f"DSCR = (PAT + depreciation + interest) / (principal + interest), the bank appraisal formula; target {q['dscr_target']:.2f}x and minimum own contribution {q['min_equity']:.0%} "
            f"are typical Indian bank norms (DSCR at least 1.25-1.50; promoter contribution 25-33%). Loan rate {q['rate']:.1%} assumed with RBI repo at 5.50% (7 Oct 2026). "
            f"{meta.get('assumption_note','')} Estimates, not guarantees; subject to lender appraisal and advisor review.")
    Frame(m, 8, W - 2 * m, 44, leftPadding=0, rightPadding=0, topPadding=2, bottomPadding=0).addFromList([Paragraph(foot, st2)], c)
    c.showPage(); c.save()
