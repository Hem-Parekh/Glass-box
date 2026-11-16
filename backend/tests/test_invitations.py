"""Investors join only by invitation: a founder suggests them, an advisor confirms, the server emails a private link,
and the offer goes out once the new investor's KYC is verified."""
import re
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from backend import app as B
from backend import auth as A
from backend import db as T
from backend.config import settings
from backend.tests import shim

H = {"X-Requested-With": "glassbox"}


@pytest.fixture()
def fresh(tmp_path):
    shim.fresh(tmp_path, "2026-10-19")
    settings.investor_signup = "invite"
    yield tmp_path
    settings.investor_signup = "open"


def client(email=None):
    c = TestClient(B.app, base_url="http://127.0.0.1")
    if email:
        assert c.post("/api/login", json={"email": email, "password": "demo1234"}, headers=H).status_code == 200
    return c


def invite_link():
    with T.engine().connect() as conn:
        body = conn.execute(select(T.outbox.c.body).where(T.outbox.c.subject == "A private invitation from Aegis Ascend")).scalar()
    return re.search(r"#signup/invite/([\w-]+)", body).group(1)


def confirm_new_investor(email="nina@fund.in", name="Nina Shah"):
    f = client("founder@demo.in")
    assert f.post("/api/act/suggest_investor", json={"name": name, "email": email, "firm": "Shah Capital"}, headers=H).status_code == 200
    sid = shim.store().suggestions[0]["id"]
    a = client("advisor@demo.in")
    assert a.post("/api/act/decide_suggestion", json={"suggestion_id": sid, "decision": "approve"}, headers=H).status_code == 200
    return invite_link()


def signup(token, email="nina@fund.in", name="Nina Shah"):
    c = client()
    return c, c.post("/api/signup", json={"name": name, "email": email, "password": "secret123", "role": "investor", "invite": token}, headers=H)


def test_open_investor_signup_is_refused(fresh):
    r = client().post("/api/signup", json={"name": "Walk In", "email": "walkin@x.in", "password": "secret123", "role": "investor"}, headers=H)
    assert r.status_code == 403 and "invitation" in r.json()["error"]
    r = client().post("/api/signup", json={"name": "New Founder", "email": "nf@x.in", "password": "secret123", "role": "founder"}, headers=H)
    assert r.status_code == 200   # founders and lenders still sign up openly


def test_full_invitation_journey(fresh):
    token = confirm_new_investor()
    with T.engine().connect() as conn:
        stored = [r.token_hash for r in conn.execute(select(T.invite_tokens))]
        msg = conn.execute(select(T.outbox).where(T.outbox.c.to == "nina@fund.in")).first()
    assert token not in stored and A.sha(token) in stored            # only the hash is kept
    assert "Kalyan Polymers" in msg.body and msg.status == "queued"
    assert shim.store().invites[0]["sent_at"]
    info = client().get("/api/invite/" + token).json()
    assert info == {"name": "Nina Shah", "email": "nina@fund.in", "firm": "Shah Capital", "company": "Kalyan Polymers Pvt Ltd"}

    _, r = signup(token, email="someone@else.in")
    assert r.status_code == 400 and "nina@fund.in" in r.json()["error"]
    c, r = signup(token)
    assert r.status_code == 200 and r.json()["user"]["firm"] == "Shah Capital"
    nina = r.json()["user"]["id"]
    sg = shim.store().suggestions[0]
    assert sg["investor_id"] == nina and sg["status"] == "waiting_kyc"
    assert shim.store().invites[0]["status"] == "accepted"
    _, again = signup(token, email="nina2@fund.in")
    assert again.status_code == 403                                   # single use
    assert client().get("/api/invite/" + token).status_code == 404

    # KYC through the provider: the confirmed offer goes out on its own
    url = c.post("/api/kyc/start", json={"pan": "ABCPE1234F", "name": "Nina Shah"}, headers=H).json()["redirect_url"]
    c.get(url)
    c.post(url, data={"outcome": "verified"}, follow_redirects=False)
    sg = shim.store().suggestions[0]
    assert sg["status"] == "offered"
    assert any(o["id"] == sg["offer_id"] and o["investor_id"] == nina and o["company_id"] == "c_kalyan" for o in shim.store().offers)
    assert any(o["company_id"] == "c_kalyan" for o in c.get("/api/state").json()["offers"])


def test_expired_invitation_is_refused(fresh):
    token = confirm_new_investor()
    with T.engine().begin() as conn:
        conn.execute(update(T.invite_tokens).values(expires_at=A.utcnow() - timedelta(minutes=1)))
    _, r = signup(token)
    assert r.status_code == 403
