"""Aegis Ascend backend (FastAPI). Serves the same website and the same /api the browser already uses, on PostgreSQL.

What it adds over the Flask prototype (server/app.py):
- PostgreSQL, one table per collection, every business action in one transaction behind a lock
- server-side sessions (revocable), Argon2 password hashing, wrong-password limits kept in the database
- two-step sign-in with any authenticator app, password change, password reset by email, "sign out other devices"
- an outbox for email/SMS/WhatsApp and a storage layer for files (local disk or S3-compatible)

Run:  pip install -r backend/requirements.txt
      GB_DATABASE_URL=postgresql+psycopg://... GB_SEED_DEMO=1 uvicorn backend.app:app --port 8000
API docs: /api/docs
"""
import json
import os
import re
import time
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from sqlalchemy import insert, select, update
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend import auth as A
from backend import db as T
from backend import notify
from backend.config import ROOT, settings
from backend.storage import storage
from backend.store import Store, add_record, audit_rows, diff, now, uid, write_audit
from server import chat as CHAT
from server import seed as SEED
from server.actions import ACTIONS, Denied, can_see_file, pub, visible_state

SITE = os.path.join(ROOT, "site")
# page scripts in load order (site/build.py inlines the same list for the demo)
SCRIPTS = ("calc.js", "optimizer.js", "ui.js", "domain.js", "kit.js", "jspdf.min.js", "pdf.js", "gsap.min.js", "ScrollTrigger.min.js", "three.min.js", "api-server.js", "public.js", "landing.js",
           "chat.js", "portal.js", "ws-investor.js", "ws-lender.js", "ws-advisor.js", "ws-founder.js")
MEDIA_FILES = {"markets-poster.webp": "image/webp", "markets-poster-960.webp": "image/webp", "markets-960.webm": "video/webm", "markets-960.mp4": "video/mp4",
               "markets-1280.webm": "video/webm", "markets-1280.mp4": "video/mp4", "expertise/business-intelligence.webp": "image/webp",
               "expertise/financial-research.webp": "image/webp", "expertise/growth-strategy.webp": "image/webp", "expertise/market-intelligence.webp": "image/webp",
               "expertise/strategic-advisory.webp": "image/webp"}   # home page footage and pictures (site/assets/media)
