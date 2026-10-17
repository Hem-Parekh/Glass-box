"""Plotly charts. Each role keeps one colour everywhere: loan/EMI = blue, investors = orange,
founder = teal. One y-axis per chart; values are shown in Rs lakh or crore with full
Indian-format amounts in the tooltips."""
from __future__ import annotations

import numpy as np
import plotly.graph_objects as go

from equity_debt.formatting import inr, mix_label
from equity_debt.model import DSCR_DEFAULT, DSCR_RISKY, METRICS

# Validated with the dataviz palette checker (lightness band, CVD separation, contrast).
PALETTES = {
    "light": dict(debt="#2F6BB3", investor="#D9861C", founder="#139A8F", tax="#8A96A3", kept="#C5CDD6", fees="#4E5966",
                  ink="#1E2935", muted="#5B6B7C", grid="#E6EBF0", good="#1E7F4F", warn="#9A6200", bad="#B3261E", other="#3C4D60"),
    "dark": dict(debt="#5A8FD6", investor="#CF8526", founder="#21A89E", tax="#7D8A98", kept="#3E4C5C", fees="#A9B4C0",
                 ink="#E6EDF4", muted="#9AAABB", grid="#24323F", good="#5BCB91", warn="#F2B552", bad="#FF8A80", other="#C3D0DD"),
}
CONFIG = {"displaylogo": False, "toImageButtonOptions": {"format": "png", "scale": 2, "filename": "equity-debt-optimizer"},
          "modeBarButtonsToRemove": ["lasso2d", "select2d"]}


def unit_for(values) -> tuple[float, str]:
    """Show charts in crore if the numbers are that big, otherwise lakh."""
    mx = float(np.nanmax(np.abs(np.asarray(values, dtype=float)[np.isfinite(values)]))) if np.size(values) else 0
    return (1e7, "Cr") if mx >= 1e7 else (1e5, "L")


def _layout(fig, c, title, ytitle, height=380, **kw):
    fig.update_layout(title=dict(text=title, x=0, xanchor="left", font=dict(size=15)), height=height, margin=dict(l=10, r=10, t=48, b=10),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color=c["ink"]),
                      legend=dict(orientation="h", yanchor="top", y=-0.2, xanchor="left", x=0, title=None),
                      hoverlabel=dict(font_size=12), **kw)
    fig.update_yaxes(title_text=ytitle, gridcolor=c["grid"], zerolinecolor=c["muted"], tickfont=dict(color=c["muted"]))
    fig.update_xaxes(gridcolor=c["grid"], tickfont=dict(color=c["muted"]), showgrid=False)
    return fig


def monthly_split(r, idxs, year, c, short):
    """Stacked bars: where each month's profit goes, for a few mixes."""
    pr, y = r.projection, year - 1
    parts = [("EMI to lender", pr.emi[:, y], c["debt"]), ("Tax", pr.tax[:, y], c["tax"]), ("One-time fees", pr.fees[:, y], c["fees"]),
             ("Investors' share", pr.investor_cash[:, y], c["investor"]), ("Kept in company", pr.retained[:, y], c["kept"]),
             ("Founder take-home", pr.founder_cash[:, y], c["founder"])]
    labels = [f"{round(pr.equity_share[i] * 100)}% equity" + (" (best)" if i == r.best else "") for i in idxs]
    div, u = unit_for(pr.profit[idxs, y] / 12)
    fig = go.Figure()
    for name, arr, col in parts:
        vals = arr[idxs] / 12
        if not np.any(np.abs(vals) > 0.5):
            continue
        fig.add_bar(name=name, x=labels, y=vals / div, marker_color=col, marker_line_width=0,
                    customdata=[inr(v, short) for v in vals], hovertemplate="%{x}<br>" + name + ": %{customdata} a month<extra></extra>")
    founder = pr.founder_cash[idxs, y] / 12
    fig.add_scatter(x=labels, y=(pr.profit[idxs, y] / 12) / div, mode="markers+text", marker=dict(size=1, color=c["ink"]), showlegend=False,
                    text=[f"You: {inr(v, True)}" for v in founder], textposition="top center", textfont=dict(color=c["ink"], size=12), hoverinfo="skip")
    fig.update_layout(barmode="relative", bargap=0.35)
    return _layout(fig, c, f"Where each month's profit goes, year {year}", f"₹ {u} a month", 400)


