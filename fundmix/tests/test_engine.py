import os, sys
import openpyxl, pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from engine import parse_cma, run, _schedule
from demo_inputs import DEMO
CMA = os.path.join(os.path.dirname(__file__), "..", "sample", "sample_cma.xlsx")

def test_schedule_repays_to_zero():
    rows = _schedule(900, 0.085, 7, 1)
    assert abs(rows[-1]["closing"]) < 1e-9 and abs(sum(r["principal"] for r in rows) - 900) < 1e-9

def test_parse():
    c = parse_cma(CMA)
    assert round(c["base"]["net_sales"]) == 65075 and round(c["base"]["pat"]) == 10982

def test_mix_adds_up_and_dscr_ok():
    r = run(parse_cma(CMA), DEMO)
    assert abs(r["debt"] + r["equity"] - DEMO["project_cost"]) < 1e-9
    assert r["min_dscr"] >= DEMO["dscr_target"]

def test_cashflow_binding():
    r = run(parse_cma(CMA), dict(DEMO, new_capacity=20000, dscr_target=1.6))
    assert r["binding"].startswith("cash flow") and 1.6 <= r["min_dscr"] < 1.61

def test_stress_cut():
    r = run(parse_cma(CMA), dict(DEMO, new_capacity=8000))
    assert r["stress_cut"] > 0 and r["min_dscr_stress"] >= 1.2

def test_missing_net_sales(tmp_path):
    wb = openpyxl.load_workbook(CMA)
    ws = wb[wb.sheetnames[0]]
    for row in ws.iter_rows(min_col=1, max_col=1):
        if str(row[0].value or "").strip().upper().startswith("NET SALES"): row[0].value = "Sales total"
    bad = tmp_path / "bad.xlsx"; wb.save(bad)
    with pytest.raises(ValueError, match="NET SALES"):
        parse_cma(str(bad))

def test_trading_runs_and_pdf(tmp_path):
    from report import build_pdf
    d = {k: v for k, v in DEMO.items() if k not in ("min_equity", "dscr_target", "tenor", "moratorium")}
    for ind in ("service", "other"):
        r = run(parse_cma(CMA), dict(d, industry=ind, ramp=[0.4, 0.7, 0.85]))
        assert abs(r["debt_pct"] + r["equity_pct"] - 1) < 1e-9
        build_pdf(r, dict(company="T", purpose="P", base_year=2027, base_status="Estimated"), str(tmp_path / f"{ind}.pdf"))

def test_service_runs():
    d = {k: v for k, v in DEMO.items() if k not in ("min_equity", "dscr_target", "tenor", "moratorium")}
    r = run(parse_cma(CMA), dict(d, industry="service", ramp=[0.3, 0.6, 0.8]))
    assert r["equity_pct"] >= 0.40 - 1e-9
