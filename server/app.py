"""Aegis Ascend Financial Advisors web app: the public website, sign-in, and the role-based workspace.

Same pages as the demo (site/), but accounts and data live on the server:
- passwords hashed with werkzeug (scrypt), sessions in a signed HttpOnly cookie
- every rule about who can see or change what is enforced here, not in the browser
- every change is written to an append-only audit log

Run:  pip install -r server/requirements.txt
      GB_SECRET_KEY=... python -m server.app          (http://127.0.0.1:8000)
"""
import json, os, secrets, sqlite3, time, uuid
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, Response, abort, g, jsonify, request, send_file, session
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
COLLECTIONS = ("companies", "reports", "intros", "loans", "holdings", "exits", "enquiries")
SITE_FILES = {"calc.js", "optimizer.js", "ui.js", "public.js", "portal.js", "api-server.js"}
ASSET_FILES = {"founder-hem.jpg", "founder-yash.jpg", "founder-vivan.jpg"}
DEMO_PASSWORD = "demo1234"
COMPANY_FIELDS = ("name", "sector", "stage", "city", "revenue", "raise", "instrument", "twin", "readiness", "quarters", "covenants", "docs")
MONTH_S = 30.44 * 24 * 3600


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix):
    return prefix + "_" + uuid.uuid4().hex[:10]


class Denied(Exception):
    pass


def need(cond, msg):
    if not cond:
        raise Denied(msg)


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


class Store:
    """Loads the collections a request needs into plain dicts, then writes back what changed."""

    def __init__(self, conn):
        self.conn = conn
        self.data = {c: [json.loads(r[0]) for r in conn.execute("SELECT data FROM docs WHERE collection=?", (c,))] for c in COLLECTIONS}
        self.users = [user_row(r) for r in conn.execute("SELECT * FROM users")]
        self._snap = {c: {d["id"]: json.dumps(d, sort_keys=True) for d in self.data[c]} for c in COLLECTIONS}

    def __getattr__(self, name):
        if name in COLLECTIONS:
            return self.data[name]
        raise AttributeError(name)

    def save(self):
        for c in COLLECTIONS:
            for d in self.data[c]:
                s = json.dumps(d, sort_keys=True)
                if self._snap[c].get(d["id"]) != s:
                    self.conn.execute("INSERT OR REPLACE INTO docs (collection, id, data) VALUES (?,?,?)", (c, d["id"], s))


def user_row(r):
    d = dict(r)
    d["mandate"] = json.loads(d["mandate"]) if d.get("mandate") else None
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
    if seed_demo and not conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        seed(conn)
    conn.commit()
    conn.close()


def write_audit(conn, user, action, detail, company_id=None):
    conn.execute("INSERT INTO audit (id, at, user_id, user_name, action, detail, company_id) VALUES (?,?,?,?,?,?,?)",
                 (uid("a"), now(), user["id"] if user else None, user["name"] if user else "Website visitor", action, detail, company_id))


def add_user(conn, email, name, role, password, **extra):
    u = dict(id=extra.pop("id", None) or uid("u"), email=email.lower(), name=name, role=role,
             company_id=extra.get("company_id"), firm=extra.get("firm"), title=extra.get("title"),
             mandate=json.dumps(extra["mandate"]) if extra.get("mandate") else None,
             pw_hash=generate_password_hash(password), created_at=now())
    conn.execute("INSERT INTO users (id,email,name,role,company_id,firm,title,mandate,pw_hash,created_at) VALUES "
                 "(:id,:email,:name,:role,:company_id,:firm,:title,:mandate,:pw_hash,:created_at)", u)
    return u


