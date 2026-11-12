import json, os, sqlite3, sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from server import app as srv  # noqa: E402
from server import domain as D  # noqa: E402

H = {"X-Requested-With": "glassbox"}
TODAY = "2026-10-19"


@pytest.fixture()
def client(tmp_path):
    srv.app.config.update(DATABASE=str(tmp_path / "t.db"), UPLOADS=str(tmp_path / "up"), TESTING=True, TODAY=TODAY)
    srv._FAILS.clear()
    srv.init_db(seed_demo=True)
    return srv.app.test_client()


def store():
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    conn.row_factory = sqlite3.Row
    return srv.Store(conn)


def login(c, email, pw="demo1234"):
    c.post("/api/logout", headers=H)
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


# ---------------- platform basics ----------------
def test_pages_served(client):
    r = client.get("/")
    assert r.status_code == 200 and b"/static/portal.js" in r.data and b"/static/ws-advisor.js" in r.data
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]
    for f in srv.SCRIPTS:
        assert client.get("/static/" + f).status_code == 200, f
    assert client.get("/static/store.js").status_code == 404  # demo store is never served
    assert client.get("/static/../server/app.py").status_code == 404
    r = client.get("/fundmix.html")  # the CMA tool is advisors-only
    assert r.status_code == 401 and b"Advisors only" in r.data
    login(client, "advisor@demo.in")
    assert "noindex" in client.get("/api/state").headers["X-Robots-Tag"]


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
    assert client.post("/api/signup", json={"name": "X", "email": "x@y.in", "password": "1234567", "role": "founder"}, headers=H).status_code == 400
    assert client.post("/api/signup", json={"name": "X", "email": "x@y.in", "password": "12345678", "role": "advisor"}, headers=H).status_code == 400
    assert client.post("/api/signup", json={"name": "X", "email": "founder@demo.in", "password": "12345678", "role": "founder"}, headers=H).status_code == 409
    r = client.post("/api/signup", json={"name": "New", "email": "new@co.in", "password": "secret123", "role": "founder", "org": "NewCo"}, headers=H)
    assert r.status_code == 200
    s = state(client)
    assert [c["name"] for c in s["companies"]] == ["NewCo"] and s["companies"][0]["pipeline_stage"] == "applied"


def test_seed_matches_the_brief(client):
    st = store()
    fy = D.fy(TODAY)
    assert sum(1 for u in st.users if u["role"] == "investor") == 25
    assert sum(1 for u in st.users if u["role"] == "lender") == 4 and len(st.loans) == 6
    assert len(D.platform_investors(st, "c_vasai")) == 19
    assert D.offers_used(st, "c_kalyan", fy, "equity") == 195
    assert sum(D.loan_summary(l, TODAY)["overdue"] for l in st.loans) == 1
    assert all(sum(1 for v in st.valuations if v["company_id"] == c) >= 2 for c in ("c_vasai", "c_taloja"))
    assert len([x for x in st.sell_requests if x["status"] == "submitted"]) == 1 and len(st.loan_transfers) == 1
    assert len({c["pipeline_stage"] for c in st.companies}) >= 3


# ---------------- required rule tests ----------------
def test_cannot_sell_before_six_months(client):
    login(client, "investor@demo.in")
    r = client.post("/api/act/request_sell", json={"holding_id": "h_t1"}, headers=H)  # Taloja, allotted under 6 months ago
    assert r.status_code == 403 and "Locked" in r.get_json()["error"] and "24 Oct 2026" in r.get_json()["error"]
    act(client, "request_sell", {"holding_id": "h_v1", "shares": 1000, "indicative_price_paise": 19500, "note": "part sale"})
    s = state(client)
    assert any(x["holding_id"] == "h_v1" and x["status"] == "submitted" and not x["full"] for x in s["sell_requests"])
    # the founder's written consent, recorded by the advisor, lifts the lock early
    login(client, "advisor@demo.in")
    act(client, "record_consent", {"holding_id": "h_t1", "note": "Farah Shaikh, letter dated 15 Oct 2026"})
    login(client, "investor@demo.in")
    act(client, "request_sell", {"holding_id": "h_t1"})


