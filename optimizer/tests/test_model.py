"""Tests for the finance model, using the sample numbers from the brief:
Rs 3 Cr raise, Rs 6 Cr pre-money, Rs 12 lakh profit a month, 15% interest, 5 years."""
import time
from dataclasses import replace

import numpy as np
import pytest

from equity_debt.model import (DSCR_RISKY, MIX_STEPS, Inputs, amortization_schedule, emi, first_lasting_lead,
                               investor_ownership, mix_index, optimize, project, validate, yearly_debt_service)

CR, LAKH = 1_00_00_000, 1_00_000
SAMPLE = Inputs(amount=3 * CR, pre_money=6 * CR, profit_month=12 * LAKH, interest_rate=0.15, tenure_years=5)


# ---- EMI ----
def test_emi_full_loan_matches_hand_calculation():
    assert float(emi(3 * CR, 0.15, 5)) == pytest.approx(7_13_698, abs=1)


def test_emi_fifty_fifty():
    assert float(emi(1.5 * CR, 0.15, 5)) == pytest.approx(3_56_849, abs=1)


def test_emi_zero_interest():
    assert float(emi(60 * LAKH, 0.0, 5)) == pytest.approx(1 * LAKH)


def test_emi_is_linear_in_principal_and_vectorised():
    out = emi(np.array([0.0, 1 * CR, 2 * CR]), 0.12, 3)
    assert out[0] == 0 and out[2] == pytest.approx(2 * out[1])


# ---- ownership ----
def test_ownership_full_raise_is_one_third():
    assert float(investor_ownership(3 * CR, 6 * CR)) == pytest.approx(1 / 3)


def test_ownership_half_raise_is_twenty_percent_not_one_third():
    assert float(investor_ownership(1.5 * CR, 6 * CR)) == pytest.approx(0.20)


def test_no_equity_means_no_dilution():
    assert float(investor_ownership(0, 6 * CR)) == 0.0


def test_ownership_is_concave_in_equity():
    own = investor_ownership(MIX_STEPS * 3 * CR, 6 * CR)
    steps = np.diff(own)
    assert np.all(steps > 0) and np.all(np.diff(steps) < 0)


# ---- amortization ----
@pytest.mark.parametrize("rate", [0.0, 0.15, 0.24])
def test_schedule_repays_exactly(rate):
    rows = amortization_schedule(3 * CR, rate, 5)
    assert len(rows) == 60
    assert abs(rows[-1]["closing"]) < 1e-6
    assert sum(r["principal"] for r in rows) == pytest.approx(3 * CR)
    total = sum(r["emi"] for r in rows)
    assert sum(r["interest"] for r in rows) == pytest.approx(total - 3 * CR)


def test_schedule_first_month_split():
    first = amortization_schedule(3 * CR, 0.15, 5)[0]
    assert first["interest"] == pytest.approx(3_75_000)          # 3 Cr x 1.25%
    assert first["principal"] == pytest.approx(7_13_698 - 3_75_000, abs=1)


def test_vectorised_yearly_debt_service_matches_schedule():
    rows = amortization_schedule(3 * CR, 0.15, 5)
    ds = yearly_debt_service(np.array([3 * CR]), 0.15, 5, 10)
    for y in range(5):
        months = rows[y * 12:(y + 1) * 12]
        assert ds["interest"][0, y] == pytest.approx(sum(m["interest"] for m in months))
        assert ds["principal"][0, y] == pytest.approx(sum(m["principal"] for m in months))
    assert np.allclose(ds["emi"][0, 5:], 0) and abs(ds["closing"][0, 4]) < 1e-4


def test_loan_longer_than_horizon_leaves_balance():
    ds = yearly_debt_service(np.array([3 * CR]), 0.15, 7, 5)
    assert ds["closing"][0, -1] > 0


# ---- projection ----
def test_year_one_numbers_for_sample():
    pr = project(SAMPLE, np.array([0.0, 1.0]))
    profit_y1 = 12 * LAKH * 1.30 * 12
    assert pr.profit[0, 0] == pytest.approx(profit_y1)
    assert pr.founder_cash[1, 0] == pytest.approx(profit_y1 * 2 / 3)                 # all equity: founder keeps 2/3
    assert pr.founder_cash[0, 0] == pytest.approx(profit_y1 - 12 * 7_13_697.9, abs=20)  # all debt: profit minus EMI


def test_debt_service_stops_after_tenure():
    pr = project(SAMPLE, np.array([0.0]))
    assert np.all(pr.emi[0, :5] > 0) and np.all(pr.emi[0, 5:] == 0)
    assert np.isinf(pr.dscr[0, 5:]).all()


