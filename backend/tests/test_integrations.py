"""KYC, e-signing and payments through the stand-in providers, plus the webhook's safety checks."""
import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend import app as B
from backend import db as T
from backend.config import settings
from backend.integrations.providers import sign
from backend.tests import shim

H = {"X-Requested-With": "glassbox"}


@pytest.fixture()
def fresh(tmp_path):
    shim.fresh(tmp_path, "2026-10-19")
    yield tmp_path
    settings.require_esign = False
    settings.env = "development"


def client(email):
    c = TestClient(B.app, base_url="http://127.0.0.1")
    assert c.post("/api/login", json={"email": email, "password": "demo1234"}, headers=H).status_code == 200
    return c


def user(email):
    return next(u for u in shim.store().users if u["email"] == email)


def standin(c, url, outcome):
    """Open the stand-in provider page, then press one of its buttons."""
    page = c.get(url)
    assert page.status_code == 200 and "Stand-in provider" in page.text
    r = c.post(url, data={"outcome": outcome}, follow_redirects=False)
    assert r.status_code == 303
    return r.headers["location"]


def unverified_investor():
    return next(u for u in shim.store().users if u["role"] == "investor" and (u.get("profile") or {}).get("kyc") != "verified")


# ---------- KYC ----------
def test_kyc_verifies_an_investor(fresh):
    inv = unverified_investor()
    c = client(inv["email"])
    assert c.post("/api/kyc/start", json={"pan": "ABC123", "name": "X"}, headers=H).status_code == 403
    r = c.post("/api/kyc/start", json={"pan": "abcpe1234f", "name": inv["name"]}, headers=H)
    assert r.status_code == 200
    assert user(inv["email"])["profile"]["kyc"] == "pending"
    assert standin(c, r.json()["redirect_url"], "verified") == "/#app-kyc"
    prof = user(inv["email"])["profile"]
    assert prof["kyc"] == "verified" and prof["pan_last4"] == "234F"
    st = c.get("/api/kyc").json()
    assert st["kyc"] == "verified" and st["checks"][0]["status"] == "verified"
    with T.engine().connect() as conn:   # the PAN itself is never stored
        row = conn.execute(select(T.kyc_checks)).first()
        assert "ABCPE1234F" not in json.dumps({k: str(v) for k, v in row._mapping.items()})
    audit = [a["action"] for a in client("advisor@demo.in").get("/api/state").json()["audit"]]
    assert "kyc_verified" in audit and "kyc_started" in audit


def test_kyc_rejection_and_pan_reuse(fresh):
    a, b = [u for u in shim.store().users if u["role"] == "investor" and (u.get("profile") or {}).get("kyc") != "verified"][:2]
    ca = client(a["email"])
    url = ca.post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": a["name"]}, headers=H).json()["redirect_url"]
    standin(ca, url, "rejected")
    prof = user(a["email"])["profile"]
    assert prof["kyc"] == "not_started" and "does not match" in prof["kyc_note"]
    url = ca.post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": a["name"]}, headers=H).json()["redirect_url"]
    standin(ca, url, "verified")
    cb = client(b["email"])
    r = cb.post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": b["name"]}, headers=H)
    assert r.status_code == 403 and "another account" in r.json()["error"]


def test_standin_page_only_opens_for_its_owner(fresh):
    inv = unverified_investor()
    url = client(inv["email"]).post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": inv["name"]}, headers=H).json()["redirect_url"]
    other = client("advisor@demo.in")
    assert "Not found" in other.get(url).text
    other.post(url, data={"outcome": "verified"}, follow_redirects=False)
    assert user(inv["email"])["profile"]["kyc"] == "pending"


# ---------- webhook safety ----------
def _event(ref, kind="kyc", outcome="verified", data=None, eid=None):
    return json.dumps(dict(id=eid or "evt_" + uuid.uuid4().hex, kind=kind, ref=ref, outcome=outcome, data=data or {})).encode()


def test_webhook_rejects_bad_signatures_and_ignores_repeats(fresh):
    inv = unverified_investor()
    c = client(inv["email"])
    ref = c.post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": inv["name"]}, headers=H).json()["redirect_url"].rsplit("/", 1)[1]
    hook = TestClient(B.app)
    raw = _event(ref, eid="evt_same")
    assert hook.post("/api/webhooks/standin", content=raw, headers={"X-Aegis-Signature": "forged"}).status_code == 401
    assert user(inv["email"])["profile"]["kyc"] == "pending"
    good = {"X-Aegis-Signature": sign(raw, settings.webhook_secret), "Content-Type": "application/json"}
    assert hook.post("/api/webhooks/standin", content=raw, headers=good).json() == {"result": "applied"}
    assert hook.post("/api/webhooks/standin", content=raw, headers=good).json() == {"result": "duplicate"}
    assert user(inv["email"])["profile"]["kyc"] == "verified"
    assert hook.post("/api/webhooks/nobody", content=raw, headers=good).status_code == 404


# ---------- e-signing ----------
def _granted_intro():
    founder = client("founder@demo.in")
    assert founder.post("/api/act/decide_intro", json={"intro_id": "i_1", "decision": "grant"}, headers=H).status_code == 200
    intro = next(i for i in shim.store().intros if i["id"] == "i_1")
    inv = next(u for u in shim.store().users if u["id"] == intro["investor_id"])
    return client(inv["email"]), inv


