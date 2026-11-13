"""Lets the Flask prototype's test suite (server/tests/test_server.py) run unchanged against the FastAPI backend:
a Flask-style test client over FastAPI's TestClient, plus the few internals the suite reaches for."""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from backend import app as B
from backend import db as T
from backend.config import settings
from backend.store import Store as _Store

SCRIPTS = B.SCRIPTS
_CHATS = B._CHATS


class _Fails(dict):
    """The Flask app kept wrong-password counts in memory; here they live in the database and are reset per test."""
    def clear(self):
        with T.engine().begin() as conn:
            conn.execute(T.login_attempts.delete())


_FAILS = _Fails()


class Resp:
    def __init__(self, r):
        self._r, self.status_code, self.headers, self.data = r, r.status_code, r.headers, r.content

    def get_json(self):
        try:
            return self._r.json()
        except ValueError:
            return None


class Client:
    def __init__(self):
        self.c = TestClient(B.app, base_url="http://127.0.0.1")

    def get(self, url, headers=None):
        return Resp(self.c.get(url, headers=headers))

    def post(self, url, json=None, headers=None, data=None, content_type=None):
        if data is not None:
            files = {k: (v[1], v[0].read()) for k, v in data.items() if isinstance(v, tuple)}
            form = {k: v for k, v in data.items() if not isinstance(v, tuple)}
            return Resp(self.c.post(url, data=form, files=files, headers=headers))
        return Resp(self.c.post(url, json=json, headers=headers))


class _App:
    config = {}

    def test_client(self):
        return Client()


app = _App()


def test_database_url(tmp_path):
    return os.environ.get("GB_TEST_DATABASE_URL") or "sqlite:///" + str(tmp_path / "t.db")


def fresh(tmp_path, today):
    settings.database_url = test_database_url(tmp_path)
    settings.uploads = str(tmp_path / "up")
    settings.today = today
    T.reset_engine()
    eng = T.engine()
    with eng.begin() as conn:
        if eng.dialect.name == "postgresql":
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    if eng.dialect.name != "postgresql":
        T.metadata.drop_all(eng)
    B.init_db(seed_demo=True)
    _CHATS.clear()


def init_db(seed_demo=False):
    B.init_db(seed_demo=seed_demo)


def store():
    with T.engine().connect() as conn:
        return _Store(conn)


def pw_hash(email):
    with T.engine().connect() as conn:
        return conn.execute(select(T.users.c.pw_hash).where(T.users.c.email == email)).scalar()


def assert_audit_append_only():
    for sql in ("UPDATE audit SET detail='x'", "DELETE FROM audit"):
        with pytest.raises(Exception):
            with T.engine().begin() as conn:
                conn.execute(text(sql))
