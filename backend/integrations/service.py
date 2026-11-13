"""Starting KYC checks, signings and payments, and applying the providers' signed results.

Results are applied in one transaction behind the same write lock as every other action, through the same Store, with an
audit entry and notifications, so they look and behave like any other change. A provider event is recorded before it is
applied; the same event arriving again is ignored."""
import hashlib
import hmac
import re
from datetime import date

from sqlalchemy import insert, select, update

from backend import db as T
from backend.auth import utcnow
from backend.config import settings
from backend.integrations import documents as DOCS
from backend.integrations.providers import Event, provider
from backend.storage import storage
from backend.store import Store, diff, now, uid, write_audit
from server.actions import Denied, find, label, notify, notify_advisors

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def need(cond, msg):
    if not cond:
        raise Denied(msg)


def today():
    return settings.today or date.today().isoformat()


def nice_date(iso):
    d = date.fromisoformat(iso[:10])
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)


def pan_hash(pan):
    return hmac.new(settings.secret_key.encode(), ("pan:" + pan).encode(), hashlib.sha256).hexdigest()


def _save(conn, st, user, action, detail, company_id=None):
    changes = st.save()
    write_audit(conn, user, action, detail, company_id, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes])


def _user(st, uid_):
    return next((u for u in st.users if u["id"] == uid_), None)


# ---------- KYC ----------
def start_kyc(conn, user, pan, name):
    need(user["role"] == "investor", "Identity checks are for investors")
    pan, name = str(pan or "").strip().upper(), str(name or "").strip()[:120]
    need(PAN_RE.match(pan), "Enter a valid PAN: 5 letters, 4 digits, 1 letter (for example ABCDE1234F)")
    need(name, "Enter your name as it appears on your PAN card")
    T.write_lock(conn)
    st = Store(conn)
    me = _user(st, user["id"])
    prof = me["profile"] = me.get("profile") or {}
    need(prof.get("kyc") != "verified", "Your identity is already verified")
    h = pan_hash(pan)
    other = conn.execute(select(T.kyc_checks.c.user_id).where(T.kyc_checks.c.pan_hash == h, T.kyc_checks.c.status == "verified",
                                                               T.kyc_checks.c.user_id != user["id"])).first()
    need(not other, "This PAN is already verified on another account. Contact your advisor.")
    check = dict(id=uid("kyc"), user_id=user["id"], name_given=name, pan_last4=pan[-4:])
    p = provider("kyc")
    ref, url = p.start_kyc(check, me, settings.public_url + "/#app-kyc")
    conn.execute(insert(T.kyc_checks).values(provider=p.name, provider_ref=ref, status="started", pan_hash=h, created_at=utcnow(), **check))
    prof["kyc"] = "pending"
    _save(conn, st, user, "kyc_started", "Started an identity check (PAN ending %s) with %s" % (pan[-4:], p.name))
    return dict(redirect_url=url)


def kyc_status(conn, user):
    rows = conn.execute(select(T.kyc_checks).where(T.kyc_checks.c.user_id == user["id"]).order_by(T.kyc_checks.c.created_at.desc()).limit(5)).all()
    return dict(kyc=(user.get("profile") or {}).get("kyc") or "not_started",
                checks=[dict(id=r.id, status=r.status, pan_last4=r.pan_last4, provider=r.provider, reason=r.reason,
                             started=r.created_at.isoformat(), completed=r.completed_at and r.completed_at.isoformat()) for r in rows])