def test_nda_by_esign_opens_the_deal_room(fresh):
    c, inv = _granted_intro()
    settings.require_esign = True
    assert c.post("/api/act/sign_nda", json={"intro_id": "i_1"}, headers=H).status_code == 403   # no tick-box NDA
    r = c.post("/api/esign/nda", json={"intro_id": "i_1"}, headers=H)
    assert r.status_code == 200
    page = c.get(r.json()["redirect_url"]).text
    assert "Non-disclosure agreement" in page and "Kalyan Polymers" in page
    assert standin(c, r.json()["redirect_url"], "signed") == "/#app-rooms"
    intro = next(i for i in shim.store().intros if i["id"] == "i_1")
    assert intro["nda_signed_at"] and intro["nda_esign_id"]
    pdf = c.get("/api/esign/%s/document" % intro["nda_esign_id"])
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF") and b"attachment" in pdf.headers["content-disposition"].encode()
    assert client("advisor@demo.in").get("/api/esign/%s/document" % intro["nda_esign_id"]).status_code == 200
    assert client("lender@demo.in").get("/api/esign/%s/document" % intro["nda_esign_id"]).status_code == 403
    assert c.post("/api/esign/nda", json={"intro_id": "i_1"}, headers=H).status_code == 403   # already signed


def test_engagement_letter(fresh):
    adv = client("advisor@demo.in")
    assert adv.post("/api/esign/engagement", json={"company_id": "c_kalyan", "advisory_fee_lakh": 0.5}, headers=H).status_code == 403
    r = adv.post("/api/esign/engagement", json={"company_id": "c_kalyan", "advisory_fee_lakh": 1.5}, headers=H)
    assert r.status_code == 200
    sid = r.json()["esign_id"]
    founder = client("founder@demo.in")
    c = next(x for x in founder.get("/api/state").json()["companies"] if x["id"] == "c_kalyan")
    assert c["engagement"]["status"] == "sent" and c["engagement"]["fee_paise"] == 150_000 * 100
    assert adv.post("/api/esign/%s/start" % sid, headers=H).status_code == 403          # only the founder signs
    url = founder.post("/api/esign/%s/start" % sid, headers=H).json()["redirect_url"]
    assert "Rs 150,000 plus GST" in founder.get(url).text
    standin(founder, url, "signed")
    c = next(x for x in shim.store().companies if x["id"] == "c_kalyan")
    assert c["engagement"]["status"] == "signed"
    assert any(n["text"] == "Kalyan Polymers Pvt Ltd signed the engagement letter" for n in shim.store().notifications)
    assert founder.get("/api/esign/%s/document" % sid).content.startswith(b"%PDF")


# ---------- payments ----------
def _new_invoice(amount_paise=1_000_000):
    adv = client("advisor@demo.in")
    assert adv.post("/api/act/save_invoice", json={"company_id": "c_kalyan", "kind": "advisory", "amount_paise": amount_paise, "period": "Test"}, headers=H).status_code == 200
    return next(f for f in reversed(shim.store().invoices) if f["period"] == "Test")


def test_founder_pays_an_invoice_online(fresh):
    f = _new_invoice()
    assert client("lender@demo.in").post("/api/pay/" + f["id"], headers=H).status_code == 403   # not the payer
    founder = client("founder@demo.in")
    url = founder.post("/api/pay/" + f["id"], headers=H).json()["redirect_url"]
    assert "11,800.00" in founder.get(url).text            # Rs 10,000 + 18% GST
    standin(founder, url, "failed")
    assert not next(x for x in shim.store().invoices if x["id"] == f["id"])["paid_on"]
    url = founder.post("/api/pay/" + f["id"], headers=H).json()["redirect_url"]
    assert standin(founder, url, "paid") == "/#app-fees"
    paid = next(x for x in shim.store().invoices if x["id"] == f["id"])
    assert paid["paid_on"] == "2026-10-19" and paid["paid_via"] == "standin" and paid["payment_ref"].startswith("standin_payment_")
    assert founder.post("/api/pay/" + f["id"], headers=H).status_code == 403   # already paid


def test_payment_with_the_wrong_amount_is_not_accepted(fresh):
    f = _new_invoice()
    founder = client("founder@demo.in")
    ref = founder.post("/api/pay/" + f["id"], headers=H).json()["redirect_url"].rsplit("/", 1)[1]
    raw = _event(ref, kind="payment", outcome="paid", data={"amount_paise": 100})
    r = TestClient(B.app).post("/api/webhooks/standin", content=raw, headers={"X-Aegis-Signature": sign(raw, settings.webhook_secret)})
    assert r.json() == {"result": "mismatch"}
    assert not next(x for x in shim.store().invoices if x["id"] == f["id"])["paid_on"]


def test_standins_are_off_in_production(fresh):
    inv = unverified_investor()
    c = client(inv["email"])
    settings.env = "production"
    with pytest.raises(RuntimeError):
        c.post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": inv["name"]}, headers=H)
