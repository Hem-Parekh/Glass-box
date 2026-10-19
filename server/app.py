"""Aegis Ascend Financial Advisors web app: the public website, sign-in, and the role-based workspace.

Same pages as the demo (site/), but accounts and data live on the server:
- passwords hashed with werkzeug (scrypt), sessions in a signed HttpOnly cookie
- every rule about who can see or change what is enforced here (server/actions.py), not in the browser
- every change is written to an append-only audit log with its before and after values

Run:  pip install -r server/requirements.txt
      GB_SECRET_KEY=... python -m server.app          (http://127.0.0.1:8000)
"""
import json, os, re, secrets, sqlite3, time
from datetime import date
from functools import wraps

from flask import Flask, Response, abort, g, jsonify, request, send_file, session
from werkzeug.security import check_password_hash, generate_password_hash

from server import seed as SEED
from server.actions import ACTIONS, COLLECTIONS, Denied, can_see_file, now, pub, uid, visible_state

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
# page scripts in load order (site/build.py inlines the same list for the demo)
SCRIPTS = ("calc.js", "optimizer.js", "ui.js", "domain.js", "kit.js", "api-server.js", "public.js", "portal.js",
           "ws-investor.js", "ws-lender.js", "ws-advisor.js", "ws-founder.js")
SITE_FILES = set(SCRIPTS)
ASSET_FILES = {"founder-hem.jpg", "founder-yash.jpg", "founder-vivan.jpg"}
UPLOAD_TYPES = {".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}
UPLOAD_PURPOSES = ("valuation_report", "dataroom", "monitoring", "loan_doc")
DEMO_PASSWORD = "demo1234"
USER_COLS = ("id", "email", "name", "role", "company_id", "firm", "title", "mandate", "profile", "pw_hash", "created_at")


# ---------------- storage ----------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
  company_id TEXT, firm TEXT, title TEXT, mandate TEXT, pw_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS docs (
  collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id));
CREATE TABLE IF NOT EXISTS audit (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, at TEXT NOT NULL, user_id TEXT, user_name TEXT,
  action TEXT NOT NULL, detail TEXT, company_id TEXT);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