def wealth_curve(r, c, short, selected=None):
    """Founder's outcome for every equity share; the best mix is marked; rejected mixes are hollow."""
    pr, m = r.projection, r.projection.metric()
    x = pr.equity_share * 100
    div, u = unit_for(m)
    ok = r.feasible
    fig = go.Figure()
    fig.add_scatter(x=x[ok], y=m[ok] / div, mode="lines", line=dict(color=c["founder"], width=2.5), name="Allowed mixes",
                    customdata=np.stack([[mix_label(e) for e in pr.equity_share[ok]], [inr(v, short) for v in m[ok]]], axis=-1),
                    hovertemplate="%{customdata[0]}<br>%{customdata[1]}<extra></extra>")
    if (~ok).any():
        fig.add_scatter(x=x[~ok], y=m[~ok] / div, mode="markers", name="Rejected: EMI not covered",
                        marker=dict(symbol="circle-open", size=7, color=c["bad"]),
                        customdata=np.stack([[mix_label(e) for e in pr.equity_share[~ok]], [inr(v, short) for v in m[~ok]]], axis=-1),
                        hovertemplate="%{customdata[0]}<br>%{customdata[1]}<br>Rejected: profit does not cover the EMI<extra></extra>")
    b = r.best
    fig.add_scatter(x=[x[b]], y=[m[b] / div], mode="markers+text", name="Best mix", marker=dict(size=14, color=c["founder"], line=dict(width=3, color=c["ink"])),
                    text=[f"Best: {mix_label(pr.equity_share[b])}"], textposition="bottom right" if b < 30 else "bottom center" if b < 70 else "bottom left",
                    textfont=dict(color=c["ink"], size=13), hovertemplate=f"Best: {mix_label(pr.equity_share[b])}<br>{inr(m[b], short)}<extra></extra>")
    if selected is not None and selected != b:
        fig.add_scatter(x=[x[selected]], y=[m[selected] / div], mode="markers", name="Mix you are looking at",
                        marker=dict(size=11, symbol="diamond", color=c["other"]),
                        hovertemplate=f"{mix_label(pr.equity_share[selected])}<br>{inr(m[selected], short)}<extra></extra>")
    fig.update_xaxes(title_text="Equity share of the raise (%)", range=[-2, 102], dtick=10)
    return _layout(fig, c, METRICS[r.inputs.metric], f"₹ {u}", 400)


def yearly_flows(r, idx, c, short):
    """Year-by-year: profit split into EMI, tax, investors, kept, founder (stack top = profit)."""
    pr, yrs = r.projection, [f"Y{y}" for y in r.projection.years]
    div, u = unit_for(pr.profit[idx])
    fig = go.Figure()
    for name, arr, col in [("EMI to lender", pr.emi[idx], c["debt"]), ("Tax", pr.tax[idx], c["tax"]), ("One-time fees", pr.fees[idx], c["fees"]),
                           ("Investors' share", pr.investor_cash[idx], c["investor"]), ("Kept in company", pr.retained[idx], c["kept"]),
                           ("Founder share", pr.founder_cash[idx], c["founder"])]:
        if np.any(np.abs(arr) > 0.5):
            fig.add_bar(name=name, x=yrs, y=arr / div, marker_color=col, customdata=[inr(v, short) for v in arr],
                        hovertemplate="%{x} " + name + ": %{customdata}<extra></extra>")
    fig.add_scatter(name="Profit", x=yrs, y=pr.profit[idx] / div, mode="lines+markers", line=dict(color=c["ink"], width=2, dash="dot"),
                    customdata=[inr(v, short) for v in pr.profit[idx]], hovertemplate="%{x} profit: %{customdata}<extra></extra>")
    fig.update_layout(barmode="relative", bargap=0.3)
    return _layout(fig, c, f"Cash flow by year: {mix_label(pr.equity_share[idx])}", f"₹ {u} a year", 400)


def cumulative(r, idx, c, short):
    """Cumulative founder cash for 100% equity, 100% debt, the best mix and the mix being viewed (one line each)."""
    pr, yrs = r.projection, list(r.projection.years)
    series = {100: ["100% equity", c["investor"], "solid"], 0: ["100% debt", c["debt"], "solid"]}
    if r.best in series:
        series[r.best][0] += " (best)"
    else:
        series[r.best] = [f"Best mix ({round(pr.equity_share[r.best] * 100)}% equity)", c["founder"], "solid"]
    if idx not in series:
        series[idx] = [f"{round(pr.equity_share[idx] * 100)}% equity (viewing)", c["other"], "dash"]
    div, u = unit_for(pr.cum_founder_cash[list(series)])
    fig = go.Figure()
    for i, (label, col, dash) in series.items():
        fig.add_scatter(x=yrs, y=pr.cum_founder_cash[i] / div, name=label, mode="lines+markers",
                        line=dict(color=col, width=3 if i == r.best else 2, dash=dash), marker=dict(size=7),
                        customdata=[inr(v, short) for v in pr.cum_founder_cash[i]], hovertemplate="%{customdata}<extra>" + label + "</extra>")
    if r.breakeven_cash_year:
        fig.add_vline(x=r.breakeven_cash_year, line=dict(color=c["muted"], dash="dot"),
                      annotation_text=f"100% debt ahead from year {r.breakeven_cash_year}", annotation_position="top left")
    fig.update_xaxes(title_text="Year", dtick=1)
    fig.update_layout(hovermode="x unified")
    return _layout(fig, c, "Cumulative founder cash", f"\u20b9 {u}", 400)


