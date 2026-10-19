"""site/domain.js must give the same numbers as server/domain.py (the demo and the real server show the same figures)."""
import json, os, shutil, subprocess, sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from server import domain as D  # noqa: E402
from server.seed import resolved  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TODAY = "2026-10-19"
pytestmark = pytest.mark.skipif(not shutil.which("node"), reason="node is not installed")


def js(expr, data):
    code = "const D=require(%r);const st=%s;const today=%r;process.stdout.write(JSON.stringify(%s));" % (
        os.path.join(ROOT, "site", "domain.js"), json.dumps(data), TODAY, expr)
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)


def test_loan_schedules_match():
    st = resolved(TODAY)
    out = js("st.loans.map(l=>({rows:D.schedule(l,today),sum:D.loanSummary(l,today)}))", st)
    for l, j in zip(st["loans"], out):
        assert j["rows"] == D.schedule(l, TODAY), l["id"]
        assert j["sum"] == D.loan_summary(l, TODAY), l["id"]


def test_counters_and_portfolio_match():
    st = resolved(TODAY)
    fy = D.fy(TODAY)
    out = js("({off:D.offersUsed(st,'c_kalyan',%r,'equity'),mem:D.members(st,'c_vasai'),fd:D.fdShares(st,'c_vasai'),"
             "pf:D.portfolio(st,'u_investor',today,D.SETTINGS_DEFAULT),fy:D.fy(today),lock:D.addMonths('2026-08-31',6)})" % fy, st)
    assert out["off"] == D.offers_used(st, "c_kalyan", fy, "equity")
    assert out["mem"] == D.members(st, "c_vasai") and out["fd"] == D.fd_shares(st, "c_vasai")
    py = D.portfolio(st, "u_investor", TODAY, D.SETTINGS_DEFAULT)
    for k in ("invested", "value", "gain", "companies"):
        assert out["pf"][k] == py[k]
    assert [r["lock_until"] for r in out["pf"]["rows"]] == [r["lock_until"] for r in py["rows"]]
    assert out["fy"] == fy and out["lock"] == D.add_months("2026-08-31", 6) == "2027-02-28"