"""
MIGRATIONS = (("users", "profile", "ALTER TABLE users ADD COLUMN profile TEXT"),
              ("audit", "changes", "ALTER TABLE audit ADD COLUMN changes TEXT"))


class Store:
    """Loads every collection into plain dicts, then writes back what changed and reports each change."""

    def __init__(self, conn):
        self.conn = conn
        self.data = {c: [json.loads(r[0]) for r in conn.execute("SELECT data FROM docs WHERE collection=? ORDER BY rowid", (c,))] for c in COLLECTIONS}
        self.users = [user_row(r) for r in conn.execute("SELECT * FROM users")]
        self._snap = {c: {d["id"]: json.dumps(d, sort_keys=True) for d in self.data[c]} for c in COLLECTIONS}
        self._usnap = {u["id"]: json.dumps(u.get("profile"), sort_keys=True) for u in self.users}

    def __getattr__(self, name):
        if name in COLLECTIONS:
            return self.data[name]
        raise AttributeError(name)

    def __getitem__(self, name):
        return self.data[name]

    def save(self):
        """Write changed documents; return [(collection, id, before, after)] for the audit log."""
        changes = []
        for c in COLLECTIONS:
            ids = set()
            for d in self.data[c]:
                ids.add(d["id"])
                s = json.dumps(d, sort_keys=True)
                old = self._snap[c].get(d["id"])
                if old != s:
                    self.conn.execute("INSERT OR REPLACE INTO docs (collection, id, data) VALUES (?,?,?)", (c, d["id"], s))
                    changes.append((c, d["id"], json.loads(old) if old else None, d))
            for gone in set(self._snap[c]) - ids:
                self.conn.execute("DELETE FROM docs WHERE collection=? AND id=?", (c, gone))
                changes.append((c, gone, json.loads(self._snap[c][gone]), None))
        for u in self.users:
            s = json.dumps(u.get("profile"), sort_keys=True)
            if self._usnap.get(u["id"]) != s:
                self.conn.execute("UPDATE users SET profile=? WHERE id=?", (s, u["id"]))
                changes.append(("users", u["id"], {"profile": json.loads(self._usnap[u["id"]])}, {"profile": u.get("profile")}))
        return changes


def diff(before, after):
    """Only the fields that changed, as {field: [before, after]}."""
    if before is None or after is None:
        return {"created" if before is None else "deleted": True}
    keys = set(before) | set(after)
    return {k: [before.get(k), after.get(k)] for k in sorted(keys) if before.get(k) != after.get(k)}


def user_row(r):
    d = dict(r)
    for k in ("mandate", "profile"):
        d[k] = json.loads(d[k]) if d.get(k) else None
    return d


def db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


def init_db(seed_demo=False):
    conn = sqlite3.connect(app.config["DATABASE"])
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    for table, col, sql in MIGRATIONS:
        if col not in [r[1] for r in conn.execute("PRAGMA table_info(%s)" % table)]:
            conn.execute(sql)
    if not conn.execute("SELECT 1 FROM docs WHERE collection='settings'").fetchone():
        conn.execute("INSERT INTO docs (collection, id, data) VALUES ('settings','settings',?)", (json.dumps(SEED.SETTINGS_DEFAULT),))
    if seed_demo and not conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        seed(conn)
    conn.commit()
    conn.close()


def write_audit(conn, user, action, detail, company_id=None, changes=None):
    conn.execute("INSERT INTO audit (id, at, user_id, user_name, action, detail, company_id, changes) VALUES (?,?,?,?,?,?,?,?)",
                 (uid("a"), now(), user["id"] if user else None, user["name"] if user else "Website visitor", action, detail, company_id,
                  json.dumps(changes) if changes else None))


def add_user(conn, email, name, role, password, **extra):
    u = dict(id=extra.pop("id", None) or uid("u"), email=email.lower(), name=name, role=role,
             company_id=extra.get("company_id"), firm=extra.get("firm"), title=extra.get("title"),
             mandate=json.dumps(extra["mandate"]) if extra.get("mandate") else None,
             profile=json.dumps(extra["profile"]) if extra.get("profile") else None,
             pw_hash=generate_password_hash(password, **({"method": "pbkdf2:sha256:20000"} if extra.get("demo") else {})), created_at=now())
    conn.execute("INSERT INTO users (%s) VALUES (%s)" % (",".join(USER_COLS), ",".join(":" + c for c in USER_COLS)), u)
    return u


def today():
    return app.config.get("TODAY") or date.today().isoformat()


def seed(conn):
    data = SEED.resolved(today())
    for u in data.pop("users"):
        # demo accounts share a published password, so a lighter hash is enough; real accounts use scrypt
        add_user(conn, u.pop("email"), u.pop("name"), u.pop("role"), DEMO_PASSWORD, demo=True, **u)
    conn.execute("DELETE FROM docs WHERE collection='settings'")
    for c, docs in data.items():
        for d in docs:
            conn.execute("INSERT INTO docs (collection, id, data) VALUES (?,?,?)", (c, d["id"], json.dumps(d)))


# ---------------- app ----------------
app = Flask(__name__)
app.config.update(
    DATABASE=os.environ.get("GB_DATABASE", os.path.join(ROOT, "server", "glassbox.db")),
    UPLOADS=os.environ.get("GB_UPLOADS", os.path.join(ROOT, "server", "uploads")),
    SECRET_KEY=os.environ.get("GB_SECRET_KEY") or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("GB_SECURE_COOKIES", "0") == "1",
    PERMANENT_SESSION_LIFETIME=8 * 3600, MAX_CONTENT_LENGTH=8_000_000,
)
_FAILS = {}  # (ip, email) -> [timestamps] for login throttling


@app.teardown_appcontext
def _close(exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


@app.after_request
def _headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; "
        "connect-src 'self'; frame-ancestors 'none'")
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Robots-Tag"] = "noindex, nofollow"
    return resp


def current_user():
    uid_ = session.get("uid")
    if not uid_:
        return None
    r = db().execute("SELECT * FROM users WHERE id=?", (uid_,)).fetchone()
    return user_row(r) if r else None


def api(fn):
    """JSON endpoint guard: custom header blocks cross-site form posts (CSRF); errors become JSON."""
    @wraps(fn)
    def wrapper(*a, **kw):
        if request.method != "GET" and request.headers.get("X-Requested-With") != "glassbox":
            return jsonify(error="Missing request header."), 400
        try:
            return fn(*a, **kw)
        except Denied as e:
            return jsonify(error=str(e)), 403
    return wrapper


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


@app.get("/api/me")
@api
def me():
    return jsonify(user=pub(current_user(), True))


@app.post("/api/login")
@api
def login():
    p = body()
    email = str(p.get("email") or "").strip().lower()
    key = (request.remote_addr, email)
    recent = [t for t in _FAILS.get(key, []) if time.time() - t < 900]
    if len(recent) >= 5:
        return jsonify(error="Too many attempts. Try again in 15 minutes."), 429
    r = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not r or not check_password_hash(r["pw_hash"], str(p.get("password") or "")):
        _FAILS[key] = recent + [time.time()]
        return jsonify(error="Email or password is wrong."), 401
    _FAILS.pop(key, None)
    session.clear()
    session.permanent = True
    session["uid"] = r["id"]
    u = user_row(r)
    if u["role"] == "investor":
        prof = dict(u.get("profile") or {}, last_active=now())
        db().execute("UPDATE users SET profile=? WHERE id=?", (json.dumps(prof), u["id"]))
    write_audit(db(), u, "login", "Signed in")
    db().commit()
    return jsonify(user=pub(u, True))


@app.post("/api/logout")
@api
def logout():
    session.clear()
    return jsonify(ok=True)


@app.post("/api/signup")
@api
def signup():
    p = body()
    email = str(p.get("email") or "").strip().lower()
    name = str(p.get("name") or "").strip()[:80]
    role = p.get("role")
    pw = str(p.get("password") or "")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Enter a valid email address."), 400
    if len(pw) < 8:
        return jsonify(error="Use a password of at least 8 characters."), 400
    if role not in ("founder", "investor", "lender"):
        return jsonify(error="Choose founder, investor or lender."), 400
    if not name:
        return jsonify(error="Enter your name."), 400
    conn = db()
    if conn.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify(error="An account with this email already exists. Sign in instead."), 409
    org = str(p.get("org") or "").strip()[:120]
    sector = str(p.get("sector") or "Plastics & packaging")[:60]
    extra = {}
    if role == "founder":
        c = dict(id=uid("c"), name=org or "My company", sector=sector, stage="Growth", city="Mumbai", revenue=50, **{"raise": 10}, instrument="equity",
                 raise_paise=10 * 10_000_000 * 100, pipeline_stage="applied", stage_since=today(), security_type="equity", offer_price_paise=0,
                 fd_extra_shares=0, external_offers={}, checklist={}, updates=[],
                 twin={}, readiness={}, quarters=[], covenants=dict(dscr_min=1.25, debt_ebitda_max=3.5), docs=[])
        conn.execute("INSERT INTO docs (collection, id, data) VALUES ('companies',?,?)", (c["id"], json.dumps(c)))
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
    u["mandate"], u["profile"] = extra.get("mandate"), extra.get("profile")
    write_audit(conn, u, "signup", "Created a %s account" % role, extra.get("company_id"))
    conn.commit()
    session.clear()
    session.permanent = True
    session["uid"] = u["id"]
    return jsonify(user=pub(u, True))


@app.get("/api/state")
@api
def state():
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    conn = db()

    def audit_rows(filt):
        q, args = "SELECT id, at, user_id, user_name, action, detail, company_id, changes FROM audit", ()
        if filt:
            q += " WHERE %s=?" % ("company_id" if filt[0] == "company_id" else "user_id")
            args = (filt[1],)
        rows = [dict(r) for r in conn.execute(q + " ORDER BY seq DESC LIMIT 1000", args)]
        for r in rows:
            r["changes"] = json.loads(r["changes"]) if r.get("changes") else None
        return rows
    return jsonify(visible_state(Store(conn), u, audit_rows, today()))


@app.post("/api/act/<name>")
@api
def act(name):
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    fn = ACTIONS.get(name)
    if not fn:
        return jsonify(error="Unknown action"), 404
    conn = db()
    st = Store(conn)
    me_ = next(x for x in st.users if x["id"] == u["id"])
    detail, company_id = fn(st, me_, body(), today())
    changes = st.save()
    write_audit(conn, u, name, detail, company_id, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes])
    conn.commit()
    return jsonify(detail=detail, company_id=company_id)


@app.post("/api/upload")
@api
def upload():
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    f, cid, purpose = request.files.get("file"), request.form.get("company_id"), request.form.get("purpose")
    if not f or not f.filename:
        return jsonify(error="Choose a file."), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in UPLOAD_TYPES:
        return jsonify(error="Upload a PDF, Excel, CSV, Word or image file."), 400
    if purpose not in UPLOAD_PURPOSES:
        return jsonify(error="Unknown upload type."), 400
    conn = db()
    st = Store(conn)
    if not any(c["id"] == cid for c in st.companies):
        return jsonify(error="Company not found."), 404
    allowed = u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid and purpose in ("dataroom", "monitoring"))
    if not allowed:
        return jsonify(error="You cannot upload files for this company."), 403
    os.makedirs(app.config["UPLOADS"], exist_ok=True)
    rec = dict(id=uid("file"), name=re.sub(r"[^\w.\- ()]", "_", f.filename)[:120], mime=UPLOAD_TYPES[ext], company_id=cid, purpose=purpose,
               item=str(request.form.get("item") or "")[:60] or None, uploaded_by=u["id"], at=now())
    path = os.path.join(app.config["UPLOADS"], rec["id"])
    f.save(path)
    rec["size"] = os.path.getsize(path)
    st.files.append(rec)
    changes = st.save()
    write_audit(conn, u, "upload", "Uploaded %s (%s)" % (rec["name"], purpose.replace("_", " ")), cid, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes])
    conn.commit()
    return jsonify(file=rec)


@app.get("/api/file/<fid>")
@api
def get_file(fid):
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    st = Store(db())
    f = next((x for x in st.files if x["id"] == fid), None)
    if not f or not can_see_file(st, u, f):
        return jsonify(error="File not found."), 404
    write_audit(db(), u, "download", "Downloaded " + f["name"], f["company_id"])
    db().commit()
    return send_file(os.path.join(app.config["UPLOADS"], f["id"]), mimetype=f["mime"], as_attachment=True, download_name=f["name"])


@app.post("/api/enquiry")
@api
def enquiry():
    p = body()
    name, email, msg = str(p.get("name") or "").strip()[:80], str(p.get("email") or "").strip()[:120], str(p.get("message") or "").strip()[:2000]
    if not name or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or not msg:
        return jsonify(error="Enter your name, a valid email and a message."), 400
    conn = db()
    e = dict(id=uid("e"), at=now(), name=name, email=email, company=str(p.get("company") or "")[:120], message=msg)
    conn.execute("INSERT INTO docs (collection, id, data) VALUES ('enquiries',?,?)", (e["id"], json.dumps(e)))
    write_audit(conn, None, "enquiry", "Enquiry from " + name)
    conn.commit()
    return jsonify(ok=True)


# ---------------- pages ----------------
@app.get("/")
def index():
    shell = open(os.path.join(SITE, "shell.html"), encoding="utf-8").read()
    pre, post = SCRIPTS[:SCRIPTS.index("api-server.js") + 1], SCRIPTS[SCRIPTS.index("api-server.js") + 1:]
    tags = "".join('<script src="/static/%s"></script>' % f for f in pre)
    tags += '<script>window.GB_CMA_URL = "/fundmix.html"; window.GB_ASSETS = "/assets/";</script>'
    tags += "".join('<script src="/static/%s"></script>' % f for f in post)
    html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            "<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230D0E10'/%3E%3Cpath d='M16 5l6 6-6 6-6-6z' fill='%23C9A04F'/%3E%3Cpath d='M6 28l8-12v12M26 28l-8-12v12' stroke='%23C9A04F' stroke-width='2' fill='none'/%3E%3C/svg%3E\">"
            "<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>"
            + shell.replace("<!--SCRIPTS-->", tags) + "</body></html>")
    return Response(html, mimetype="text/html")


@app.get("/static/<name>")
def static_file(name):
    if name not in SITE_FILES:
        abort(404)
    return send_file(os.path.join(SITE, name), mimetype="text/javascript", max_age=300)


@app.get("/assets/<name>")
def asset_file(name):
    if name not in ASSET_FILES:
        abort(404)
    return send_file(os.path.join(SITE, "assets", name), mimetype="image/jpeg", max_age=86400)


@app.get("/fundmix.html")
def fundmix():
    cma = open(os.path.join(ROOT, "fundmix", "web", "index.html"), encoding="utf-8").read()
    return Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                    '<meta name="robots" content="noindex"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + cma + "</body></html>", mimetype="text/html")


# ---------------- admin commands ----------------
@app.cli.command("init-db")
def _init_db():
    """Create the tables (no demo data)."""
    init_db(seed_demo=False)
    print("Database ready at", app.config["DATABASE"])


@app.cli.command("seed-demo")
def _seed_demo():
    """Create the tables and load the fictional demo accounts (password demo1234)."""
    init_db(seed_demo=True)
    print("Demo data loaded. Sign in as founder@demo.in, investor@demo.in, advisor@demo.in or lender@demo.in with password", DEMO_PASSWORD)


@app.cli.command("create-advisor")
def _create_advisor():
    """Create an advisor account (advisors cannot sign themselves up)."""
    import getpass
    init_db()
    email = input("Advisor email: ").strip().lower()
    name = input("Full name: ").strip()
    pw = getpass.getpass("Password (8+ characters): ")
    if len(pw) < 8:
        raise SystemExit("Password too short")
    conn = sqlite3.connect(app.config["DATABASE"])
    add_user(conn, email, name, "advisor", pw, firm="Aegis Ascend Financial Advisors", title="Advisor")
    conn.commit()
    print("Advisor created:", email)


if __name__ == "__main__":
    if not os.environ.get("GB_SECRET_KEY"):
        print("  Note: GB_SECRET_KEY is not set, so sign-ins reset when the server restarts.")
    init_db(seed_demo=os.environ.get("GB_SEED_DEMO", "1") == "1")
    print("\n  Open http://127.0.0.1:8000\n")
    app.run(host=os.environ.get("GB_HOST", "127.0.0.1"), port=int(os.environ.get("GB_PORT", "8000")), debug=False)
