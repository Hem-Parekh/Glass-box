"""Database tables. PostgreSQL in production; SQLite works for quick local trials and tests.

Business data keeps one table per collection (companies, offers, holdings, loans, invoices ...). Each row has the record's
id, the company it belongs to (indexed, so every query and future row-level security policy can filter on it) and the
record itself as JSON (JSONB on PostgreSQL). The rules in server/actions.py work on these records unchanged.
"""
import json

from sqlalchemy import (JSON, BigInteger, Boolean, Column, DateTime, Index, Integer, MetaData, String, Table, Text, create_engine, event,
                        text)
from sqlalchemy.dialects.postgresql import JSONB

from backend.config import settings
from server.actions import COLLECTIONS

JSONT = JSON().with_variant(JSONB(), "postgresql")
metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", String(40), primary_key=True),
    Column("email", String(254), nullable=False, unique=True),
    Column("name", String(120), nullable=False),
    Column("role", String(20), nullable=False),
    Column("company_id", String(40), index=True),
    Column("firm", String(160)), Column("title", String(120)),
    Column("mandate", JSONT), Column("profile", JSONT),
    Column("pw_hash", Text, nullable=False),
    Column("totp_secret", String(64)),                 # set once two-step sign-in is switched on
    Column("totp_enabled", Boolean, nullable=False, default=False),
    Column("totp_last_step", BigInteger),              # stops the same code being used twice
    Column("disabled", Boolean, nullable=False, default=False),
    Column("created_at", String(40), nullable=False),
)

records = {c: Table(
    c, metadata,
    Column("id", String(60), primary_key=True),
    Column("company_id", String(40), index=True),
    Column("seq", Integer, nullable=False),            # keeps the original order of records
    Column("data", JSONT, nullable=False),
) for c in COLLECTIONS}

audit = Table(
    "audit", metadata,
    Column("seq", Integer, primary_key=True, autoincrement=True),
    Column("id", String(40), nullable=False),
    Column("at", String(40), nullable=False),
    Column("user_id", String(40), index=True), Column("user_name", String(120)),
    Column("action", String(60), nullable=False),
    Column("detail", Text), Column("company_id", String(40), index=True),
    Column("changes", JSONT),
    Column("ip", String(64)),
)

sessions = Table(
    "sessions", metadata,
    Column("token_hash", String(64), primary_key=True),   # only a hash of the cookie is stored
    Column("user_id", String(40), nullable=False, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("last_seen", DateTime(timezone=True), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("mfa_pending", Boolean, nullable=False, default=False),  # password done, code still needed
    Column("ip", String(64)), Column("user_agent", String(300)),
)

login_attempts = Table(
    "login_attempts", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("key", String(320), nullable=False, index=True),
    Column("at", DateTime(timezone=True), nullable=False),
)

password_resets = Table(
    "password_resets", metadata,
    Column("token_hash", String(64), primary_key=True),
    Column("user_id", String(40), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("used_at", DateTime(timezone=True)),
)

outbox = Table(
    "outbox", metadata,   # every email, SMS and WhatsApp message, written here first and sent by a worker
    Column("id", String(40), primary_key=True),
    Column("channel", String(20), nullable=False),
    Column("to", String(254), nullable=False),
    Column("subject", String(300)), Column("body", Text, nullable=False),
    Column("status", String(20), nullable=False, default="queued"),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("sent_at", DateTime(timezone=True)),
    Column("error", Text),
)
Index("ix_outbox_status", outbox.c.status)

AUDIT_GUARD_PG = """
CREATE OR REPLACE FUNCTION audit_append_only() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit log is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_no_change ON audit;
CREATE TRIGGER audit_no_change BEFORE UPDATE OR DELETE ON audit FOR EACH ROW EXECUTE FUNCTION audit_append_only();
"""
AUDIT_GUARD_SQLITE = (
    "CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;",
    "CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;",
)

_engine = None


def engine():
    global _engine
    if _engine is None:
        url = settings.database_url
        kw = dict(pool_pre_ping=True, json_serializer=lambda o: json.dumps(o, separators=(",", ":")))
        if url.startswith("sqlite"):
            kw["connect_args"] = {"check_same_thread": False}
        _engine = create_engine(url, **kw)
        if url.startswith("sqlite"):
            @event.listens_for(_engine, "connect")
            def _fk(dbapi, _):
                dbapi.execute("PRAGMA foreign_keys=ON")
    return _engine


def reset_engine():
    """Forget the engine (tests switch databases)."""
    global _engine
    if _engine is not None:
        _engine.dispose()
    _engine = None


def create_schema():
    eng = engine()
    metadata.create_all(eng)
    with eng.begin() as conn:
        if eng.dialect.name == "postgresql":
            conn.exec_driver_sql(AUDIT_GUARD_PG)
        else:
            for s in AUDIT_GUARD_SQLITE:
                conn.exec_driver_sql(s)


def write_lock(conn):
    """One business action at a time: actions check limits (200 offers, 200 members, 20 investors) across many records,
    so two running together could each pass a check the pair breaks. Held until the transaction ends."""
    if conn.dialect.name == "postgresql":
        conn.execute(text("SELECT pg_advisory_xact_lock(724001)"))