def test_offer_over_200_in_a_financial_year_is_blocked(client):
    login(client, "advisor@demo.in")
    for sfx in ("23", "25"):
        act(client, "set_investor_profile", {"investor_id": "u_investor" + sfx, "kyc": "verified"})
    five = ["u_investor%s" % s for s in ("21", "22", "23", "24", "25")]
    # a new, verified investor makes six: 195 + 6 = 201 -> the whole share is refused
    client.post("/api/logout", headers=H)
    new = client.post("/api/signup", json={"name": "Six", "email": "six@x.in", "password": "secret123", "role": "investor"}, headers=H).get_json()["user"]
    login(client, "advisor@demo.in")
    act(client, "set_investor_profile", {"investor_id": new["id"], "kyc": "verified"})
    r = client.post("/api/act/share_offer", json={"company_id": "c_kalyan", "investor_ids": five + [new["id"]]}, headers=H)
    assert r.status_code == 403 and "Section 42" in r.get_json()["error"]
    assert D.offers_used(store(), "c_kalyan", D.fy(TODAY), "equity") == 195
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": five})
    assert D.offers_used(store(), "c_kalyan", D.fy(TODAY), "equity") == 200
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": [new["id"]]}, 403)
    # the same investor offered again in the same year does not count twice
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": ["u_investor21"]}, 403)
    # a different kind of security has its own 200
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": [new["id"]], "security_type": "debentures"})


def test_twenty_first_platform_investor_is_blocked(client):
    login(client, "advisor@demo.in")
    act(client, "set_stage", {"company_id": "c_vasai", "stage": "offering"})
    act(client, "share_offer", {"company_id": "c_vasai", "investor_ids": ["u_investor21", "u_investor22"]})
    offers = {o["investor_id"]: o for o in state(client)["offers"] if o["company_id"] == "c_vasai"}
    for sfx in ("21", "22"):
        login(client, "inv%s@demo.in" % sfx)
        act(client, "respond_offer", {"offer_id": offers["u_investor" + sfx]["id"], "response": "interested"})
    login(client, "advisor@demo.in")
    act(client, "allot_shares", {"offer_id": offers["u_investor21"]["id"], "shares": 10000, "amount_paise": 10000 * 18400})
    assert len(D.platform_investors(store(), "c_vasai")) == 20
    r = client.post("/api/act/allot_shares", json={"offer_id": offers["u_investor22"]["id"], "shares": 10000, "amount_paise": 10000 * 18400}, headers=H)
    assert r.status_code == 403 and "platform investors" in r.get_json()["error"]
    # the limit is a setting
    act(client, "save_settings", {"max_platform_investors": 21})
    act(client, "allot_shares", {"offer_id": offers["u_investor22"]["id"], "shares": 10000, "amount_paise": 10000 * 18400})


