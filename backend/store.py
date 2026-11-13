"""Loads the business records for one request, lets the rules (server/actions.py) work on plain dicts, then writes back
only what changed and reports every change for the audit log. Same contract as the Flask store, on any database."""
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update

from backend import db as T
from server.actions import COLLECTIONS

USER_FIELDS = ("id", "email", "name", "role", "company_id", "firm", "title", "mandate", "profile", "pw_hash", "created_at")


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix):
    return prefix + "_" + uuid.uuid4().hex[:10]


def company_of(collection, d):
    return d["id"] if collection == "companies" else d.get("company_id")


def canon(d):
    return json.dumps(d, sort_keys=True, separators=(",", ":"))


def user_dict(row):
    m = row._mapping
    return {k: m[k] for k in USER_FIELDS}


class Store:
    def __init__(self, conn):
        self.conn = conn
        self.data = {}
        self._snap, self._seq = {}, {}
        for c in COLLECTIONS:
            rows = conn.execute(select(T.records[c].c.data, T.records[c].c.seq).order_by(T.records[c].c.seq)).all()
            self.data[c] = [r.data for r in rows]
            self._snap[c] = {d["id"]: canon(d) for d in self.data[c]}
            self._seq[c] = max([r.seq for r in rows], default=0)
        self.users = [user_dict(r) for r in conn.execute(select(T.users))]
        self._usnap = {u["id"]: canon(u.get("profile")) for u in self.users}

    def __getattr__(self, name):
        if name in COLLECTIONS:
            return self.data[name]
        raise AttributeError(name)

    def __getitem__(self, name):
        return self.data[name]

    def save(self):
        """Write changed records; return [(collection, id, before, after)]."""
        changes = []
        for c in COLLECTIONS:
            t, ids = T.records[c], set()
            for d in self.data[c]:
                ids.add(d["id"])
                s, old = canon(d), self._snap[c].get(d["id"])
                if old == s:
                    continue
                if old is None:
                    self._seq[c] += 1
                    self.conn.execute(insert(t).values(id=d["id"], company_id=company_of(c, d), seq=self._seq[c], data=d))
                else:
                    self.conn.execute(update(t).where(t.c.id == d["id"]).values(company_id=company_of(c, d), data=d))
                changes.append((c, d["id"], json.loads(old) if old else None, d))
            for gone in set(self._snap[c]) - ids:
                self.conn.execute(delete(t).where(t.c.id == gone))
                changes.append((c, gone, json.loads(self._snap[c][gone]), None))
        for u in self.users:
            s = canon(u.get("profile"))
            if self._usnap.get(u["id"]) != s:
                self.conn.execute(update(T.users).where(T.users.c.id == u["id"]).values(profile=u.get("profile")))
                changes.append(("users", u["id"], {"profile": json.loads(self._usnap[u["id"]])}, {"profile": u.get("profile")}))
        return changes


def add_record(conn, collection, d):
    t = T.records[collection]
    seq = (conn.execute(select(t.c.seq).order_by(t.c.seq.desc()).limit(1)).scalar() or 0) + 1
    conn.execute(insert(t).values(id=d["id"], company_id=company_of(collection, d), seq=seq, data=d))


def diff(before, after):
    """Only the fields that changed, as {field: [before, after]}."""
    if before is None or after is None:
        return {"created" if before is None else "deleted": True}
    keys = set(before) | set(after)
    return {k: [before.get(k), after.get(k)] for k in sorted(keys) if before.get(k) != after.get(k)}


def write_audit(conn, user, action, detail, company_id=None, changes=None, ip=None):
    conn.execute(insert(T.audit).values(id=uid("a"), at=now(), user_id=user["id"] if user else None,
                                        user_name=user["name"] if user else "Website visitor", action=action, detail=detail,
                                        company_id=company_id, changes=changes or None, ip=ip))


def audit_rows(conn, filt):
    q = select(T.audit.c.id, T.audit.c.at, T.audit.c.user_id, T.audit.c.user_name, T.audit.c.action, T.audit.c.detail,
               T.audit.c.company_id, T.audit.c.changes)
    if filt:
        q = q.where((T.audit.c.company_id if filt[0] == "company_id" else T.audit.c.user_id) == filt[1])
    return [dict(r._mapping) for r in conn.execute(q.order_by(T.audit.c.seq.desc()).limit(1000))]
