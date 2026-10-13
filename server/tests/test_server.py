import os, sqlite3, sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from server import app as srv  # noqa: E402

H = {"X-Requested-With": "glassbox"}


@pytest.fixture()
def client(tmp_path):
    srv.app.config.update(DATABASE=str(tmp_path / "t.db"), TESTING=True)
    srv._FAILS.clear()
    srv.init_db(seed_demo=True)
    return srv.app.test_client()


def login(c, email, pw="demo1234"):
    r = c.post("/api/login", json={"email": email, "password": pw}, headers=H)
    assert r.status_code == 200, r.get_json()
    return r.get_json()["user"]


def act(c, name, payload, status=200):
    r = c.post("/api/act/" + name, json=payload, headers=H)
    assert r.status_code == status, (name, r.get_json())
    return r.get_json()


def state(c):
    r = c.get("/api/state")
    assert r.status_code == 200
    return r.get_json()


CHECKS = {"validation": True, "founder_confirmed": True, "verifier": True}


def test_pages_served(client):
    r = client.get("/")
    assert r.status_code == 200 and b"/static/portal.js" in r.data and b"api-server.js" in r.data
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]
    assert client.get("/static/portal.js").status_code == 200
    assert client.get("/static/store.js").status_code == 404  # demo store is never served
    assert client.get("/static/../server/app.py").status_code == 404
    assert client.get("/fundmix.html").status_code == 200


def test_passwords_are_hashed(client):
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    h = conn.execute("SELECT pw_hash FROM users WHERE email='founder@demo.in'").fetchone()[0]
    assert "demo1234" not in h and h.startswith(("scrypt:", "pbkdf2:"))


def test_requires_login_and_csrf_header(client):
    assert client.get("/api/state").status_code == 401
    assert client.post("/api/act/save_company", json={}, headers=H).status_code == 401
    r = client.post("/api/login", json={"email": "founder@demo.in", "password": "demo1234"})
    assert r.status_code == 400  # no custom header -> blocked


def test_wrong_password_and_throttle(client):
    for _ in range(5):
        assert client.post("/api/login", json={"email": "founder@demo.in", "password": "nope"}, headers=H).status_code == 401
    assert client.post("/api/login", json={"email": "founder@demo.in", "password": "demo1234"}, headers=H).status_code == 429


def test_signup_rules(client):
    bad = client.post("/api/signup", json={"name": "X", "email": "x@y.in", "password": "1234567", "role": "founder"}, headers=H)
    assert bad.status_code == 400
    assert client.post("/api/signup", json={"name": "X", "email": "x@y.in", "password": "12345678", "role": "advisor"}, headers=H).status_code == 400
    assert client.post("/api/signup", json={"name": "X", "email": "founder@demo.in", "password": "12345678", "role": "founder"}, headers=H).status_code == 409
    r = client.post("/api/signup", json={"name": "New", "email": "new@co.in", "password": "secret123", "role": "founder", "org": "NewCo"}, headers=H)
    assert r.status_code == 200
    s = state(client)
    assert [c["name"] for c in s["companies"]] == ["NewCo"]
    client.post("/api/logout", headers=H)
    assert client.get("/api/state").status_code == 401
    login(client, "new@co.in", "secret123")


def test_visibility(client):
    login(client, "investor@demo.in")
    s = state(client)
    ids = {c["id"]: c for c in s["companies"]}
    assert "c_kalyan" not in ids and "c_taloja" not in ids
    assert ids["c_vasai"]["teaser"] is False
    assert s["loans"] == [] and all(h["investor_id"] == "u_investor" for h in s["holdings"])
    client.post("/api/logout", headers=H)
    login(client, "angels@demo.in")
    t = {c["id"]: c for c in state(client)["companies"]}["c_taloja"]
    assert t["teaser"] is True and "twin" not in t and "quarters" not in t
    client.post("/api/logout", headers=H)
    login(client, "founder@demo.in")
    s = state(client)
    assert [c["id"] for c in s["companies"]] == ["c_kalyan"] and s["reports"] == []
    client.post("/api/logout", headers=H)
    login(client, "lender@demo.in")
    s = state(client)
    assert [l["id"] for l in s["loans"]] == ["l_vasai"]


