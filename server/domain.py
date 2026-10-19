"""Pure business arithmetic shared by the rules, the API and the tests.

Money is integer paise everywhere. Dates are ISO strings: "YYYY-MM-DD" for business dates.
site/domain.js is a line-for-line mirror for the browser; keep the two in step
(server/tests/test_parity.py runs both on the same inputs).
"""
import math
from datetime import date

SETTINGS_DEFAULT = dict(
    id="settings",
    max_platform_investors=20,
    offer_limit=200, offer_warn=150,
    member_limit=200, member_warn=180,
    lock_months=6,
)
SECURITY_TYPES = ("equity", "preference", "debentures")
PIPELINE = ("applied", "under_review", "approved", "offering", "funded", "monitoring", "closed", "rejected")
DOC_CHECKLIST = (
    ("valuation_report", "Registered valuer's report"),
    ("mgt14", "Special resolution filed (MGT-14)"),
    ("pas4", "PAS-4 offer letters issued"),
    ("bank_account", "Separate bank account for the issue"),
    ("allotment", "Shares allotted"),
    ("pas3", "PAS-3 filed (within 15 days of allotment)"),
    ("demat_credit", "Shares credited to demat"),
)


def d(s):
    return date.fromisoformat(s[:10])


def add_months(s, n):
    """Same day n calendar months later, clamped to the month's last day."""
    x = d(s)
    m = x.month - 1 + n
    y, m = x.year + m // 12, m % 12 + 1
    last = [31, 29 if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    return date(y, m, min(x.day, last)).isoformat()


def add_days(s, n):
    return date.fromordinal(d(s).toordinal() + n).isoformat()


def days_between(a, b):
    return d(b).toordinal() - d(a).toordinal()


def fy(s):
    """Indian financial year, April to March: 2026-10-19 -> '2026-27'."""
    x = d(s)
    y = x.year if x.month >= 4 else x.year - 1
    return "%d-%02d" % (y, (y + 1) % 100)


def half_up(x):
    return int(math.floor(x + 0.5))


# ---------------- loans ----------------
def schedule(loan, today):
    """Monthly schedule in paise. Interest-only during the moratorium, then a level EMI.
    Interest each month = opening x rate / 12, rounded to the paisa; the last instalment clears the balance."""
    P, bps = int(loan["amount_paise"]), int(loan["rate_bps"])
    T, M = int(loan["tenor_months"]), int(loan.get("moratorium_months") or 0)
    start, paid = loan.get("disbursal_date"), loan.get("payments") or {}
    if not start or P <= 0 or T <= 0:
        return []
    r = bps / 120000.0
    n = T - M
    f = 1.0
    for _ in range(n):
        f = f * (1 + r)
    emi = half_up(P * r * f / (f - 1)) if n > 0 and r > 0 else (half_up(P / n) if n > 0 else 0)
    rows, opening = [], P
    for k in range(1, T + 1):
        due = add_months(start, k)
        interest = half_up(opening * bps / 120000.0)
        if k <= M:
            principal = 0
        elif k == T:
            principal = opening
        else:
            principal = min(emi - interest, opening)
        closing = opening - principal
        status = "paid" if due in paid else ("overdue" if due < today else "pending")
        rows.append(dict(n=k, due=due, opening=opening, interest=interest, principal=principal,
                         payment=interest + principal, closing=closing, status=status, paid_on=paid.get(due)))
        opening = closing
    return rows


def loan_summary(loan, today):
    rows = schedule(loan, today)
    paid = [r for r in rows if r["status"] == "paid"]
    unpaid = [r for r in rows if r["status"] != "paid"]
    month = today[:7]
    nxt = unpaid[0] if unpaid else None
    repaid = sum(r["principal"] for r in paid)
    return dict(
        disbursed=int(loan["amount_paise"]) if rows else 0,
        principal_repaid=repaid,
        principal_pending=(int(loan["amount_paise"]) - repaid) if rows else 0,
        interest_earned=sum(r["interest"] for r in paid),
        interest_this_month=sum(r["interest"] for r in rows if r["due"][:7] == month),
        monthly_interest=nxt["interest"] if nxt else 0,
        next_due=nxt and nxt["due"], next_amount=nxt and nxt["payment"],
        overdue=sum(1 for r in rows if r["status"] == "overdue"),
        remaining_months=len(unpaid),
    )


def min_holding_months(loan):
    """RBI transfer of loan exposures (2021): 3 months for loans of 2 years or less, otherwise 6 months."""
    return 3 if int(loan["tenor_months"]) <= 24 else 6


# ---------------- cap table and counters ----------------
def platform_investors(st, cid):
    return sorted({h["investor_id"] for h in st["holdings"] if h["company_id"] == cid and h["shares"] > 0})


def members(st, cid):
    """Section 2(68): founders and existing shareholders (each row may stand for several holders) plus platform investors."""
    return sum(int(e.get("holders") or 1) for e in st["cap_table"] if e["company_id"] == cid and e["shares"] > 0) + len(platform_investors(st, cid))


def fd_shares(st, cid):
    c = next(x for x in st["companies"] if x["id"] == cid)
    return (sum(e["shares"] for e in st["cap_table"] if e["company_id"] == cid)
            + sum(h["shares"] for h in st["holdings"] if h["company_id"] == cid)
            + int(c.get("fd_extra_shares") or 0))


def offers_used(st, cid, year, sec):
    """Section 42: each person offered counts once per financial year and security type, plus offers the company made off-platform."""
    c = next(x for x in st["companies"] if x["id"] == cid)
    on = {o["investor_id"] for o in st["offers"] if o["company_id"] == cid and o["fy"] == year and o["security_type"] == sec}
    return len(on) + int(((c.get("external_offers") or {}).get(year) or {}).get(sec) or 0)


def latest_valuation(st, cid, on=None):
    v = [x for x in st["valuations"] if x["company_id"] == cid and (on is None or x["date"] <= on)]
    return max(v, key=lambda x: x["date"]) if v else None


def lock_until(h, settings):
    return add_months(h["allotment_date"], settings["lock_months"])


def holding_view(st, h, today, settings):
    v = latest_valuation(st, h["company_id"])
    cost = int(h["cost_paise"])
    price = v["price_per_share_paise"] if v else (cost // h["shares"] if h["shares"] else 0)
    value = h["shares"] * price
    unlock = lock_until(h, settings)
    return dict(
        id=h["id"], company_id=h["company_id"], shares=h["shares"], cost=cost,
        avg_cost=(cost / h["shares"]) if h["shares"] else 0,
        price=price, valuation_date=v and v["date"], value=value,
        gain=value - cost, gain_pct=((value - cost) / cost) if cost else 0,
        ownership=h["shares"] / fd_shares(st, h["company_id"]),
        lock_until=unlock, eligible=today >= unlock or bool(h.get("early_consent")),
    )


def portfolio(st, investor_id, today, settings):
    rows = [holding_view(st, h, today, settings) for h in st["holdings"] if h["investor_id"] == investor_id and h["shares"] > 0]
    inv, val = sum(r["cost"] for r in rows), sum(r["value"] for r in rows)
    return dict(rows=rows, invested=inv, value=val, gain=val - inv, gain_pct=((val - inv) / inv) if inv else 0, companies=len(rows))


def capital_gains_estimate(holding, view, today):
    """Unlisted shares: 24 months or more is long-term at 12.5%; shorter is short-term at the investor's slab rate."""
    months = days_between(holding["allotment_date"], today) / 30.4375
    long_term = months >= 24
    gain = view["gain"]
    return dict(months=months, long_term=long_term, gain=gain, tax=half_up(max(gain, 0) * 0.125) if long_term else None)
