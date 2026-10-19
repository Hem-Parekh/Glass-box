"""Who can see what, and every change a signed-in user can make.

Each action takes (st, user, payload, today), checks the rules, mutates the loaded collections and returns
(detail, company_id). The API layer saves the changes and writes them, with before/after values, to the
append-only audit log. site/store.js mirrors this file for the browser-only demo.
"""
import uuid
from datetime import datetime, timezone

from server import domain as D

COLLECTIONS = ("companies", "reports", "intros", "cap_table", "holdings", "offers", "valuations", "sell_requests", "transfers",
               "loans", "loan_transfers", "invoices", "notes", "notifications", "files", "enquiries", "settings")
COMPANY_FIELDS = ("name", "sector", "stage", "city", "revenue", "raise", "instrument", "twin", "readiness", "quarters", "covenants", "docs")
ADVISOR_COMPANY_FIELDS = ("offer_price_paise", "fd_extra_shares", "security_type", "raise_paise")
SELL_OPEN = ("submitted", "under_review", "rofr", "buyer_introduced", "spa_signed")
STATUS_LABEL = dict(submitted="submitted", under_review="under review", rofr="first-refusal window started", buyer_introduced="buyer introduced",
                    spa_signed="SPA signed", completed="transfer complete", rejected="rejected", withdrawn="withdrawn", eligibility="eligibility checked",
                    consent="borrower consent recorded", deed_signed="assignment deed signed", charge_updated="charge updated with the ROC")
LT_STEPS = ("submitted", "eligibility", "consent", "buyer_introduced", "deed_signed", "charge_updated", "completed")


class Denied(Exception):
    pass


def need(cond, msg):
    if not cond:
        raise Denied(msg)


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix):
    return prefix + "_" + uuid.uuid4().hex[:10]


def fnum(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and x not in (float("inf"), float("-inf")) else None


def inum(v):
    x = fnum(v)
    return int(x) if x is not None and x == int(x) else None


def valid_date(v, msg="Enter a valid date"):
    try:
        D.d(str(v))
        need(len(str(v)) == 10, msg)
    except ValueError:
        raise Denied(msg)
    return str(v)


def rs(paise):
    """Rs 1,23,45,678.90 (Indian grouping) for messages."""
    neg, p = paise < 0, abs(int(paise))
    r, ps = divmod(p, 100)
    s = str(r)
    head, tail = s[:-3], s[-3:]
    while len(head) > 2:
        tail = head[-2:] + "," + tail
        head = head[:-2]
    s = (head + "," + tail) if head else tail
    return ("-" if neg else "") + "Rs " + s + ("" if ps == 0 else ".%02d" % ps)


def grp(n):
    """Indian digit grouping: 2,50,000."""
    return rs(int(n) * 100)[3:] if n >= 0 else "-" + rs(-int(n) * 100)[3:]


def ddmmmyyyy(s):
    x = D.d(s)
    return "%d %s %d" % (x.day, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][x.month - 1], x.year)


# ---------------- lookups ----------------
def settings(st):
    return st.settings[0] if st.settings else dict(D.SETTINGS_DEFAULT)


def find(coll, id_):
    return next((x for x in coll if x["id"] == id_), None)


def company_of(st, cid):
    c = find(st.companies, cid)
    need(c, "Company not found")
    return c


def user_of(st, id_, role=None):
    u = next((x for x in st.users if x["id"] == id_), None)
    need(u and (role is None or u["role"] == role), (role or "User").capitalize() + " not found")
    return u


def label(u):
    return (u.get("firm") if u["role"] in ("investor", "lender") and u.get("firm") else u["name"])


def notify(st, user_id, kind, text, link):
    st.notifications.append(dict(id=uid("nt"), user_id=user_id, kind=kind, text=text, link=link, at=now(), read=False))


def notify_advisors(st, kind, text, link):
    for u in st.users:
        if u["role"] == "advisor":
            notify(st, u["id"], kind, text, link)


def owns(u, cid):
    return u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid)


def approved(st, cid):
    return any(r["company_id"] == cid and r["status"] == "approved" for r in st.reports)


def holder_ids(st, cid):
    return set(D.platform_investors(st, cid))


# ---------------- visibility ----------------
def pub(u, full=False):
    if not u:
        return None
    keys = ("id", "name", "role", "firm", "title", "company_id", "mandate") + (("profile", "email") if full else ())
    out = {k: u.get(k) for k in keys}
    if u["role"] == "lender":
        out["profile"] = u.get("profile")
    return out


def company_brief(st, c, today):
    """What an investor may see of a company: no twin, no readiness, no cap table."""
    rep = next((r for r in st.reports if r["company_id"] == c["id"] and r["status"] == "approved"), None)
    return dict(id=c["id"], name=c["name"], sector=c["sector"], stage=c["stage"], city=c["city"], revenue=c["revenue"], raise_paise=c.get("raise_paise"),
                security_type=c.get("security_type"), offer_price_paise=c.get("offer_price_paise"), updates=c.get("updates") or [],
                docs=c.get("docs") or [], fd_shares=D.fd_shares(st, c["id"]), report=rep and dict(title=rep["title"], summary=rep["summary"],
                reviewed_by=rep.get("reviewed_by"), reviewed_at=rep.get("reviewed_at"), review_note=rep.get("review_note")))