def test_partial_resale_that_adds_a_member_over_200_is_blocked(client):
    login(client, "advisor@demo.in")
    act(client, "save_cap_entry", {"company_id": "c_vasai", "entry_id": "ct_v3", "holder_name": "Employees and early shareholders",
                                   "holder_type": "existing", "shares": 900000, "holders": 178})
    assert D.members(store(), "c_vasai") == 200
    login(client, "investor@demo.in")
    act(client, "request_sell", {"holding_id": "h_v1", "shares": 1000})
    rid = next(x["id"] for x in state(client)["sell_requests"] if x["holding_id"] == "h_v1")
    login(client, "advisor@demo.in")
    act(client, "sell_step", {"request_id": rid, "step": "review"})
    act(client, "sell_step", {"request_id": rid, "step": "rofr", "days": 15})
    act(client, "sell_step", {"request_id": rid, "step": "buyer", "buyer_investor_id": "u_investor21"}, 403)  # window still open
    r = client.post("/api/act/sell_step", json={"request_id": rid, "step": "buyer", "buyer_investor_id": "u_investor21", "waived": True}, headers=H)
    assert r.status_code == 403 and "members" in r.get_json()["error"]
    # a full-stake sale to a new buyer keeps the count at 200 and goes through
    for step in ({"step": "review"}, {"step": "rofr", "days": 20}, {"step": "buyer", "buyer_investor_id": "u_investor21", "waived": True},
                 {"step": "spa", "price_paise": 19000}, {"step": "complete", "fee_rate": 0.006}):
        if step["step"] == "complete":   # the resale fee must be 0.3% to 0.5%
            act(client, "sell_step", dict(step, request_id="s_1"), 403)
            step = dict(step, fee_rate=0.004)
        act(client, "sell_step", dict(step, request_id="s_1"))
    st = store()
    # the selling investor pays 0.4% of the sale value; the buyer pays nothing
    t0 = st.transfers[0]
    fee = [f for f in st.invoices if f["kind"] == "resale"]
    assert len(fee) == 1 and fee[0]["payer"] == "investor" and fee[0]["payer_id"] == t0["from_investor_id"]
    assert fee[0]["amount_paise"] == D.half_up(t0["shares"] * 19000 * 0.004) and fee[0]["gst_paise"] == fee[0]["amount_paise"] * 18 // 100
    assert not any(f["payer_id"] == t0["to_investor_id"] for f in st.invoices)
    assert D.members(st, "c_vasai") == 200
    assert next(h for h in st.holdings if h["id"] == "h_v3")["shares"] == 0
    t = st.transfers[0]
    assert t["to_investor_id"] == "u_investor21" and t["price_paise"] == 19000
    new = next(h for h in st.holdings if h["investor_id"] == "u_investor21" and h["company_id"] == "c_vasai")
    assert new["shares"] == t["shares"] and new["cost_paise"] == t["shares"] * 19000 and new["origin"] == "transfer"


def test_revaluation_updates_portfolio_value_and_gain(client):
    s0 = D.portfolio(store(), "u_investor", TODAY, D.SETTINGS_DEFAULT)
    v_row = next(r for r in s0["rows"] if r["company_id"] == "c_vasai")
    assert v_row["price"] == 18400
    login(client, "advisor@demo.in")
    act(client, "publish_valuation", {"company_id": "c_vasai", "date": TODAY, "method": "DCF", "price_per_share_paise": 20500, "valuer": "R. K. Valuers"})
    act(client, "publish_valuation", {"company_id": "c_vasai", "date": "2026-11-01", "method": "DCF", "price_per_share_paise": 1, "valuer": "x"}, 403)
    s1 = D.portfolio(store(), "u_investor", TODAY, D.SETTINGS_DEFAULT)
    row = next(r for r in s1["rows"] if r["company_id"] == "c_vasai")
    h = next(h for h in store().holdings if h["id"] == "h_v1")
    assert row["price"] == 20500 and row["valuation_date"] == TODAY
    assert row["value"] == h["shares"] * 20500
    assert row["gain"] == h["shares"] * 20500 - h["cost_paise"]
    assert abs(row["gain_pct"] - (20500 - 16000) / 16000) < 1e-12
    assert s1["value"] - s0["value"] == h["shares"] * (20500 - 18400)
    login(client, "investor@demo.in")
    assert any(n["kind"] == "valuation" and "Rs 205" in n["text"] for n in state(client)["notifications"])


def test_ownership_is_shares_over_fully_diluted(client):
    st = store()
    fd = 4_200_000 + 1_800_000 + 900_000 + 300_000 + 200_000 + sum(h["shares"] for h in st.holdings if h["company_id"] == "c_vasai")
    assert D.fd_shares(st, "c_vasai") == fd
    h = next(x for x in st.holdings if x["id"] == "h_v1")
    assert D.holding_view(st, h, TODAY, D.SETTINGS_DEFAULT)["ownership"] == h["shares"] / fd