# ---------------- demo seed (same as site/store.js) ----------------
def seed(conn):
    def put(c, d):
        conn.execute("INSERT INTO docs (collection, id, data) VALUES (?,?,?)", (c, d["id"], json.dumps(d)))
    users = [
        dict(id="u_founder", email="founder@demo.in", name="Priya Nair", role="founder", company_id="c_kalyan", title="Managing Director"),
        dict(id="u_founder2", email="rahul@demo.in", name="Rahul Deshmukh", role="founder", company_id="c_vasai", title="Founder"),
        dict(id="u_founder3", email="farah@demo.in", name="Farah Shaikh", role="founder", company_id="c_taloja", title="Director"),
        dict(id="u_investor", email="investor@demo.in", name="Meera Iyer", role="investor", firm="Konkan Growth Partners",
             mandate=dict(sectors=["Auto components", "Plastics & packaging"], past_sectors=["Chemicals", "Auto components"], stages=["Growth"], ticket_min=5, ticket_max=20, instruments=["equity", "CCPS"])),
        dict(id="u_investor2", email="angels@demo.in", name="Vikram Bhatt", role="investor", firm="Sahyadri Angels Network",
             mandate=dict(sectors=["Chemicals", "Food processing"], past_sectors=["Plastics & packaging"], stages=["Expansion", "Growth"], ticket_min=2, ticket_max=10, instruments=["equity", "CCD"])),
        dict(id="u_investor3", email="familyoffice@demo.in", name="Arvind Rao", role="investor", firm="Rao Family Office",
             mandate=dict(sectors=["Plastics & packaging", "Auto components"], past_sectors=[], stages=["Growth", "Mature"], ticket_min=10, ticket_max=30, instruments=["equity"])),
        dict(id="u_advisor", email="advisor@demo.in", name="CA Neha Joshi", role="advisor", firm="Aegis Ascend Financial Advisors", title="Reviewing advisor"),
        dict(id="u_lender", email="lender@demo.in", name="Suresh Pillai", role="lender", firm="Harbour Bank (sample)", title="Credit manager"),
        dict(id="u_lender2", email="nbfc@demo.in", name="Kavita Rane", role="lender", firm="Sahyadri Finance NBFC (sample)", title="Head of SME lending"),
    ]
    for u in users:
        add_user(conn, u.pop("email"), u.pop("name"), u.pop("role"), DEMO_PASSWORD, **u)
    cov = dict(dscr_min=1.25, debt_ebitda_max=3.5)
    put("companies", dict(id="c_kalyan", name="Kalyan Polymers Pvt Ltd", sector="Plastics & packaging", stage="Growth", city="Bhiwandi", revenue=68, **{"raise": 12}, instrument="equity",
        twin={}, readiness={}, covenants=cov, quarters=[
            dict(q="Q1 FY26", ebitda=1.6, interest=0.18, principal=0.55, debt=5.2), dict(q="Q2 FY26", ebitda=1.5, interest=0.17, principal=0.55, debt=4.7),
            dict(q="Q3 FY26", ebitda=1.2, interest=0.15, principal=0.55, debt=4.1), dict(q="Q4 FY26", ebitda=0.95, interest=0.14, principal=0.55, debt=3.6)],
        docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "CMA data FY25-FY28", "Cap table", "Debt vs equity report"]))
    put("companies", dict(id="c_vasai", name="Vasai Precision Castings Pvt Ltd", sector="Auto components", stage="Growth", city="Vasai", revenue=112, **{"raise": 25}, instrument="equity",
        twin=dict(**{"raise": 25}, pre_money=140, ebitda0=13, existing_ds=3), readiness=dict(dscr=1.62, collateral_cover=1.6, gst_on_time=12, data_room_ready=True), covenants=cov, quarters=[
            dict(q="Q1 FY26", ebitda=3.4, interest=0.46, principal=0.9, debt=17.1), dict(q="Q2 FY26", ebitda=3.6, interest=0.44, principal=0.9, debt=16.2),
            dict(q="Q3 FY26", ebitda=3.5, interest=0.42, principal=0.9, debt=15.3), dict(q="Q4 FY26", ebitda=3.9, interest=0.4, principal=0.9, debt=14.4)],
        docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "Customer contracts", "Cap table", "Debt vs equity report"]))
    put("companies", dict(id="c_taloja", name="Taloja Specialty Chemicals Pvt Ltd", sector="Chemicals", stage="Expansion", city="Taloja", revenue=45, **{"raise": 8}, instrument="equity",
        twin=dict(**{"raise": 8}, pre_money=36, ebitda0=4.2, existing_ds=0.8), readiness=dict(dscr=1.3, audited_years=2), covenants=cov, quarters=[], docs=["Audited accounts FY25-FY26", "Cap table"]))
    checks = dict(validation=True, founder_confirmed=True, verifier=True)
    put("reports", dict(id="r_vasai", company_id="c_vasai", title="Debt vs equity: Rs 25 cr expansion", status="approved", engine_version="gb-engine 1.0.0",
        created_at="2026-09-18T00:00:00+00:00", submitted_by="u_founder2", reviewed_by="u_advisor", reviewed_at="2026-09-28T00:00:00+00:00",
        review_note="Assumptions within sector benchmarks. Stress case holds.", summary=dict(best_share=0.55, net=6.1, break_even=210, min_dscr=1.48, min_dscr_stress=1.07), checks=checks))
    put("reports", dict(id="r_taloja", company_id="c_taloja", title="Debt vs equity: Rs 8 cr capacity add", status="in_review", engine_version="gb-engine 1.0.0",
        created_at="2026-10-06T00:00:00+00:00", submitted_by="u_founder3", summary=dict(best_share=0.4, net=1.2, break_even=58, min_dscr=1.31, min_dscr_stress=1.02), checks=checks))
    put("intros", dict(id="i_1", company_id="c_vasai", investor_id="u_investor", origin="investor", status="granted", created_at="2026-09-30T00:00:00+00:00",
        nda_signed_at="2026-10-01T00:00:00+00:00", views=[dict(doc="Audited accounts FY24-FY26", at="2026-10-01T10:12:00+00:00"), dict(doc="Debt vs equity report", at="2026-10-02T16:40:00+00:00")]))
    put("intros", dict(id="i_2", company_id="c_vasai", investor_id="u_investor3", origin="investor", status="requested", created_at="2026-10-08T00:00:00+00:00", views=[]))
    put("loans", dict(id="l_kalyan", company_id="c_kalyan", lender_id="u_lender2", amount=6, rate=0.115, tenor=5, status="disbursed", created_at="2025-03-01T00:00:00+00:00", transfer=None))
    put("loans", dict(id="l_vasai", company_id="c_vasai", lender_id="u_lender", amount=18, rate=0.1025, tenor=7, status="disbursed", created_at="2025-04-15T00:00:00+00:00", transfer=None))
    put("holdings", dict(id="h_1", company_id="c_vasai", investor_id="u_investor", amount=4, stake=0.032, invested_at="2026-02-10T00:00:00+00:00"))
    put("holdings", dict(id="h_2", company_id="c_taloja", investor_id="u_investor2", amount=1.5, stake=0.045, invested_at="2026-07-20T00:00:00+00:00"))


