"""Core finance model for the Equity vs Debt Optimizer.

Everything here is plain Python + NumPy with no UI code, so it can be unit-tested
and reused. All money is in rupees (not lakh or crore). Rates are fractions
(0.15 = 15%).

The model, in one paragraph: the company raises `amount`. A share `e` of it comes
from equity investors at the given pre-money valuation; the rest is a term loan
repaid by equal monthly instalments (EMI). Profit grows year by year. Each year
the company pays the EMI (and tax, if a rate is entered), then distributes a
share of what is left (the payout ratio) to shareholders in proportion to
ownership. The founder's cash is their share of those distributions. At the end
of the horizon the founder also owns a stake in the company, valued at an exit
multiple of annual profit. We do this for every mix from 0% to 100% equity and
pick the mix that leaves the founder richest.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field, fields, replace
from typing import Optional

import numpy as np

MIX_STEPS = np.round(np.linspace(0.0, 1.0, 101), 10)  # equity share 0%, 1%, ..., 100%
DSCR_RISKY = 1.25   # lenders usually want at least this much cover
DSCR_DEFAULT = 1.0  # below this, profit cannot pay the EMI

METRICS = {
    "npv_wealth": "Present value of founder wealth (cash + exit stake)",
    "total_cash": "Total founder cash over the horizon",
    "wealth": "Exit-inclusive wealth (cash + exit stake, not discounted)",
    "npv_cash": "Present value of founder cash only",
}


@dataclass(frozen=True)
class Inputs:
    """Everything the founder can change. Money in rupees, rates as fractions."""
    amount: float = 3_00_00_000            # amount to raise: Rs 3 Cr
    pre_money: float = 6_00_00_000         # pre-money valuation: Rs 6 Cr
    profit_month: float = 12_00_000        # current profit per month: Rs 12 lakh
    growth_y1: float = 0.30                # profit growth in year 1 after funding
    growth_y2: float = 0.15                # profit growth each year from year 2
    interest_rate: float = 0.15            # annual interest on the loan
    tenure_years: int = 5                  # loan tenure
    horizon_years: int = 10                # years to compare over (1-20)
    # advanced
    tax_rate: float = 0.0                  # 0 = profit is already after tax; >0 = profit is pre-tax and interest is deductible
    exit_multiple: float = 5.0             # company value at the horizon = multiple x that year's annual profit
    discount_rate: float = 0.12            # for present values
    debt_fee: float = 0.0                  # loan processing fee, % of loan, paid in year 1
    equity_cost: float = 0.0               # legal / transaction cost, % of equity raised, paid in year 1
    payout_ratio: float = 1.0              # share of profit after debt service that is distributed
    growth_boost_equity: float = 0.0       # extra growth (points) if fully equity-funded
    growth_boost_debt: float = 0.0         # extra growth (points) if fully debt-funded
    min_dscr_required: float = 1.0         # mixes whose DSCR falls below this in any year are rejected
    metric: str = "npv_wealth"             # how the best mix is ranked

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Inputs":
        """Build Inputs from a dict (e.g. a saved scenario), ignoring unknown keys."""
        known = {f.name: f for f in fields(cls)}
        clean = {}
        for k, v in (d or {}).items():
            if k not in known:
                continue
            default = known[k].default
            if isinstance(default, str):
                clean[k] = str(v)
            elif isinstance(default, int) and not isinstance(default, bool):
                clean[k] = int(round(float(v)))
            else:
                clean[k] = float(v)
        return replace(cls(), **clean)


def validate(p: Inputs) -> tuple[list[str], list[str]]:
    """Return (errors, warnings) in plain language. Errors stop the calculation."""
    errors, warnings = [], []
    if p.amount <= 0:
        errors.append("The amount to raise must be more than zero.")
    if p.pre_money <= 0:
        errors.append("The pre-money valuation must be more than zero.")
    if p.profit_month < 0:
        errors.append("Profit per month cannot be negative. If the company makes a loss, this model does not apply: debt would have to be repaid from new money.")
    for name, v in (("Year-1 growth", p.growth_y1), ("Year-2+ growth", p.growth_y2)):
        if v <= -1:
            errors.append(f"{name} must be above -100%.")
        elif v > 2:
            warnings.append(f"{name} of {v:.0%} a year is very high. Check it is not a typo.")
    if not 0 <= p.interest_rate <= 1:
        errors.append("The interest rate must be between 0% and 100%.")
    if not 1 <= p.tenure_years <= 30:
        errors.append("The loan tenure must be between 1 and 30 years.")
    if not 1 <= p.horizon_years <= 20:
        errors.append("The analysis horizon must be between 1 and 20 years.")
    if not 0 <= p.tax_rate < 1:
        errors.append("The tax rate must be between 0% and 100%.")
    if p.exit_multiple < 0:
        errors.append("The exit multiple cannot be negative.")
    if not -0.5 < p.discount_rate <= 1:
        errors.append("The discount rate must be between -50% and 100%.")
    if not 0 <= p.debt_fee < 1 or not 0 <= p.equity_cost < 1:
        errors.append("Fees must be between 0% and 100%.")
    if not 0 <= p.payout_ratio <= 1:
        errors.append("The payout ratio must be between 0% and 100%.")
    if not 1.0 <= p.min_dscr_required <= 3.0:
        errors.append("The minimum DSCR you accept must be between 1.00 and 3.00.")
    if p.metric not in METRICS:
        errors.append("Unknown ranking metric.")
    if errors:
        return errors, warnings
    if p.amount > p.pre_money:
        warnings.append("You are raising more than the company is worth today. All-equity would hand investors over half the company.")
    if p.tenure_years > p.horizon_years:
        warnings.append("The loan runs past the analysis horizon. The unpaid balance is deducted from the exit value.")
    if p.interest_rate > 0.24:
        warnings.append("Interest above 24% a year is unusually expensive for a business loan.")
    return errors, warnings


# ---------------- building blocks ----------------
def investor_ownership(equity_amount, pre_money):
    """Post-money ownership: equity / (pre-money + equity).
    Rs 3 Cr into Rs 6 Cr pre-money buys 3 / 9 = 33.3%; Rs 1.5 Cr buys 1.5 / 7.5 = 20%."""
    equity_amount = np.asarray(equity_amount, dtype=float)
    return np.where(equity_amount > 0, equity_amount / (pre_money + equity_amount), 0.0)


def emi(principal, annual_rate, years):
    """Equal monthly instalment: P x r x (1 + r)^n / ((1 + r)^n - 1),
    with r = annual rate / 12 and n = years x 12. At 0% interest, EMI = P / n."""
    principal = np.asarray(principal, dtype=float)
    n = int(round(years * 12))
    if n <= 0:
        raise ValueError("tenure must be at least one month")
    r = annual_rate / 12.0
    if r == 0:
        return principal / n
    growth = (1 + r) ** n
    return principal * r * growth / (growth - 1)


def amortization_schedule(principal: float, annual_rate: float, years: int) -> list[dict]:
    """Month-by-month loan schedule. Each EMI pays the month's interest first
    (balance x r); the rest repays principal. The last row closes the loan at exactly zero."""
    n, r = int(years * 12), annual_rate / 12.0
    pay = float(emi(principal, annual_rate, years))
    rows, bal = [], float(principal)
    for m in range(1, n + 1):
        interest = bal * r
        principal_part = pay - interest if m < n else bal
        rows.append(dict(month=m, opening=bal, emi=interest + principal_part, interest=interest,
                         principal=principal_part, closing=bal - principal_part))
        bal -= principal_part
    return rows


def yearly_debt_service(debt, annual_rate: float, tenure_years: int, horizon_years: int):
    """Vectorised amortization for many loan sizes at once.
    Returns arrays of shape (len(debt), horizon): interest, principal and EMI paid in each year,
    and the balance outstanding at each year end."""
    debt = np.asarray(debt, dtype=float)
    n_m, r = tenure_years * 12, annual_rate / 12.0
    pay = emi(debt, annual_rate, tenure_years)
    H = horizon_years
    interest = np.zeros((debt.size, H))
    principal = np.zeros((debt.size, H))
    closing = np.zeros((debt.size, H))
    bal = debt.copy()
    for m in range(1, H * 12 + 1):
        y = (m - 1) // 12
        if m <= n_m:  # no payments after the loan ends
            i_m = bal * r
            p_m = bal if m == n_m else pay - i_m   # last instalment closes the loan exactly
            interest[:, y] += i_m
            principal[:, y] += p_m
            bal = bal - p_m
        if m % 12 == 0:
            closing[:, y] = bal
    return dict(emi_month=pay, interest=interest, principal=principal, emi=interest + principal, closing=closing)


# ---------------- projection for every mix ----------------
@dataclass
class Projection:
    """Year-by-year arrays have shape (mixes, years); per-mix arrays have shape (mixes,)."""
    inputs: Inputs
    equity_share: np.ndarray
    equity_amount: np.ndarray
    debt_amount: np.ndarray
    investor_own: np.ndarray
    founder_own: np.ndarray
    emi_month: np.ndarray
    profit: np.ndarray            # annual profit (before EMI)
    interest: np.ndarray
    principal: np.ndarray
    emi: np.ndarray               # annual EMI paid
    tax: np.ndarray
    tax_shield: np.ndarray        # tax saved because interest is deductible
    fees: np.ndarray              # one-time costs (year 1)
    after_debt: np.ndarray        # profit after EMI, tax and fees
    distributed: np.ndarray
    retained: np.ndarray
    investor_cash: np.ndarray
    founder_cash: np.ndarray      # includes any shortfall the founder must cover
    shortfall: np.ndarray         # negative when profit cannot cover the EMI
    cum_founder_cash: np.ndarray
    outstanding: np.ndarray       # loan balance at each year end
    company_value: np.ndarray     # exit multiple x annual profit - debt + retained cash, at each year end
    dscr: np.ndarray              # profit / EMI each year (inf when no EMI)
    founder_wealth_to_date: np.ndarray
    # per-mix summaries
    total_cash: np.ndarray = field(default=None)
    npv_cash: np.ndarray = field(default=None)
    exit_stake: np.ndarray = field(default=None)
    wealth: np.ndarray = field(default=None)
    npv_wealth: np.ndarray = field(default=None)
    min_dscr: np.ndarray = field(default=None)
    years_below_risky: np.ndarray = field(default=None)
    years_below_one: np.ndarray = field(default=None)

    @property
    def years(self) -> np.ndarray:
        return np.arange(1, self.inputs.horizon_years + 1)

    def metric(self, name: Optional[str] = None) -> np.ndarray:
        return getattr(self, name or self.inputs.metric)


def project(p: Inputs, equity_share=MIX_STEPS) -> Projection:
    """Run the year-by-year model for each equity share (0..1)."""
    e = np.asarray(equity_share, dtype=float).reshape(-1)
    H = p.horizon_years
    equity_amount = p.amount * e
    debt_amount = p.amount - equity_amount
    inv_own = investor_ownership(equity_amount, p.pre_money)
    fdr_own = 1.0 - inv_own

    # Profit: year 1 grows at the year-1 rate, later years at the year-2+ rate.
    boost = e * p.growth_boost_equity + (1 - e) * p.growth_boost_debt
    g1 = (p.growth_y1 + boost)[:, None]
    g2 = (p.growth_y2 + boost)[:, None]
    years = np.arange(1, H + 1)[None, :]
    profit_month = p.profit_month * (1 + g1) * (1 + g2) ** (years - 1)
    profit = 12 * profit_month

    ds = yearly_debt_service(debt_amount, p.interest_rate, p.tenure_years, H)
    interest, principal, emi_y, outstanding = ds["interest"], ds["principal"], ds["emi"], ds["closing"]

    # Tax: interest is deductible, so tax = rate x (profit - interest), never below zero.
    tax = p.tax_rate * np.maximum(profit - interest, 0.0)
    tax_shield = p.tax_rate * profit - tax

    fees = np.zeros_like(profit)
    fees[:, 0] = p.debt_fee * debt_amount + p.equity_cost * equity_amount

    after_debt = profit - emi_y - tax - fees
    positive = np.maximum(after_debt, 0.0)
    shortfall = np.minimum(after_debt, 0.0)          # lender must still be paid; founder covers the gap
    distributed = p.payout_ratio * positive
    retained = positive - distributed
    investor_cash = inv_own[:, None] * distributed
    founder_cash = fdr_own[:, None] * distributed + shortfall
    cum_founder_cash = np.cumsum(founder_cash, axis=1)

    company_value = p.exit_multiple * profit - outstanding + np.cumsum(retained, axis=1)
    founder_wealth_to_date = cum_founder_cash + fdr_own[:, None] * np.maximum(company_value, 0.0)

    with np.errstate(divide="ignore", invalid="ignore"):
        dscr = np.where(emi_y > 0, profit / np.where(emi_y > 0, emi_y, 1.0), np.inf)

    disc = (1 + p.discount_rate) ** -years
    total_cash = cum_founder_cash[:, -1]
    npv_cash = (founder_cash * disc).sum(axis=1)
    exit_stake = fdr_own * np.maximum(company_value[:, -1], 0.0)
    wealth = total_cash + exit_stake
    npv_wealth = npv_cash + exit_stake * disc[0, -1]
    min_dscr = dscr.min(axis=1)
    return Projection(
        inputs=p, equity_share=e, equity_amount=equity_amount, debt_amount=debt_amount,
        investor_own=inv_own, founder_own=fdr_own, emi_month=np.asarray(ds["emi_month"], dtype=float),
        profit=profit, interest=interest, principal=principal, emi=emi_y, tax=tax, tax_shield=tax_shield,
        fees=fees, after_debt=after_debt, distributed=distributed, retained=retained,
        investor_cash=investor_cash, founder_cash=founder_cash, shortfall=shortfall,
        cum_founder_cash=cum_founder_cash, outstanding=outstanding, company_value=company_value, dscr=dscr,
        founder_wealth_to_date=founder_wealth_to_date,
        total_cash=total_cash, npv_cash=npv_cash, exit_stake=exit_stake, wealth=wealth, npv_wealth=npv_wealth,
        min_dscr=min_dscr, years_below_risky=(dscr < DSCR_RISKY).sum(axis=1), years_below_one=(dscr < DSCR_DEFAULT).sum(axis=1),
    )


def first_lasting_lead(a: np.ndarray, b: np.ndarray) -> Optional[int]:
    """First year (1-based) from which series a stays at or above series b to the end; None if never."""
    ahead = a >= b - 1e-6
    if not ahead[-1]:
        return None
    y = len(ahead)
    while y > 0 and ahead[y - 1]:
        y -= 1
    return y + 1


@dataclass
class Result:
    projection: Projection
    best: int                     # index into MIX_STEPS of the recommended mix
    feasible: np.ndarray          # min DSCR >= the required minimum (never below 1.0)
    risky: np.ndarray             # feasible, but min DSCR < 1.25
    breakeven_cash_year: Optional[int]     # 100% debt overtakes 100% equity in cumulative founder cash
    breakeven_wealth_year: Optional[int]   # same, counting the founder's stake value
    breakeven_vs_equity: np.ndarray        # per mix, cumulative cash vs 100% equity (0 = never)

    @property
    def inputs(self) -> Inputs:
        return self.projection.inputs

    @property
    def best_equity(self) -> float:
        return float(self.projection.equity_share[self.best])

    def score(self, idx: int, metric: Optional[str] = None) -> float:
        return float(self.projection.metric(metric)[idx])


def optimize(p: Inputs) -> Result:
    """Test every equity share 0%..100% (1% steps) and pick the founder's best.
    Mixes where profit cannot cover the EMI in some year (DSCR < 1.0, or below the
    founder's own minimum) are rejected. 100% equity has no loan, so it is always allowed."""
    errors, _ = validate(p)
    if errors:
        raise ValueError(errors[0])
    pr = project(p, MIX_STEPS)
    feasible = pr.min_dscr >= max(DSCR_DEFAULT, p.min_dscr_required) - 1e-12
    risky = feasible & (pr.min_dscr < DSCR_RISKY)
    score = np.where(feasible, pr.metric(), -np.inf)
    best = int(np.argmax(score))   # ties go to the lower equity share (less dilution)
    all_debt, all_equity = 0, len(MIX_STEPS) - 1
    be_mix = np.array([first_lasting_lead(pr.cum_founder_cash[i], pr.cum_founder_cash[all_equity]) or 0 for i in range(len(MIX_STEPS))])
    return Result(
        projection=pr, best=best, feasible=feasible, risky=risky,
        breakeven_cash_year=first_lasting_lead(pr.cum_founder_cash[all_debt], pr.cum_founder_cash[all_equity]),
        breakeven_wealth_year=first_lasting_lead(pr.founder_wealth_to_date[all_debt], pr.founder_wealth_to_date[all_equity]),
        breakeven_vs_equity=be_mix,
    )


def mix_index(equity_share: float) -> int:
    """Index of the nearest 1% step."""
    return int(np.clip(round(equity_share * 100), 0, 100))
