"""HTTP routes for KYC, e-signing and payments: what the website calls, the providers' webhook, and the stand-in pages."""
import html
import json
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from sqlalchemy import select

from backend import db as T
from backend.config import settings
from backend.integrations import service as SVC
from backend.integrations.providers import BadSignature, StandIn, by_name, sign
from server.actions import Denied

router = APIRouter()


def _err(msg, status):
    return JSONResponse(dict(error=msg), status_code=status)


async def _body(request):
    try:
        d = await request.json()
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def _signed_in(conn, request):
    from backend.app import current   # late import: app.py includes this router
    return current(conn, request)


def _run(request, fn):
    """Signed-in user + one transaction; Denied becomes a 403 like every other action."""
    with T.engine().begin() as conn:
        u, _ = _signed_in(conn, request)
        if not u:
            return _err("Please sign in.", 401)
        return fn(conn, u)


@router.get("/api/integrations")
def info():
    return dict(kyc=settings.kyc_provider, esign=settings.esign_provider, payments=settings.payments_provider, require_esign=settings.require_esign)


@router.get("/api/kyc")
def kyc_status(request: Request):
    return _run(request, lambda conn, u: SVC.kyc_status(conn, u))


@router.post("/api/kyc/start")
async def kyc_start(request: Request):
    p = await _body(request)
    return _run(request, lambda conn, u: SVC.start_kyc(conn, u, p.get("pan"), p.get("name")))


@router.post("/api/esign/nda")
async def esign_nda(request: Request):
    p = await _body(request)
    return _run(request, lambda conn, u: SVC.start_nda(conn, u, p.get("intro_id")))


@router.post("/api/esign/engagement")
async def esign_engagement(request: Request):
    p = await _body(request)
    return _run(request, lambda conn, u: SVC.send_engagement(conn, u, p.get("company_id"), p.get("advisory_fee_lakh")))


@router.post("/api/esign/{esign_id}/start")
def esign_start(esign_id: str, request: Request):
    return _run(request, lambda conn, u: SVC.start_esign(conn, u, esign_id))


@router.get("/api/esign/{esign_id}/document")
def esign_doc(esign_id: str, request: Request):
    def go(conn, u):
        r, pdf = SVC.esign_document(conn, u, esign_id)
        from backend.store import write_audit
        write_audit(conn, u, "download", "Downloaded the signed copy of \"%s\"" % r.title, r.company_id)
        name = "%s-signed-%s.pdf" % (r.kind, r.signed_at.date().isoformat())
        return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="%s"' % name})
    return _run(request, go)


@router.post("/api/pay/{invoice_id}")
def pay(invoice_id: str, request: Request):
    return _run(request, lambda conn, u: SVC.start_payment(conn, u, invoice_id))


@router.post("/api/webhooks/{provider_name}")
async def webhook(provider_name: str, request: Request):
    """Providers call this with results. Not signed in and no site header: the provider's signature is the proof."""
    try:
        p = by_name(provider_name)
    except KeyError:
        return _err("Unknown provider", 404)
    raw = await request.body()
    try:
        ev = p.parse_webhook({k.lower(): v for k, v in request.headers.items()}, raw)
    except BadSignature:
        return _err("Bad signature", 401)
    except (ValueError, KeyError, TypeError):
        return _err("Unreadable event", 400)
    try:
        return dict(result=SVC.process_event(p.name, ev))
    except Denied as e:
        return _err(str(e), 422)


# ---------- stand-in provider pages (test mode only) ----------
STANDIN_TABLE = {"kyc": (T.kyc_checks, "user_id"), "esign": (T.esign_requests, "signer_id"), "pay": (T.payments, "payer_user_id")}
OUTCOMES = {"kyc": (("verified", "Approve: details match"), ("rejected", "Reject: name does not match PAN")),
            "esign": (("signed", "Sign the document"), ("declined", "Decline to sign")),
            "pay": (("paid", "Pay now (test mode)"), ("failed", "Simulate a failed payment"))}
RETURN = {"kyc": "/#app-kyc", "esign": None, "pay": None}


def _standin_row(conn, request, kind, ref):
    if not settings.standins_enabled or kind not in STANDIN_TABLE:
        return None, None
    table, owner = STANDIN_TABLE[kind]
    r = conn.execute(select(table).where(table.c.provider == "standin", table.c.provider_ref == ref)).first()
    u, _ = _signed_in(conn, request)
    if not r or not u or getattr(r, owner) != u["id"]:   # only the person it belongs to can open it
        return None, None
    return r, u