ASSET_FILES = {"founder-hem.jpg": "image/jpeg", "founder-yash.jpg": "image/jpeg", "founder-vivan.jpg": "image/jpeg", "skyline.svg": "image/svg+xml"}
UPLOAD_TYPES = {".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}
UPLOAD_PURPOSES = ("valuation_report", "dataroom", "monitoring", "loan_doc")
DEMO_PASSWORD = "demo1234"
EMAIL_RE = r"[^@\s]+@[^@\s]+\.[^@\s]+"

@asynccontextmanager
async def lifespan(_app):
    init_db(seed_demo=settings.seed_demo)
    yield


app = FastAPI(title="Aegis Ascend API", version="1.0", docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json", lifespan=lifespan)
_CHATS = {}  # visitor -> recent assistant questions (per process; caps spend on the model)


def today():
    return settings.today or date.today().isoformat()


def err(msg, status, **extra):
    return JSONResponse(dict(error=msg, **extra), status_code=status)


def ip_of(request):
    return request.client.host if request.client else None


# ---------- request plumbing ----------
@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path
    if (path.startswith("/api/") and not path.startswith("/api/webhooks/") and request.method not in ("GET", "HEAD", "OPTIONS")
            and request.headers.get("x-requested-with") != "glassbox"):
        resp = err("Missing request header.", 400)   # blocks cross-site form posts (CSRF)
    elif path.startswith("/api/") and int(request.headers.get("content-length") or 0) > settings.max_upload_bytes:
        resp = err("That file is too large (8 MB at most).", 413)
    else:
        resp = await call_next(request)
    h = resp.headers
    h["X-Content-Type-Options"] = "nosniff"
    h["X-Frame-Options"] = "DENY"
    h["Referrer-Policy"] = "same-origin"
    if not path.startswith("/api/docs"):
        h["Content-Security-Policy"] = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
                                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; "
                                        "connect-src 'self'; frame-ancestors 'none'")
    if settings.secure_cookies:
        h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if path.startswith("/api/"):
        h["Cache-Control"] = "no-store"
        h["X-Robots-Tag"] = "noindex, nofollow"
    return resp


@app.exception_handler(Denied)
async def _denied(request, e):
    return err(str(e), 403)


@app.exception_handler(StarletteHTTPException)
async def _http(request, e):
    return err(e.detail if isinstance(e.detail, str) else "Request failed.", e.status_code)


@app.exception_handler(RequestValidationError)
async def _invalid(request, e):
    return err("The request was not understood.", 400)


async def body(request):
    try:
        data = await request.json()
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def set_cookie(resp, token, max_hours):
    resp.set_cookie(A.COOKIE, token, max_age=int(max_hours * 3600), httponly=True, samesite="lax", secure=settings.secure_cookies, path="/")


def current(conn, request):
    """(user, session row) for a fully signed-in session, else (None, None)."""
    row = A.session_row(conn, request.cookies.get(A.COOKIE))
    if not row or row.mfa_pending:
        return None, None
    r = conn.execute(select(T.users).where(T.users.c.id == row.user_id)).first()
    if not r or r.disabled:
        return None, None
    A.touch(conn, row)
    return dict(r._mapping), row


def signed_in(resp_user, token):
    resp = JSONResponse(dict(user=pub(resp_user, True)))
    set_cookie(resp, token, settings.session_max_hours)
    return resp


# ---------- account ----------
@app.get("/api/me")
def me(request: Request):
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        return dict(user=pub(u, True))


def _finish_login(conn, r, request):
    u = dict(r._mapping)
    if u["role"] == "investor":
        prof = dict(u.get("profile") or {}, last_active=now())
        conn.execute(update(T.users).where(T.users.c.id == u["id"]).values(profile=prof))
        u["profile"] = prof
    write_audit(conn, u, "login", "Signed in" + (" with a two-step code" if u.get("totp_enabled") else ""), ip=ip_of(request))
    return u


@app.post("/api/login")
async def login(request: Request):
    p = await body(request)
    email, pw = str(p.get("email") or "").strip().lower(), str(p.get("password") or "")
    key = "%s|%s" % (ip_of(request), email)
    with T.engine().begin() as conn:
        if A.too_many_attempts(conn, key):
            return err("Too many attempts. Try again in 15 minutes.", 429)
        r = conn.execute(select(T.users).where(T.users.c.email == email)).first()
        if not r or r.disabled or not A.check_password(r.pw_hash, pw):
            A.record_failure(conn, key)
            return err("Email or password is wrong.", 401)
        A.clear_failures(conn, key)
        if A.needs_rehash(r.pw_hash):
            conn.execute(update(T.users).where(T.users.c.id == r.id).values(pw_hash=A.hash_password(pw)))
        A.end_session(conn, request.cookies.get(A.COOKIE))
        if r.totp_enabled:
            token = A.new_session(conn, r.id, ip_of(request), request.headers.get("user-agent"), mfa_pending=True)
            resp = JSONResponse(dict(mfa_required=True))
            set_cookie(resp, token, settings.mfa_window_minutes / 60)
            return resp
        u = _finish_login(conn, r, request)
        return signed_in(u, A.new_session(conn, r.id, ip_of(request), request.headers.get("user-agent")))


@app.post("/api/login/mfa")
async def login_mfa(request: Request):
    """Second step: the 6-digit code from the authenticator app."""
    p = await body(request)
    with T.engine().begin() as conn:
        row = A.session_row(conn, request.cookies.get(A.COOKIE))
        if not row or not row.mfa_pending:
            return err("Your sign-in timed out. Enter your email and password again.", 401)
        key = "mfa|%s" % row.user_id
        if A.too_many_attempts(conn, key):
            return err("Too many attempts. Try again in 15 minutes.", 429)
        r = conn.execute(select(T.users).where(T.users.c.id == row.user_id)).first()
        step = A.check_totp(r.totp_secret, p.get("code"), r.totp_last_step)
        if step is None:
            A.record_failure(conn, key)
            return err("That code is not right. Use the current code from your authenticator app.", 401)
        A.clear_failures(conn, key)
        conn.execute(update(T.users).where(T.users.c.id == r.id).values(totp_last_step=step))
        A.end_session(conn, request.cookies.get(A.COOKIE))
        u = _finish_login(conn, r, request)
        return signed_in(u, A.new_session(conn, r.id, ip_of(request), request.headers.get("user-agent")))


@app.post("/api/logout")
def logout(request: Request):
    with T.engine().begin() as conn:
        A.end_session(conn, request.cookies.get(A.COOKIE))
    resp = JSONResponse(dict(ok=True))
    resp.delete_cookie(A.COOKIE, path="/")
    return resp


@app.post("/api/signup")
async def signup(request: Request):
    p = await body(request)
    email = str(p.get("email") or "").strip().lower()
    name = str(p.get("name") or "").strip()[:80]
    role, pw = p.get("role"), str(p.get("password") or "")
    if not re.fullmatch(EMAIL_RE, email):
        return err("Enter a valid email address.", 400)
    if A.password_problem(pw):
        return err(A.password_problem(pw), 400)
    if role not in ("founder", "investor", "lender"):
        return err("Choose founder, investor or lender.", 400)
    if not name:
        return err("Enter your name.", 400)
    with T.engine().begin() as conn:
        T.write_lock(conn)
        if conn.execute(select(T.users.c.id).where(T.users.c.email == email)).first():
            return err("An account with this email already exists. Sign in instead.", 409)
        org = str(p.get("org") or "").strip()[:120]
        sector = str(p.get("sector") or "Plastics & packaging")[:60]
        extra = {}
        if role == "founder":
            c = dict(id=uid("c"), name=org or "My company", sector=sector, stage="Growth", city="Mumbai", revenue=50, **{"raise": 10}, instrument="equity",
                     raise_paise=10 * 10_000_000 * 100, pipeline_stage="applied", stage_since=today(), security_type="equity", offer_price_paise=0,
                     fd_extra_shares=0, external_offers={}, checklist={}, updates=[],
                     twin={}, readiness={}, quarters=[], covenants=dict(dscr_min=1.25, debt_ebitda_max=3.5), docs=[])
            add_record(conn, "companies", c)
            extra["company_id"] = c["id"]
        else:
            extra["firm"] = org or name
            if role == "investor":
                extra["mandate"] = dict(sectors=[sector], past_sectors=[], stages=["Growth"], ticket_min=2, ticket_max=20, instruments=["equity"])
                extra["profile"] = dict(kyc="not_started", accredited=False, nda_signed_at=None, last_active=now())
            else:
                # a self-registered lender is unverified until Aegis Ascend confirms its RBI registration
                extra["profile"] = dict(regulated=False, lender_type=None, reg_no=None)
        u = add_user(conn, email, name, role, pw, **extra)
        write_audit(conn, u, "signup", "Created a %s account" % role, extra.get("company_id"), ip=ip_of(request))
        return signed_in(u, A.new_session(conn, u["id"], ip_of(request), request.headers.get("user-agent")))


def add_user(conn, email, name, role, password, demo=False, **extra):
    u = dict(id=extra.pop("id", None) or uid("u"), email=email.lower(), name=name, role=role, company_id=extra.get("company_id"),
             firm=extra.get("firm"), title=extra.get("title"), mandate=extra.get("mandate"), profile=extra.get("profile"),
             pw_hash=A.hash_password(password, demo=demo), created_at=now())
    conn.execute(insert(T.users).values(totp_enabled=False, disabled=False, **u))
    return u


@app.get("/api/account/security")
def security(request: Request):
    """Two-step status and the devices signed in to this account."""
    with T.engine().begin() as conn:
        u, row = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        rows = conn.execute(select(T.sessions).where(T.sessions.c.user_id == u["id"], T.sessions.c.mfa_pending.is_(False))
                            .order_by(T.sessions.c.last_seen.desc())).all()
        return dict(two_step=bool(u["totp_enabled"]), sessions=[dict(this_device=s.token_hash == row.token_hash, signed_in=A.aware(s.created_at).isoformat(),
                    last_seen=A.aware(s.last_seen).isoformat(), ip=s.ip, device=s.user_agent) for s in rows])


@app.post("/api/account/two-step/setup")
def two_step_setup(request: Request):
    """Step 1: a new secret for the authenticator app (shown as a QR code or typed in). Not active until confirmed."""
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        if u["totp_enabled"]:
            return err("Two-step sign-in is already on.", 409)
        secret = A.new_totp_secret()
        conn.execute(update(T.users).where(T.users.c.id == u["id"]).values(totp_secret=secret))
        return dict(secret=secret, otpauth_uri=A.totp_uri(secret, u["email"]))


@app.post("/api/account/two-step/enable")
async def two_step_enable(request: Request):
    """Step 2: confirm with a code from the app; from now on sign-in asks for a code."""
    p = await body(request)
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        step = A.check_totp(u["totp_secret"], p.get("code"))
        if u["totp_enabled"] or step is None:
            return err("That code is not right. Check the app shows Aegis Ascend and try the current code.", 400)
        conn.execute(update(T.users).where(T.users.c.id == u["id"]).values(totp_enabled=True, totp_last_step=step))
        write_audit(conn, u, "two_step_on", "Turned on two-step sign-in", ip=ip_of(request))
        return dict(two_step=True)


@app.post("/api/account/two-step/disable")
async def two_step_disable(request: Request):
    p = await body(request)
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        if not A.check_password(u["pw_hash"], str(p.get("password") or "")) or A.check_totp(u["totp_secret"], p.get("code"), u["totp_last_step"]) is None:
            return err("Enter your password and a current code to turn two-step sign-in off.", 400)
        conn.execute(update(T.users).where(T.users.c.id == u["id"]).values(totp_enabled=False, totp_secret=None, totp_last_step=None))
        write_audit(conn, u, "two_step_off", "Turned off two-step sign-in", ip=ip_of(request))
        return dict(two_step=False)


@app.post("/api/account/password")
async def change_password(request: Request):
    p = await body(request)
    new = str(p.get("new_password") or "")
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        if not A.check_password(u["pw_hash"], str(p.get("password") or "")):
            return err("Your current password is wrong.", 400)
        if A.password_problem(new):
            return err(A.password_problem(new), 400)
        conn.execute(update(T.users).where(T.users.c.id == u["id"]).values(pw_hash=A.hash_password(new)))
        A.end_all_sessions(conn, u["id"], keep=request.cookies.get(A.COOKIE))
        write_audit(conn, u, "password_changed", "Changed password and signed out other devices", ip=ip_of(request))
        return dict(ok=True)


@app.post("/api/account/sign-out-others")
def sign_out_others(request: Request):
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        A.end_all_sessions(conn, u["id"], keep=request.cookies.get(A.COOKIE))
        write_audit(conn, u, "sessions_revoked", "Signed out all other devices", ip=ip_of(request))
        return dict(ok=True)


@app.post("/api/password/forgot")
async def forgot(request: Request):
    """Always answers the same way, so the form can't be used to find out who has an account."""
    p = await body(request)
    email = str(p.get("email") or "").strip().lower()
    with T.engine().begin() as conn:
        key = "reset|%s" % ip_of(request)
        if A.too_many_attempts(conn, key):
            return err("Too many requests. Try again in 15 minutes.", 429)
        A.record_failure(conn, key)   # counts requests, not failures
        r = conn.execute(select(T.users).where(T.users.c.email == email)).first() if re.fullmatch(EMAIL_RE, email) else None
        if r and not r.disabled:
            token = A.new_reset_token(conn, r.id)
            notify.queue(conn, "email", r.email, "Reset your Aegis Ascend password",
                         "Hello %s,\n\nUse this link within one hour to choose a new password:\n%s/#reset/%s\n\n"
                         "If you did not ask for this, ignore this email; your password stays the same.\n\nAegis Ascend Financial Advisors"
                         % (r.name, settings.public_url, token))
    return dict(ok=True, message="If that email has an account, we have sent a link to reset the password.")


@app.post("/api/password/reset")
async def reset(request: Request):
    p = await body(request)
    pw = str(p.get("password") or "")
    if A.password_problem(pw):
        return err(A.password_problem(pw), 400)
    with T.engine().begin() as conn:
        user_id = A.use_reset_token(conn, p.get("token"))
        if not user_id:
            return err("This reset link has expired or was already used. Ask for a new one.", 400)
        conn.execute(update(T.users).where(T.users.c.id == user_id).values(pw_hash=A.hash_password(pw)))
        A.end_all_sessions(conn, user_id)
        u = dict(conn.execute(select(T.users).where(T.users.c.id == user_id)).first()._mapping)
        write_audit(conn, u, "password_reset", "Reset password by email link", ip=ip_of(request))
    return dict(ok=True)


# ---------- the workspace ----------
@app.get("/api/state")
def state(request: Request):
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        return visible_state(Store(conn), u, lambda filt: audit_rows(conn, filt), today())


@app.post("/api/act/{name}")
async def act(name: str, request: Request):
    p = await body(request)
    fn = ACTIONS.get(name)
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        if not fn:
            return err("Unknown action", 404)
        if name == "sign_nda" and settings.require_esign:
            return err("Sign the NDA through e-signing.", 403)
        T.write_lock(conn)
        st = Store(conn)
        me_ = next(x for x in st.users if x["id"] == u["id"])
        detail, company_id = fn(st, me_, p, today())   # raises Denied -> 403, and the transaction rolls back
        changes = st.save()
        write_audit(conn, u, name, detail, company_id, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes], ip=ip_of(request))
        return dict(detail=detail, company_id=company_id)


