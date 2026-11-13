"""The backend's own features: sessions, two-step sign-in, password change and reset, the outbox, importing the prototype."""
import os
import re
import sys
from datetime import timedelta

import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from backend import app as B
from backend import auth as A
from backend import db as T
from backend.tests import shim

H = {"X-Requested-With": "glassbox"}


@pytest.fixture()
def fresh(tmp_path):
    shim.fresh(tmp_path, "2026-10-19")
    return tmp_path


def client():
    return TestClient(B.app, base_url="http://127.0.0.1")


def login(c, email="founder@demo.in", pw="demo1234"):
    return c.post("/api/login", json={"email": email, "password": pw}, headers=H)


def outbox():
    with T.engine().connect() as conn:
        return [dict(r._mapping) for r in conn.execute(select(T.outbox).order_by(T.outbox.c.created_at))]


def test_session_cookie_is_httponly_and_only_hashed_in_db(fresh):
    c = client()
    r = login(c)
    assert r.status_code == 200
    cookie = r.headers["set-cookie"]
    assert "HttpOnly" in cookie and "samesite=lax" in cookie.lower()
    token = c.cookies.get(A.COOKIE)
    with T.engine().connect() as conn:
        stored = [x.token_hash for x in conn.execute(select(T.sessions))]
    assert token not in stored and A.sha(token) in stored


def test_logout_revokes_the_session_server_side(fresh):
    c = client()
    login(c)
    token = c.cookies.get(A.COOKIE)
    c.post("/api/logout", headers=H)
    thief = client()
    thief.cookies.set(A.COOKIE, token)
    assert thief.get("/api/state").status_code == 401


def test_expired_session_is_rejected(fresh):
    c = client()
    login(c)
    with T.engine().begin() as conn:
        conn.execute(update(T.sessions).values(expires_at=A.utcnow() - timedelta(minutes=1)))
    assert c.get("/api/state").status_code == 401


def test_two_step_sign_in(fresh):
    c = client()
    login(c)
    setup = c.post("/api/account/two-step/setup", headers=H).json()
    assert setup["otpauth_uri"].startswith("otpauth://totp/Aegis%20Ascend:founder%40demo.in")
    totp = pyotp.TOTP(setup["secret"])
    assert c.post("/api/account/two-step/enable", json={"code": "000000"}, headers=H).status_code == 400
    assert c.post("/api/account/two-step/enable", json={"code": totp.now()}, headers=H).json() == {"two_step": True}

    c2 = client()
    r = login(c2)
    assert r.json() == {"mfa_required": True}
    assert c2.get("/api/state").status_code == 401            # password alone is not enough
    assert c2.post("/api/login/mfa", json={"code": "123456"}, headers=H).status_code == 401
    # the code already used to switch it on cannot be replayed
    assert c2.post("/api/login/mfa", json={"code": totp.now()}, headers=H).status_code == 401
    with T.engine().begin() as conn:                          # next 30-second window
        conn.execute(update(T.users).where(T.users.c.email == "founder@demo.in").values(totp_last_step=T.users.c.totp_last_step - 1))
    r = c2.post("/api/login/mfa", json={"code": totp.now()}, headers=H)
    assert r.status_code == 200 and r.json()["user"]["email"] == "founder@demo.in"
    assert c2.get("/api/state").status_code == 200
    assert c2.get("/api/account/security").json()["two_step"] is True


def test_two_step_code_attempts_are_limited(fresh):
    c = client()
    login(c)
    secret = c.post("/api/account/two-step/setup", headers=H).json()["secret"]
    c.post("/api/account/two-step/enable", json={"code": pyotp.TOTP(secret).now()}, headers=H)
    c2 = client()
    login(c2)
    codes = [c2.post("/api/login/mfa", json={"code": "000000"}, headers=H).status_code for _ in range(6)]
    assert codes[:5] == [401] * 5 and codes[5] == 429