def _apply_kyc(conn, st, ev, provider_name):
    r = conn.execute(select(T.kyc_checks).where(T.kyc_checks.c.provider == provider_name, T.kyc_checks.c.provider_ref == ev.ref)).first()
    need(r, "Unknown KYC check")
    if r.status != "started":
        return "already decided"
    inv = _user(st, r.user_id)
    prof = inv["profile"] = inv.get("profile") or {}
    if ev.outcome == "verified":
        conn.execute(update(T.kyc_checks).where(T.kyc_checks.c.id == r.id).values(status="verified", completed_at=utcnow()))
        prof.update(kyc="verified", kyc_verified_at=now(), kyc_ref=r.id, pan_last4=r.pan_last4, kyc_note=None)
        notify(st, inv["id"], "kyc", "Your identity is verified. You can now receive private offers.", "app-kyc")
        notify_advisors(st, "kyc", "KYC verified: " + label(inv), "app-directory")
        _save(conn, st, inv, "kyc_verified", "Identity verified by %s (PAN ending %s)" % (provider_name, r.pan_last4))
    else:
        reason = str(ev.data.get("reason") or "The details could not be verified")[:300]
        conn.execute(update(T.kyc_checks).where(T.kyc_checks.c.id == r.id).values(status="rejected", reason=reason, completed_at=utcnow()))
        prof.update(kyc="not_started", kyc_note=reason)
        notify(st, inv["id"], "kyc", "Your identity check did not go through: " + reason, "app-kyc")
        _save(conn, st, inv, "kyc_rejected", "Identity check not passed (%s): %s" % (provider_name, reason))
    return "applied"


# ---------- e-signing ----------
def _new_request(conn, kind, subject_id, company_id, signer, created_by, title, body, terms=None):
    req = dict(id=uid("sig"), kind=kind, subject_id=subject_id, company_id=company_id, signer_id=signer["id"], created_by=created_by,
               title=title, body=body, doc_hash=DOCS.doc_hash(body), terms=terms, provider=settings.esign_provider, status="created", created_at=utcnow())
    conn.execute(insert(T.esign_requests).values(**req))
    return req


def _send(conn, req, signer, return_path):
    p = provider("esign")
    ref, url = p.start_esign(req, signer, settings.public_url + return_path)
    conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == req["id"]).values(provider=p.name, provider_ref=ref, status="sent"))
    return url


def start_nda(conn, user, intro_id):
    T.write_lock(conn)
    st = Store(conn)
    i = find(st.intros, intro_id)
    need(i and user["role"] == "investor" and i["investor_id"] == user["id"], "Introduction not found")
    need(i["status"] == "granted", "The founder has not granted access yet")
    need(not i.get("nda_signed_at"), "You have already signed this NDA")
    c = find(st.companies, i["company_id"])
    me = _user(st, user["id"])
    old = conn.execute(select(T.esign_requests).where(T.esign_requests.c.kind == "nda", T.esign_requests.c.subject_id == i["id"],
                                                      T.esign_requests.c.status.in_(("created", "sent")))).first()
    req = dict(old._mapping) if old else _new_request(conn, "nda", i["id"], c["id"], me, user["id"], *DOCS.nda(c, me, nice_date(today())))
    write_audit(conn, user, "esign_started", "Opened the NDA for %s for e-signing" % c["name"], c["id"])
    return dict(redirect_url=_send(conn, req, me, "/#app-rooms"))


def send_engagement(conn, user, company_id, fee_lakh):
    need(user["role"] == "advisor", "Only an advisor sends engagement letters")
    try:
        fee_paise = int(round(float(fee_lakh) * 100_000 * 100))
    except (TypeError, ValueError):
        fee_paise = 0
    need(fee_paise >= 100_000 * 100, "The advisory fee starts at Rs 1 lakh")
    need(fee_paise <= 1_00_00_000 * 100, "Check the advisory fee: it is above Rs 1 crore")
    T.write_lock(conn)
    st = Store(conn)
    c = find(st.companies, company_id)
    need(c, "Company not found")
    founder = next((u for u in st.users if u["role"] == "founder" and u.get("company_id") == c["id"]), None)
    need(founder, "This company has no founder account to sign")
    eng = c.get("engagement") or {}
    need(eng.get("status") != "signed", "This company has already signed its engagement letter")
    if eng.get("esign_id"):   # a resent letter replaces the unsigned one
        conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == eng["esign_id"], T.esign_requests.c.status.in_(("created", "sent")))
                     .values(status="replaced"))
    req = _new_request(conn, "engagement", c["id"], c["id"], founder, user["id"], *DOCS.engagement(c, founder, fee_paise, nice_date(today())),
                       terms=dict(fee_paise=fee_paise))
    c["engagement"] = dict(status="sent", esign_id=req["id"], fee_paise=fee_paise, sent_at=now(), signed_at=None)
    notify(st, founder["id"], "esign", "Your engagement letter from Aegis Ascend is ready to sign", "app")
    _save(conn, st, user, "engagement_sent", "Sent the engagement letter to %s (advisory fee Rs %s lakh)" % (c["name"], "{:g}".format(fee_paise / 10_000_000)), c["id"])
    return dict(esign_id=req["id"])