@app.post("/api/upload")
async def upload(request: Request):
    form = await request.form()
    f, cid, purpose = form.get("file"), form.get("company_id"), form.get("purpose")
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        if not f or not getattr(f, "filename", None):
            return err("Choose a file.", 400)
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in UPLOAD_TYPES:
            return err("Upload a PDF, Excel, CSV, Word or image file.", 400)
        if purpose not in UPLOAD_PURPOSES:
            return err("Unknown upload type.", 400)
        T.write_lock(conn)
        st = Store(conn)
        if not any(c["id"] == cid for c in st.companies):
            return err("Company not found.", 404)
        allowed = u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid and purpose in ("dataroom", "monitoring"))
        if not allowed:
            return err("You cannot upload files for this company.", 403)
        data = await f.read()
        if len(data) > settings.max_upload_bytes:
            return err("That file is too large (8 MB at most).", 413)
        rec = dict(id=uid("file"), name=re.sub(r"[^\w.\- ()]", "_", f.filename)[:120], mime=UPLOAD_TYPES[ext], company_id=cid, purpose=purpose,
                   item=str(form.get("item") or "")[:60] or None, uploaded_by=u["id"], at=now(), size=len(data))
        storage().put(rec["id"], data, rec["mime"])
        st.files.append(rec)
        changes = st.save()
        write_audit(conn, u, "upload", "Uploaded %s (%s)" % (rec["name"], purpose.replace("_", " ")), cid,
                    [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes], ip=ip_of(request))
        return dict(file=rec)


