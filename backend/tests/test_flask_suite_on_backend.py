"""Runs every test of the Flask prototype's suite (server/tests/test_server.py) against the FastAPI backend.
The rules, numbers, permissions and API responses must match exactly; only storage details differ:
Argon2 instead of scrypt hashes, and PostgreSQL/SQLAlchemy instead of sqlite3 for the append-only audit check.

  GB_TEST_DATABASE_URL=postgresql+psycopg://user@host/aegis_test pytest backend/tests   (PostgreSQL; else SQLite)
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, "..", "..", "server", "tests", "test_server.py"), encoding="utf-8").read()

SWAPS = [
    ("from server import app as srv  # noqa: E402", "from backend.tests import shim as srv  # noqa: E402"),
    ('''    srv.app.config.update(DATABASE=str(tmp_path / "t.db"), UPLOADS=str(tmp_path / "up"), TESTING=True, TODAY=TODAY)
    srv._FAILS.clear()
    srv.init_db(seed_demo=True)
    return srv.app.test_client()''', '''    srv.fresh(tmp_path, TODAY)
    return srv.app.test_client()'''),
    ('''    conn = sqlite3.connect(srv.app.config["DATABASE"])
    conn.row_factory = sqlite3.Row
    return srv.Store(conn)''', '''    return srv.store()'''),
    ('''    conn = sqlite3.connect(srv.app.config["DATABASE"])
    h = conn.execute("SELECT pw_hash FROM users WHERE email='founder@demo.in'").fetchone()[0]
    assert "demo1234" not in h and h.startswith(("scrypt:", "pbkdf2:"))''', '''    h = srv.pw_hash("founder@demo.in")
    assert "demo1234" not in h and h.startswith("$argon2id$")'''),
    ('''    conn = sqlite3.connect(srv.app.config["DATABASE"])
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("UPDATE audit SET detail='x'")
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM audit")''', '''    srv.assert_audit_append_only()'''),
]
for old, new in SWAPS:
    assert SRC.count(old) == 1, "test_server.py changed; update the swap for: " + old[:60]
    SRC = SRC.replace(old, new)
assert "sqlite3.connect" not in SRC, "a test still opens SQLite directly"
exec(compile(SRC, "server/tests/test_server.py (on backend)", "exec"), globals())
