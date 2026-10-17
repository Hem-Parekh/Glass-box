"""Equity vs Debt Optimizer: Streamlit screens. All maths lives in the equity_debt package."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # so `equity_debt` imports when run by streamlit

import numpy as np
import pandas as pd
import streamlit as st

from app import charts
from equity_debt import __version__
from equity_debt.advice import suggestions
from equity_debt.analysis import downside, explain, heatmap, horizon_table, sensitivity
from equity_debt.exports import load_scenario, mixes_frame, scenario_json, to_csv, to_excel, to_pdf, yearly_frame
from equity_debt.formatting import inr, mix_label, pct, ratio
from equity_debt.model import METRICS, Inputs, mix_index, optimize, validate

st.set_page_config(page_title="Equity vs Debt Optimizer", page_icon="⚖️", layout="wide", initial_sidebar_state="expanded")

# ---------------- inputs: widget key -> (label, to-model, from-model, help) ----------------
D = Inputs()
FIELDS = {
    "amount_cr": ("Amount to raise (₹ Cr)", lambda v: v * 1e7, D.amount / 1e7, "The total money you want to raise now, in crore. 1 Cr = 100 lakh."),
    "pre_money_cr": ("Current valuation, pre-money (₹ Cr)", lambda v: v * 1e7, D.pre_money / 1e7, "What the company is worth today, before the new money comes in. Investors' share = their money / (this + their money)."),
    "profit_lakh": ("Current profit per month (₹ lakh)", lambda v: v * 1e5, D.profit_month / 1e5, "Profit the business makes in a typical month today, in lakh. This is the money that pays the EMI and the shareholders."),
    "g1_pct": ("Profit growth in year 1 (%)", lambda v: v / 100, D.growth_y1 * 100, "How much profit grows in the first year after the money comes in. Often higher, as the new money is put to work."),
    "g2_pct": ("Profit growth from year 2 (%)", lambda v: v / 100, D.growth_y2 * 100, "Steady growth rate each year after year 1."),
    "rate_pct": ("Loan interest rate (% a year)", lambda v: v / 100, D.interest_rate * 100, "Annual interest the lender charges. EMI is worked out monthly at this rate / 12."),
    "tenure": ("Loan tenure (years)", int, D.tenure_years, "How many years you repay the loan over. EMI stops after this."),
    "horizon": ("Analysis horizon (years)", int, D.horizon_years, "How many years to compare over. Equity costs you every year forever; debt only until the tenure ends, so longer horizons usually favour debt."),
    "tax_pct": ("Tax rate (%)", lambda v: v / 100, D.tax_rate * 100, "Leave at 0 if your profit figure is already after tax. If you enter a rate, profit is treated as pre-tax and loan interest reduces your tax (the tax shield)."),
    "exit_multiple": ("Exit valuation (x annual profit)", float, D.exit_multiple, "What the company is worth at the end of the horizon, as a multiple of that year's annual profit. Your stake = your ownership x this value."),
    "discount_pct": ("Discount rate for present value (%)", lambda v: v / 100, D.discount_rate * 100, "Money later is worth less than money now. Future cash is divided by (1 + this rate) for each year of waiting."),
    "debt_fee_pct": ("Loan processing fee (% of loan)", lambda v: v / 100, D.debt_fee * 100, "One-time fee the lender charges, paid in year 1."),
    "equity_cost_pct": ("Legal / transaction cost on equity (% of equity)", lambda v: v / 100, D.equity_cost * 100, "Lawyers, valuation report, stamp duty and filings for issuing shares, paid in year 1."),
    "payout_pct": ("Profit distributed to shareholders (%)", lambda v: v / 100, D.payout_ratio * 100, "Share of profit (after EMI) actually paid out. What is kept stays in the company and adds to the exit value."),
    "boost_eq": ("Extra growth if equity-funded (points)", lambda v: v / 100, D.growth_boost_equity * 100, "Investors sometimes bring contacts and advice. Add points of growth if fully equity-funded; mixes get a proportional share."),
    "boost_debt": ("Extra growth if debt-funded (points)", lambda v: v / 100, D.growth_boost_debt * 100, "Use a negative number if loan covenants would slow you down."),
    "min_dscr": ("Minimum debt cover you accept (DSCR)", float, D.min_dscr_required, "Reject any mix where profit / EMI falls below this in some year. 1.00 = just able to pay; lenders usually want 1.25."),
}
INPUT_MAP = dict(amount_cr="amount", pre_money_cr="pre_money", profit_lakh="profit_month", g1_pct="growth_y1", g2_pct="growth_y2", rate_pct="interest_rate",
                 tenure="tenure_years", horizon="horizon_years", tax_pct="tax_rate", exit_multiple="exit_multiple", discount_pct="discount_rate",
                 debt_fee_pct="debt_fee", equity_cost_pct="equity_cost", payout_pct="payout_ratio", boost_eq="growth_boost_equity",
                 boost_debt="growth_boost_debt", min_dscr="min_dscr_required")
METRIC_KEYS = list(METRICS)


def set_from_inputs(p: Inputs):
    for k, attr in INPUT_MAP.items():
        v = getattr(p, attr)
        conv = FIELDS[k][1]
        if conv is int:
            st.session_state[k] = int(v)
        elif conv is float:
            st.session_state[k] = float(v)
        elif k.endswith("_cr"):
            st.session_state[k] = round(float(v) / 1e7, 6)
        elif k == "profit_lakh":
            st.session_state[k] = round(float(v) / 1e5, 6)
        else:  # stored as a fraction, shown as a percentage
            st.session_state[k] = round(float(v) * 100, 6)
    st.session_state["metric"] = p.metric


def reset_defaults():
    set_from_inputs(Inputs())
    st.session_state.pop("sel_mix", None)


def on_scenario_upload():
    f = st.session_state.get("scenario_file")
    if not f:
        return
    try:
        name, p = load_scenario(f.getvalue())
        set_from_inputs(p)
        st.session_state["scenario_name"] = name or os.path.splitext(f.name)[0]
        st.session_state["flash"] = f"Loaded scenario “{st.session_state['scenario_name']}”."
        st.session_state.pop("sel_mix", None)
    except Exception as e:  # bad file: tell the user, keep current inputs
        st.session_state["flash_err"] = f"Could not read that file: {e}"


if "amount_cr" not in st.session_state:
    reset_defaults()
st.session_state.setdefault("fmt", "Short (L / Cr)")
st.session_state.setdefault("compare", {})

# ---------------- sidebar ----------------
with st.sidebar:
    st.markdown("### Your raise")
    st.number_input(FIELDS["amount_cr"][0], key="amount_cr", min_value=0.0, step=0.25, format="%.2f", help=FIELDS["amount_cr"][3])
    st.number_input(FIELDS["pre_money_cr"][0], key="pre_money_cr", min_value=0.0, step=0.5, format="%.2f", help=FIELDS["pre_money_cr"][3])
    st.number_input(FIELDS["profit_lakh"][0], key="profit_lakh", min_value=0.0, step=0.5, format="%.2f", help=FIELDS["profit_lakh"][3])
    c1, c2 = st.columns(2)
    c1.number_input("Growth, year 1 (%)", key="g1_pct", step=1.0, format="%.1f", help=FIELDS["g1_pct"][3])
    c2.number_input("Growth, year 2+ (%)", key="g2_pct", step=1.0, format="%.1f", help=FIELDS["g2_pct"][3])
    st.markdown("### The loan")
    c1, c2 = st.columns(2)
    c1.number_input("Interest (% a year)", key="rate_pct", min_value=0.0, max_value=100.0, step=0.5, format="%.2f", help=FIELDS["rate_pct"][3])
    c2.number_input("Tenure (years)", key="tenure", min_value=1, max_value=30, step=1, help=FIELDS["tenure"][3])
    st.slider(FIELDS["horizon"][0], 1, 20, key="horizon", help=FIELDS["horizon"][3])
    with st.expander("Advanced", expanded=False):
        st.number_input(FIELDS["tax_pct"][0], key="tax_pct", min_value=0.0, max_value=99.0, step=1.0, format="%.1f", help=FIELDS["tax_pct"][3])
        st.number_input(FIELDS["exit_multiple"][0], key="exit_multiple", min_value=0.0, step=0.5, format="%.1f", help=FIELDS["exit_multiple"][3])
        st.number_input(FIELDS["discount_pct"][0], key="discount_pct", min_value=-49.0, max_value=100.0, step=1.0, format="%.1f", help=FIELDS["discount_pct"][3])
        c1, c2 = st.columns(2)
        c1.number_input("Loan fee (%)", key="debt_fee_pct", min_value=0.0, max_value=99.0, step=0.25, format="%.2f", help=FIELDS["debt_fee_pct"][3])
        c2.number_input("Equity costs (%)", key="equity_cost_pct", min_value=0.0, max_value=99.0, step=0.25, format="%.2f", help=FIELDS["equity_cost_pct"][3])
        st.slider(FIELDS["payout_pct"][0], 0.0, 100.0, key="payout_pct", step=5.0, help=FIELDS["payout_pct"][3])
        c1, c2 = st.columns(2)
        c1.number_input("Growth boost, equity (pts)", key="boost_eq", step=1.0, format="%.1f", help=FIELDS["boost_eq"][3])
        c2.number_input("Growth boost, debt (pts)", key="boost_debt", step=1.0, format="%.1f", help=FIELDS["boost_debt"][3])
        st.number_input(FIELDS["min_dscr"][0], key="min_dscr", min_value=1.0, max_value=3.0, step=0.05, format="%.2f", help=FIELDS["min_dscr"][3])
    st.markdown("### Results")
    st.selectbox("Rank mixes by", METRIC_KEYS, key="metric", format_func=lambda k: METRICS[k],
                 help="Present value counts money sooner as worth more. Exit-inclusive wealth adds the value of your shares at the end of the horizon.")
    st.radio("Show amounts as", ["Short (L / Cr)", "Full (₹1,23,45,678)"], key="fmt", horizontal=True)
    st.button("Reset to defaults", on_click=reset_defaults, width="stretch")
    st.markdown("### Scenarios")
    st.text_input("Scenario name", key="scenario_name", placeholder="e.g. Base case")
    st.file_uploader("Load a scenario (.json)", type=["json"], key="scenario_file", on_change=on_scenario_upload)
    st.caption(f"v{__version__} · runs entirely on this computer. Switch light / dark mode from the ⋮ menu → Settings.")

SHORT = st.session_state["fmt"].startswith("Short")
f = lambda x: inr(x, SHORT)


def current_inputs() -> Inputs:
    kw = {INPUT_MAP[k]: FIELDS[k][1](st.session_state[k]) for k in INPUT_MAP}
    kw["metric"] = st.session_state["metric"]
    return Inputs(**kw)


P = current_inputs()


def theme_colors():
    t = "light"
    try:
        t = st.context.theme.type or "light"
    except Exception:
        pass
    return charts.PALETTES["dark" if t == "dark" else "light"]


C = theme_colors()


@st.cache_data(show_spinner=False)
def cached_analyses(d: dict):
    p = Inputs.from_dict(d)
    return horizon_table(p), sensitivity(p), heatmap(p)


@st.cache_data(show_spinner=False)
def cached_files(d: dict, idx: int, short: bool):
    p = Inputs.from_dict(d)
    r = optimize(p)
    secs = suggestions(r, downside(p), horizon_table(p), short=True)
    return to_excel(r, idx), to_csv(r), to_pdf(r, secs)


# ---------------- header ----------------
st.title("Equity vs Debt Optimizer")
st.caption("Tests every mix from 0% to 100% equity and shows which leaves the founder the most money. "
           "**Decision-support model, not financial advice.**")
if st.session_state.pop("flash", None):
    st.success(f"Loaded scenario “{st.session_state.get('scenario_name', '')}”.")
if (err := st.session_state.pop("flash_err", None)):
    st.error(err)

errors, warnings = validate(P)
for e in errors:
    st.error(e)
if errors:
    st.stop()
for w in warnings:
    st.warning(w)

R = optimize(P)
PR = R.projection
M = PR.metric()
B = R.best
DOWN = downside(P)

# ---------------- headline ----------------
with st.container(border=True):
    st.markdown(f"#### Best mix for the founder: **{round(PR.equity_share[B] * 100)}% equity / {100 - round(PR.equity_share[B] * 100)}% debt**")
    st.caption(f"Raise {f(PR.equity_amount[B])} as equity and {f(PR.debt_amount[B])} as a loan. You keep {pct(PR.founder_own[B])} of the company. "
               f"Ranked by {METRICS[P.metric].lower()}.")
    k = st.columns(5)
    k[0].metric("Your cash a month, year 1", f(PR.founder_cash[B, 0] / 12), help="Your share of the profit left after the EMI, per month, in the first year.")
    k[1].metric(f"Total cash, {P.horizon_years} years", f(PR.total_cash[B]))
    k[2].metric("Exit-inclusive wealth", f(PR.wealth[B]), help="Total cash plus the value of your stake at the end of the horizon.")
    k[3].metric("vs 100% equity", f(M[B] - M[-1]), delta=f"{(M[B] - M[-1]) / abs(M[-1]):+.1%}" if M[-1] else None, help=METRICS[P.metric])
    if R.feasible[0]:
        k[4].metric("vs 100% debt", f(M[B] - M[0]), delta=f"{(M[B] - M[0]) / abs(M[0]):+.1%}" if M[0] and B != 0 else "this is it", help=METRICS[P.metric])
    else:
        k[4].metric("vs 100% debt", "Not possible", help="100% debt is rejected: profit would not cover the EMI in some year.")
    if PR.debt_amount[B] > 0:
        md = PR.min_dscr[B]
        if R.risky[B]:
            st.warning(f"Debt cover is thin: in the weakest year profit is {ratio(md)} the EMI (lenders usually want 1.25x).")
        else:
            st.info(f"Debt cover is comfortable: profit is at least {ratio(md)} the EMI in every year of the loan.")
    rejected = int((~R.feasible).sum())
    if rejected:
        st.caption(f"{rejected} mixes rejected because profit would not cover the EMI (DSCR below {max(1.0, P.min_dscr_required):.2f}x) in some year.")

# selected mix for the detail views
if "sel_mix" not in st.session_state:
    st.session_state["sel_mix"] = int(round(PR.equity_share[B] * 100))
cs1, cs2 = st.columns([4, 1])
cs1.slider("Look at a mix (equity %)", 0, 100, key="sel_mix", help="Used by the year-by-year charts, the calculation view and the exports.")
cs2.button("Back to best mix", on_click=lambda: st.session_state.update(sel_mix=int(round(PR.equity_share[B] * 100))), width="stretch")
SEL = mix_index(st.session_state["sel_mix"] / 100)

tabs = st.tabs(["Overview", "Year by year", "Longer horizon?", "Sensitivity", "All mixes & export", "Suggestions", "Show calculation", "Compare scenarios"])

# ---------------- overview ----------------
with tabs[0]:
    a, b = st.columns(2)
    keys = sorted({0, 25, 50, 75, 100, B})
    yr = a.selectbox("Year shown", list(PR.years), index=0, key="split_year", format_func=lambda y: f"Year {y}")
    a.plotly_chart(charts.monthly_split(R, keys, yr, C, SHORT), config=charts.CONFIG)
    b.plotly_chart(charts.wealth_curve(R, C, SHORT, SEL), config=charts.CONFIG)
    st.caption("Hover for exact amounts. Use the camera icon on any chart to download it as a PNG.")

# ---------------- year by year ----------------
with tabs[1]:
    st.plotly_chart(charts.yearly_flows(R, SEL, C, SHORT), config=charts.CONFIG)
    a, b = st.columns(2)
    a.plotly_chart(charts.cumulative(R, SEL, C, SHORT), config=charts.CONFIG)
    fig = charts.dscr_chart(R, SEL, C)
    if fig is None:
        b.info("This mix has no loan, so there is no EMI to cover.")
    else:
        b.plotly_chart(fig, config=charts.CONFIG)
    yf = yearly_frame(R, SEL)
    money = [c for c in yf.columns if c not in ("Year", "DSCR")]
    st.dataframe(yf.style.format({**{c: f for c in money}, "DSCR": lambda v: "no loan" if v is None or pd.isna(v) else f"{v:.2f}x"}),
                 hide_index=True, width="stretch")

HROWS, SENS, HM = cached_analyses(P.to_dict())

# ---------------- horizon ----------------
with tabs[2]:
    st.markdown("#### What if the horizon is longer?")
    hdf = pd.DataFrame([{"Horizon": f"{h['horizon']} years", "Best mix": mix_label(h["best_equity"]), "Best outcome": f(h["best_score"]),
                         "100% equity": f(h["all_equity"]), "100% debt": f(h["all_debt"]) if h["all_debt"] is not None else "rejected",
                         "Best vs 100% equity": f(h["gap_vs_equity"]),
                         "Debt pulls ahead in cash": f"year {h['breakeven_cash_year']}" if h["breakeven_cash_year"] else "not within horizon"} for h in HROWS])
    st.dataframe(hdf, hide_index=True, width="stretch")
    from equity_debt.analysis import horizon_explanation
    st.info(horizon_explanation(HROWS))
    st.caption(f"Ranked by {METRICS[P.metric].lower()}. Everything except the horizon is kept as you entered it.")

# ---------------- sensitivity ----------------
with tabs[3]:
    st.markdown(f"#### How sure is the answer?  Base case: **{mix_label(SENS['base_equity'])}**")
    a, b = st.columns(2)
    a.plotly_chart(charts.tornado(SENS, C, SHORT), config=charts.CONFIG)
    b.plotly_chart(charts.heatmap_chart(HM, C), config=charts.CONFIG)
    if np.ptp(HM["best_equity"]) == 0:
        b.caption(f"The best mix is {mix_label(HM['best_equity'][0, 0])} everywhere on this grid: across these interest rates and growth rates the answer does not change.")
    sdf = pd.DataFrame([{"Change": f"{r['variable']} {r['case']}", "Best mix": mix_label(r["best_equity"]), "Best outcome": f(r["best_score"]),
                         "Change vs base": f(r["change"]), "Mix moved": "no" if r["mix_moved"] == 0 else f"{r['mix_moved'] * 100:+.0f} pts equity"} for r in SENS["rows"]])
    st.dataframe(sdf, hide_index=True, width="stretch")

# ---------------- all mixes ----------------
with tabs[4]:
    df = mixes_frame(R)
    c1, c2, c3 = st.columns([2, 1, 1])
    lo, hi = c1.slider("Equity % range", 0, 100, (0, 100), key="tbl_range")
    only_ok = c2.checkbox("Allowed mixes only", key="tbl_ok")
    step = c3.selectbox("Show every", [1, 5, 10], index=1, key="tbl_step", format_func=lambda s: f"{s}%")
    view = df[(df["Equity %"] >= lo) & (df["Equity %"] <= hi) & ((df["Equity %"] % step == 0) | df["Best"])]
    if only_ok:
        view = view[view["Allowed"]]
    money = ["Equity raised", "Loan", "EMI per month", "Founder cash per month, year 1", "Total founder cash", "PV of founder cash",
             "Founder exit stake", "Exit-inclusive wealth", "PV of wealth"]
    sty = view.style.format({**{c: f for c in money}, "Lowest DSCR": lambda v: "no loan" if v is None or pd.isna(v) else f"{v:.2f}x",
                                                          "Investor ownership %": "{:.2f}%", "Founder ownership %": "{:.2f}%",
                                                          "Beats 100% equity in cash from year": lambda v: "-" if v is None or pd.isna(v) else f"year {int(v)}"})
    sty = sty.apply(lambda row: ["font-weight: 700" if row["Best"] else "" for _ in row], axis=1)
    st.dataframe(sty, hide_index=True, width="stretch", height=420)
    st.caption("Click a column header to sort. Amounts follow the short / full setting; the files hold exact rupees.")
    xlsx, csv, pdf = cached_files(P.to_dict(), SEL, SHORT)
    d1, d2, d3 = st.columns(3)
    d1.download_button("Download Excel (.xlsx)", xlsx, "equity-debt-mixes.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", width="stretch")
    d2.download_button("Download CSV", csv, "equity-debt-mixes.csv", "text/csv", width="stretch")
    d3.download_button("Download PDF summary", pdf, "equity-debt-recommendation.pdf", "application/pdf", width="stretch")

# ---------------- suggestions ----------------
with tabs[5]:
    for title, items in suggestions(R, DOWN, HROWS, short=SHORT):
        st.markdown(f"#### {title}")
        st.markdown("\n".join(f"- {it}" for it in items))
    st.caption("Written from the numbers by fixed rules, not by AI. Decision-support model, not financial advice.")

# ---------------- show calculation ----------------
with tabs[6]:
    ex = explain(P, SEL / 100, short=SHORT)
    st.markdown(f"#### Step by step: {ex['label']}")
    for n, (title, formula, worked) in enumerate(ex["steps"], 1):
        st.markdown(f"**{n}. {title}**")
        st.code(formula, language=None)
        st.markdown(worked)
    yd = pd.DataFrame(ex["years"])
    yd.columns = ["Year", "Profit", "EMI", "Interest", "Principal", "Tax", "Tax shield", "Left after debt", "Investors", "Founder", "Founder a month", "Founder cumulative", "DSCR", "Loan outstanding"]
    st.dataframe(yd.style.format({**{c: f for c in yd.columns if c not in ("Year", "DSCR")}, "DSCR": lambda v: "no loan" if np.isinf(v) else f"{v:.2f}x"}),
                 hide_index=True, width="stretch")
    if PR.debt_amount[SEL] > 0:
        with st.expander("Full month-by-month loan schedule"):
            from equity_debt.model import amortization_schedule
            sch = pd.DataFrame(amortization_schedule(PR.debt_amount[SEL], P.interest_rate, P.tenure_years))
            sch.columns = ["Month", "Opening balance", "EMI", "Interest", "Principal", "Closing balance"]
            st.dataframe(sch.style.format({c: f for c in sch.columns if c != "Month"}), hide_index=True, width="stretch", height=360)

# ---------------- compare scenarios ----------------
with tabs[7]:
    st.markdown("#### Save, load and compare")
    name = st.session_state.get("scenario_name") or "Current"
    c1, c2, c3 = st.columns(3)
    c1.download_button("Save current scenario (.json)", scenario_json(P, name), f"{name.strip().replace(' ', '-').lower() or 'scenario'}.json", "application/json", width="stretch")
    if c2.button("Add current to comparison", width="stretch", disabled=len(st.session_state["compare"]) >= 3):
        st.session_state["compare"][name] = P.to_dict()
        st.rerun()
    if c3.button("Clear comparison", width="stretch"):
        st.session_state["compare"] = {}
        st.rerun()
    ups = st.file_uploader("Or add saved scenarios (.json, up to 3)", type=["json"], accept_multiple_files=True, key="cmp_files")
    for up in ups or []:
        if len(st.session_state["compare"]) >= 3:
            break
        try:
            nm, q = load_scenario(up.getvalue())
            st.session_state["compare"].setdefault(nm or os.path.splitext(up.name)[0], q.to_dict())
        except Exception as e:
            st.error(f"{up.name}: {e}")
    items = [(f"{name} (on screen)", R)] + [(n, optimize(Inputs.from_dict(d))) for n, d in st.session_state["compare"].items()]
    if len(items) == 1:
        st.info("Add 1-3 scenarios to compare them with what is on screen. Change the inputs, name the scenario, then click “Add current to comparison”.")
    else:
        rows = {}
        for n, r in items:
            pr, b = r.projection, r.best
            p = r.inputs
            rows[n] = {"Raise": f(p.amount), "Valuation": f(p.pre_money), "Profit a month": f(p.profit_month), "Growth Y1 / Y2+": f"{pct(p.growth_y1, 0)} / {pct(p.growth_y2, 0)}",
                       "Loan": f"{pct(p.interest_rate)} for {p.tenure_years} yrs", "Horizon": f"{p.horizon_years} yrs", "Best mix": mix_label(pr.equity_share[b]),
                       "Founder cash a month, Y1": f(pr.founder_cash[b, 0] / 12), "Total cash": f(pr.total_cash[b]), "Exit-inclusive wealth": f(pr.wealth[b]),
                       "PV of wealth": f(pr.npv_wealth[b]), "Founder keeps": pct(pr.founder_own[b]), "Lowest DSCR": ratio(pr.min_dscr[b])}
        st.dataframe(pd.DataFrame(rows), width="stretch")
        st.plotly_chart(charts.scenario_curves(items, C, SHORT), config=charts.CONFIG)

st.divider()
st.caption("Decision-support model, not financial advice. Results depend entirely on the inputs; check with a qualified advisor before raising money.")