@app.get("/api/file/{fid}")
def get_file(fid: str, request: Request):
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
        if not u:
            return err("Please sign in.", 401)
        st = Store(conn)
        f = next((x for x in st.files if x["id"] == fid), None)
        if not f or not can_see_file(st, u, f):
            return err("File not found.", 404)
        try:
            data = storage().get(f["id"])
        except (FileNotFoundError, ValueError):
            return err("File not found.", 404)
        write_audit(conn, u, "download", "Downloaded " + f["name"], f["company_id"], ip=ip_of(request))
    safe = re.sub(r'[^\w.\- ()]', "_", f["name"])
    return Response(data, media_type=f["mime"], headers={"Content-Disposition": 'attachment; filename="%s"' % safe})


@app.post("/api/enquiry")
async def enquiry(request: Request):
    p = await body(request)
    name, email, msg = str(p.get("name") or "").strip()[:80], str(p.get("email") or "").strip()[:120], str(p.get("message") or "").strip()[:2000]
    if not name or not re.fullmatch(EMAIL_RE, email) or not msg:
        return err("Enter your name, a valid email and a message.", 400)
    with T.engine().begin() as conn:
        e = dict(id=uid("e"), at=now(), name=name, email=email, company=str(p.get("company") or "")[:120], message=msg)
        add_record(conn, "enquiries", e)
        write_audit(conn, None, "enquiry", "Enquiry from " + name, ip=ip_of(request))
    return dict(ok=True)