def lock_notices(st, user, today):
    s = settings(st)
    out = []
    for h in st.holdings:
        if h["investor_id"] == user["id"] and h["shares"] > 0:
            unlock = D.lock_until(h, s)
            left = D.days_between(today, unlock)
            if 0 < left <= 7:
                c = find(st.companies, h["company_id"])
                out.append(dict(id="lock_" + h["id"], user_id=user["id"], kind="lock", text="Lock-in for %s ends in %d day%s (%s)" % (c["name"], left, "" if left == 1 else "s", ddmmmyyyy(unlock)),
                                link="app-portfolio", at=today + "T00:00:00+00:00", read=False, computed=True))
    return out


def visible_state(st, user, audit_rows, today):
    role = user["role"]
    s = settings(st)
    base = dict(me=pub(user, True), today=today, settings=s,
                notifications=lock_notices(st, user, today) + sorted([n for n in st.notifications if n["user_id"] == user["id"]], key=lambda n: n["at"], reverse=True)[:60])
    advisors = [pub(u) for u in st.users if u["role"] == "advisor"]
    if role == "advisor":
        return dict(base, directory=[pub(u, True) for u in st.users if u["role"] != "founder"], founders=[pub(u) for u in st.users if u["role"] == "founder"],
                    **{c: getattr(st, c) for c in COLLECTIONS if c not in ("notifications", "settings")}, audit=audit_rows(None))
    if role == "founder":
        cid = user["company_id"]
        only = lambda coll: [x for x in coll if x.get("company_id") == cid]  # noqa: E731
        def offer_view(o):
            named = o.get("share_identity") or o["response"] == "invested"
            inv = user_of(st, o["investor_id"])
            return dict(o, investor_id=o["investor_id"] if named else None, investor_name=label(inv) if named else "Name shared after the investor consents", views=[] if not named else o.get("views", []))
        def sell_view(x):
            return dict(id=x["id"], company_id=x["company_id"], shares=x["shares"], full=x["full"], status=x["status"], rofr_until=x.get("rofr_until"), created_at=x["created_at"])
        return dict(base, directory=advisors + [pub(u) for u in st.users if u["role"] in ("lender", "investor")],
                    intros=[dict(i, investor_name=label(user_of(st, i["investor_id"]))) for i in only(st.intros)],
                    companies=[c for c in st.companies if c["id"] == cid], reports=only(st.reports), cap_table=only(st.cap_table),
                    holdings=[dict(h, investor_name=label(user_of(st, h["investor_id"]))) for h in only(st.holdings)],
                    offers=[offer_view(o) for o in only(st.offers)], valuations=only(st.valuations), sell_requests=[sell_view(x) for x in only(st.sell_requests)],
                    loans=only(st.loans), invoices=[i for i in st.invoices if i["company_id"] == cid and i["payer"] == "company"],
                    files=only(st.files), audit=audit_rows(("company_id", cid)))
    if role == "investor":
        mine = [o for o in st.offers if o["investor_id"] == user["id"]]
        hold = [h for h in st.holdings if h["investor_id"] == user["id"]]
        cids = {o["company_id"] for o in mine} | {h["company_id"] for h in hold}
        held = {h["company_id"] for h in hold if h["shares"] > 0}
        sells = [x for x in st.sell_requests if x["investor_id"] == user["id"]]
        return dict(base, directory=advisors, intros=[i for i in st.intros if i["investor_id"] == user["id"]],
                    companies=[company_brief(st, c, today) for c in st.companies if c["id"] in cids],
                    offers=mine, holdings=hold, valuations=[v for v in st.valuations if v["company_id"] in held or v["company_id"] in cids],
                    sell_requests=[dict(x, buyer_investor_id=None) for x in sells],
                    transfers=[t for t in st.transfers if user["id"] in (t["from_investor_id"], t["to_investor_id"])],
                    files=[f for f in st.files if f["company_id"] in held and f["purpose"] == "valuation_report"], audit=audit_rows(("user_id", user["id"])))
    # lender
    loans = [l for l in st.loans if l["lender_id"] == user["id"]]
    lids = {l["id"] for l in loans}
    cids = {l["company_id"] for l in loans}
    return dict(base, directory=advisors + [pub(u) for u in st.users if u["role"] == "lender"],
                companies=[c for c in st.companies if c["id"] in cids], reports=[r for r in st.reports if r["status"] == "approved" and r["company_id"] in cids],
                loans=loans, loan_transfers=[t for t in st.loan_transfers if t["loan_id"] in lids or t["from_lender_id"] == user["id"]],
                invoices=[i for i in st.invoices if i["payer"] == "lender" and i["payer_id"] == user["id"]],
                files=[f for f in st.files if f["company_id"] in cids and f["purpose"] in ("monitoring", "loan_doc")], audit=audit_rows(("user_id", user["id"])))


def can_see_file(st, user, f):
    if user["role"] == "advisor":
        return True
    if user["role"] == "founder":
        return f["company_id"] == user["company_id"]
    if user["role"] == "investor":
        return f["purpose"] == "valuation_report" and any(h["investor_id"] == user["id"] and h["company_id"] == f["company_id"] and h["shares"] > 0 for h in st.holdings)
    return f["purpose"] in ("monitoring", "loan_doc") and any(l["lender_id"] == user["id"] and l["company_id"] == f["company_id"] for l in st.loans)


