# Aegis Ascend backend

The production backend: FastAPI on PostgreSQL. It serves the same website and the same `/api` that the browser already uses, so the front end did not need rebuilding. The business rules, money maths and compliance limits are the tested code in `server/actions.py` and `server/domain.py`, used unchanged.

## Run it

**With Docker (PostgreSQL included):**

```
docker compose up --build
```

Open http://127.0.0.1:8000. The demo accounts load on first start (`founder@demo.in`, `investor@demo.in`, `advisor@demo.in`, `lender@demo.in`, password `demo1234`). API docs: http://127.0.0.1:8000/api/docs.

**Without Docker:**

```
pip install -r backend/requirements.txt
export GB_DATABASE_URL=postgresql+psycopg://USER:PASS@HOST:5432/aegis
python -m backend.cli seed-demo           # or init-db for an empty database
uvicorn backend.app:app --port 8000
```

Leave `GB_DATABASE_URL` unset to use a local SQLite file for a quick trial.

## Settings (environment variables)

| Variable | What it does |
|---|---|
| `GB_DATABASE_URL` | PostgreSQL address, `postgresql+psycopg://...` |
| `GB_ENV` | `production` turns on secure cookies and HSTS, and refuses to start without a secret key |
| `GB_SECRET_KEY` | Long random string (32+ characters) |
| `GB_PUBLIC_URL` | The site's address, used in password-reset emails |
| `GB_STORAGE` | `local` (default, folder `GB_UPLOADS`) or `s3` (S3-compatible store, bucket `GB_S3_BUCKET`, needs `boto3`) |
| `GB_SENDER` | How queued emails and messages are sent. `console` (default) prints them; add a provider class in `backend/notify.py` |
| `GB_SEED_DEMO` | `1` loads the fictional demo data into an empty database |
| `ANTHROPIC_API_KEY` | Turns on Claude answers in the website assistant |

## Admin commands

```
python -m backend.cli init-db                 create the tables
python -m backend.cli seed-demo               tables plus the fictional demo data
python -m backend.cli create-advisor          add an advisor (advisors cannot sign up)
python -m backend.cli import-sqlite server/glassbox.db   move accounts, records and the audit log over from the Flask prototype
python -m backend.cli send-outbox             send queued emails/SMS/WhatsApp (run every minute from a scheduler)
```

## What changed from the Flask prototype

| Area | Prototype (`server/`) | Backend (`backend/`) |
|---|---|---|
| Database | One SQLite table holding every record as JSON | PostgreSQL, one table per collection (companies, offers, holdings, loans, invoices ...), each row tagged with its company and indexed |
| Concurrency | One process | Every action in one transaction behind a database lock, so two actions can't both pass a limit check (200 offers, 200 members, 20 investors) |
| Passwords | scrypt | Argon2id. Imported scrypt hashes still work and are upgraded at the next sign-in |
| Sessions | Signed cookie, can't be cancelled | Server-side: the cookie holds a random token, the database holds only its hash. Sign-out, password change and reset end sessions immediately. Signed out after 8 idle hours, and always after 24 |
| Wrong passwords | Counted in memory | Counted in the database (5 per 15 minutes), so the limit holds across restarts and servers |
| Two-step sign-in | No | Yes, codes from any authenticator app (Google or Microsoft Authenticator). A code can't be used twice |
| Password reset | No | By emailed link, valid for one hour, single use. The form never reveals whether an email has an account |
| Devices | No | "Sign-in & security" page: list of signed-in devices, "Sign out all other devices" |
| Email / SMS / WhatsApp | No | Outbox table, written in the same transaction as the change, sent by a worker |
| Files | Local folder | Storage layer: local folder or S3-compatible store with server-side encryption |
| Audit log | Append-only (SQLite trigger) | Append-only (PostgreSQL trigger), now with the IP address |

## Tests

```
GB_TEST_DATABASE_URL=postgresql+psycopg://USER@HOST/aegis_test pytest backend/tests
```

- `test_flask_suite_on_backend.py` runs **every test of the prototype's suite** (`server/tests/test_server.py`) against this backend. Rules, numbers, permissions and API responses must match.
- `test_security.py` covers sessions, two-step sign-in, password change and reset, the outbox, the import from the prototype, and the action lock.

Without `GB_TEST_DATABASE_URL` the tests run on SQLite. CI (`.github/workflows/backend.yml`) runs them on PostgreSQL 16 and builds the Docker image.

## Still to do

- **KYC, e-signing and payments:** the next step, each behind a small adapter with a stand-in provider until accounts exist.
- **Real email/SMS sender:** add a provider class in `notify.py`. Emails are queued and printed today.
- **Notifications by email:** in-app notifications are not yet copied to the outbox.
- **Normalised columns:** records are JSON inside per-collection tables today. Key fields (amounts, statuses, dates) can move into typed columns, and PostgreSQL row-level security can be added on `company_id`, without changing the API.
- **Hosting:** pick the provider (data must stay in India), set `GB_ENV=production`, a secret key, HTTPS, and daily database backups.
- **QR code for two-step setup:** today the user types the setup key, or taps the link on a phone.
