"""Provider adapters for KYC, e-signing and payments.

Every provider works the same way, whichever company it is:
  1. start(...)          we ask the provider to start a check, signing or payment; it gives back its own reference and a page
                         to send the person to (the provider's hosted page)
  2. the person finishes on the provider's page and comes back to the site
  3. parse_webhook(...)  the provider calls our webhook with the result; the adapter checks the provider's signature on the
                         call and turns it into an Event. Only this signed call changes anything: coming back to the site
                         proves nothing.

Stand-ins play the provider's part until accounts exist. Their hosted pages are served by this backend (/stand-in/...)
and they send a properly signed webhook, so the real code path runs end to end. They approve whatever you click, so
they are switched off in production (see settings.standins_enabled).

To add a real provider, write a class with the same methods and register it in PROVIDERS. backend/integrations/README.md
lists what each method must do and how the usual Indian providers map onto it.
"""
import hashlib
import hmac
import json
from dataclasses import dataclass, field

from backend.config import settings


class BadSignature(Exception):
    pass


@dataclass
class Event:
    """A provider's result, in our words."""
    id: str            # the provider's event id; the same id is never applied twice
    kind: str          # kyc, esign or payment
    ref: str           # the provider's reference for the check, signing or payment we started
    outcome: str       # kyc: verified | rejected; esign: signed | declined; payment: paid | failed
    data: dict = field(default_factory=dict)


def sign(raw: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


class StandIn:
    """The stand-in provider for all three kinds. References look like standin_<kind>_<our id>."""
    name = "standin"

    def _start(self, kind, our_id):
        if not settings.standins_enabled:
            raise RuntimeError("The stand-in %s provider is switched off in production. Set a real provider." % kind)
        ref = "standin_%s_%s" % (kind, our_id)
        return ref, "/stand-in/%s/%s" % (kind, ref)

    # KYC: check the person's PAN and name (a real provider also checks Aadhaar/DigiLocker or a video KYC)
    def start_kyc(self, check, user, return_url):
        return self._start("kyc", check["id"])

    # e-signing: the person reads the document and signs (a real provider uses Aadhaar e-sign or a DSC)
    def start_esign(self, req, signer, return_url):
        return self._start("esign", req["id"])

    def fetch_signed(self, ref):
        """A real provider returns its signed PDF; the stand-in has none, so we print our own signed copy."""
        return None

    # payments: a hosted checkout or payment link for the invoice total (fee plus GST)
    def start_payment(self, payment, invoice, payer, return_url):
        return self._start("pay", payment["id"])

    def parse_webhook(self, headers, raw: bytes):
        given = headers.get("x-aegis-signature", "")
        if not hmac.compare_digest(given, sign(raw, settings.webhook_secret)):
            raise BadSignature("Signature does not match")
        d = json.loads(raw)
        return Event(id=str(d["id"]), kind=d["kind"], ref=str(d["ref"]), outcome=d["outcome"], data=d.get("data") or {})


PROVIDERS = {"standin": StandIn}


def provider(kind):
    name = {"kyc": settings.kyc_provider, "esign": settings.esign_provider, "payment": settings.payments_provider}[kind]
    if name not in PROVIDERS:
        raise RuntimeError("Unknown %s provider %r. Add its adapter to backend/integrations/providers.py." % (kind, name))
    return PROVIDERS[name]()


def by_name(name):
    if name not in PROVIDERS:
        raise KeyError(name)
    return PROVIDERS[name]()