def test_tax_shield_is_rate_times_interest():
    p = replace(SAMPLE, tax_rate=0.25)
    pr = project(p, np.array([0.0]))
    assert pr.tax_shield[0, 0] == pytest.approx(0.25 * pr.interest[0, 0])


def test_payout_keeps_retained_cash_in_exit_value():
    full = project(replace(SAMPLE, payout_ratio=1.0), np.array([1.0]))
    half = project(replace(SAMPLE, payout_ratio=0.5), np.array([1.0]))
    assert half.total_cash[0] == pytest.approx(full.total_cash[0] / 2)
    assert half.exit_stake[0] > full.exit_stake[0]


def test_shortfall_is_borne_by_founder():
    p = replace(SAMPLE, profit_month=3 * LAKH, growth_y1=0, growth_y2=0)   # EMI (7.1 L) > profit (3 L)
    pr = project(p, np.array([0.0]))
    assert pr.founder_cash[0, 0] < 0 and pr.min_dscr[0] < 1


def test_fees_reduce_year_one_only():
    p = replace(SAMPLE, debt_fee=0.01)
    a, b = project(SAMPLE, np.array([0.0])), project(p, np.array([0.0]))
    assert a.founder_cash[0, 0] - b.founder_cash[0, 0] == pytest.approx(0.01 * 3 * CR)
    assert np.allclose(a.founder_cash[0, 1:], b.founder_cash[0, 1:])


# ---- optimizer ----
def test_optimizer_covers_every_mix_and_is_fast():
    t = time.perf_counter()
    r = optimize(SAMPLE)
    assert len(r.projection.equity_share) == 101
    assert time.perf_counter() - t < 0.5


def test_sample_prefers_debt_over_long_horizon():
    r = optimize(SAMPLE)
    assert r.best_equity == 0.0
    assert r.breakeven_cash_year is not None and 1 < r.breakeven_cash_year <= 10


def test_equity_wins_on_short_horizon_without_exit_value():
    r = optimize(replace(SAMPLE, horizon_years=3, exit_multiple=0, metric="total_cash"))
    assert r.best_equity == 1.0


def test_best_is_never_a_rejected_mix():
    p = replace(SAMPLE, profit_month=5 * LAKH, growth_y1=0.05, growth_y2=0.05)
    r = optimize(p)
    assert r.feasible[r.best]
    assert not r.feasible[0]          # all debt cannot be paid from Rs 5 lakh a month


def test_minimum_dscr_caps_the_loan():
    p = replace(SAMPLE, profit_month=8 * LAKH, growth_y1=0.1, growth_y2=0.1, min_dscr_required=DSCR_RISKY)
    r = optimize(p)
    assert 0 < r.best_equity < 1
    assert r.projection.min_dscr[r.best] >= DSCR_RISKY
    assert r.projection.min_dscr[r.best - 1] < DSCR_RISKY   # one more percent of debt would break the limit


def test_ranking_metric_changes_the_score_used():
    a, b = optimize(replace(SAMPLE, metric="total_cash")), optimize(replace(SAMPLE, metric="npv_cash"))
    assert a.score(a.best) != b.score(b.best)


def test_mix_index_rounds_to_nearest_percent():
    assert mix_index(0.334) == 33 and mix_index(1.2) == 100 and mix_index(-1) == 0


def test_first_lasting_lead():
    assert first_lasting_lead(np.array([1, 2, 5, 6]), np.array([3, 3, 3, 3])) == 3
    assert first_lasting_lead(np.array([5, 1, 5]), np.array([3, 3, 3])) == 3
    assert first_lasting_lead(np.array([1, 1]), np.array([3, 3])) is None


# ---- validation ----
def test_validation_messages():
    errs, _ = validate(replace(SAMPLE, amount=-1))
    assert any("more than zero" in e for e in errs)
    _, warns = validate(replace(SAMPLE, amount=7 * CR))
    assert any("more than the company is worth" in w for w in warns)
    errs, _ = validate(replace(SAMPLE, horizon_years=25))
    assert errs
    with pytest.raises(ValueError):
        optimize(replace(SAMPLE, interest_rate=-0.1))


def test_inputs_round_trip_and_ignore_unknown_keys():
    d = SAMPLE.to_dict()
    d["unknown"] = 5
    d["tenure_years"] = "6"
    q = Inputs.from_dict(d)
    assert q.tenure_years == 6 and q.amount == SAMPLE.amount
