"""Outgoing email, SMS and WhatsApp.

Messages are written to the outbox table inside the same transaction as the change that caused them, so a message is
never sent for a change that was rolled back, and never lost for one that was saved. A worker
(python -m backend.cli send-outbox) hands queued messages to a sender.

Senders are stand-ins until provider accounts exist: ConsoleSender prints the message. To go live, add a class with the
same send(channel, to, subject, body) method for the chosen provider (for example SES or SendGrid for email, MSG91 or
Gupshup for SMS and WhatsApp) and select it with GB_SENDER.
"""
import os

from sqlalchemy import insert, select, update

from backend import db as T
from backend.auth import utcnow
from backend.store import uid


def queue(conn, channel, to, subject, body):
    assert channel in ("email", "sms", "whatsapp")
    conn.execute(insert(T.outbox).values(id=uid("msg"), channel=channel, to=to, subject=subject, body=body, status="queued", created_at=utcnow()))


class ConsoleSender:
    """Stand-in: prints instead of sending."""
    def send(self, channel, to, subject, body):
        print("[%s to %s] %s\n%s\n" % (channel, to, subject or "", body))


SENDERS = {"console": ConsoleSender}


def sender():
    return SENDERS[os.environ.get("GB_SENDER", "console")]()


def send_queued(conn, limit=100):
    s, sent = sender(), 0
    for m in conn.execute(select(T.outbox).where(T.outbox.c.status == "queued").order_by(T.outbox.c.created_at).limit(limit)).all():
        try:
            s.send(m.channel, m.to, m.subject, m.body)
            conn.execute(update(T.outbox).where(T.outbox.c.id == m.id).values(status="sent", sent_at=utcnow(), error=None))
            sent += 1
        except Exception as e:  # keep going; the failed message stays visible with its error
            conn.execute(update(T.outbox).where(T.outbox.c.id == m.id).values(status="failed", error=str(e)[:500]))
    return sent