def test_loan_interest_and_principal_match_the_schedule(client):
    st = store()
    l2 = next(l for l in st.loans if l["id"] == "l_2")
    rows = D.schedule(l2, TODAY)
    assert rows[0]["interest"] == 5_750_000 * 10  # Rs 5,75,000: 6 crore x 11.5% / 12
    assert sum(r["principal"] for r in rows) == l2["amount_paise"] and rows[-1]["closing"] == 0
    for r in rows:
        assert r["opening"] - r["principal"] == r["closing"]
    s = D.loan_summary(l2, TODAY)
    paid = [r for r in rows if r["status"] == "paid"]
    assert s["interest_earned"] == sum(r["interest"] for r in paid)
    assert s["principal_pending"] == paid[-1]["closing"] == l2["amount_paise"] - sum(r["principal"] for r in paid)
    assert s["overdue"] == 1 and s["next_due"] == next(r["due"] for r in rows if r["status"] == "overdue")
    # moratorium: interest only, no principal
    l1 = next(l for l in st.loans if l["id"] == "l_1")
    assert all(r["principal"] == 0 for r in D.schedule(l1, TODAY)[:6]) and D.schedule(l1, TODAY)[6]["principal"] > 0
    # recording the overdue instalment clears it and moves the numbers by exactly that row
    login(client, "lender@demo.in")
    act(client, "record_repayment", {"loan_id": "l_2", "due": s["next_due"]})
    s2 = D.loan_summary(next(l for l in store().loans if l["id"] == "l_2"), TODAY)
    row = next(r for r in rows if r["due"] == s["next_due"])
    assert s2["overdue"] == 0 and s2["interest_earned"] == s["interest_earned"] + row["interest"]
    assert s2["principal_pending"] == s["principal_pending"] - row["principal"]


def test_each_role_sees_only_its_own_data(client):
    login(client, "investor@demo.in")
    s = state(client)
    assert {h["investor_id"] for h in s["holdings"]} == {"u_investor"}
    assert "cap_table" not in s and "loans" not in s and all("twin" not in c for c in s["companies"])
    assert {d["role"] for d in s["directory"]} == {"advisor"}
    assert "c_nashik" not in {c["id"] for c in s["companies"]}
    act(client, "request_sell", {"holding_id": "h_v3"}, 403)  # another investor's holding
    act(client, "respond_offer", {"offer_id": "o_k2", "response": "interested"}, 403)  # another investor's offer
    login(client, "founder@demo.in")
    s = state(client)
    assert [c["id"] for c in s["companies"]] == ["c_kalyan"]
    hidden = [o for o in s["offers"] if o["investor_id"] is None]
    assert hidden and all(o["investor_name"].startswith("Name shared") for o in hidden)
    assert {o["investor_name"] for o in s["offers"] if o["investor_id"]} == {"Sahyadri Angels Network", "Menon Investments (sample)"}
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": ["u_investor21"]}, 403)
    login(client, "lender@demo.in")
    s = state(client)
    assert {l["id"] for l in s["loans"]} == {"l_1", "l_2", "l_3"}
    act(client, "record_repayment", {"loan_id": "l_4", "due": "2026-10-14"}, 403)
    act(client, "publish_valuation", {"company_id": "c_vasai"}, 403)


def test_files_follow_the_same_rules(client, tmp_path):
    login(client, "advisor@demo.in")
    from io import BytesIO
    r = client.post("/api/upload", data={"file": (BytesIO(b"%PDF-1.4 report"), "valuation.pdf"), "company_id": "c_taloja", "purpose": "valuation_report"},
                    headers=H, content_type="multipart/form-data")
    assert r.status_code == 200
    fid = r.get_json()["file"]["id"]
    act(client, "publish_valuation", {"company_id": "c_taloja", "date": TODAY, "method": "DCF", "price_per_share_paise": 9800, "valuer": "Mehta & Associates", "file_id": fid})
    login(client, "angels@demo.in")  # holds Taloja
    assert client.get("/api/file/" + fid).status_code == 200
    login(client, "familyoffice@demo.in")  # does not hold Taloja
    assert client.get("/api/file/" + fid).status_code == 404
    bad = client.post("/api/upload", data={"file": (BytesIO(b"x"), "evil.exe"), "company_id": "c_taloja", "purpose": "dataroom"}, headers=H, content_type="multipart/form-data")
    assert bad.status_code == 400


