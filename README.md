# Glass-Box Advisory

Independent debt vs equity advisory for growing Indian businesses. This repository holds the company website,
the role-based workspace behind its sign-in, and the CMA funding report tool.

| Folder | What it is |
|---|---|
| `site/` | The website and workspace pages (plain HTML/CSS/JS, no build tools) and the calculation engine `calc.js` |
| `server/` | The real web app: Flask, accounts with hashed passwords, permissions enforced on the server, SQLite, append-only audit log |
| `fundmix/` | CMA funding report tool (Python engine + PDF, and a browser version in `fundmix/web/`) |

## Two ways to run it

**Demo (no server).** `python site/build.py` writes `site/dist/index.html`, a single page that keeps fictional
demo data in the visitor's browser. Its sign-in only demonstrates the flow and protects nothing. Hosted demo:
https://claude.ai/artifact/J9CP4uLM2vzRSm1DXFR3HG

**Real app.**
```
pip install -r server/requirements.txt
export GB_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
python -m server.app            # http://127.0.0.1:8000, loads demo accounts on first run
```
Settings (environment variables): `GB_DATABASE` (SQLite file), `GB_SECRET_KEY` (required in production),
`GB_SECURE_COOKIES=1` (behind HTTPS), `GB_SEED_DEMO=0` (start with no demo accounts), `GB_HOST`, `GB_PORT`.

Admin commands: `flask --app server.app init-db`, `flask --app server.app seed-demo`,
`flask --app server.app create-advisor` (advisors cannot sign themselves up).

Demo accounts (both versions): `founder@demo.in`, `investor@demo.in`, `advisor@demo.in`, `lender@demo.in`,
password `demo1234`. All companies, investors and lenders in the demo data are fictional.

## What is in the workspace

- **Founder:** Funding Twin (Net Effect Bridge, Break-even Value, Stress Slider, best mix search, 2,000-run simulation,
  plain-language summary with a number checker, submit for review), Readiness Score with a fix-it plan, CMA funding
  report, Term Sheet Analyser (loan and equity), Investor Fit Score and introductions, deal room with view log,
  loans and covenant monitoring, fees, activity log.
- **Investor:** curated (advisor-approved) deals with fit scores, request introductions, NDA and watermarked deal room,
  portfolio, early-exit requests (6-month minimum or founder consent), exit tax view.
- **Advisor:** review queue with release checklist and "Reviewed by" stamp, all companies, deals and exits
  (at most 3 investors per deal), loan transfers, website enquiries, full audit log.
- **Lender:** lender-side view of applicants, sanction / decline / disburse, monitoring, loan transfer requests, fee calculator.

Every number in the workspace can be clicked to show its formula, inputs and their source (founder, benchmark or advisor).

## Tests

```
python -m pytest server/tests fundmix/tests
```