# ---------------- founder ----------------
def a_save_company(st, u, p, today):
    need(owns(u, p.get("company_id")), "Only the company's founder or an advisor can edit it")
    c = company_of(st, p["company_id"])
    patch = p.get("patch") or {}
    need(isinstance(patch, dict), "Bad request")
    allowed = COMPANY_FIELDS + (ADVISOR_COMPANY_FIELDS if u["role"] == "advisor" else ())
    for k, v in patch.items():
        need(k in allowed, "You cannot change " + k)
        if k in ("revenue", "raise"):
            need(fnum(v) is not None and fnum(v) > 0, "Revenue and raise must be positive numbers")
            v = fnum(v)
        elif k in ADVISOR_COMPANY_FIELDS and k != "security_type":
            need(inum(v) is not None and inum(v) >= 0, k + " must be a whole number")
            v = inum(v)
        elif k == "security_type":
            need(v in D.SECURITY_TYPES, "Choose equity, preference or debentures")
        elif k in ("name", "sector", "stage", "city", "instrument"):
            v = str(v).strip()[:120]
            need(v, "Enter a value for " + k)
        c[k] = v
    return "Updated " + ", ".join(patch.keys()), c["id"]


def a_submit_report(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor prepares and submits the debt vs equity report")
    c = company_of(st, p["company_id"])
    ch = p.get("checks") or {}
    need(ch.get("validation") and ch.get("founder_confirmed") and ch.get("verifier"), "All release checks must pass before review")
    need(not any(r["company_id"] == c["id"] and r["status"] == "in_review" for r in st.reports), "A report for this company is already in review")
    r = dict(id=uid("r"), company_id=c["id"], title=str(p.get("title") or "Debt vs equity report")[:120], status="in_review",
             engine_version=str(p.get("engine_version") or "")[:40], created_at=now(), submitted_by=u["id"],
             summary=p.get("summary") or {}, checks=ch, inputs=p.get("inputs") or {})
    st.reports.append(r)
    if c.get("pipeline_stage", "applied") == "applied":
        c.update(pipeline_stage="under_review", stage_since=today)
    notify_advisors(st, "review", "New report to review: " + c["name"], "app-review")
    return "Submitted for advisor review: " + r["title"], c["id"]


def a_apply_loan(st, u, p, today):
    cid = p.get("company_id")
    need(u["role"] == "founder" and u["company_id"] == cid, "Only the company's founder can apply")
    lender = user_of(st, p.get("lender_id"), "lender")
    amount, bps, tenor, mor = inum(p.get("amount_paise")), inum(p.get("rate_bps")), inum(p.get("tenor_months")), inum(p.get("moratorium_months") or 0)
    need(amount and amount > 0 and bps and 0 < bps < 5000 and tenor and 0 < tenor <= 240 and mor is not None and 0 <= mor < tenor, "Enter a valid amount, rate, tenor and moratorium")
    st.loans.append(dict(id=uid("l"), company_id=cid, lender_id=lender["id"], amount_paise=amount, rate_bps=bps, tenor_months=tenor, moratorium_months=mor,
                         status="applied", sanction_date=None, disbursal_date=None, payments={}, created_at=now()))
    notify(st, lender["id"], "loan", "New loan application from " + company_of(st, cid)["name"], "app-loanbook")
    return "Sent a %s loan application to %s" % (rs(amount), lender.get("firm")), cid


# ---------------- advisor: reports, pipeline, cap table ----------------
def a_review_report(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor can review reports")
    r = find(st.reports, p.get("report_id"))
    need(r, "Report not found")
    need(r["status"] == "in_review", "This report is not waiting for review")
    need(p.get("decision") in ("approve", "changes"), "Choose approve or request changes")
    r.update(status="approved" if p["decision"] == "approve" else "changes", reviewed_by=u["id"], reviewed_at=now(), review_note=str(p.get("note") or "")[:500])
    c = company_of(st, r["company_id"])
    if p["decision"] == "approve" and c.get("pipeline_stage") in ("applied", "under_review", None):
        c.update(pipeline_stage="approved", stage_since=today)
    return ("Approved report: " if p["decision"] == "approve" else "Requested changes: ") + r["title"], r["company_id"]


def a_set_stage(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor can move a company")
    c = company_of(st, p.get("company_id"))
    stage = p.get("stage")
    need(stage in D.PIPELINE, "Unknown stage")
    need(stage != c.get("pipeline_stage"), "The company is already in that stage")
    if stage in ("approved", "offering", "funded", "monitoring"):
        need(approved(st, c["id"]), "A company needs an advisor-approved report before it can be " + stage.replace("_", " "))
    old = c.get("pipeline_stage")
    c.update(pipeline_stage=stage, stage_since=today)
    return "Moved %s from %s to %s" % (c["name"], (old or "none").replace("_", " "), stage.replace("_", " ")), c["id"]


def a_save_cap_entry(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor maintains the cap table")
    c = company_of(st, p.get("company_id"))
    name, kind, shares, holders = str(p.get("holder_name") or "").strip()[:120], p.get("holder_type"), inum(p.get("shares")), inum(p.get("holders") or 1)
    need(name and kind in ("founder", "existing") and shares is not None and shares >= 0 and holders and holders >= 1, "Enter the holder, type (founder or existing), shares and number of holders")
    e = find(st.cap_table, p.get("entry_id")) if p.get("entry_id") else None
    if e:
        need(e["company_id"] == c["id"], "Entry not found")
        e.update(holder_name=name, holder_type=kind, shares=shares, holders=holders)
    else:
        st.cap_table.append(dict(id=uid("ct"), company_id=c["id"], holder_name=name, holder_type=kind, shares=shares, holders=holders))
    return "Cap table: %s holds %s shares (%d holder%s)" % (name, grp(shares), holders, "" if holders == 1 else "s"), c["id"]


def a_remove_cap_entry(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor maintains the cap table")
    e = find(st.cap_table, p.get("entry_id"))
    need(e, "Entry not found")
    st.cap_table.remove(e)
    return "Removed %s from the cap table" % e["holder_name"], e["company_id"]


def a_set_checklist(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor updates the compliance checklist")
    c = company_of(st, p.get("company_id"))
    item = p.get("item")
    need(item in dict(D.DOC_CHECKLIST), "Unknown checklist item")
    val = p.get("date")
    if val:
        D.d(val)
    c.setdefault("checklist", {})[item] = val or None
    if item == "allotment" and val:
        c["allotment_date"] = val
    return "%s: %s" % (dict(D.DOC_CHECKLIST)[item], "done " + ddmmmyyyy(val) if val else "not done"), c["id"]


def a_set_external_offers(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records offers")
    c = company_of(st, p.get("company_id"))
    year, sec, n = str(p.get("fy") or D.fy(today)), p.get("security_type") or "equity", inum(p.get("count"))
    need(sec in D.SECURITY_TYPES and n is not None and n >= 0, "Enter the number of off-platform offers")
    c.setdefault("external_offers", {}).setdefault(year, {})[sec] = n
    used = D.offers_used(st, c["id"], year, sec)
    need(used <= settings(st)["offer_limit"], "That would put %s at %d offers in FY %s; the limit is %d" % (c["name"], used, year, settings(st)["offer_limit"]))
    return "Off-platform %s offers for FY %s set to %d (total now %d)" % (sec, year, n, used), c["id"]


def a_post_update(st, u, p, today):
    need(owns(u, p.get("company_id")), "Only the company's founder or an advisor can post updates")
    c = company_of(st, p["company_id"])
    text = str(p.get("text") or "").strip()[:600]
    need(text, "Write the update")
    c.setdefault("updates", []).insert(0, dict(date=today, text=text))
    for iid in holder_ids(st, c["id"]):
        notify(st, iid, "update", "Company update from " + c["name"], "app-portfolio")
    return "Posted an update for " + c["name"], c["id"]


def a_set_investor_profile(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records KYC")
    inv = user_of(st, p.get("investor_id"), "investor")
    prof = inv["profile"] = inv.get("profile") or {}
    if p.get("kyc") is not None:
        need(p["kyc"] in ("verified", "pending", "not_started"), "Unknown KYC status")
        prof["kyc"] = p["kyc"]
    if p.get("accredited") is not None:
        prof["accredited"] = bool(p["accredited"])
    return "Updated %s: KYC %s, accredited %s" % (label(inv), prof.get("kyc"), "yes" if prof.get("accredited") else "no"), None


def a_save_settings(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor changes settings")
    s = settings(st)
    n = inum(p.get("max_platform_investors"))
    need(n and 1 <= n <= 200, "Platform investor limit must be between 1 and 200")
    s["max_platform_investors"] = n
    return "Platform investor limit set to %d per company" % n, None


# ---------------- advisor: offers and allotment (Section 42, Section 2(68)) ----------------
def a_share_offer(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor shares offers")
    c = company_of(st, p.get("company_id"))
    need(c.get("pipeline_stage") in ("approved", "offering") and approved(st, c["id"]), "Only a company in Approved or Offering status with a signed-off report can be offered")
    sec = p.get("security_type") or c.get("security_type") or "equity"
    need(sec in D.SECURITY_TYPES, "Choose equity, preference or debentures")
    ids = list(dict.fromkeys(p.get("investor_ids") or []))
    need(ids, "Select at least one investor")
    year = D.fy(today)
    already = {o["investor_id"] for o in st.offers if o["company_id"] == c["id"] and o["fy"] == year and o["security_type"] == sec}
    invs = [user_of(st, i, "investor") for i in ids]
    for inv in invs:
        need((inv.get("profile") or {}).get("kyc") == "verified", label(inv) + " has not completed KYC")
    new = [inv for inv in invs if inv["id"] not in already]
    need(new, "Every selected investor already has this offer for FY " + year)
    s = settings(st)
    used = D.offers_used(st, c["id"], year, sec)
    need(used + len(new) <= s["offer_limit"], "Blocked: %s has %d of %d %s offers used in FY %s. Sending %d more would exceed the Section 42 limit; %d left." % (
        c["name"], used, s["offer_limit"], sec, year, len(new), s["offer_limit"] - used))
    for inv in new:
        st.offers.append(dict(id=uid("o"), company_id=c["id"], investor_id=inv["id"], fy=year, security_type=sec, sent_at=now(), sent_by=u["id"],
                              response="pending", responded_at=None, share_identity=False, views=[]))
        notify(st, inv["id"], "offer", "New private offer: " + c["name"], "app-opportunities")
    if c["pipeline_stage"] == "approved":
        c.update(pipeline_stage="offering", stage_since=today)
    total = used + len(new)
    return "Shared %s with %d investor%s (%d of %d offers used in FY %s%s)" % (c["name"], len(new), "" if len(new) == 1 else "s", total, s["offer_limit"], year,
                                                                                "; already offered: %d" % (len(invs) - len(new)) if len(invs) > len(new) else ""), c["id"]


def check_new_holder(st, cid, investor_id, leaving=None):
    """A new holder must keep platform investors <= the limit and members <= 200. `leaving` is a seller who exits completely."""
    s = settings(st)
    current = holder_ids(st, cid)
    if investor_id in current:
        return
    plat = len(current) + 1 - (1 if leaving in current else 0)
    mem = D.members(st, cid) + 1 - (1 if leaving in current else 0)
    need(plat <= s["max_platform_investors"], "Blocked: this would make %d platform investors in the company; the limit is %d" % (plat, s["max_platform_investors"]))
    need(mem <= s["member_limit"], "Blocked: this would make %d members (shareholders); a private company may have at most %d" % (mem, s["member_limit"]))


def a_allot_shares(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records an allotment")
    o = find(st.offers, p.get("offer_id"))
    need(o, "Offer not found")
    need(o["response"] == "interested", "The investor must express interest before shares are allotted")
    c = company_of(st, o["company_id"])
    shares, amount, when = inum(p.get("shares")), inum(p.get("amount_paise")), valid_date(p.get("allotment_date") or today)
    need(shares and shares > 0 and amount and amount > 0, "Enter the shares allotted and the amount paid")
    need(when <= today, "The allotment date cannot be in the future")
    check_new_holder(st, c["id"], o["investor_id"])
    st.holdings.append(dict(id=uid("h"), investor_id=o["investor_id"], company_id=c["id"], shares=shares, allotment_date=when, invested_at=when,
                            cost_paise=amount, origin="allotment", early_consent=None))
    o.update(response="invested", responded_at=o.get("responded_at") or now())
    c["allotment_date"] = when
    c.setdefault("checklist", {})["allotment"] = when
    if c.get("pipeline_stage") == "offering":
        c.update(pipeline_stage="funded", stage_since=today)
    notify(st, o["investor_id"], "allotment", "%s shares of %s allotted to you" % (grp(shares), c["name"]), "app-portfolio")
    return "Allotted %s shares of %s to %s for %s" % (grp(shares), c["name"], label(user_of(st, o["investor_id"])), rs(amount)), c["id"]


def a_publish_valuation(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor publishes valuations")
    c = company_of(st, p.get("company_id"))
    when, price, method, valuer = p.get("date"), inum(p.get("price_per_share_paise")), p.get("method"), str(p.get("valuer") or "").strip()[:120]
    need(when and D.d(when) and when <= today, "Enter a valuation date that is not in the future")
    need(price and price > 0, "Enter the price per share")
    need(method in ("DCF", "Market multiples"), "Choose DCF or market multiples")
    need(valuer, "Enter the registered valuer's name")
    f = find(st.files, p.get("file_id")) if p.get("file_id") else None
    need(not p.get("file_id") or (f and f["company_id"] == c["id"]), "Report file not found")
    prev = D.latest_valuation(st, c["id"])
    st.valuations.append(dict(id=uid("v"), company_id=c["id"], date=when, price_per_share_paise=price, method=method, valuer=valuer,
                              report_file=f and f["id"], published_at=now(), published_by=u["id"]))
    for iid in holder_ids(st, c["id"]):
        notify(st, iid, "valuation", "Revaluation published: %s at %s a share" % (c["name"], rs(price)), "app-portfolio")
    return "Published %s valuation of %s: %s a share (was %s)" % (method, c["name"], rs(price), rs(prev["price_per_share_paise"]) if prev else "none"), c["id"]


# ---------------- investor ----------------
def a_respond_offer(st, u, p, today):
    o = find(st.offers, p.get("offer_id"))
    need(o and u["role"] == "investor" and o["investor_id"] == u["id"], "Offer not found")
    need(o["response"] in ("pending", "interested", "declined"), "This offer is closed")
    need(p.get("response") in ("interested", "declined"), "Choose interested or decline")
    o.update(response=p["response"], responded_at=now(), share_identity=bool(p.get("share_identity")) and p["response"] == "interested")
    c = company_of(st, o["company_id"])
    notify_advisors(st, "offer", "%s %s %s" % (label(u), "is interested in" if p["response"] == "interested" else "declined", c["name"]), "app-directory")
    return ("Expressed interest in " if p["response"] == "interested" else "Declined the offer for ") + c["name"], c["id"]


def a_view_doc(st, u, p, today):
    o = find(st.offers, p.get("offer_id"))
    need(o and u["role"] == "investor" and o["investor_id"] == u["id"] and o["response"] != "declined", "Offer not found")
    c = company_of(st, o["company_id"])
    need(p.get("doc") in (c.get("docs") or []) or p.get("doc") == "Advisor-reviewed report", "Document not found")
    o.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


# ---------------- deal rooms: investor asks, founder grants, investor signs the NDA ----------------
def a_request_intro(st, u, p, today):
    need(u["role"] == "investor", "Only investors can ask for deal-room access")
    cid = p.get("company_id")
    c = company_of(st, cid)
    need(any(o["company_id"] == cid and o["investor_id"] == u["id"] and o["response"] != "declined" for o in st.offers),
         "Deal rooms open only for companies your advisor has offered to you")
    need(not any(i["company_id"] == cid and i["investor_id"] == u["id"] for i in st.intros), "You have already asked for access to this deal room")
    st.intros.append(dict(id=uid("i"), company_id=cid, investor_id=u["id"], status="requested", created_at=now(), nda_signed_at=None, views=[]))
    for f in st.users:
        if f["role"] == "founder" and f.get("company_id") == cid:
            notify(st, f["id"], "intro", label(u) + " asked for access to your deal room", "app-investors")
    return "Asked for access to the %s deal room" % c["name"], cid


def a_decide_intro(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i, "Introduction not found")
    need(u["role"] == "founder" and u["company_id"] == i["company_id"], "Only the company's founder can decide")
    need(i["status"] == "requested", "This request was already decided")
    need(p.get("decision") in ("grant", "decline"), "Choose grant or decline")
    i["status"] = "granted" if p["decision"] == "grant" else "declined"
    notify(st, i["investor_id"], "intro", "%s %s your deal-room request" % (company_of(st, i["company_id"])["name"], "granted" if i["status"] == "granted" else "declined"), "app-rooms")
    return ("Granted deal-room access to " if i["status"] == "granted" else "Declined ") + label(user_of(st, i["investor_id"])), i["company_id"]


def a_sign_nda(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i and u["role"] == "investor" and i["investor_id"] == u["id"], "Introduction not found")
    need(i["status"] == "granted", "The founder has not granted access yet")
    i["nda_signed_at"] = i.get("nda_signed_at") or now()
    return "Signed the NDA for " + company_of(st, i["company_id"])["name"], i["company_id"]


def a_view_room_doc(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i and u["role"] == "investor" and i["investor_id"] == u["id"] and i["status"] == "granted" and i.get("nda_signed_at"), "Sign the NDA to open documents")
    c = company_of(st, i["company_id"])
    need(p.get("doc") in (c.get("docs") or []), "Document not found")
    i.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


def a_suggest_investor(st, u, p, today):
    need(u["role"] == "founder", "Only founders suggest investors")
    inv = user_of(st, p.get("investor_id"), "investor")
    c = company_of(st, u["company_id"])
    note = "%s suggests offering to %s" % (u["name"], label(inv))
    st.notes.append(dict(id=uid("n"), subject_type="company", subject_id=c["id"], text=note + ".", due=None, done=False, by=u["id"], at=now()))
    notify_advisors(st, "suggest", note + " (" + c["name"] + ")", "app-directory")
    return "Suggested %s to your advisor. Your advisor decides who receives the offer." % label(inv), c["id"]


def a_request_sell(st, u, p, today):
    h = find(st.holdings, p.get("holding_id"))
    need(h and u["role"] == "investor" and h["investor_id"] == u["id"], "Holding not found")
    need(h["shares"] > 0, "You no longer hold these shares")
    need(not any(x["holding_id"] == h["id"] and x["status"] in SELL_OPEN for x in st.sell_requests), "A sell request for this holding is already open")
    s = settings(st)
    unlock = D.lock_until(h, s)
    need(today >= unlock or h.get("early_consent"), "Locked: you can request to sell from %s, %d months after allotment" % (ddmmmyyyy(unlock), s["lock_months"]))
    n = inum(p.get("shares")) if p.get("shares") not in (None, "") else h["shares"]
    need(n and 0 < n <= h["shares"], "Enter between 1 and %s shares" % grp(h["shares"]))
    price = inum(p.get("indicative_price_paise")) if p.get("indicative_price_paise") not in (None, "") else None
    need(price is None or price > 0, "The indicative price must be positive")
    c = company_of(st, h["company_id"])
    x = dict(id=uid("s"), holding_id=h["id"], investor_id=u["id"], company_id=c["id"], shares=n, full=n == h["shares"], indicative_price_paise=price,
             note=str(p.get("note") or "")[:500], status="submitted", rofr_days=None, rofr_until=None, buyer_investor_id=None, spa_date=None,
             price_paise=None, reason=None, created_at=now(), history=[dict(status="submitted", at=now(), by=u["id"])])
    st.sell_requests.append(x)
    notify_advisors(st, "sell", "Sell request: %s, %s shares of %s" % (label(u), grp(n), c["name"]), "app-requests")
    return "Requested to sell %s %s shares of %s" % ("all" if x["full"] else "", grp(n), c["name"]), c["id"]


def a_withdraw_sell(st, u, p, today):
    x = find(st.sell_requests, p.get("request_id"))
    need(x and u["role"] == "investor" and x["investor_id"] == u["id"], "Request not found")
    need(x["status"] in ("submitted", "under_review", "rofr"), "This request can no longer be withdrawn")
    x["status"] = "withdrawn"
    x["history"].append(dict(status="withdrawn", at=now(), by=u["id"]))
    return "Withdrew a sell request", x["company_id"]


def a_read_notifications(st, u, p, today):
    n = 0
    for x in st.notifications:
        if x["user_id"] == u["id"] and not x["read"]:
            x["read"] = True
            n += 1
    return "Marked %d notification%s read" % (n, "" if n == 1 else "s"), None


# ---------------- advisor: equity resales ----------------
def a_record_consent(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records the founder's consent")
    h = find(st.holdings, p.get("holding_id"))
    need(h, "Holding not found")
    note = str(p.get("note") or "").strip()[:300]
    need(note, "Describe the written consent (who signed and when)")
    h["early_consent"] = dict(by=u["id"], at=now(), note=note)
    notify(st, h["investor_id"], "sell", "The founder's written consent allows an early sale of your %s shares" % company_of(st, h["company_id"])["name"], "app-portfolio")
    return "Recorded founder consent for an early sale: " + note, h["company_id"]


def a_sell_step(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor moves a sell request")
    x = find(st.sell_requests, p.get("request_id"))
    need(x, "Request not found")
    step = p.get("step")
    c = company_of(st, x["company_id"])
    h = find(st.holdings, x["holding_id"])
    if step == "reject":
        need(x["status"] in SELL_OPEN, "This request is closed")
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give a reason")
        x.update(status="rejected", reason=reason)
    elif step == "review":
        need(x["status"] == "submitted", "Only a submitted request can be put under review")
        x["status"] = "under_review"
    elif step == "rofr":
        need(x["status"] == "under_review", "Review the request first")
        days = inum(p.get("days"))
        need(days and 15 <= days <= 30, "The first-refusal window is 15 to 30 days")
        x.update(status="rofr", rofr_days=days, rofr_until=D.add_days(today, days))
    elif step == "buyer":
        need(x["status"] == "rofr", "Start the first-refusal window first")
        need(today >= x["rofr_until"] or p.get("waived"), "The first-refusal window runs until %s. Record a written waiver to proceed early." % ddmmmyyyy(x["rofr_until"]))
        buyer = user_of(st, p.get("buyer_investor_id"), "investor")
        need(buyer["id"] != x["investor_id"], "The buyer cannot be the seller")
        need((buyer.get("profile") or {}).get("kyc") == "verified", label(buyer) + " has not completed KYC")
        check_new_holder(st, c["id"], buyer["id"], leaving=x["investor_id"] if x["full"] else None)
        x.update(status="buyer_introduced", buyer_investor_id=buyer["id"], rofr_waived=bool(p.get("waived")) and today < x["rofr_until"])
    elif step == "spa":
        need(x["status"] == "buyer_introduced", "Introduce a buyer first")
        price, when = inum(p.get("price_paise")), valid_date(p.get("spa_date") or today)
        need(price and price > 0, "Enter the agreed price per share")
        need(when <= today, "The SPA date cannot be in the future")
        x.update(status="spa_signed", price_paise=price, spa_date=when)
    elif step == "complete":
        need(x["status"] == "spa_signed", "Record the signed SPA first")
        need(h and h["shares"] >= x["shares"], "The seller no longer holds these shares")
        buyer = user_of(st, x["buyer_investor_id"], "investor")
        leaving = x["investor_id"] if x["shares"] == h["shares"] else None
        check_new_holder(st, c["id"], buyer["id"], leaving=leaving)
        cost_moved = h["cost_paise"] * x["shares"] // h["shares"]
        h["shares"] -= x["shares"]
        h["cost_paise"] -= cost_moved
        st.holdings.append(dict(id=uid("h"), investor_id=buyer["id"], company_id=c["id"], shares=x["shares"], allotment_date=today, invested_at=today,
                                cost_paise=x["shares"] * x["price_paise"], origin="transfer", early_consent=None))
        st.transfers.append(dict(id=uid("t"), sell_request_id=x["id"], company_id=c["id"], from_investor_id=x["investor_id"], to_investor_id=buyer["id"],
                                 shares=x["shares"], price_paise=x["price_paise"], spa_date=x["spa_date"], completed_at=now()))
        x["status"] = "completed"
        notify(st, buyer["id"], "sell", "%s shares of %s transferred to you" % (grp(x["shares"]), c["name"]), "app-portfolio")
    else:
        raise Denied("Unknown step")
    x["history"].append(dict(status=x["status"], at=now(), by=u["id"]))
    notify(st, x["investor_id"], "sell", "Your sell request for %s: %s" % (c["name"], x["status"].replace("_", " ")), "app-portfolio")
    return "Resale of %s %s shares by %s: %s" % (grp(x["shares"]), c["name"], label(user_of(st, x["investor_id"])), STATUS_LABEL[x["status"]]), c["id"]


# ---------------- lender ----------------
def a_lender_decide(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    nxt = {"sanction": ("applied", "sanctioned"), "decline": ("applied", "declined"), "disburse": ("sanctioned", "disbursed")}.get(p.get("decision"))
    need(nxt and l["status"] == nxt[0], "That step is not available now")
    l["status"] = nxt[1]
    if nxt[1] == "sanctioned":
        l["sanction_date"] = today
    if nxt[1] == "disbursed":
        l.update(disbursal_date=today, payments={})
    return "Loan %s (%s)" % (l["status"], rs(l["amount_paise"])), l["company_id"]


def a_record_repayment(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] in ("lender", "advisor") and (u["role"] == "advisor" or l["lender_id"] == u["id"]), "Not your loan")
    row = next((r for r in D.schedule(l, today) if r["due"] == p.get("due")), None)
    need(row, "Instalment not found")
    need(row["status"] != "paid", "Already marked as received")
    need(row["due"] <= D.add_days(today, 31), "You can only record instalments due in the next month or earlier")
    l.setdefault("payments", {})[row["due"]] = today
    return "Recorded the %s instalment of %s (due %s)" % (company_of(st, l["company_id"])["name"], rs(row["payment"]), ddmmmyyyy(row["due"])), l["company_id"]


def a_request_loan_transfer(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    need(l["status"] == "disbursed", "Only a disbursed loan can be transferred")
    need((u.get("profile") or {}).get("regulated"), "Only regulated banks and NBFCs can transfer loans")
    need(not any(t["loan_id"] == l["id"] and t["status"] not in ("completed", "rejected") for t in st.loan_transfers), "A transfer for this loan is already open")
    pending = D.loan_summary(l, today)["principal_pending"]
    amount = inum(p.get("amount_paise")) if p.get("amount_paise") not in (None, "") else None
    need(amount is not None or p.get("amount_paise") in (None, ""), "Enter the amount as a number")
    need(amount is None or 0 < amount <= pending, "The amount must be up to the outstanding %s" % rs(pending))
    st.loan_transfers.append(dict(id=uid("lt"), loan_id=l["id"], from_lender_id=u["id"], amount_paise=amount, note=str(p.get("note") or "")[:500],
                                  status="submitted", buyer_lender_id=None, fee_rate=None, fee_paise=None, created_at=now(),
                                  history=[dict(status="submitted", at=now(), by=u["id"])]))
    notify_advisors(st, "transfer", "Loan transfer request: %s, %s" % (label(u), company_of(st, l["company_id"])["name"]), "app-loantransfers")
    return "Asked Aegis Ascend to transfer %s of the %s loan" % (rs(amount or pending), company_of(st, l["company_id"])["name"]), l["company_id"]


def a_loan_transfer_step(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor arranges loan transfers")
    t = find(st.loan_transfers, p.get("transfer_id"))
    need(t and t["status"] not in ("completed", "rejected"), "No open transfer")
    l = find(st.loans, t["loan_id"])
    step = p.get("step")
    if step == "reject":
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give a reason")
        t.update(status="rejected", reason=reason)
    else:
        need(step in LT_STEPS and LT_STEPS.index(step) == LT_STEPS.index(t["status"]) + 1, "Do the steps in order: next is " + LT_STEPS[LT_STEPS.index(t["status"]) + 1].replace("_", " "))
        if step == "eligibility":
            seller = user_of(st, t["from_lender_id"], "lender")
            need((seller.get("profile") or {}).get("regulated"), "The selling lender is not a regulated bank or NBFC")
            held = D.days_between(l["disbursal_date"], today) / 30.4375
            mhp = D.min_holding_months(l)
            need(held >= mhp, "Minimum holding period not met: %d months needed, %.1f held" % (mhp, held))
            t["eligibility"] = dict(checked_at=now(), months_held=round(held, 1), min_holding=mhp)
        elif step == "consent":
            t["borrower_consent_at"] = valid_date(p.get("date") or today)
        elif step == "buyer_introduced":
            buyer = user_of(st, p.get("buyer_lender_id"), "lender")
            need(buyer["id"] != t["from_lender_id"], "The buyer must be a different lender")
            need((buyer.get("profile") or {}).get("regulated"), "Loans move only between regulated banks and NBFCs")
            t["buyer_lender_id"] = buyer["id"]
        elif step == "deed_signed":
            t["deed_date"] = valid_date(p.get("date") or today)
        elif step == "charge_updated":
            t["charge_date"] = valid_date(p.get("date") or today)
        elif step == "completed":
            rate = fnum(p.get("fee_rate"))
            need(rate is not None and 0.003 <= rate <= 0.005, "The transfer fee is 0.3% to 0.5%")
            base = t["amount_paise"] or D.loan_summary(l, today)["principal_pending"]
            fee = D.half_up(base * rate)
            t.update(fee_rate=rate, fee_paise=fee)
            l["lender_id"] = t["buyer_lender_id"]
            st.invoices.append(dict(id=uid("f"), kind="transfer", company_id=l["company_id"], payer="lender", payer_id=t["from_lender_id"],
                                    period="Loan transfer " + t["id"], amount_paise=fee, gst_paise=fee * 18 // 100, issued=today, due=D.add_days(today, 15), paid_on=None))
            notify(st, t["buyer_lender_id"], "transfer", "A %s loan has moved to your book" % company_of(st, l["company_id"])["name"], "app-loanbook")
        t["status"] = step
    t["history"].append(dict(status=t["status"], at=now(), by=u["id"]))
    notify(st, t["from_lender_id"], "transfer", "Loan transfer for %s: %s" % (company_of(st, l["company_id"])["name"], t["status"].replace("_", " ")), "app-loanbook")
    return "Loan transfer of the %s loan from %s: %s" % (company_of(st, l["company_id"])["name"], label(user_of(st, t["from_lender_id"])), STATUS_LABEL[t["status"]]), l["company_id"]


# ---------------- advisor: notes, invoices ----------------
def a_save_note(st, u, p, today):
    need(u["role"] == "advisor", "Only advisors keep notes")
    kind, sid, text = p.get("subject_type"), p.get("subject_id"), str(p.get("text") or "").strip()[:600]
    need(kind in ("investor", "lender", "company") and sid and text, "Write the note and choose who it is about")
    if kind == "company":
        company_of(st, sid)
    else:
        user_of(st, sid, kind)
    due = p.get("due") or None
    if due:
        D.d(due)
    st.notes.append(dict(id=uid("n"), subject_type=kind, subject_id=sid, text=text, due=due, done=False, by=u["id"], at=now()))
    return "Added a note" + (" due " + ddmmmyyyy(due) if due else ""), sid if kind == "company" else None


def a_toggle_note(st, u, p, today):
    need(u["role"] == "advisor", "Only advisors keep notes")
    n = find(st.notes, p.get("note_id"))
    need(n, "Note not found")
    n["done"] = not n["done"]
    return ("Completed" if n["done"] else "Reopened") + " a task", n["subject_id"] if n["subject_type"] == "company" else None


def a_mark_invoice_paid(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records payments")
    f = find(st.invoices, p.get("invoice_id"))
    need(f and not f["paid_on"], "Invoice not found or already paid")
    f["paid_on"] = valid_date(p.get("date") or today)
    return "Invoice %s marked paid (%s + GST)" % (f["id"], rs(f["amount_paise"])), f["company_id"]


def a_save_invoice(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor raises invoices")
    kind = p.get("kind")
    need(kind in ("advisory", "success", "revenue_share", "monitoring", "transfer"), "Unknown fee type")
    c = company_of(st, p.get("company_id"))
    amount = inum(p.get("amount_paise"))
    need(amount and amount > 0, "Enter the amount")
    payer = "lender" if kind in ("monitoring", "transfer") else "company"
    payer_id = c["id"] if payer == "company" else user_of(st, p.get("payer_id"), "lender")["id"]
    due = valid_date(p.get("due") or D.add_days(today, 15))
    st.invoices.append(dict(id=uid("f"), kind=kind, company_id=c["id"], payer=payer, payer_id=payer_id, period=str(p.get("period") or "")[:60],
                            amount_paise=amount, gst_paise=amount * 18 // 100, issued=today, due=due, paid_on=None))
    return "Raised a %s invoice for %s: %s + GST" % (kind.replace("_", " "), c["name"], rs(amount)), c["id"]


ACTIONS = {name[2:]: fn for name, fn in list(globals().items()) if name.startswith("a_") and callable(fn)}
