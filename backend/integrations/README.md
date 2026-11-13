# KYC, e-signing and payments

Three flows, all built the same way:

| Flow | Who | Starts from | When the provider confirms |
|---|---|---|---|
| **KYC** (identity check) | Investors | "Identity check (KYC)" page: name and PAN | The investor's KYC becomes **verified**, so they can get private offers and be introduced as a buyer. A rejection is shown with its reason. |
| **E-signing: NDA** | Investors | Deal room: "Review and sign the NDA" | The deal room opens. The signed PDF (with its signature certificate) can be downloaded by the investor and advisors. |
| **E-signing: engagement letter** | Advisor sends, founder signs | Advisor: company file, "Send engagement letter" (sets the advisory fee). Founder: overview, "Review and sign" | The company's engagement shows as signed, and advisors are notified. |
| **Payments** | Founders, investors, lenders | "Pay now" on any unpaid invoice (fee + 18% GST) | The invoice is marked paid, with the provider's payment reference, and advisors are notified. |

## How a flow runs

1. The site calls our API (for example `POST /api/kyc/start`). We check permissions with the same rules as everywhere else, record the request, ask the provider to start, and send the person to the provider's page.
2. The person finishes on the provider's page and is sent back to the site.
3. The provider calls **`POST /api/webhooks/<provider>`** with the result. The adapter checks the provider's signature on that call. Only this signed call changes anything: coming back to the site proves nothing.
4. The result is applied in one transaction, behind the same lock as every other action, with an audit entry and notifications. Each provider event id is stored, so a repeated callback is ignored. A payment whose amount doesn't match the invoice total is never marked paid.

**What we store:** for KYC, only a keyed hash of the PAN (to spot the same PAN on two accounts) and its last 4 characters. For e-signing, the exact text shown, its SHA-256 fingerprint, the signing time and IP address, and the signed PDF. For payments, the amount, the provider's reference and the result.

**The tick-box NDA:** with `GB_REQUIRE_ESIGN=1` (the default in production), the old one-click "Sign NDA" is refused and NDAs go through e-signing only. Advisors can still record KYC by hand, and mark an invoice paid for a bank transfer.

## Stand-ins

Until provider accounts exist, `standin` plays the provider's part. Its pages are served by this backend at `/stand-in/...`, open only for the person the request belongs to, and are clearly labelled "test mode". When you press a button, it sends our webhook a properly signed event, so the real code path runs end to end.

**Stand-ins approve whatever you click, so they are switched off in production** (`GB_ENV=production`). `GB_ALLOW_STANDINS=1` turns them back on, for a staging site only.

## Adding a real provider

Write a class in `providers.py` with the methods below, add it to `PROVIDERS`, and choose it with `GB_KYC_PROVIDER`, `GB_ESIGN_PROVIDER` or `GB_PAYMENTS_PROVIDER`. Keep keys in the environment (or the host's secret store), never in code.

| Method | Must do |
|---|---|
| `start_kyc(check, user, return_url)` | Create the verification at the provider. Return `(provider_ref, url_to_send_the_person_to)` |
| `start_esign(req, signer, return_url)` | Upload `req["body"]` (or a PDF made from it) with the signer's name and email. Return `(provider_ref, signing_url)` |
| `fetch_signed(provider_ref)` | Return the provider's signed PDF as bytes, or `None` to use our own signed copy |
| `start_payment(payment, invoice, payer, return_url)` | Create an order or payment link for `payment["amount_paise"]` in INR, with our `payment["id"]` as the receipt. Return `(provider_ref, checkout_url)` |
| `parse_webhook(headers, raw_body)` | Verify the provider's signature (raise `BadSignature` if it fails), then return an `Event(id, kind, ref, outcome, data)`. Outcomes: `verified`/`rejected`, `signed`/`declined`, `paid`/`failed`. For payments, put the amount received in `data["amount_paise"]` and the provider's payment id in `data["payment_id"]` |

**Choosing providers** (each needs a business account; most ask for company registration documents before giving live API keys):

- **KYC:** for example Digio, Signzy, IDfy or HyperVerge. Use PAN verification plus Aadhaar through DigiLocker, or video KYC for higher-value investors.
- **E-signing:** for example Leegality, Digio or SignDesk. Aadhaar e-sign is legally valid under the IT Act for agreements like the NDA and the engagement letter.
- **Payments:** for example Razorpay, Cashfree or PayU. Payment links or hosted checkout with UPI, net banking and cards. Razorpay's webhook signature is HMAC-SHA256 of the raw body, the same check the stand-in uses.

Confirm with a lawyer which documents can be signed electronically, and whether the KYC level meets SEBI and PMLA requirements for the services offered.