def start_esign(conn, user, esign_id):
    r = conn.execute(select(T.esign_requests).where(T.esign_requests.c.id == esign_id)).first()
    need(r and r.signer_id == user["id"], "Document not found")
    need(r.status in ("created", "sent"), "This document is already %s" % r.status)
    me = dict(conn.execute(select(T.users).where(T.users.c.id == user["id"])).first()._mapping)
    write_audit(conn, user, "esign_started", "Opened \"%s\" for e-signing" % r.title, r.company_id)
    return dict(redirect_url=_send(conn, dict(r._mapping), me, "/#app-rooms" if r.kind == "nda" else "/#app"))


def esign_document(conn, user, esign_id):
    """The signed copy, for the signer and advisors."""
    r = conn.execute(select(T.esign_requests).where(T.esign_requests.c.id == esign_id)).first()
    need(r and (r.signer_id == user["id"] or user["role"] == "advisor"), "Document not found")
    need(r.status == "signed" and r.signed_key, "This document has not been signed yet")
    return r, storage().get(r.signed_key)


def _apply_esign(conn, st, ev, provider_name):
    r = conn.execute(select(T.esign_requests).where(T.esign_requests.c.provider == provider_name, T.esign_requests.c.provider_ref == ev.ref)).first()
    need(r, "Unknown signing request")
    if r.status != "sent":
        return "already decided"
    signer = _user(st, r.signer_id)
    if ev.outcome != "signed":
        conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == r.id).values(status="declined"))
        if r.kind == "engagement":
            c = find(st.companies, r.subject_id)
            c["engagement"] = dict(c.get("engagement") or {}, status="declined")
            notify_advisors(st, "esign", "%s declined the engagement letter" % c["name"], "app-companyfile/" + c["id"])
        _save(conn, st, signer, "esign_declined", "Declined to sign \"%s\"" % r.title, r.company_id)
        return "applied"
    signed_at, ip = utcnow(), str(ev.data.get("ip") or "")[:64] or None
    req = dict(r._mapping, signed_at=signed_at, signer_ip=ip)
    pdf = provider("esign").fetch_signed(ev.ref) or DOCS.signed_pdf(req, signer, "%s e-sign" % provider_name)
    key = "esign_%s.pdf" % r.id
    storage().put(key, pdf, "application/pdf")
    conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == r.id).values(status="signed", signed_at=signed_at, signer_ip=ip, signed_key=key))
    if r.kind == "nda":
        i = find(st.intros, r.subject_id)
        i["nda_signed_at"] = i.get("nda_signed_at") or signed_at.isoformat()
        i["nda_esign_id"] = r.id
        _save(conn, st, signer, "nda_esigned", "Signed the NDA for %s by e-sign" % find(st.companies, r.company_id)["name"], r.company_id)
    else:
        c = find(st.companies, r.subject_id)
        c["engagement"] = dict(c.get("engagement") or {}, status="signed", signed_at=signed_at.isoformat())
        notify_advisors(st, "esign", "%s signed the engagement letter" % c["name"], "app-companyfile/" + c["id"])
        _save(conn, st, signer, "engagement_signed", "Signed the engagement letter by e-sign", c["id"])
    return "applied"


