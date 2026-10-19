# Aegis Ascend Financial Advisors

Independent debt vs equity advisory for growing Indian businesses. This repository holds the company website,
the role-based workspace behind its sign-in, and the CMA funding report tool.

| Folder | What it is |
|---|---|
| `site/` | The website and workspace pages (plain HTML/CSS/JS, no build tools) and the calculation engine `calc.js` |
| `server/` | The real web app: Flask, accounts with hashed passwords, SQLite, append-only audit log with before/after values. `actions.py` holds every rule and permission, `domain.py` the money and date arithmetic, `seed.py` the demo data |
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
Settings (environment variables): `GB_DATABASE` (SQLite file), `GB_UPLOADS` (folder for uploaded reports and data-room files), `GB_SECRET_KEY` (required in production),
`GB_SECURE_COOKIES=1` (behind HTTPS), `GB_SEED_DEMO=0` (start with no demo accounts), `GB_HOST`, `GB_PORT`.

Admin commands: `flask --app server.app init-db`, `flask --app server.app seed-demo`,
`flask --app server.app create-advisor` (advisors cannot sign themselves up).

Demo accounts (both versions): `founder@demo.in`, `investor@demo.in`, `advisor@demo.in`, `lender@demo.in`,
password `demo1234`. All companies, investors and lenders in the demo data are fictional.

## What is in the workspace

Pages are hash routes, e.g. `http://127.0.0.1:8000/#app-directory`. All workspace pages are behind sign-in and marked `noindex`.

- **Investor** (`investor@demo.in`): Portfolio `#app` (demat-style summary with XIRR, holdings table, lock-in badges),
  holding detail `#app-holding/<id>` (valuation history, value over time, valuer reports, SSA/SHA/allotment/PAS-4, tax estimate),
  sell request flow and timelines `#app-sells`, private offers `#app-opportunities`, `#app-notifications`.
- **Lender** (`lender@demo.in`): Loan book `#app`, lender desk overview `#app-desk`, (outstanding, interest earned, next repayment, DSCR bands, 24-month interest chart),
  loan detail `#app-loan/<id>` (schedule, balance and interest charts, monitoring, transfer request), `#app-applications`,
  `#app-monitor`, `#app-ltransfers`, `#app-lfees`.
- **Advisor** (`advisor@demo.in`): Today `#app`, pipeline board/table `#app-pipeline`, companies with readiness and reports `#app-companies`,
  deal-room requests `#app-intros`, company file `#app-companyfile/<id>`
  (cap table, offer log, valuations, documents checklist, fees, notes), investor directory and offer sharing `#app-directory`,
  resale requests `#app-requests`, revaluation centre `#app-revaluations`, loan transfers `#app-loantransfers`, loans and DSCR
  `#app-loansdesk`, compliance `#app-compliance`, revenue `#app-revenue`, notes and tasks `#app-tasks`, message templates
  `#app-templates`, audit log `#app-activity`, settings `#app-settings`, the review queue, and the analysis tools, which are
  advisor-only: Funding Twin (where the advisor prepares and submits each company's report), Equity vs Debt Optimizer,
  CMA funding report, Readiness Score and Term Sheet Analyser.
- **Founder** (`founder@demo.in`): overview with deal-room decisions `#app`, fundraise tracker `#app-fundraise`, investors ranked by
  fit score (suggest one to the advisor, grant or decline deal-room access) `#app-investors`, deal room with view log `#app-dealroom`,
  cap table with the planned round `#app-captable`, data room `#app-dataroom`, revenue-share statements `#app-revshare`,
  loans and monitoring `#app-loans`, fees, company profile. Founders do not have the analysis tools.

Every table can be searched, filtered, sorted and exported to CSV or Excel, and every computed number can be clicked to show
its formula and inputs.

## Rules enforced on the server

Checked in `server/actions.py` on every action (the demo mirrors them in `site/store.js`):

- Direct holdings only: every holding is in the investor's own name; no pooled money.
- At most 20 platform investors per company (setting) — allotments and resale buyers are refused beyond it.
- Section 42 offer counter: one offer per investor per company per financial year (April–March) per security type,
  plus off-platform offers the advisor records; warning at 150, refusal above 200. Resale introductions do not count.
- Section 2(68) member counter: founders and existing shareholders (a cap-table row may stand for several holders) plus
  platform investors; warning at 180, any allotment or transfer above 200 is refused.
- 6-month minimum holding from the allotment date; earlier only with the founder's written consent, recorded by the advisor.
- Quarterly revaluations by a registered valuer; investors see value and gain against the latest one.
- Private resales: no listings or prices shown to other investors; first-refusal window of 15–30 days; one-to-one buyer introductions.
- Loan transfers only between regulated banks and NBFCs, after the RBI minimum holding period (3 months for loans of
  2 years or less, otherwise 6), with a 0.3%–0.5% fee.
- Money is integer paise; every change is written to the append-only audit log with before and after values.

## Tests

```
python -m pytest server/tests fundmix/tests   # includes the demo-store and JS/Python parity tests (need node)
```