def test_audit_log_records_every_state_change(client):
    login(client, "advisor@demo.in")
    act(client, "sell_step", {"request_id": "s_1", "step": "review"})
    act(client, "publish_valuation", {"company_id": "c_vasai", "date": TODAY, "method": "DCF", "price_per_share_paise": 19000, "valuer": "R. K. Valuers"})
    act(client, "set_stage", {"company_id": "c_nashik", "stage": "rejected"})
    rows = state(client)["audit"]
    by = {r["action"]: r for r in rows}
    sell = by["sell_step"]["changes"]
    s1 = next(c for c in sell if c["id"] == "s_1")["diff"]
    assert s1["status"] == ["submitted", "under_review"]
    assert any(c["collection"] == "valuations" and c["diff"] == {"created": True} for c in by["publish_valuation"]["changes"])
    assert next(c for c in by["set_stage"]["changes"] if c["id"] == "c_nashik")["diff"]["pipeline_stage"] == ["under_review", "rejected"]
    assert all(r["user_name"] == "CA Neha Joshi" for r in rows if r["action"] in by)
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("UPDATE audit SET detail='x'")
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM audit")


def test_loan_transfer_between_regulated_lenders(client):
    login(client, "advisor@demo.in")
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "consent"}, 403)  # out of order
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "eligibility"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "consent"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "buyer_introduced", "buyer_lender_id": "u_lender2"}, 403)  # same lender
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "buyer_introduced", "buyer_lender_id": "u_lender4"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "deed_signed"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "charge_updated"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "completed", "fee_rate": 0.006}, 403)
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "completed", "fee_rate": 0.004})
    st = store()
    l4 = next(l for l in st.loans if l["id"] == "l_4")
    assert l4["lender_id"] == "u_lender4"
    fee = next(f for f in st.invoices if f["kind"] == "transfer")
    assert fee["amount_paise"] == D.half_up(D.loan_summary(l4, TODAY)["principal_pending"] * 0.004) and fee["payer_id"] == "u_lender2"
    login(client, "deccan@demo.in")
    assert "l_4" in {l["id"] for l in state(client)["loans"]}
    # an unverified, self-registered lender cannot start a transfer
    client.post("/api/logout", headers=H)
    client.post("/api/signup", json={"name": "L", "email": "l@x.in", "password": "secret123", "role": "lender"}, headers=H)
    assert all((d.get("profile") or {}).get("regulated") for d in state(client)["directory"] if d["role"] == "lender" and d["id"].startswith("u_lender"))


def test_deal_room_requests_need_an_offer_and_founder_approval(client):
    login(client, "familyoffice@demo.in")  # declined Kalyan's offer
    act(client, "request_intro", {"company_id": "c_kalyan"}, 403)
    act(client, "request_intro", {"company_id": "c_nashik"}, 403)  # never offered
    login(client, "investor@demo.in")  # Kalyan offer pending
    act(client, "request_intro", {"company_id": "c_kalyan"})
    act(client, "request_intro", {"company_id": "c_kalyan"}, 403)  # only once
    iid = next(i["id"] for i in state(client)["intros"] if i["company_id"] == "c_kalyan")
    act(client, "sign_nda", {"intro_id": iid}, 403)  # not granted yet
    login(client, "rahul@demo.in")
    act(client, "decide_intro", {"intro_id": iid, "decision": "grant"}, 403)  # another company's founder
    login(client, "founder@demo.in")
    s = state(client)
    assert {i["investor_name"] for i in s["intros"]} >= {"Konkan Growth Partners", "Sahyadri Angels Network"}
    act(client, "decide_intro", {"intro_id": iid, "decision": "grant"})
    act(client, "suggest_investor", {"investor_id": "u_investor21"})
    login(client, "investor@demo.in")
    act(client, "view_room_doc", {"intro_id": iid, "doc": "Cap table"}, 403)  # NDA first
    act(client, "sign_nda", {"intro_id": iid})
    act(client, "view_room_doc", {"intro_id": iid, "doc": "Cap table"})
    login(client, "founder@demo.in")
    i = next(x for x in state(client)["intros"] if x["id"] == iid)
    assert i["status"] == "granted" and i["nda_signed_at"] and i["views"][0]["doc"] == "Cap table"
    login(client, "advisor@demo.in")
    assert any("suggests offering" in n["text"] for n in state(client)["notes"])


def test_only_advisors_submit_the_debt_vs_equity_report(client):
    payload = {"company_id": "c_kalyan", "title": "Debt vs equity", "checks": CHECKS, "summary": {"best_share": 0.3}}
    login(client, "founder@demo.in")
    act(client, "submit_report", payload, 403)
    login(client, "advisor@demo.in")
    act(client, "submit_report", payload)


