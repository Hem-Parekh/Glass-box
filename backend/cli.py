"""Admin commands.

  python -m backend.cli init-db           create the tables
  python -m backend.cli seed-demo         create the tables and load the fictional demo accounts (password demo1234)
  python -m backend.cli create-advisor    add an advisor account (advisors cannot sign themselves up)
  python -m backend.cli import-sqlite PATH  copy accounts, records and the audit log from the Flask prototype's database
  python -m backend.cli send-outbox       send queued emails/SMS/WhatsApp messages (run every minute from a scheduler)
"""
import getpass
import json
import sqlite3
import sys

from sqlalchemy import insert, select

from backend import db as T
from backend import notify
from backend.app import add_user, init_db
from server.actions import COLLECTIONS


def import_sqlite(path):
    init_db()
    src = sqlite3.connect(path)
    src.row_factory = sqlite3.Row
    with T.engine().begin() as conn:
        if conn.execute(select(T.users.c.id)).first():
            raise SystemExit("The target database already has accounts. Import into an empty database.")
        for r in src.execute("SELECT * FROM users"):
            d = dict(r)
            conn.execute(insert(T.users).values(
                id=d["id"], email=d["email"], name=d["name"], role=d["role"], company_id=d["company_id"], firm=d["firm"], title=d["title"],
                mandate=json.loads(d["mandate"]) if d.get("mandate") else None, profile=json.loads(d["profile"]) if d.get("profile") else None,
                pw_hash=d["pw_hash"], created_at=d["created_at"], totp_enabled=False, disabled=False))   # old hashes are upgraded at next sign-in
        conn.execute(T.records["settings"].delete())
        for c in COLLECTIONS:
            for i, r in enumerate(src.execute("SELECT data FROM docs WHERE collection=? ORDER BY rowid", (c,)), 1):
                d = json.loads(r[0])
                conn.execute(insert(T.records[c]).values(id=d["id"], company_id=d["id"] if c == "companies" else d.get("company_id"), seq=i, data=d))
        for r in src.execute("SELECT * FROM audit ORDER BY seq"):
            d = dict(r)
            conn.execute(insert(T.audit).values(id=d["id"], at=d["at"], user_id=d["user_id"], user_name=d["user_name"], action=d["action"],
                                                detail=d["detail"], company_id=d["company_id"], changes=json.loads(d["changes"]) if d.get("changes") else None))
    print("Imported", path)


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "init-db":
        init_db()
        print("Tables ready.")
    elif cmd == "seed-demo":
        init_db(seed_demo=True)
        print("Demo data loaded. Sign in as founder@demo.in, investor@demo.in, advisor@demo.in or lender@demo.in with password demo1234")
    elif cmd == "create-advisor":
        init_db()
        email, name = input("Advisor email: ").strip().lower(), input("Full name: ").strip()
        pw = getpass.getpass("Password (8+ characters): ")
        if len(pw) < 8:
            raise SystemExit("Password too short")
        with T.engine().begin() as conn:
            add_user(conn, email, name, "advisor", pw, firm="Aegis Ascend Financial Advisors", title="Advisor")
        print("Advisor created:", email, "- ask them to turn on two-step sign-in after their first sign-in.")
    elif cmd == "import-sqlite" and len(argv) > 2:
        import_sqlite(argv[2])
    elif cmd == "send-outbox":
        with T.engine().begin() as conn:
            print("Sent", notify.send_queued(conn), "messages")
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
