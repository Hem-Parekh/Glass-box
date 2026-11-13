"""Sign-in: password hashing, server-side sessions, throttling, two-step codes (authenticator apps) and password resets.

Sessions: the browser holds a random token in an HttpOnly cookie; the database holds only its SHA-256 hash, the user, and
when it expires. Signing out, resetting a password or switching off an account removes the rows, so access ends at once.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import delete, func, insert, select, update

from backend import db as T
from backend.config import settings

COOKIE = "aa_session"
_ph = PasswordHasher()                                             # Argon2id, library defaults (64 MiB, 3 passes)
_ph_demo = PasswordHasher(time_cost=1, memory_cost=8192, parallelism=1)  # published demo password only


def utcnow():
    return datetime.now(timezone.utc)


def aware(dt):
    """SQLite hands back naive datetimes; treat them as UTC."""
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


# ---------- passwords ----------
def hash_password(pw, demo=False):
    return (_ph_demo if demo else _ph).hash(pw)


def check_password(hash_, pw):
    if not hash_:
        return False
    if hash_.startswith(("scrypt:", "pbkdf2:")):   # accounts imported from the Flask server
        from werkzeug.security import check_password_hash
        return check_password_hash(hash_, pw)
    try:
        return _ph.verify(hash_, pw)
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(hash_):
    return hash_.startswith(("scrypt:", "pbkdf2:"))


def password_problem(pw):
    if len(pw) < 8:
        return "Use a password of at least 8 characters."
    if len(pw) > 200:
        return "Use a password of at most 200 characters."
    return None


# ---------- throttling ----------
def too_many_attempts(conn, key):
    since = utcnow() - timedelta(minutes=15)
    n = conn.execute(select(func.count()).select_from(T.login_attempts).where(T.login_attempts.c.key == key, T.login_attempts.c.at > since)).scalar()
    return n >= settings.login_limit


def record_failure(conn, key):
    conn.execute(insert(T.login_attempts).values(key=key, at=utcnow()))
    conn.execute(delete(T.login_attempts).where(T.login_attempts.c.at < utcnow() - timedelta(days=1)))


def clear_failures(conn, key):
    conn.execute(delete(T.login_attempts).where(T.login_attempts.c.key == key))


# ---------- sessions ----------
def new_session(conn, user_id, ip=None, agent=None, mfa_pending=False):
    token, t = secrets.token_urlsafe(32), utcnow()
    life = timedelta(minutes=settings.mfa_window_minutes) if mfa_pending else timedelta(hours=settings.session_idle_hours)
    conn.execute(insert(T.sessions).values(token_hash=sha(token), user_id=user_id, created_at=t, last_seen=t, expires_at=t + life,
                                           mfa_pending=mfa_pending, ip=ip, user_agent=(agent or "")[:300]))
    return token


def session_row(conn, token):
    if not token:
        return None
    r = conn.execute(select(T.sessions).where(T.sessions.c.token_hash == sha(token))).first()
    if not r:
        return None
    t = utcnow()
    if aware(r.expires_at) < t or aware(r.created_at) + timedelta(hours=settings.session_max_hours) < t:
        conn.execute(delete(T.sessions).where(T.sessions.c.token_hash == r.token_hash))
        return None
    return r


def touch(conn, row):
    """Slide the idle expiry forward, at most once a minute."""
    t = utcnow()
    if not row.mfa_pending and t - aware(row.last_seen) > timedelta(minutes=1):
        conn.execute(update(T.sessions).where(T.sessions.c.token_hash == row.token_hash)
                     .values(last_seen=t, expires_at=t + timedelta(hours=settings.session_idle_hours)))


def end_session(conn, token):
    if token:
        conn.execute(delete(T.sessions).where(T.sessions.c.token_hash == sha(token)))


def end_all_sessions(conn, user_id, keep=None):
    q = delete(T.sessions).where(T.sessions.c.user_id == user_id)
    if keep:
        q = q.where(T.sessions.c.token_hash != sha(keep))
    conn.execute(q)


# ---------- two-step sign-in (TOTP, any authenticator app) ----------
def new_totp_secret():
    return pyotp.random_base32()


def totp_uri(secret, email):
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Aegis Ascend")


def check_totp(secret, code, last_step=None):
    """Returns the time step the code matched (to block reuse), or None."""
    code = "".join(ch for ch in str(code or "") if ch.isdigit())
    if not secret or len(code) != 6:
        return None
    totp = pyotp.TOTP(secret)
    step = int(utcnow().timestamp()) // 30
    for s in (step - 1, step, step + 1):   # allow 30 seconds of clock drift either way
        if secrets.compare_digest(totp.at(s * 30), code) and (last_step is None or s > last_step):
            return s
    return None


# ---------- password reset ----------
def new_reset_token(conn, user_id):
    token = secrets.token_urlsafe(32)
    conn.execute(delete(T.password_resets).where(T.password_resets.c.user_id == user_id))
    conn.execute(insert(T.password_resets).values(token_hash=sha(token), user_id=user_id, expires_at=utcnow() + timedelta(hours=1)))
    return token


def use_reset_token(conn, token):
    """Returns the user id once, if the token is valid and unused."""
    r = conn.execute(select(T.password_resets).where(T.password_resets.c.token_hash == sha(str(token or "")))).first()
    if not r or r.used_at or aware(r.expires_at) < utcnow():
        return None
    conn.execute(update(T.password_resets).where(T.password_resets.c.token_hash == r.token_hash).values(used_at=utcnow()))
    return r.user_id