def test_full_workflow_and_denials(client):
    login(client, "investor@demo.in")
    act(client, "request_intro", {"company_id": "c_kalyan"}, 403)
    act(client, "save_company", {"company_id": "c_vasai", "patch": {"name": "x"}}, 403)
    client.post("/api/logout", headers=H)

    login(client, "founder@demo.in")
    act(client, "save_company", {"company_id": "c_vasai", "patch": {"name": "x"}}, 403)
    act(client, "invite_investor", {"company_id": "c_kalyan", "investor_id": "u_investor"}, 403)
    act(client, "submit_report", {"company_id": "c_kalyan", "checks": {"validation": True}}, 403)
    act(client, "submit_report", {"company_id": "c_kalyan", "title": "DvE", "summary": {"best_share": 0.6}, "checks": CHECKS})
    act(client, "submit_report", {"company_id": "c_kalyan", "checks": CHECKS}, 403)
    act(client, "review_report", {"report_id": "r_taloja", "decision": "approve"}, 403)
    client.post("/api/logout", headers=H)

    login(client, "advisor@demo.in")
    rep = next(r for r in state(client)["reports"] if r["company_id"] == "c_kalyan")
    act(client, "review_report", {"report_id": rep["id"], "decision": "approve", "note": "fine"})
    client.post("/api/logout", headers=H)

    login(client, "founder@demo.in")
    act(client, "invite_investor", {"company_id": "c_kalyan", "investor_id": "u_investor"})
    act(client, "apply_loan", {"company_id": "c_kalyan", "lender_id": "u_lender", "amount": 7, "rate": 0.105, "tenor": 7})
    client.post("/api/logout", headers=H)

    login(client, "investor@demo.in")
    intro = next(i for i in state(client)["intros"] if i["company_id"] == "c_kalyan")
    act(client, "view_doc", {"intro_id": intro["id"], "doc": "Cap table"}, 403)
    act(client, "sign_nda", {"intro_id": intro["id"]})
    act(client, "view_doc", {"intro_id": intro["id"], "doc": "Cap table"})
    act(client, "view_doc", {"intro_id": intro["id"], "doc": "Secret file"}, 403)
    assert {c["id"]: c for c in state(client)["companies"]}["c_kalyan"]["teaser"] is False
    act(client, "request_exit", {"holding_id": "h_1", "price": 5})
    act(client, "request_exit", {"holding_id": "h_2"}, 403)
    client.post("/api/logout", headers=H)

    login(client, "lender@demo.in")
    loan = next(l for l in state(client)["loans"] if l["company_id"] == "c_kalyan")
    act(client, "lender_decide", {"loan_id": loan["id"], "decision": "disburse"}, 403)
    act(client, "lender_decide", {"loan_id": loan["id"], "decision": "sanction"})
    act(client, "lender_decide", {"loan_id": "l_kalyan", "decision": "sanction"}, 403)
    act(client, "request_transfer", {"loan_id": "l_vasai"})
    client.post("/api/logout", headers=H)

    login(client, "advisor@demo.in")
    s = state(client)
    act(client, "advance_transfer", {"loan_id": "l_vasai"})
    x = s["exits"][0]
    assert x["status"] == "first_refusal"
    act(client, "advance_exit", {"exit_id": x["id"]})
    actions = [a["action"] for a in state(client)["audit"]]
    assert "review_report" in actions and "sign_nda" in actions and "view_doc" in actions


def test_audit_is_append_only(client):
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    srv.write_audit(conn, None, "x", "y")
    conn.commit()
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM audit")
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("UPDATE audit SET detail='z'")


def test_max_three_investors_per_deal(client):
    login(client, "advisor@demo.in")
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    import json
    for k, inv in enumerate(["u_investor", "u_investor2", "u_investor3", "u_founder"]):
        conn.execute("INSERT OR REPLACE INTO docs VALUES ('intros', ?, ?)", ("t%d" % k, json.dumps({"id": "t%d" % k, "company_id": "c_taloja", "investor_id": inv, "status": "granted", "views": []})))
    conn.commit()
    for k in range(3):
        act(client, "record_investment", {"intro_id": "t%d" % k, "amount": 1, "stake": 0.02, "round": "A"})
    act(client, "record_investment", {"intro_id": "t3", "amount": 1, "stake": 0.02, "round": "A"}, 403)