# ---------- payments ----------
def start_payment(conn, user, invoice_id):
    T.write_lock(conn)
    st = Store(conn)
    f = find(st.invoices, invoice_id)
    mine = f and ((f["payer"] == "company" and user["role"] == "founder" and user.get("company_id") == f["company_id"])
                  or (f["payer"] in ("investor", "lender") and f.get("payer_id") == user["id"]))
    need(mine, "Invoice not found")
    need(not f.get("paid_on"), "This invoice is already paid")
    total = f["amount_paise"] + f["gst_paise"]
    pay = dict(id=uid("pay"), invoice_id=f["id"], payer_user_id=user["id"], amount_paise=total)
    p = provider("payment")
    back = {"founder": "/#app-fees", "investor": "/#app-sells", "lender": "/#app-lfees"}.get(user["role"], "/#app")
    ref, url = p.start_payment(pay, f, user, settings.public_url + back)
    conn.execute(insert(T.payments).values(provider=p.name, provider_ref=ref, status="created", currency="INR", created_at=utcnow(), **pay))
    write_audit(conn, user, "payment_started", "Started an online payment of invoice %s (Rs %s incl. GST)" % (f["id"], "{:,.2f}".format(total / 100)), f["company_id"])
    return dict(redirect_url=url)


def _apply_payment(conn, st, ev, provider_name):
    r = conn.execute(select(T.payments).where(T.payments.c.provider == provider_name, T.payments.c.provider_ref == ev.ref)).first()
    need(r, "Unknown payment")
    if r.status == "paid":
        return "already decided"
    payer = _user(st, r.payer_user_id)
    if ev.outcome != "paid":
        conn.execute(update(T.payments).where(T.payments.c.id == r.id).values(status="failed", error=str(ev.data.get("reason") or "")[:300]))
        return "applied"
    amount = int(ev.data.get("amount_paise") or -1)
    if amount != r.amount_paise:   # never mark an invoice paid for a different sum
        conn.execute(update(T.payments).where(T.payments.c.id == r.id).values(status="failed", error="Amount %s does not match %s" % (amount, r.amount_paise)))
        notify_advisors(st, "payment", "A payment for invoice %s arrived with the wrong amount. Check it with the provider." % r.invoice_id, "app-revenue")
        _save(conn, st, payer, "payment_mismatch", "Online payment for invoice %s did not match the amount due" % r.invoice_id)
        return "mismatch"
    conn.execute(update(T.payments).where(T.payments.c.id == r.id).values(status="paid", paid_at=utcnow()))
    f = find(st.invoices, r.invoice_id)
    if not f.get("paid_on"):
        f.update(paid_on=today(), paid_via=provider_name, payment_ref=str(ev.data.get("payment_id") or ev.ref)[:120])
    notify_advisors(st, "payment", "Invoice %s paid online by %s" % (f["id"], label(payer)), "app-revenue")
    _save(conn, st, payer, "invoice_paid_online", "Paid invoice %s online (Rs %s incl. GST, %s)" % (f["id"], "{:,.2f}".format(r.amount_paise / 100), provider_name), f["company_id"])
    return "applied"


# ---------- provider events ----------
APPLY = {"kyc": _apply_kyc, "esign": _apply_esign, "payment": _apply_payment}


def process_event(provider_name, ev: Event):
    """Apply a verified provider event once. Returns what happened, for the webhook's reply."""
    need(ev.kind in APPLY, "Unknown event kind")
    with T.engine().begin() as conn:
        T.write_lock(conn)
        seen = conn.execute(select(T.webhook_events.c.event_id).where(T.webhook_events.c.provider == provider_name, T.webhook_events.c.event_id == ev.id)).first()
        if seen:
            return "duplicate"
        conn.execute(insert(T.webhook_events).values(provider=provider_name, event_id=ev.id, kind=ev.kind, received_at=utcnow(),
                                                     payload=dict(ref=ev.ref, outcome=ev.outcome, data=ev.data)))
        return APPLY[ev.kind](conn, Store(conn), ev, provider_name)