# ---------------- permissions (mirror of site/store.js: visibleState) ----------------
def pub(u):
    return {k: u.get(k) for k in ("id", "name", "role", "firm", "title", "company_id", "mandate")} if u else None


def approved_ids(st):
    return {r["company_id"] for r in st.reports if r["status"] == "approved"}


def teaser(c, st):
    rep = next((r for r in st.reports if r["company_id"] == c["id"] and r["status"] == "approved"), None)
    return {"id": c["id"], "name": c["name"], "sector": c["sector"], "stage": c["stage"], "city": c["city"], "revenue": c["revenue"],
            "raise": c["raise"], "instrument": c.get("instrument"), "teaser": True,
            "reviewed_by": rep and rep.get("reviewed_by"), "report_summary": rep and rep.get("summary")}


def visible_state(st, user, audit_rows):
    directory = [pub(u) for u in st.users if u["role"] in ("investor", "lender", "advisor")]
    base = dict(me=pub(user), directory=directory)
    role = user["role"]
    if role == "advisor":
        return dict(base, companies=st.companies, reports=st.reports, intros=st.intros, loans=st.loans, holdings=st.holdings, exits=st.exits,
                    enquiries=st.enquiries, audit=audit_rows(None), founders=[pub(u) for u in st.users if u["role"] == "founder"])
    if role == "founder":
        cid = user["company_id"]
        only = lambda coll: [d for d in coll if d.get("company_id") == cid]
        return dict(base, companies=[c for c in st.companies if c["id"] == cid], reports=only(st.reports), intros=only(st.intros),
                    loans=only(st.loans), holdings=only(st.holdings), exits=only(st.exits), audit=audit_rows(("company_id", cid)))
    if role == "investor":
        mine = [i for i in st.intros if i["investor_id"] == user["id"]]
        open_ = {i["company_id"] for i in mine if i["status"] == "granted" and i.get("nda_signed_at")}
        approved = approved_ids(st)
        held = {h["company_id"] for h in st.holdings if h["investor_id"] == user["id"]}
        asked = {i["company_id"] for i in mine}
        companies = [dict(c, teaser=False) if c["id"] in open_ else teaser(c, st)
                     for c in st.companies if c["id"] in approved or c["id"] in held or c["id"] in asked]
        return dict(base, companies=companies, reports=[r for r in st.reports if r["status"] == "approved" and r["company_id"] in open_],
                    intros=mine, loans=[], holdings=[h for h in st.holdings if h["investor_id"] == user["id"]],
                    exits=[x for x in st.exits if x["investor_id"] == user["id"]], audit=audit_rows(("user_id", user["id"])))
    loans = [l for l in st.loans if l["lender_id"] == user["id"]]
    cids = {l["company_id"] for l in loans}
    return dict(base, companies=[c for c in st.companies if c["id"] in cids], reports=[r for r in st.reports if r["status"] == "approved" and r["company_id"] in cids],
                intros=[], loans=loans, holdings=[], exits=[], audit=audit_rows(("user_id", user["id"])))