def _page(title, inner):
    return HTMLResponse("""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title><meta name="robots" content="noindex"><style>
body{margin:0;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;background:#F2F1EE;color:#16171A}
.band{background:#7a1f1f;color:#fff;padding:10px 20px;font-size:14px;text-align:center}
main{max-width:640px;margin:32px auto;padding:0 16px}.card{background:#fff;border:1px solid #DCD2BF;border-radius:6px;padding:24px}
h1{font:400 26px/1.25 Georgia,serif;margin:0 0 8px}.muted{color:#47443E;font-size:14px}.doc{white-space:pre-wrap;border:1px solid #DCD2BF;
background:#FBF8F1;padding:16px;border-radius:4px;max-height:360px;overflow:auto;font-size:14px}dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px}
dt{color:#47443E}dd{margin:0;font-weight:600}.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}button{font:inherit;padding:11px 18px;border-radius:4px;
border:1px solid #16171A;background:#16171A;color:#E8C77B;cursor:pointer}button.alt{background:#fff;color:#16171A}</style></head><body>
<div class="band">Stand-in provider · test mode · nothing here is a real check, signature or payment</div><main><div class="card">%s</div></main></body></html>"""
                        % (html.escape(title), inner))


@router.get("/stand-in/{kind}/{ref}", response_class=HTMLResponse)
def standin_page(kind: str, ref: str, request: Request):
    with T.engine().begin() as conn:
        r, u = _standin_row(conn, request, kind, ref)
        if not r:
            return _page("Not found", "<h1>Not found</h1><p class=muted>This link is not for you, has expired, or test providers are switched off.</p>")
        e = html.escape
        if kind == "kyc":
            head = "<h1>Verify your identity</h1><p class=muted>A real provider would check your PAN with the Income Tax Department and your Aadhaar through DigiLocker.</p>"
            info = "<dl><dt>Name given</dt><dd>%s</dd><dt>PAN</dt><dd>&bull;&bull;&bull;&bull;&bull;&bull;%s</dd></dl>" % (e(r.name_given or ""), e(r.pan_last4 or ""))
        elif kind == "esign":
            head = "<h1>%s</h1><p class=muted>Read the document, then sign. A real provider would ask for an Aadhaar OTP or your digital signature.</p>" % e(r.title)
            info = '<div class="doc">%s</div><p class=muted>Document fingerprint (SHA-256): %s</p>' % (e(r.body), e(r.doc_hash))
        else:
            head = "<h1>Pay your invoice</h1><p class=muted>A real provider would offer UPI, net banking and cards.</p>"
            info = "<dl><dt>Invoice</dt><dd>%s</dd><dt>Amount (incl. GST)</dt><dd>Rs %s</dd></dl>" % (e(r.invoice_id), "{:,.2f}".format(r.amount_paise / 100))
        done = (kind == "kyc" and r.status != "started") or (kind == "esign" and r.status != "sent") or (kind == "pay" and r.status == "paid")
        buttons = "<p class=muted>This was already completed.</p>" if done else '<form method="post" class="row">' + "".join(
            '<button name="outcome" value="%s"%s>%s</button>' % (v, "" if i == 0 else ' class="alt"', e(l)) for i, (v, l) in enumerate(OUTCOMES[kind])) + "</form>"
        return _page(head.split("</h1>")[0][4:], head + info + buttons)


@router.post("/stand-in/{kind}/{ref}")
async def standin_submit(kind: str, ref: str, request: Request):
    """Plays the provider: sends our webhook a signed event, exactly as a real provider would, then returns to the site."""
    form = await request.form()
    with T.engine().begin() as conn:
        r, u = _standin_row(conn, request, kind, ref)
        if not r:
            return RedirectResponse("/#app", status_code=303)
        outcome = form.get("outcome")
        if outcome not in [o for o, _ in OUTCOMES[kind]]:
            return RedirectResponse("/#app", status_code=303)
        data = {"kyc": lambda: {"reason": "The name does not match the PAN record"} if outcome == "rejected" else {},
                "esign": lambda: {"ip": request.client.host if request.client else None},
                "pay": lambda: {"amount_paise": r.amount_paise, "payment_id": "standin_payment_" + uuid.uuid4().hex[:10]}}[kind]()
        back = RETURN[kind] or ("/#app-rooms" if kind == "esign" and r.kind == "nda" else "/#app" if kind == "esign" else
                                {"founder": "/#app-fees", "investor": "/#app-sells", "lender": "/#app-lfees"}.get(u["role"], "/#app"))
    raw = json.dumps(dict(id="evt_" + uuid.uuid4().hex, kind={"pay": "payment"}.get(kind, kind), ref=ref, outcome=outcome, data=data)).encode()
    try:
        SVC.process_event("standin", StandIn().parse_webhook({"x-aegis-signature": sign(raw, settings.webhook_secret)}, raw))
    except Denied:
        pass
    return RedirectResponse(back, status_code=303)
