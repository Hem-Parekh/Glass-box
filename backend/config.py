"""Settings, all read from environment variables so the same code runs locally, in Docker and on any host.

  GB_DATABASE_URL   postgresql+psycopg://user:pass@host:5432/aegis   (default: a local SQLite file, for quick trials only)
  GB_SECRET_KEY     long random string; signs password-reset links. Required in production.
  GB_ENV            "production" turns on secure cookies and refuses to start without GB_SECRET_KEY
  GB_UPLOADS        folder for uploaded files when GB_STORAGE=local (default backend/uploads)
  GB_STORAGE        "local" (default) or "s3" (any S3-compatible store; see backend/storage.py)
  GB_PUBLIC_URL     the site's own address, used in emailed links (default http://127.0.0.1:8000)
  GB_SEED_DEMO      "1" loads the fictional demo accounts into an empty database
  GB_TODAY          fixes "today" (tests only)
"""
import os
import secrets
from dataclasses import dataclass, field

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@dataclass
class Settings:
    database_url: str = field(default_factory=lambda: os.environ.get("GB_DATABASE_URL") or "sqlite:///" + os.path.join(ROOT, "backend", "aegis.db"))
    env: str = field(default_factory=lambda: os.environ.get("GB_ENV", "development"))
    secret_key: str = field(default_factory=lambda: os.environ.get("GB_SECRET_KEY", ""))
    uploads: str = field(default_factory=lambda: os.environ.get("GB_UPLOADS") or os.path.join(ROOT, "backend", "uploads"))
    storage: str = field(default_factory=lambda: os.environ.get("GB_STORAGE", "local"))
    public_url: str = field(default_factory=lambda: os.environ.get("GB_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/"))
    seed_demo: bool = field(default_factory=lambda: os.environ.get("GB_SEED_DEMO", "0") == "1")
    today: str = field(default_factory=lambda: os.environ.get("GB_TODAY", ""))
    session_idle_hours: float = 8          # signed out after 8 hours without activity
    session_max_hours: float = 24          # and always after 24 hours
    mfa_window_minutes: int = 5            # time allowed between the password step and the code step
    login_limit: int = 5                   # wrong passwords per 15 minutes before the account pauses
    max_upload_bytes: int = 8_000_000

    def __post_init__(self):
        if self.env == "production" and len(self.secret_key) < 32:
            raise SystemExit("GB_SECRET_KEY must be set to a random string of 32+ characters in production.")
        if not self.secret_key:
            self.secret_key = secrets.token_hex(32)

    @property
    def secure_cookies(self):
        return self.env == "production"

    @property
    def is_postgres(self):
        return self.database_url.startswith("postgresql")


settings = Settings()