@app.post("/api/chat")
async def chat_reply(request: Request):
    """The website assistant. Reports offline:true when Claude isn't configured, so the page uses its quick answers."""
    p = await body(request)
    msgs = CHAT.clean_history(p.get("messages"))
    if msgs is None:
        return err("Ask a question of up to %d characters." % CHAT.MAX_CHARS, 400)
    with T.engine().begin() as conn:
        user, _ = current(conn, request)
    key = (user and user["id"]) or ip_of(request) or "anon"
    recent = [t for t in _CHATS.get(key, []) if time.time() - t < 600]
    if len(recent) >= 20:
        return err("That's a lot of questions in a short time. Please wait a few minutes, or use the Contact page.", 429)
    if len(_CHATS) > 5000:
        _CHATS.clear()
    _CHATS[key] = recent + [time.time()]
    try:
        page = str(p.get("page") or "")[:60]
        return dict(reply=CHAT.answer(msgs, page=page if re.fullmatch(r"[a-z0-9/_-]*", page) else "", role=user and user["role"]))
    except CHAT.Offline:
        return err("The assistant is offline.", 503, offline=True)


# ---------- KYC, e-signing and payments ----------
from backend.integrations.routes import router as integrations_router  # noqa: E402

app.include_router(integrations_router)


# ---------- pages ----------
@app.get("/", response_class=HTMLResponse)
def index():
    shell = open(os.path.join(SITE, "shell.html"), encoding="utf-8").read()
    pre, post = SCRIPTS[:SCRIPTS.index("api-server.js") + 1], SCRIPTS[SCRIPTS.index("api-server.js") + 1:]
    tags = "".join('<script src="/static/%s"></script>' % f for f in pre)
    tags += ('<script>window.GB_CMA_URL = "/fundmix.html"; window.GB_ASSETS = "/assets/"; window.GB_CHAT_URL = "/api/chat"; window.GB_SITEMAP = '
             + json.dumps(CHAT.SITEMAP, separators=(",", ":")).replace("</", "<\\/") + ';</script>')
    tags += "".join('<script src="/static/%s"></script>' % f for f in post)
    html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            "<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230D0E10'/%3E%3Cpath d='M16 5l6 6-6 6-6-6z' fill='%23C9A04F'/%3E%3Cpath d='M6 28l8-12v12M26 28l-8-12v12' stroke='%23C9A04F' stroke-width='2' fill='none'/%3E%3C/svg%3E\">"
            "<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>" + shell.replace("<!--LANDING_CSS-->", "<style>" + open(os.path.join(SITE, "landing.css"), encoding="utf-8").read() + "</style>").replace("<!--SCRIPTS-->", tags) + "</body></html>")
    return HTMLResponse(html)