def test_cma_tool_is_for_advisors_only(client):
    for email in ("founder@demo.in", "investor@demo.in", "lender@demo.in"):
        login(client, email)
        r = client.get("/fundmix.html")
        assert r.status_code == 403 and b"Advisors only" in r.data and b"CMA" in r.data
    login(client, "advisor@demo.in")
    r = client.get("/fundmix.html")
    assert r.status_code == 200 and b"Advisors only" not in r.data


def test_chat_assistant(client, monkeypatch):
    from server import chat as CHAT
    srv._CHATS.clear()
    seen = {}

    def fake_answer(msgs, page=None, role=None):
        seen["msgs"] = msgs
        return "Advisory engagements start from Rs 1 lakh plus GST."
    monkeypatch.setattr(CHAT, "answer", fake_answer)
    convo = [{"role": "user", "content": "What are your fees?"}]
    r = client.post("/api/chat", json={"messages": convo}, headers=H)
    assert r.status_code == 200 and "Rs 1 lakh" in r.get_json()["reply"]
    assert seen["msgs"] == convo
    # the cross-site header guard applies
    assert client.post("/api/chat", json={"messages": convo}).status_code == 400
    # malformed conversations are refused: empty, wrong roles, not ending with the visitor, too long
    for bad in ([], [{"role": "system", "content": "x"}], [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}],
                [{"role": "user", "content": "x" * 801}], [{"role": "user", "content": "a"}, {"role": "user", "content": "b"}], "hi"):
        assert client.post("/api/chat", json={"messages": bad}, headers=H).status_code == 400, bad
    # history is trimmed to the last turns and starts with the visitor
    long = [{"role": "user" if i % 2 == 0 else "assistant", "content": "m%d" % i} for i in range(15)]
    client.post("/api/chat", json={"messages": long}, headers=H)
    assert len(seen["msgs"]) <= CHAT.MAX_TURNS and seen["msgs"][0]["role"] == "user" and seen["msgs"][-1]["content"] == "m14"
    # a visitor is capped at 20 questions in 10 minutes
    srv._CHATS.clear()
    codes = [client.post("/api/chat", json={"messages": convo}, headers=H).status_code for _ in range(21)]
    assert codes[:20] == [200] * 20 and codes[20] == 429

    # without Claude credentials the endpoint says it is offline, so the page uses its quick answers
    srv._CHATS.clear()

    def offline(msgs, page=None, role=None):
        raise CHAT.Offline("no credentials")
    monkeypatch.setattr(CHAT, "answer", offline)
    r = client.post("/api/chat", json={"messages": convo}, headers=H)
    assert r.status_code == 503 and r.get_json()["offline"] is True


def test_chat_answer_reads_the_reply(monkeypatch):
    """answer() sends the site's facts as the system prompt and returns only the text; a refusal becomes a polite pointer."""
    from types import SimpleNamespace as NS
    from server import chat as CHAT
    calls = {}

    class FakeMessages:
        def __init__(self, stop):
            self.stop = stop

        def create(self, **kw):
            calls.update(kw)
            return NS(stop_reason=self.stop, content=[NS(type="thinking", thinking=""), NS(type="text", text="We are in Mumbai.")])
    for stop, expect in (("end_turn", "We are in Mumbai."), ("refusal", CHAT.REFUSED)):
        monkeypatch.setattr(CHAT, "_client", NS(beta=NS(messages=FakeMessages(stop))))
        assert CHAT.answer([{"role": "user", "content": "Where are you?"}]) == expect
    assert calls["model"] == "claude-opus-5-5" and "Rs 1 lakh" in calls["system"] and calls["fallbacks"] == "default"


