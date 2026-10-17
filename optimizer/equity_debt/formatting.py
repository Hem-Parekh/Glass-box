"""Indian number formatting: Rs 1,23,45,678 (full) or Rs 1.23 Cr / Rs 12.00 L (short)."""
from __future__ import annotations

import math

RUPEE = "₹"
LAKH, CRORE = 1_00_000, 1_00_00_000


def group_indian(n: int) -> str:
    """12345678 -> '1,23,45,678': last three digits, then pairs."""
    s = str(abs(int(n)))
    if len(s) <= 3:
        head, tail = "", s
    else:
        head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail]) if parts else tail


def inr(x: float, short: bool = False, decimals: int = 2, symbol: str = RUPEE) -> str:
    """Format rupees. Full: Rs 1,23,45,678. Short: Rs 1.23 Cr, Rs 12.00 L, Rs 45,000."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return "-"
    if isinstance(x, float) and math.isinf(x):
        return "n/a"
    sign = "-" if x < 0 else ""
    a = abs(x)
    if short:
        if a >= CRORE:
            return f"{sign}{symbol}{a / CRORE:,.{decimals}f} Cr"
        if a >= LAKH:
            return f"{sign}{symbol}{a / LAKH:,.{decimals}f} L"
    return f"{sign}{symbol}{group_indian(round(a))}"


def pct(x: float, decimals: int = 1) -> str:
    return "-" if x is None else f"{x * 100:.{decimals}f}%"


def ratio(x: float) -> str:
    return "no loan" if x is None or math.isinf(x) else f"{x:.2f}x"


def mix_label(equity_share: float) -> str:
    e = round(equity_share * 100)
    return f"{e}% equity / {100 - e}% debt"
