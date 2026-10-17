"""Tests for formatting, the what-if analyses, suggestions and exports."""
import io
import json

import openpyxl
import pytest

from equity_debt.advice import suggestions
from equity_debt.analysis import downside, explain, heatmap, horizon_table, sensitivity
from equity_debt.exports import load_scenario, mixes_frame, scenario_json, to_csv, to_excel, to_pdf
from equity_debt.formatting import group_indian, inr, mix_label
from equity_debt.model import Inputs, optimize

P = Inputs()


@pytest.mark.parametrize("n,out", [(0, "0"), (999, "999"), (1000, "1,000"), (100000, "1,00,000"), (12345678, "1,23,45,678"), (1234567890, "1,23,45,67,890")])
def test_indian_grouping(n, out):
    assert group_indian(n) == out


def test_inr_full_and_short():
    assert inr(12345678) == "₹1,23,45,678"
    assert inr(3_00_00_000, short=True) == "₹3.00 Cr"
    assert inr(12_00_000, short=True) == "₹12.00 L"
    assert inr(45_000, short=True) == "₹45,000"
    assert inr(-7_13_698) == "-₹7,13,698"
    assert mix_label(0.3) == "30% equity / 70% debt"


def test_horizon_table_has_all_horizons():
    rows = horizon_table(P)
    assert [r["horizon"] for r in rows] == [3, 5, 7, 10, 15, 20]
    assert rows[-1]["gap_debt_vs_equity"] > rows[0]["gap_debt_vs_equity"]


def test_sensitivity_and_heatmap_shapes():
    s = sensitivity(P)
    assert len(s["rows"]) == 10 and {r["variable"] for r in s["rows"]} == {"Profit growth", "Interest rate", "Valuation", "Loan tenure"}
    h = heatmap(P)
    assert h["best_equity"].shape == (len(h["growths"]), len(h["rates"]))
    assert ((h["best_equity"] >= 0) & (h["best_equity"] <= 1)).all()


def test_explain_shows_emi_and_ownership():
    ex = explain(P, 0.5)
    text = " ".join(s[2] for s in ex["steps"])
    assert "₹3,56,849" in text and "20.00%" in text
    assert len(ex["years"]) == P.horizon_years


def test_suggestions_cover_required_topics():
    r = optimize(P)
    secs = dict(suggestions(r, downside(P), horizon_table(P)))
    assert {"Why this mix wins", "Risks", "Fundamentals", "Downside: growth at half the plan"} <= set(secs)
    assert any("26%" in s for s in secs["Fundamentals"])


def test_exports():
    r = optimize(P)
    df = mixes_frame(r)
    assert len(df) == 101 and df["Best"].sum() == 1
    assert to_csv(r).startswith(b"Equity %")
    wb = openpyxl.load_workbook(io.BytesIO(to_excel(r, 50)))
    assert {"Inputs", "All mixes", "Best mix by year"} <= set(wb.sheetnames)
    pdf = to_pdf(r, suggestions(r, downside(P)))
    assert pdf.startswith(b"%PDF")


def test_scenario_round_trip():
    q = Inputs(amount=5e7, horizon_years=15)
    name, back = load_scenario(scenario_json(q, "Plan B"))
    assert name == "Plan B" and back == q
    with pytest.raises(ValueError):
        load_scenario(json.dumps([1, 2]))