def test_sitemap_matches_the_site():
    """The assistant's site map lists exactly the pages in each role's workspace menu, and the public routes the router knows."""
    import re as _re
    from server import chat as CHAT
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    portal = open(os.path.join(root, "site", "portal.js"), encoding="utf-8").read()
    menus = _re.search(r"const NAVS = \{(.*?)\n  \};", portal, _re.S)
    for role in CHAT.ROLES:
        line = _re.search(role + r": \[(.*?\])\],?(?:\n|$)", menus.group(1), _re.S).group(1)
        menu = _re.findall(r'\["(app[a-z-]*)", "([^"]+)"\]', line)
        mapped = [(p["route"], p["label"]) for p in CHAT.SITEMAP["roles"][role]["pages"]]
        assert menu == mapped, role
    public = _re.search(r"const PUBLIC = \{(.*?)\};", portal).group(1)
    routes = set(_re.findall(r'"?([a-z-]+)"?: PUB\.', public)) | {"login", "signup"}
    assert {p["route"] for p in CHAT.SITEMAP["public"]} == routes


def test_chat_knows_where_the_visitor_is(client, monkeypatch):
    from server import chat as CHAT
    srv._CHATS.clear()
    seen = {}

    def fake_answer(msgs, page=None, role=None):
        seen.update(page=page, role=role)
        return "ok"
    monkeypatch.setattr(CHAT, "answer", fake_answer)
    convo = [{"role": "user", "content": "Where is my cap table?"}]
    client.post("/api/chat", json={"messages": convo, "page": "pricing"}, headers=H)
    assert seen == {"page": "pricing", "role": None}
    login(client, "founder@demo.in")
    client.post("/api/chat", json={"messages": convo, "page": "app-captable"}, headers=H)
    assert seen == {"page": "app-captable", "role": "founder"}
    client.post("/api/chat", json={"messages": convo, "page": "<script>"}, headers=H)
    assert seen["page"] == ""                                   # anything that isn't a route is dropped
    # the prompt carries the site map; links to unknown pages are stripped from replies
    assert "[Cap table](#app-captable)" in CHAT.SYSTEM and "INVESTOR WORKSPACE" in CHAT.SYSTEM
    assert CHAT.keep_known_links("Open [Pricing](#pricing) or [Admin](#secret-admin).") == "Open [Pricing](#pricing) or Admin."
    note = CHAT.context_note("app-captable", "founder")
    assert "Cap table" in note and "founder" in note


def test_debt_success_fee_on_disbursal(client):
    """A loan arranged through Aegis Ascend: the company is invoiced 2.5% + GST when the lender disburses it, and the founder is told."""
    login(client, "founder@demo.in")
    act(client, "apply_loan", {"company_id": "c_kalyan", "lender_id": "u_lender", "amount_paise": 4 * 10**9, "rate_bps": 1100, "tenor_months": 60, "moratorium_months": 0})
    login(client, "lender@demo.in")
    loan = next(l for l in state(client)["loans"] if l["status"] == "applied" and l["company_id"] == "c_kalyan")
    act(client, "lender_decide", {"loan_id": loan["id"], "decision": "sanction"})
    act(client, "lender_decide", {"loan_id": loan["id"], "decision": "disburse"})
    login(client, "founder@demo.in")
    st = state(client)
    fee = [f for f in st["invoices"] if f["kind"] == "debt_success" and f["period"] == "Loan from Harbour Bank (sample)" and f["issued"] == TODAY]
    assert len(fee) == 1 and fee[0]["amount_paise"] == 4 * 10**9 * 25 // 1000 and fee[0]["gst_paise"] == fee[0]["amount_paise"] * 18 // 100
    assert fee[0]["payer"] == "company" and fee[0]["company_id"] == "c_kalyan"
    assert any("2.5% debt success fee" in n["text"] for n in st["notifications"])
    # the advisor can also raise one by hand
    login(client, "advisor@demo.in")
    act(client, "save_invoice", {"kind": "debt_success", "company_id": "c_vasai", "amount_paise": 100000, "period": "Loan"})


def test_lender_sells_a_loan_through_the_advisor(client):
    login(client, "lender@demo.in")
    act(client, "request_loan_transfer", {"loan_id": "l_1", "note": "Rebalancing the book"})
    login(client, "advisor@demo.in")
    st = state(client)
    assert any(t["loan_id"] == "l_1" and t["status"] == "submitted" for t in st["loan_transfers"])
    assert any("Loan sale request" in n["text"] and n["link"] == "app-loantransfers" for n in st["notifications"])