def test_change_password_signs_out_other_devices(fresh):
    a, b = client(), client()
    login(a)
    login(b)
    assert a.post("/api/account/password", json={"password": "wrong", "new_password": "new-secret-1"}, headers=H).status_code == 400
    assert a.post("/api/account/password", json={"password": "demo1234", "new_password": "short"}, headers=H).status_code == 400
    assert a.post("/api/account/password", json={"password": "demo1234", "new_password": "new-secret-1"}, headers=H).status_code == 200
    assert a.get("/api/state").status_code == 200 and b.get("/api/state").status_code == 401
    assert login(client()).status_code == 401
    assert login(client(), pw="new-secret-1").status_code == 200


def test_password_reset_by_email(fresh):
    c = client()
    r = c.post("/api/password/forgot", json={"email": "nobody@nowhere.in"}, headers=H)
    same = c.post("/api/password/forgot", json={"email": "investor@demo.in"}, headers=H)
    assert r.json() == same.json()                            # no hint about which emails have accounts
    msgs = outbox()
    assert len(msgs) == 1 and msgs[0]["to"] == "investor@demo.in" and msgs[0]["status"] == "queued"
    token = re.search(r"#reset/([\w-]+)", msgs[0]["body"]).group(1)
    signed_in = client()
    login(signed_in, "investor@demo.in")
    assert c.post("/api/password/reset", json={"token": token, "password": "brand-new-pw"}, headers=H).status_code == 200
    assert c.post("/api/password/reset", json={"token": token, "password": "another-pw-1"}, headers=H).status_code == 400  # single use
    assert signed_in.get("/api/state").status_code == 401     # every device signed out
    assert login(client(), "investor@demo.in", "brand-new-pw").status_code == 200


def test_outbox_worker_sends_queued_messages(fresh, capsys):
    client().post("/api/password/forgot", json={"email": "lender@demo.in"}, headers=H)
    from backend import notify
    with T.engine().begin() as conn:
        assert notify.send_queued(conn) == 1
    assert outbox()[0]["status"] == "sent"
    assert "Reset your Aegis Ascend password" in capsys.readouterr().out


def test_sign_out_other_devices(fresh):
    a, b = client(), client()
    login(a)
    login(b)
    assert len(a.get("/api/account/security").json()["sessions"]) == 2
    a.post("/api/account/sign-out-others", headers=H)
    assert a.get("/api/state").status_code == 200 and b.get("/api/state").status_code == 401


def test_import_from_flask_prototype(tmp_path):
    """Accounts, records and the audit log move across; old scrypt passwords still work and are upgraded to Argon2."""
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from server import app as srv
    old = str(tmp_path / "old.db")
    srv.app.config.update(DATABASE=old, TODAY="2026-10-19")
    srv.init_db(seed_demo=True)
    with srv.app.app_context():
        conn = srv.sqlite3.connect(old)
        srv.add_user(conn, "real@client.in", "Real Client", "investor", "a-real-password")
        conn.commit()
    shim.settings.database_url = shim.test_database_url(tmp_path / "new")
    os.makedirs(tmp_path / "new", exist_ok=True)
    T.reset_engine()
    eng = T.engine()
    if eng.dialect.name == "postgresql":
        with eng.begin() as conn:
            conn.exec_driver_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
    from backend.cli import import_sqlite
    import_sqlite(old)
    c = client()
    assert login(c, "real@client.in", "a-real-password").status_code == 200
    assert shim.pw_hash("real@client.in").startswith("$argon2id$")
    with T.engine().connect() as conn:
        assert conn.execute(select(T.records["companies"].c.id)).all()
        assert conn.execute(select(T.audit.c.id)).first() is not None
    assert login(client(), "advisor@demo.in").status_code == 200


def test_actions_run_one_at_a_time_on_postgres(fresh):
    """Limit checks (200 offers, 200 members, 20 investors) read many records; the write lock stops two actions racing."""
    import threading
    import time
    eng = T.engine()
    if eng.dialect.name != "postgresql":
        pytest.skip("the lock is a PostgreSQL advisory lock")
    order = []
    with eng.begin() as first:
        T.write_lock(first)

        def second():
            with eng.begin() as conn:
                T.write_lock(conn)
                order.append("second")
        t = threading.Thread(target=second)
        t.start()
        time.sleep(0.5)
        order.append("first done")
    t.join(5)
    assert order == ["first done", "second"]