def _file(path, mime, max_age):
    with open(path, "rb") as f:
        return Response(f.read(), media_type=mime, headers={"Cache-Control": "public, max-age=%d" % max_age})


@app.get("/static/{name}")
def static_file(name: str):
    if name not in SCRIPTS:
        return err("Not found", 404)
    return _file(os.path.join(SITE, name), "text/javascript", 300)


@app.get("/assets/{name}")
def asset_file(name: str):
    if name not in ASSET_FILES:
        return err("Not found", 404)
    return _file(os.path.join(SITE, "assets", name), ASSET_FILES[name], 86400)


@app.get("/assets/media/{name:path}")
def media_file(name: str):
    if name not in MEDIA_FILES:
        return err("Not found", 404)
    return FileResponse(os.path.join(SITE, "assets", "media", name), media_type=MEDIA_FILES[name], headers={"Cache-Control": "public, max-age=86400"})


@app.get("/fundmix.html", response_class=HTMLResponse)
def fundmix(request: Request):
    """The CMA funding report tool is for advisors only; everyone else gets the advisors-only page."""
    with T.engine().begin() as conn:
        u, _ = current(conn, request)
    if not u or u["role"] != "advisor":
        return HTMLResponse(open(os.path.join(SITE, "cma-lock.html"), encoding="utf-8").read(), status_code=403 if u else 401)
    cma = open(os.path.join(ROOT, "fundmix", "web", "index.html"), encoding="utf-8").read()
    return HTMLResponse('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                        '<meta name="robots" content="noindex"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + cma + "</body></html>")


@app.get("/healthz")
def health():
    with T.engine().connect() as conn:
        conn.exec_driver_sql("SELECT 1")
    return dict(ok=True)


# ---------- setup ----------
def init_db(seed_demo=False):
    T.create_schema()
    with T.engine().begin() as conn:
        if not conn.execute(select(T.records["settings"].c.id)).first():
            add_record(conn, "settings", dict(SEED.SETTINGS_DEFAULT))
        if seed_demo and not conn.execute(select(T.users.c.id)).first():
            data = SEED.resolved(today())
            for u in data.pop("users"):
                # demo accounts share a published password, so a lighter hash is enough; real accounts use full Argon2id
                add_user(conn, u.pop("email"), u.pop("name"), u.pop("role"), DEMO_PASSWORD, demo=True, **u)
            conn.execute(T.records["settings"].delete())
            for c, docs in data.items():
                for i, d in enumerate(docs, 1):
                    conn.execute(insert(T.records[c]).values(id=d["id"], company_id=d["id"] if c == "companies" else d.get("company_id"), seq=i, data=d))