# ---------------- actions (mirror of site/store.js: ACTIONS) ----------------
def company_of(st, cid):
    c = next((x for x in st.companies if x["id"] == cid), None)
    need(c, "Company not found")
    return c


def find(coll, id_):
    return next((x for x in coll if x["id"] == id_), None)


def owns(u, cid):
    return u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid)


def fnum(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and x not in (float("inf"), float("-inf")) else None


def a_save_company(st, u, p):
    need(owns(u, p.get("company_id")), "Only the company's founder can edit it")
    c = company_of(st, p["company_id"])
    patch = p.get("patch") or {}
    need(isinstance(patch, dict), "Bad request")
    for k, v in patch.items():
        if k in COMPANY_FIELDS:
            if k in ("revenue", "raise"):
                need(fnum(v) is not None and fnum(v) > 0, "Revenue and raise must be positive numbers")
                v = fnum(v)
            elif k in ("name", "sector", "stage", "city", "instrument"):
                v = str(v).strip()[:120]
                need(v, "Enter a value for " + k)
            c[k] = v
    need(len(json.dumps(c)) < 200_000, "That is too much data for one company")
    return "Updated " + ", ".join(patch.keys()), c["id"]


def a_submit_report(st, u, p):
    need(u["role"] == "founder" and u["company_id"] == p.get("company_id"), "Only the company's founder can submit its report")
    c = company_of(st, p["company_id"])
    ch = p.get("checks") or {}
    need(ch.get("validation") and ch.get("founder_confirmed") and ch.get("verifier"), "All release checks must pass before review")
    need(not any(r["company_id"] == c["id"] and r["status"] == "in_review" for r in st.reports), "A report for this company is already in review")
    r = dict(id=uid("r"), company_id=c["id"], title=str(p.get("title") or "Debt vs equity report")[:120], status="in_review",
             engine_version=str(p.get("engine_version") or "")[:40], created_at=now(), submitted_by=u["id"],
             summary=p.get("summary") or {}, checks=ch, inputs=p.get("inputs") or {})
    st.reports.append(r)
    return "Submitted for advisor review: " + r["title"], c["id"]


def a_review_report(st, u, p):
    need(u["role"] == "advisor", "Only an advisor can review reports")
    r = find(st.reports, p.get("report_id"))
    need(r, "Report not found")
    need(r["status"] == "in_review", "This report is not waiting for review")
    need(p.get("decision") in ("approve", "changes"), "Choose approve or request changes")
    r.update(status="approved" if p["decision"] == "approve" else "changes", reviewed_by=u["id"], reviewed_at=now(), review_note=str(p.get("note") or "")[:500])
    return ("Approved report: " if p["decision"] == "approve" else "Requested changes: ") + r["title"], r["company_id"]


def a_request_intro(st, u, p):
    need(u["role"] == "investor", "Only investors can request an introduction")
    cid = p.get("company_id")
    need(cid in approved_ids(st), "Only advisor-approved deals are open to investors")
    need(not any(i["company_id"] == cid and i["investor_id"] == u["id"] for i in st.intros), "You already have an introduction for this company")
    st.intros.append(dict(id=uid("i"), company_id=cid, investor_id=u["id"], origin="investor", status="requested", created_at=now(), views=[]))
    return "Requested an introduction to " + company_of(st, cid)["name"], cid


def a_invite_investor(st, u, p):
    cid = p.get("company_id")
    need(u["role"] == "founder" and u["company_id"] == cid, "Only the company's founder can invite investors")
    need(cid in approved_ids(st), "Your report must be advisor-approved before investors are introduced")
    inv = next((x for x in st.users if x["id"] == p.get("investor_id") and x["role"] == "investor"), None)
    need(inv, "Investor not found")
    need(not any(i["company_id"] == cid and i["investor_id"] == inv["id"] for i in st.intros), "This investor is already introduced")
    st.intros.append(dict(id=uid("i"), company_id=cid, investor_id=inv["id"], origin="founder", status="granted", created_at=now(), views=[]))
    return "Approved an introduction to " + (inv.get("firm") or inv["name"]), cid


def a_decide_intro(st, u, p):
    i = find(st.intros, p.get("intro_id"))
    need(i, "Introduction not found")
    need(u["role"] == "founder" and u["company_id"] == i["company_id"], "Only the company's founder can decide")
    need(i["status"] == "requested", "This request was already decided")
    i["status"] = "granted" if p.get("decision") == "grant" else "declined"
    inv = next((x for x in st.users if x["id"] == i["investor_id"]), None)
    return ("Granted access to " if i["status"] == "granted" else "Declined ") + ((inv or {}).get("firm") or "investor"), i["company_id"]


def a_sign_nda(st, u, p):
    i = find(st.intros, p.get("intro_id"))
    need(i, "Introduction not found")
    need(u["role"] == "investor" and i["investor_id"] == u["id"], "Not your introduction")
    need(i["status"] == "granted", "The founder has not granted access yet")
    i["nda_signed_at"] = i.get("nda_signed_at") or now()
    return "Signed NDA for " + company_of(st, i["company_id"])["name"], i["company_id"]


def a_view_doc(st, u, p):
    i = find(st.intros, p.get("intro_id"))
    need(i, "Introduction not found")
    need(u["role"] == "investor" and i["investor_id"] == u["id"] and i["status"] == "granted" and i.get("nda_signed_at"), "Sign the NDA to open documents")
    c = company_of(st, i["company_id"])
    need(p.get("doc") in (c.get("docs") or []), "Document not found")
    i.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


def a_apply_loan(st, u, p):
    cid = p.get("company_id")
    need(u["role"] == "founder" and u["company_id"] == cid, "Only the company's founder can apply")
    lender = next((x for x in st.users if x["id"] == p.get("lender_id") and x["role"] == "lender"), None)
    need(lender, "Lender not found")
    amount, rate, tenor = fnum(p.get("amount")), fnum(p.get("rate")), fnum(p.get("tenor"))
    need(amount and amount > 0 and rate and 0 < rate < 1 and tenor and 0 < tenor <= 20, "Enter a valid amount, rate and tenor")
    st.loans.append(dict(id=uid("l"), company_id=cid, lender_id=lender["id"], amount=amount, rate=rate, tenor=int(tenor), status="applied", created_at=now(), transfer=None))
    return "Sent a Rs %g cr loan application to %s" % (amount, lender.get("firm")), cid


def a_lender_decide(st, u, p):
    l = find(st.loans, p.get("loan_id"))
    need(l, "Loan not found")
    need(u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    nxt = {"sanction": ("applied", "sanctioned"), "decline": ("applied", "declined"), "disburse": ("sanctioned", "disbursed")}.get(p.get("decision"))
    need(nxt and l["status"] == nxt[0], "That step is not available now")
    l["status"] = nxt[1]
    if fnum(p.get("rate")):
        l["rate"] = fnum(p["rate"])
    return "Loan %s (Rs %g cr)" % (l["status"], l["amount"]), l["company_id"]


def a_request_transfer(st, u, p):
    l = find(st.loans, p.get("loan_id"))
    need(l, "Loan not found")
    need(u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    need(l["status"] == "disbursed" and not l.get("transfer"), "Only a disbursed loan with no open transfer can be transferred")
    l["transfer"] = dict(status="open", step=0, amount=fnum(p.get("amount")) or l["amount"], requested_at=now())
    return "Asked Aegis Ascend to find a buyer for a Rs %g cr loan" % l["transfer"]["amount"], l["company_id"]


def a_advance_transfer(st, u, p):
    need(u["role"] == "advisor", "Only an advisor can move a transfer forward")
    l = find(st.loans, p.get("loan_id"))
    need(l and l.get("transfer") and l["transfer"]["status"] == "open", "No open transfer")
    l["transfer"]["step"] += 1
    if l["transfer"]["step"] >= 7:
        l["transfer"]["status"] = "completed"
    return "Loan transfer step %d done" % l["transfer"]["step"], l["company_id"]


def a_request_exit(st, u, p):
    h = find(st.holdings, p.get("holding_id"))
    need(h, "Holding not found")
    need(u["role"] == "investor" and h["investor_id"] == u["id"], "Not your holding")
    need(not any(x["holding_id"] == h["id"] and x["status"] != "completed" for x in st.exits), "An exit is already in progress")
    months = (time.time() - datetime.fromisoformat(h["invested_at"]).timestamp()) / MONTH_S
    st.exits.append(dict(id=uid("x"), holding_id=h["id"], company_id=h["company_id"], investor_id=u["id"], price=fnum(p.get("price")),
                         months=int(months), status="first_refusal" if months >= 6 else "consent_needed", step=0, created_at=now()))
    return "Asked to sell stake in " + company_of(st, h["company_id"])["name"] + ("" if months >= 6 else " (needs founder consent: under 6 months)"), h["company_id"]


def a_consent_exit(st, u, p):
    x = find(st.exits, p.get("exit_id"))
    need(x, "Exit not found")
    need(u["role"] == "founder" and u["company_id"] == x["company_id"], "Only the company's founder can consent")
    need(x["status"] == "consent_needed", "No consent is needed for this exit")
    x["status"] = "first_refusal"
    return "Gave written consent to an early exit", x["company_id"]


EXIT_ORDER = ["first_refusal", "buyer_intro", "valuation", "spa", "transfer", "completed"]


def a_advance_exit(st, u, p):
    need(u["role"] == "advisor", "Only an advisor can move an exit forward")
    x = find(st.exits, p.get("exit_id"))
    need(x and x["status"] not in ("consent_needed", "completed"), "No exit to move forward")
    x["status"] = EXIT_ORDER[min(EXIT_ORDER.index(x["status"]) + 1, len(EXIT_ORDER) - 1)]
    return "Exit moved to " + x["status"].replace("_", " "), x["company_id"]


def a_record_investment(st, u, p):
    need(u["role"] == "advisor", "Only an advisor records a closed deal")
    i = find(st.intros, p.get("intro_id"))
    need(i and i["status"] == "granted", "Introduction not found or not granted")
    amount, stake = fnum(p.get("amount")), fnum(p.get("stake"))
    need(amount and amount > 0 and stake and 0 < stake < 1, "Enter the amount and stake")
    rnd = str(p.get("round") or "current")[:20]
    on_deal = {h["investor_id"] for h in st.holdings if h["company_id"] == i["company_id"] and h.get("round") == rnd}
    need(len(on_deal) < 3, "A deal closes with at most 3 investors")
    st.holdings.append(dict(id=uid("h"), company_id=i["company_id"], investor_id=i["investor_id"], amount=amount, stake=stake, round=rnd, invested_at=now()))
    return "Recorded a Rs %g cr investment" % amount, i["company_id"]


ACTIONS = {name[2:]: fn for name, fn in globals().items() if name.startswith("a_") and callable(fn)}


# ---------------- app ----------------
app = Flask(__name__)
app.config.update(
    DATABASE=os.environ.get("GB_DATABASE", os.path.join(ROOT, "server", "glassbox.db")),
    SECRET_KEY=os.environ.get("GB_SECRET_KEY") or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("GB_SECURE_COOKIES", "0") == "1",
    PERMANENT_SESSION_LIFETIME=8 * 3600, MAX_CONTENT_LENGTH=1_000_000,
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
    return jsonify(user=pub(current_user()))


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
    write_audit(db(), u, "login", "Signed in")
    db().commit()
    return jsonify(user=pub(u))


@app.post("/api/logout")
@api
def logout():
    session.clear()
    return jsonify(ok=True)


@app.post("/api/signup")
@api
def signup():
    import re
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
                 twin={}, readiness={}, quarters=[], covenants=dict(dscr_min=1.25, debt_ebitda_max=3.5), docs=[])
        conn.execute("INSERT INTO docs (collection, id, data) VALUES ('companies',?,?)", (c["id"], json.dumps(c)))
        extra["company_id"] = c["id"]
    else:
        extra["firm"] = org or name
        if role == "investor":
            extra["mandate"] = dict(sectors=[sector], past_sectors=[], stages=["Growth"], ticket_min=2, ticket_max=20, instruments=["equity"])
    u = add_user(conn, email, name, role, pw, **extra)
    u["mandate"] = extra.get("mandate")
    write_audit(conn, u, "signup", "Created a %s account" % role, extra.get("company_id"))
    conn.commit()
    session.clear()
    session.permanent = True
    session["uid"] = u["id"]
    return jsonify(user=pub(u))


@app.get("/api/state")
@api
def state():
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    conn = db()

    def audit_rows(filt):
        q, args = "SELECT id, at, user_id, user_name, action, detail, company_id FROM audit", ()
        if filt:
            q += " WHERE %s=?" % ("company_id" if filt[0] == "company_id" else "user_id")
            args = (filt[1],)
        return [dict(r) for r in conn.execute(q + " ORDER BY seq DESC LIMIT 500", args)]
    return jsonify(visible_state(Store(conn), u, audit_rows))


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
    detail, company_id = fn(st, u, body())
    st.save()
    write_audit(conn, u, name, detail, company_id)
    conn.commit()
    return jsonify(detail=detail, company_id=company_id)


@app.post("/api/enquiry")
@api
def enquiry():
    import re
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
    tags = "".join('<script src="/static/%s"></script>' % f for f in ("calc.js", "optimizer.js", "ui.js", "api-server.js"))
    tags += '<script>window.GB_CMA_URL = "/fundmix.html"; window.GB_ASSETS = "/assets/";</script>'
    tags += "".join('<script src="/static/%s"></script>' % f for f in ("public.js", "portal.js"))
    html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
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
                    "<style>[hidden]{display:none!important}body{margin:0}</style></head><body>" + cma + "</body></html>", mimetype="text/html")


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