def dscr_chart(r, idx, c):
    pr = r.projection
    d = pr.dscr[idx]
    mask = np.isfinite(d)
    if not mask.any():
        return None
    yrs = [f"Y{y}" for y in pr.years[mask]]
    vals = d[mask]
    cols = [c["bad"] if v < DSCR_DEFAULT else c["warn"] if v < DSCR_RISKY else c["good"] for v in vals]
    status = ["Cannot pay" if v < DSCR_DEFAULT else "Risky" if v < DSCR_RISKY else "Comfortable" for v in vals]
    fig = go.Figure(go.Bar(x=yrs, y=vals, marker_color=cols, text=[f"{v:.2f}x {s}" if s != "Comfortable" else f"{v:.2f}x" for v, s in zip(vals, status)],
                           textposition="outside", customdata=status, hovertemplate="%{x}: %{y:.2f}x (%{customdata})<extra></extra>", showlegend=False))
    for y, col, label in ((DSCR_RISKY, c["warn"], "1.25x: lenders' usual minimum"), (DSCR_DEFAULT, c["bad"], "1.00x: profit just covers the EMI")):
        fig.add_hline(y=y, line=dict(color=col, dash="dash"))
        fig.add_scatter(x=[None], y=[None], mode="lines", line=dict(color=col, dash="dash"), name=label)  # legend entry for the line
    fig.update_yaxes(rangemode="tozero")
    fig.update_layout(yaxis_range=[0, max(vals.max() * 1.18, 1.6)])
    return _layout(fig, c, f"Debt cover (DSCR) by year: {mix_label(pr.equity_share[idx])}", "Profit / EMI", 340)


def tornado(sens, c, short):
    rows = sens["rows"]
    labels = [f"{r['variable']} {r['case']}" for r in rows]
    order = np.argsort([abs(r["change"]) for r in rows])
    div, u = unit_for([r["change"] for r in rows] or [0])
    fig = go.Figure()
    for k in order:
        r = rows[k]
        fig.add_bar(y=[labels[k]], x=[r["change"] / div], orientation="h", marker_color=c["debt"] if r["change"] >= 0 else c["investor"], showlegend=False,
                    text=[f"best: {round(r['best_equity'] * 100)}% equity"], textposition="outside", cliponaxis=False,
                    hovertemplate=f"{labels[k]}<br>Change in best outcome: {inr(r['change'], short)}<br>Best mix: {mix_label(r['best_equity'])}<extra></extra>")
    fig.add_vline(x=0, line=dict(color=c["muted"]))
    lim = max(abs(r["change"]) for r in rows) / div * 1.6 if rows else 1
    fig.update_xaxes(title_text=f"Change in the founder's best outcome (₹ {u}); blue = better, orange = worse",
                     showgrid=True, range=[-lim or -1, lim or 1])
    return _layout(fig, c, "What moves the answer most", "", 420)


def heatmap_chart(hm, c):
    z = hm["best_equity"] * 100
    fig = go.Figure(go.Heatmap(
        z=z, x=[f"{r * 100:.1f}%" for r in hm["rates"]], y=[f"{g * 100:.0f}%" for g in hm["growths"]],
        colorscale=[[0, "#FBEFDC"], [0.5, "#E9A64B"], [1, "#8A4B00"]], zmin=0, zmax=100,
        text=[[f"{v:.0f}%" for v in row] for row in z], texttemplate="%{text}", textfont=dict(size=11),
        colorbar=dict(title="Best equity %", ticksuffix="%"),
        hovertemplate="Interest %{x}, growth %{y}: best mix %{z:.0f}% equity<extra></extra>"))
    fig.update_xaxes(title_text="Loan interest rate", showgrid=False)
    return _layout(fig, c, "Best equity share by interest rate and growth", "Profit growth, year 2 onward", 430)


def scenario_curves(results: list[tuple[str, object]], c, short):
    dashes = ["solid", "dash", "dot", "dashdot"]
    fig = go.Figure()
    allv = np.concatenate([r.projection.metric() for _, r in results])
    div, u = unit_for(allv)
    for k, (name, r) in enumerate(results):
        m = r.projection.metric()
        fig.add_scatter(x=r.projection.equity_share * 100, y=m / div, name=name, mode="lines", line=dict(color=c["ink"] if k == 0 else c["muted"], width=2.5 if k == 0 else 2, dash=dashes[k % 4]),
                        customdata=[inr(v, short) for v in m], hovertemplate="%{x:.0f}% equity: %{customdata}<extra>" + name + "</extra>")
        fig.add_scatter(x=[r.best_equity * 100], y=[m[r.best] / div], mode="markers", marker=dict(size=11, color=c["founder"], line=dict(width=2, color=c["ink"])), showlegend=False,
                        hovertemplate=f"{name}: best {mix_label(r.best_equity)}<extra></extra>")
    fig.update_xaxes(title_text="Equity share of the raise (%)")
    return _layout(fig, c, "Founder outcome by equity share, per scenario", f"₹ {u}", 380)
