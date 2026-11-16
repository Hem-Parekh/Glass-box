# Aegis Ascend: functional specification (rebuild pack)

## 0. Read this first (instructions for the person or AI rebuilding this)

This pack describes **how every part of the Aegis Ascend platform works**: the rules, limits, calculations, permissions, workflows, data and API. It does **not** describe the look. Use any design you like, but every function must behave exactly as written here.

**What is in the pack**
- **Sections 1–14:** the written specification.
- **Appendix A:** a screen-by-screen list of what each login can see and do.
- **Appendix B:** the real source code of the rules and calculations, copied verbatim from the working product. Python is the server, JavaScript is the browser.

**How to use it**
1. **The code wins.** If the text and the Appendix B code ever disagree, follow the code. Port it line for line into your stack, or use it as is. Do not "improve" formulas, limits, rounding or messages.
2. **Rules live on the server.** Every action in section 6 must be checked on the server, never only in the UI. The UI may hide buttons, but the server must still refuse.
3. **Money is whole paise.** 1 rupee = 100 paise. Store integers; never use floating-point rupees in storage. The analysis tools work in rupees or crore as floats; that is fine because they are calculations, not records.
4. **Dates** are ISO strings (`YYYY-MM-DD`) for business dates and ISO timestamps for events. The **financial year** runs April to March (`2026-27`).
5. **Use the same error messages.** Users see them as they are.
6. **No AI does maths.** All numbers come from fixed code. The website assistant may explain, but it never computes figures.
7. **Demo data is fictional and must be labelled so.** Never invent clients, testimonials or statistics.
8. **Pass section 14 before calling the rebuild done.** It lists the behaviours that must work.

---

## 1. What the product is

Aegis Ascend Financial Advisors is an independent funding advisory firm for growing Indian private companies. It advises a company whether to raise **debt, equity or a mix**, helps make the deal happen (offers to investors, loans from lenders), and keeps monitoring for about five years. The platform has:

- **A public website.** Pages: home, services (debt, equity), pricing, about, trust, contact form, sign-in, sign-up, password reset. It also has a website assistant (chat).
- **A private workspace with four roles:**
  - **founder:** one company each.
  - **investor:** invite-only.
  - **lender:** bank or NBFC.
  - **advisor:** Aegis Ascend staff, created by admin only.
- **Analysis tools for advisors:**
  - Funding Twin
  - Equity vs Debt Optimizer
  - CMA funding report
  - Readiness Score
  - Term Sheet Analyser
- **Two run modes with identical rules:**
  - **Server mode:** FastAPI + PostgreSQL in the reference build. A real database, sessions and security.
  - **Demo mode:** a single file that keeps fictional data in the visitor's browser (localStorage). It runs the same rules in JavaScript and protects nothing.

## 2. Architecture contract (how the logic is organised)

Rebuild this pattern. It is what keeps every role consistent.

1. **State is a set of collections.** Each one is a list of JSON records with an `id`:
   - `companies`, `reports`, `intros`, `cap_table`
   - `holdings`, `offers`, `valuations`
   - `sell_requests`, `transfers`
   - `loans`, `loan_transfers`, `invoices`
   - `notes`, `notifications`, `files`, `enquiries`
   - `settings` (one record), `suggestions`, `invites`
   - plus `users`

   Records belonging to a company carry `company_id`.
2. **Every change is a named action.** The client calls `POST /api/act/<name>` with a JSON payload. The server then:
   1. loads the state;
   2. takes a global write lock, so actions run one at a time and limit checks across many records cannot race;
   3. runs `a_<name>(state, user, payload, today)`;
   4. saves only the records that changed;
   5. writes an **append-only audit entry** with the action name, a human sentence, the company, the IP, and before/after values of every changed record.

   If the action raises `Denied(message)`, nothing is saved and the API answers **403** with `{"error": message}`. On success the answer is `{"detail": sentence, "company_id": id}`.
3. **Reading uses one call.** `GET /api/state` returns `visible_state(user)`: only what that role may see (section 5). The client re-fetches state after each action.
4. **Notifications are records.** `{id, user_id, kind, text, link, at, read}` is written by actions. The `link` is a workspace route such as `app-portfolio`. Lock-in reminders are computed on read and not stored (section 7.9).
5. **The audit log can never be edited or deleted.** It is enforced with a database trigger. Advisors see everything. Founders see their company's entries. Investors and lenders see their own.
6. **The shared maths** (`domain`) is pure functions used by the rules, the API and the browser. The Python and JavaScript copies must give identical results.

## 3. Accounts, sign-up and security

### 3.1 Roles and sign-up
- **Public sign-up** offers **Founder** and **Lender** only.
  - **Founder sign-up** creates a company with these defaults:
    - name = organisation or "My company"
    - sector from the form (default "Plastics & packaging"), stage "Growth", city "Mumbai"
    - revenue 50 (Rs cr), raise 10 (Rs cr), `raise_paise` = 10 cr in paise, instrument "equity", `security_type` "equity"
    - `pipeline_stage` "applied", `stage_since` today
    - `offer_price_paise` 0, `fd_extra_shares` 0
    - empty `external_offers`, `checklist`, `updates`, `twin`, `readiness`, `quarters` and `docs`
    - covenants `{dscr_min: 1.25, debt_ebitda_max: 3.5}`

    The founder's `company_id` points to that company.
  - **Lender sign-up** sets `firm` (organisation or name) and profile `{regulated: false, lender_type: null, reg_no: null}`. A self-registered lender is unverified until Aegis Ascend confirms its RBI registration.
- **Investors join only by invitation** (section 7.4).
  - Sign-up with role investor requires a valid invitation token. Without one: 403 "Investors join by invitation. Ask the founder or your Aegis Ascend advisor for an invitation link."
  - The email must equal the invited email: 400 "Use the email address the invitation was sent to: …".
  - The new investor gets these defaults:
    - mandate `{sectors:[sector], past_sectors:[], stages:["Growth"], ticket_min:2, ticket_max:20, instruments:["equity"]}`
    - profile `{kyc:"not_started", accredited:false, nda_signed_at:null, last_active:now}`
    - `firm` = the invitation's firm, if there is one
  - A setting `GB_INVESTOR_SIGNUP=open` allows open investor sign-up, for tests only.
- **Advisors cannot sign up.** They are created by an admin command.
- **Sign-up validation and errors:**
  - "Enter a valid email address."
  - Password 8–200 characters: "Use a password of at least 8 characters."
  - Role must be founder, investor or lender.
  - "Enter your name."
  - Duplicate email: 409 "An account with this email already exists. Sign in instead."
- A successful sign-up signs the user in.

### 3.2 Sign-in and sessions
- **Email and password.** Email is case-insensitive.
  - Wrong details: 401 "Email or password is wrong."
  - **Limit:** 5 failures per (IP + email) per 15 minutes, then 429 "Too many attempts. Try again in 15 minutes." Counts are kept in the database.
- **Passwords** are hashed with Argon2id. Old scrypt hashes still work and are re-hashed at the next sign-in.
- **Sessions:**
  - The cookie `aa_session` holds a random token, and the database stores only its SHA-256 hash.
  - Cookie settings: httpOnly, SameSite=Lax, and Secure in production.
  - Idle timeout is 8 hours and the absolute limit is 24 hours.
  - Sign-out, password change and password reset end sessions immediately.
- **Two-step sign-in (TOTP)** with any authenticator app:
  - **Setup:** setup returns a secret and an `otpauth://` URI. Enable confirms it with a current code. Disable needs the password and a current code.
  - **At sign-in:** when TOTP is on, the password step returns `{mfa_required:true}` and a short session (5 minutes) that can only call `/api/login/mfa`.
  - **Codes:** a code cannot be reused (the last used time step is stored). Code attempts are rate-limited the same way as passwords.
- **Password reset:**
  - "Forgot" always answers the same way: "If that email has an account, we have sent a link…". It is limited per IP.
  - The emailed link `/#reset/<token>` works for 1 hour, once.
  - A reset ends all sessions.
- **Account page:** shows two-step status and the list of signed-in devices (this device, signed in, last seen, IP, browser). It offers "sign out all other devices" and "change password" (needs the current password; signs out other devices).
- **Investor sign-in** updates `profile.last_active`.
- **Every sign-in, sign-up and security change** is written to the audit log.

### 3.3 Request security (server)
- Every non-GET `/api/` request must send the header `X-Requested-With: glassbox`, otherwise 400. This blocks cross-site forms. Webhooks are exempt.
- The request size limit is 8 MB (413).
- Security headers:
  - `nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: same-origin`
  - a strict CSP
  - HSTS in production
  - `Cache-Control: no-store` and `noindex` on the API
- Errors always come back as `{"error": "..."}`.

## 4. Data model

Money fields end in `_paise` unless noted. Company `revenue` and `raise` are in Rs crore (floats) for the analysis tools.

**users:**
- `id`, `email` (unique, lowercase), `name`, `role` (founder, investor, lender or advisor)
- `company_id` (founder), `firm`, `title`
- `mandate` (investor: sectors, past_sectors, stages, ticket_min, ticket_max in Rs cr, instruments)
- `profile`:
  - investor: `kyc` (not_started, pending or verified), `accredited`, `last_active`, `kyc_verified_at`, `pan_last4`, `kyc_note`
  - lender: `regulated` (bool), `lender_type`, `reg_no`
- `pw_hash`, `totp_secret`, `totp_enabled`, `totp_last_step`, `disabled`, `created_at`

**companies:**
- `id`, `name`, `sector`, `stage`, `city`, `revenue`, `raise`, `instrument`
- `raise_paise`, `security_type` (equity, preference or debentures)
- `offer_price_paise`, `fd_extra_shares` (extra fully-diluted shares such as an option pool)
- `pipeline_stage` (applied → under_review → approved → offering → funded → monitoring, or closed or rejected), `stage_since`
- `external_offers {fy: {security_type: count}}`
- `checklist {item: date|null}`, `allotment_date`
- `updates [{date, text}]` (newest first)
- `docs [names]`: deal-room document names
- `twin`, `readiness`: saved tool inputs
- `quarters [{ebitda, interest, principal, debt, tax_rate, …}]`
- `covenants {dscr_min, debt_ebitda_max}`
- `engagement {status: sent|signed|declined, esign_id, fee_paise, sent_at, signed_at}`

**reports:**
- `id`, `company_id`, `title`
- `status`: in_review, approved or changes
- `engine_version`, `created_at`, `submitted_by`
- `summary`, `checks {validation, founder_confirmed, verifier}`, `inputs`
- `reviewed_by`, `reviewed_at`, `review_note`

**cap_table:**
- `id`, `company_id`, `holder_name`
- `holder_type`: founder or existing
- `shares`, `holders` (how many people one row stands for)

**offers:**
- `id`, `company_id`, `investor_id`, `fy`, `security_type`, `sent_at`, `sent_by`
- `response`: pending, interested, declined or invested
- `responded_at`, `share_identity` (investor agreed to reveal their name to the founder)
- `views [{doc, at}]`

**holdings:**
- `id`, `investor_id`, `company_id`, `shares`
- `allotment_date`, `invested_at`, `cost_paise`
- `origin`: allotment or transfer
- `early_consent {by, at, note}|null`

**valuations:**
- `id`, `company_id`, `date`, `price_per_share_paise`
- `method`: DCF or Market multiples
- `valuer`, `report_file`, `published_at`, `published_by`

**intros** (deal rooms):
- `id`, `company_id`, `investor_id`
- `status`: requested, granted or declined
- `created_at`, `nda_signed_at`, `nda_esign_id`, `views [{doc, at}]`

**sell_requests:**
- `id`, `holding_id`, `investor_id`, `company_id`, `shares`, `full` (bool)
- `indicative_price_paise`, `note`
- `status`: submitted, under_review, rofr, buyer_introduced, spa_signed, completed, rejected or withdrawn
- `rofr_days`, `rofr_until`, `rofr_waived`
- `buyer_investor_id`, `spa_date`, `price_paise`
- `fee_rate`, `fee_paise`
- `reason`, `created_at`, `history [{status, at, by}]`

**transfers** (completed resales):
- `id`, `sell_request_id`, `company_id`, `from_investor_id`, `to_investor_id`
- `shares`, `price_paise`, `spa_date`, `completed_at`

**loans:**
- `id`, `company_id`, `lender_id`
- `amount_paise`, `rate_bps` (e.g. 1050 = 10.5%), `tenor_months`, `moratorium_months`
- `status`: applied, sanctioned, declined or disbursed
- `sanction_date`, `disbursal_date`
- `payments {due_date: paid_date}`, `created_at`

**loan_transfers:**
- `id`, `loan_id`, `from_lender_id`, `amount_paise` (null = everything outstanding), `note`
- `status`: submitted, eligibility, consent, buyer_introduced, deed_signed, charge_updated, completed or rejected
- `buyer_lender_id`, `eligibility {checked_at, months_held, min_holding}`
- `borrower_consent_at`, `deed_date`, `charge_date`
- `fee_rate`, `fee_paise`, `reason`, `created_at`, `history`

**invoices:**
- `id`
- `kind`: advisory, success, debt_success, revenue_share, monitoring, transfer or resale
- `company_id`
- `payer`: company, investor or lender
- `payer_id`, `period`
- `amount_paise`, `gst_paise` (always amount × 18 ÷ 100, integer division)
- `issued`, `due`, `paid_on`, `paid_via`, `payment_ref`

**notes:**
- `id`
- `subject_type`: investor, lender or company
- `subject_id`, `text`, `due`, `done`, `by`, `at`

**notifications:**
- `id`, `user_id`, `kind`, `text`, `link`, `at`, `read`

**files:**
- `id`, `name`, `mime`, `company_id`
- `purpose`: valuation_report, dataroom, monitoring or loan_doc
- `item`, `uploaded_by`, `at`, `size`
- The bytes go in storage (local disk or S3).

**enquiries:**
- `id`, `at`, `name`, `email`, `company`, `message`

**settings** (one record):
- `max_platform_investors` 20, `offer_limit` 200, `offer_warn` 150
- `member_limit` 200, `member_warn` 180
- `lock_months` 6

**suggestions:**
- `id`, `company_id`, `by` (founder), `at`, `note`
- `status`: suggested, invited, waiting_kyc, offered, declined or blocked
- `decided_by`, `decided_at`, `reason`, `offer_id`, `invite_id`
- `investor_id`, `name`, `email`, `firm`

**invites:**
- `id`, `company_id`, `suggestion_id`, `name`, `email`, `firm`
- `status`: pending or accepted
- `created_at`, `created_by`, `sent_at`, `accepted_at`, `user_id`

**Server-only tables** (not part of the state):
- `sessions`, `login_attempts`, `password_resets`
- `invite_tokens` (hash, invite_id, expires_at, used_at)
- `outbox` (email/SMS queue)
- `kyc_checks`, `esign_requests`, `payments`
- `webhook_events`
- `audit`

## 5. Who sees what (`visible_state`)

Every role gets:
- `me` (own profile)
- `today`
- `settings`
- notifications: computed lock-in reminders, then their newest 60 notifications

| Role | Sees |
|---|---|
| **Advisor** | Everything: every collection, the full directory of non-founder users (with email and profile), the founders list, and the full audit log. |
| **Founder** | Only their company: the company itself, reports, cap table, valuations, loans, files and suggestions. Also: holdings (with investor names), intros (with investor names), and invoices where the payer is the company. **Offers:** the investor's name is hidden ("Name shared after the investor consents") unless the investor ticked `share_identity` or has invested; document views are hidden until then. **Sell requests:** a reduced view (shares, full, status, ROFR date, created), with no seller identity or price. Directory: advisors, lenders and investors (public fields). Audit: their company. |
| **Investor** | Their own offers, holdings, intros, sell requests (buyer identity removed), transfers they are party to, and invoices they pay. Companies appear only as a **brief** for companies they were offered or hold: name, sector, stage, city, revenue, raise, security type, offer price, updates, docs, fully-diluted shares, and the approved report's title, summary and review details. They never see the twin, readiness or cap table. Valuations for companies they hold or were offered. Files: valuation reports of companies they hold. Directory: advisors. Audit: their own. |
| **Lender** | Their loans, the companies of those loans, approved reports of those companies, loan transfers of their loans (or that they started), invoices they pay, and files with purpose monitoring or loan_doc for those companies. Directory: advisors and lenders. Audit: their own. |

**File download rule** (`can_see_file`):
- An advisor can download any file.
- A founder can download their company's files.
- An investor can download valuation reports of companies where they hold shares > 0.
- A lender can download monitoring and loan_doc files of companies they lend to.

## 6. Action catalogue

Each row is one `POST /api/act/<name>`. "Who" is enforced on the server. Section 8 lists the limits. Appendix B holds the exact checks and messages.

### Founder
| Action | Payload | Rules and effects |
|---|---|---|
| `save_company` | company_id, patch | Founder of that company, or an advisor. Founders may change name, sector, stage, city, revenue, raise, instrument, twin, readiness, quarters, covenants and docs. Advisors may also change offer_price_paise, fd_extra_shares, security_type and raise_paise. Revenue and raise must be > 0. Advisor number fields must be whole numbers ≥ 0. security_type must be one of the three types. Text is trimmed to 120 characters and must not be empty. Any other field: "You cannot change X". |
| `apply_loan` | company_id, lender_id, amount_paise, rate_bps, tenor_months, moratorium_months | That company's founder only. amount > 0; 0 < rate_bps < 5000; 0 < tenor ≤ 240; 0 ≤ moratorium < tenor. Creates a loan with status `applied` and notifies the lender. |
| `post_update` | company_id, text | Founder or advisor. Text up to 600 characters, required. Inserted at the top of `updates`. Every platform investor holding shares is notified. |
| `decide_intro` | intro_id, decision (grant or decline) | That company's founder, while the status is `requested`. The investor is notified. |
| `suggest_investor` | investor_id, or name + email (+ firm, note) | Founder only. See section 7.4. |

### Investor
| Action | Payload | Rules and effects |
|---|---|---|
| `respond_offer` | offer_id, response (interested or declined), share_identity | Own offer only. The response must still be pending, interested or declined (an invested offer is closed). `share_identity` is kept only with interested. Advisors are notified. |
| `view_doc` | offer_id, doc | Own offer that is not declined. The doc must be in the company's `docs` or be "Advisor-reviewed report". Records a view. The detail text says "watermarked: <name>". |
| `request_intro` | company_id | Only for a company the investor holds a non-declined offer for. One request per company. Creates an intro with status `requested` and notifies the founder. |
| `sign_nda` | intro_id | Own intro, status granted. Sets `nda_signed_at`. In server mode with e-signing required, this action is refused ("Sign the NDA through e-signing."); the NDA is signed via section 10. |
| `view_room_doc` | intro_id, doc | Granted and NDA signed. The doc must be in `docs`. Records a view. |
| `request_sell` | holding_id, shares (blank = all), indicative_price_paise, note | Own holding with shares > 0. No other open request on that holding. **Lock-in:** today ≥ allotment_date + 6 months, or early consent recorded; otherwise "Locked: you can request to sell from <date>, 6 months after allotment". Shares must be 1 to the number held; the price, if given, must be > 0. `full` = whether all shares are being sold. Advisors are notified. |
| `withdraw_sell` | request_id | Own request, while status is submitted, under_review or rofr. |
| `read_notifications` | (none) | Any role: marks all of their notifications read. |

### Lender
| Action | Payload | Rules and effects |
|---|---|---|
| `lender_decide` | loan_id, decision | Own loan. sanction: applied → sanctioned, sets sanction_date. decline: applied → declined. disburse: sanctioned → disbursed, sets disbursal_date and clears payments. **On disburse** a debt success invoice is raised: 2.5% of the amount (`amount × 25 // 1000`), payer = company, due in 15 days, and the founder is notified. |
| `record_repayment` | loan_id, due | The lender (own loan) or an advisor. The instalment must exist in the schedule, must not be paid already, and must be due no later than today + 31 days. Records `payments[due] = today`. |
| `request_loan_transfer` | loan_id, amount_paise (optional), note | Own loan, status disbursed, the lender's `profile.regulated` is true, and no open transfer exists for that loan. The amount, if given, must be 0 < amount ≤ principal outstanding. Advisors are notified. |

### Advisor
| Action | Payload | Rules and effects |
|---|---|---|
| `submit_report` | company_id, title, summary, inputs, checks, engine_version | All three checks (validation, founder_confirmed, verifier) must be true. Only one report per company may be in review. Creates status `in_review`. Moves the company applied → under_review. Advisors are notified. |
| `review_report` | report_id, decision (approve or changes), note | The report must be in_review. Approve: the company moves to `approved` if it is in applied or under_review. |
| `set_stage` | company_id, stage | Must be a valid stage and different from the current one. approved, offering, funded and monitoring need an approved report. |
| `save_cap_entry` / `remove_cap_entry` | entry_id?, holder_name, holder_type (founder or existing), shares ≥ 0, holders ≥ 1 | Adds, edits or removes a cap-table row. |
| `set_checklist` | company_id, item, date or empty | Item must be one of: valuation_report, mgt14, pas4, bank_account, allotment, pas3, demat_credit. Setting `allotment` also sets the company's allotment_date. |
| `set_external_offers` | company_id, fy, security_type, count | Records offers the company made off-platform. These count towards Section 42. Refused if the total would exceed 200. |
| `set_investor_profile` | investor_id, kyc, accredited | Manual KYC record. If KYC becomes verified, confirmed suggestions waiting for it are released (section 7.4). |
| `save_settings` | max_platform_investors (1–200) | Changes the per-company platform investor limit. |
| `share_offer` | company_id, investor_ids[], security_type | See section 7.3. |
| `decide_suggestion` | suggestion_id, decision (approve or decline), reason | See section 7.4. |
| `allot_shares` | offer_id, shares, amount_paise, allotment_date | See section 7.5. |
| `publish_valuation` | company_id, date (not in the future), price_per_share_paise > 0, method (DCF or Market multiples), valuer (required), file_id? | Adds a valuation and notifies holders. The detail text includes the previous price. |
| `record_consent` | holding_id, note (required) | Founder's written consent for an early sale. Sets `early_consent`, which bypasses the lock-in. The investor is notified. |
| `sell_step` | request_id, step, … | Resale workflow, section 7.7. |
| `loan_transfer_step` | transfer_id, step, … | Loan sale workflow, section 7.8. |
| `save_note` / `toggle_note` | subject_type, subject_id, text, due? / note_id | Notes and tasks about an investor, lender or company. Toggle flips `done`. |
| `save_invoice` | kind, company_id, amount_paise, period, due, payer_id (lender kinds) | Kinds: advisory, success, debt_success, revenue_share, monitoring, transfer. monitoring and transfer are paid by a lender; the rest by the company. GST = 18%. The default due date is today + 15. |
| `mark_invoice_paid` | invoice_id, date | Only if not already paid. |

## 7. Workflows end to end

### 7.1 Company pipeline
Stages, in order:
1. applied
2. under_review
3. approved
4. offering
5. funded
6. monitoring

closed and rejected can be set at any time.

Automatic moves:
- submitting a report moves applied → under_review;
- approving a report moves applied or under_review → approved;
- the first offer moves approved → offering;
- the first allotment moves offering → funded.

The advisor can also move a company manually, but approved, offering, funded and monitoring require an advisor-approved report. `stage_since` records the date of each move.

### 7.2 Debt vs equity report ("golden rule")
1. The advisor runs the Funding Twin (section 9.2) on the company's inputs.
2. They submit a report. It holds the summary numbers, the inputs and the engine version.
3. The three release checks must all be ticked:
   - the inputs pass validation;
   - the founder confirmed the inputs;
   - a second person verified them.
4. Any plain-language summary is checked against the engine: every number in the text must match an engine output.
5. Another advisor reviews it: approve, or request changes with a note.
6. Only an approved report unlocks offering. Investors and lenders see only approved reports.

### 7.3 Private placement offers (Companies Act Section 42)
- **Conditions:** an offer can only go out when the company is in approved or offering **and** has an approved report. Every investor must have KYC verified.
- **The limit:** each person offered counts **once per financial year per security type** (equity, preference and debentures are counted separately). Off-platform offers recorded by the advisor also count. The limit is **200 per FY per security type**.
  - Sending more than the remaining room is refused with the full message: "Blocked: <company> has <used> of 200 <type> offers used in FY <fy>. Sending <n> more would exceed the Section 42 limit; <left> left."
  - Investors who already have the offer this FY are skipped. If all were skipped: "Every selected investor already has this offer for FY …".
  - The UI warns from 150 used (`offer_warn`).
- **Each new offer:**
  - response `pending`, identity hidden from the founder;
  - the investor is notified "New private offer: <company>".
- **Investor responses:**
  - **interested:** may share their identity with the founder;
  - **declined.**

  The response can be changed until the offer is invested.

### 7.4 Invite-only investors: founder suggests, advisor confirms, offer follows
1. **The founder suggests** either an investor already on the platform (`investor_id`) or a new person (name + email, optional firm and note).
   - If the email already belongs to an account, it is used if it is an investor. Otherwise: "That email belongs to an account that is not an investor".
   - Refused if:
     - the investor already has an offer from this company;
     - an open suggestion exists for the same investor;
     - an open suggestion exists for the same email.
   - A suggestion counts as open while its status is suggested, invited or waiting_kyc.
   - Creates a suggestion with status `suggested`. It also adds a company note "<founder> suggests offering to <who>." and notifies advisors.
   - The founder sees "Suggested <who> to your advisor. Your advisor decides who receives the offer."
2. **The advisor decides:**
   - **Decline** requires a reason. Status becomes `declined`, and the founder is notified with the reason.
   - **Approve** requires the company to be offerable (approved or offering stage with an approved report). Otherwise: "Approve <company>'s report and move it to Approved before confirming investors".
     - **Platform investor:** release now (step 4).
     - **New person:** create an invite (`pending`). The suggestion becomes `invited` and the founder is notified "an invitation is on its way".
3. **The invitation:**
   - **Sending:** after the action, the server creates a random token for each new invite. It stores only the token's hash, expiring in **30 days**, and queues an email with the link `<public_url>/#signup/invite/<token>`. It sets `sent_at`.
   - **Opening the link:** `GET /api/invite/<token>` returns the name, email, firm and company name. If the link has expired or was used: 404.
   - **Sign-up:** the sign-up page shows the email as read-only, with the role fixed to investor. Sign-up checks the token and email, then:
     - the invite becomes `accepted`;
     - the suggestion gets the new `investor_id` and becomes `waiting_kyc`;
     - the founder and advisors are notified;
     - the token is marked used (single use).
   - **Demo mode** cannot email, so it shows the advisor the link in a dialog instead.
4. **Release:**
   - If the investor's KYC is not verified, the suggestion stays or becomes `waiting_kyc`.
   - If it is verified, one offer is sent with the Section 42 checks. An existing offer for the same FY and type is reused. The suggestion becomes `offered` with the `offer_id`, and the founder is notified "Your advisor sent the offer to …".
   - If sending is refused (for example, the limit is full), the suggestion becomes `blocked` with the reason, and advisors are notified.
   - **When KYC becomes verified** (by the provider or by the advisor's manual record), every suggestion `waiting_kyc` for that investor is released automatically.
5. The founder sees each suggestion's status as "Waiting for your advisor", "Invited to join", "Waiting for KYC", "Offer sent", "Declined" (with reason) or "Could not send".

### 7.5 Allotment (Section 2(68) member limit and platform investor limit)
- The offer must be `interested`. Shares and amount must be > 0. The date must not be in the future.
- **New-holder check:** if the investor does not already hold shares in the company:
  - platform investors (distinct investors with shares > 0) + 1 must be ≤ `max_platform_investors` (default 20);
  - members + 1 must be ≤ 200 (private company limit). Members = sum of `holders` on cap-table rows with shares > 0, plus the platform investors.
  - The messages give the resulting count and the limit.
- **Effects:**
  - creates a holding (origin `allotment`, cost = amount);
  - the offer becomes `invested`;
  - sets the company's allotment_date and checklist `allotment`;
  - offering → funded;
  - the investor is notified.

### 7.6 Valuations and portfolio
- The advisor publishes valuations: date, price per share, method DCF or Market multiples, registered valuer, and an optional report file.
- **Each holding view shows:**
  - **price:** the latest valuation, or the cost per share if there is none;
  - **value:** shares × price;
  - **gain** and **gain %**;
  - **ownership:** shares ÷ fully-diluted shares (cap table + all holdings + `fd_extra_shares`);
  - **lock-in end date**;
  - **eligible to sell.**
- **Portfolio totals:** invested, value, gain, gain % and the number of companies.
- **Capital gains estimate:** 24 months or more is long-term at 12.5% of a positive gain. Shorter is short-term at the investor's slab rate, so no figure is shown.

### 7.7 Equity resale (investor sells, advisor arranges)
1. **Request.** The investor requests a sale (lock-in rule in section 6) → `submitted`.
2. **Advisor steps.** They must be done in order. "reject" (reason required) is allowed while the request is open.
   1. `review`: submitted → under_review.
   2. `rofr`: under_review → rofr, with a **right-of-first-refusal window of 15–30 days**. Sets `rofr_until` = today + days.
   3. `buyer`: rofr → buyer_introduced.
      - Allowed only after `rofr_until`, unless a written waiver is ticked (stored as `rofr_waived`).
      - The buyer must be an investor other than the seller, with KYC verified.
      - New-holder check: if the seller sells everything, they leave, so the count does not rise.
   4. `spa`: buyer_introduced → spa_signed. Needs the agreed price per share > 0 and an SPA date not in the future.
   5. `complete`: spa_signed → completed.
      - The seller must still hold the shares, and the new-holder check runs again.
      - **Resale fee rate:** 0.3%–0.5%.
      - **Seller's holding:** shares go down. Cost goes down pro rata (`cost × sold // held`).
      - **Buyer:** gets a new holding with origin `transfer`, cost = shares × price, and allotment date today (their lock-in starts now).
      - **Records and fee:**
        - a transfer record is created;
        - the **seller** pays the resale fee: round-half-up of shares × price × rate, plus 18% GST, due in 15 days;
        - the buyer pays nothing.
3. **History and notifications.** Every step appends to `history`. The seller is notified of each status, and the buyer on completion.
4. **Withdrawal.** The investor can withdraw while the status is submitted, under_review or rofr.
5. **Early sale.** The advisor can record the founder's written consent for an early sale, which lifts the 6-month lock-in for that holding.

### 7.8 Loans and loan transfers
**Loan life:**
1. founder applies;
2. lender sanctions or declines;
3. lender disburses, which raises the 2.5% debt success invoice for the company;
4. repayments are recorded by the lender or an advisor.

**Repayment schedule** (`schedule`):
- **Interest** each month = opening × rate_bps ÷ 120000, rounded half-up to the paisa.
- **During the moratorium** the company pays interest only.
- **After it,** a level EMI = P·r·f/(f−1), with r = bps/120000 and f = (1+r)^(T−M). The last instalment clears the balance.
- **Due dates** are the disbursal date + k calendar months, clamped to the month end.
- **Status:** paid, or overdue (due < today, unpaid), or pending.

**Loan summary:**
- disbursed
- principal repaid and principal pending
- interest earned (from paid instalments)
- interest this month
- next due date and amount
- number overdue
- remaining months

**Loan transfer** (RBI transfer of loan exposures):
1. The lender asks (regulated lenders only).
2. The advisor runs the steps in strict order. Reject (with a reason) is possible at any time while open.
   1. `eligibility`:
      - the seller must be regulated;
      - months held = days since disbursal ÷ 30.4375 must be ≥ the minimum holding: **3 months if the tenor is ≤ 24 months, otherwise 6**;
      - the result is stored.
   2. `consent`: date of the borrower's consent.
   3. `buyer_introduced`: a different, regulated lender.
   4. `deed_signed`: date.
   5. `charge_updated`: date (charge updated with the ROC).
   6. `completed`:
      - fee 0.3%–0.5% on the transfer amount, or on the principal pending if the amount is blank, round half-up;
      - **the loan's lender_id changes to the buyer**;
      - a transfer fee invoice goes to the selling lender (+18% GST, due in 15 days);
      - the buyer is notified.

   The selling lender is notified of every step.

### 7.9 Notifications and reminders
- Notifications are written by actions as listed above. Each has a `kind`, for example: offer, intro, sell, valuation, update, loan, fee, transfer, review, suggest, kyc, esign, payment, allotment.
- The menu shows the unread count. "Mark all read" is `read_notifications`.
- **Lock-in reminders** are computed on every state read, not stored. For each of an investor's holdings with shares > 0 whose lock-in ends in 1–7 days: "Lock-in for <company> ends in N days (<date>)", linking to the portfolio.

### 7.10 Compliance checklist (per company)
The items:
1. Registered valuer's report
2. Special resolution filed (MGT-14)
3. PAS-4 offer letters issued
4. Separate bank account for the issue
5. Shares allotted
6. PAS-3 filed (within 15 days of allotment)
7. Shares credited to demat

Each item holds a date, or is not done.

The compliance page also shows:
- offers used against 200 per FY and type, warning from 150;
- members against 200, warning from 180;
- platform investors against the limit;
- the PAS-3 deadline, which is allotment + 15 days.

### 7.11 Fees and invoices (business model)
- **Advisory fee:** from Rs 1 lakh, agreed in the engagement letter.
- **Success fee on equity raised:** 2.5%.
- **Debt success fee:** 2.5% of a loan disbursed through the platform. Raised automatically at disbursal and paid by the company.
- **Revenue share:** 0.4% of revenue a year for 5 years.
- **Lender fees:**
  - monitoring: 0.35% a year on the outstanding balance;
  - loan transfer: 0.3%–0.5%.
- **Resale fee:** 0.3%–0.5% of the sale value, paid by the selling investor. Buying is free.
- **GST** is 18% on everything (integer paise, `amount × 18 // 100`).
- **Default due date** is 15 days after issue.
- Each payer sees their invoices and can pay online (section 10). The advisor can raise invoices manually and mark them paid.
- The `dealFees` and `debtFees` calculators (Appendix B) project these fees.

### 7.12 Notes, tasks, templates and enquiries
- Advisors keep notes on companies, investors and lenders. A note with a due date is a task and can be ticked done or reopened.
- The **contact form** (`POST /api/enquiry`, no login) needs a name, a valid email and a message. It stores an enquiry, which advisors see on the Enquiries page.
- **Message templates** are advisor text snippets.

### 7.13 Files
- **Upload** with `POST /api/upload` (multipart: file, company_id, purpose, item).
  - Allowed types: pdf, xlsx, xls, csv, docx, png, jpg.
  - Maximum 8 MB. The file name is cleaned.
- **Who may upload:**
  - an advisor: any purpose;
  - a founder: dataroom or monitoring, for their own company only.
- **Download** with `GET /api/file/<id>`. It is checked against `can_see_file` and audited.
- Investors see document views watermarked with their name. The watermark is recorded in the view.

## 8. Limits and constants (all in one place)

| Rule | Value |
|---|---|
| Section 42 offers | 200 per company per FY per security type (warn at 150), including off-platform offers |
| Members (Section 2(68)) | 200 (warn at 180) |
| Platform investors per company | 20 by default (advisor setting, 1–200) |
| Lock-in after allotment or transfer | 6 months (early sale only with the founder's written consent) |
| Right of first refusal window | 15–30 days (can be waived in writing) |
| Resale fee (seller) | 0.3%–0.5% of shares × price |
| Loan transfer fee (selling lender) | 0.3%–0.5% of the amount moved |
| Debt success fee (company) | 2.5% of the amount disbursed |
| Equity success fee | 2.5% of the raise |
| Revenue share | 0.4% of revenue a year, 5 years |
| Monitoring fee (lender) | 0.35% of the outstanding balance a year |
| Advisory fee | from Rs 1 lakh (engagement letter refuses < Rs 1 lakh and > Rs 1 crore) |
| GST | 18%, integer paise |
| Invoice due | 15 days |
| Loan minimum holding before transfer | 3 months (tenor ≤ 24 months) or 6 months |
| Loan inputs | rate 0 < bps < 5000; tenor 1–240 months; moratorium < tenor |
| Repayment can be recorded | for instalments due up to 31 days ahead |
| Capital gains (unlisted) | ≥ 24 months long-term at 12.5%; otherwise slab |
| Passwords | 8–200 characters; 5 wrong tries per 15 minutes |
| Sessions | 8 hours idle, 24 hours maximum; two-step window 5 minutes |
| Invitation link | 30 days, single use |
| Password reset link | 1 hour, single use |
| Uploads | 8 MB; pdf, xlsx, xls, csv, docx, png, jpg |
| Assistant | 20 questions per user or IP per 10 minutes |

## 9. Calculations and tools

All of these are deterministic. The exact code is in Appendix B.
- `domain` covers dates, the financial year, schedules, counters and portfolio.
- `calc.js` covers the Funding Twin, simulation, readiness, term sheets, monitoring, fit score, fees and exit tax.
- `optimizer.js` is the Equity vs Debt Optimizer.
- `fundmix/engine.py` is the CMA funding report.

### 9.1 Shared maths (`domain`)
- `add_months` keeps the same day and clamps to the month's last day.
- `fy(date)` gives an April–March label, e.g. 2026-10-19 → "2026-27".
- `half_up(x)` is floor(x + 0.5).
- The loan schedule and summary are as in section 7.8.
- `members`, `platform_investors`, `fd_shares`, `offers_used`, `latest_valuation`, `lock_until`, `holding_view`, `portfolio` and `capital_gains_estimate` work as described in section 7.

### 9.2 Funding Twin (debt vs equity, for one raise)
**Inputs** (Rs crore and fractions), with these defaults:

| Input | Default | Input | Default |
|---|---|---|---|
| raise | 12 | ebitda0 | 5 |
| pre_money | 60 | ebitda_growth | 0.12 |
| value_growth | 0.18 | existing_ds | 1.5 |
| horizon | 7 years | dscr_min | 1.25 |
| loan_rate | 0.11 | cash | 3 |
| tenor | 7 | growth_sigma | 0.08 |
| moratorium | 0 | sales_drop | 0.2 |
| tax_rate | 0.25 | rate_shock | 0.02 |
| discount_rate | 0.14 | op_leverage | 1.5 |

**Outputs:**
- **The loan:** a yearly annuity schedule, the payment, total repaid and total interest.
- **Founder value:**
  - **all-debt:** the founder keeps 100% of company value V_n = (pre_money + raise)(1+g)^h, minus the debt cost (payments − tax shield + outstanding balance);
  - **all-equity:** the founder keeps (1 − stake) of V_n, where stake = E/(pre + E);
  - **net advantage** of debt, discounted to today.
- **Break-even:** the company value (debt cost ÷ stake), and the growth rate that produces it.
- **Best, expected and worst cases:** growth ± sigma.
- **DSCR paths** (CFADS ÷ debt service, each year):
  - **expected;**
  - **stress:** EBITDA cut by sales_drop × op_leverage, and rate + rate_shock.
- **Mix table** for debt shares from 0% to 100% in 5% steps. A mix is feasible when the expected min DSCR is ≥ dscr_min **and** the stress min DSCR is ≥ 1.0. **Best** is the feasible mix with the highest founder value (if none is feasible, the first mix).
- **Simulation:** 2,000 runs with the fixed seed 20261013 (mulberry32 + Box-Muller). It gives the chance that debt beats equity and the chance of a year with DSCR < 1.

### 9.3 Readiness Score
Two lists of items, each with points, maximum, pass/fail and a fix-it sentence.

**Debt items** (100 points):

| Item | Maximum |
|---|---|
| DSCR | 25 |
| Collateral cover | 20 |
| GST on time | 15 |
| Audited years | 10 |
| Credit score | 15 |
| Debt/EBITDA | 15 |

**Equity items** (100 points):

| Item | Maximum |
|---|---|
| Revenue growth | 25 |
| EBITDA-positive years | 15 |
| Board | 15 |
| Clean cap table | 15 |
| Data room | 10 |
| Team | 10 |
| Story | 10 |

Verdict: ≥ 75 "Ready", ≥ 55 "Nearly ready", otherwise "Not yet ready". The plan lists the fix sentences for failed items. The exact thresholds are in the code.

### 9.4 Term Sheet Analyser
- **Loan:** the all-in cost is the IRR of (amount − fees, then −payment × tenor). Red flags with severity:
  - personal guarantee;
  - cross-default;
  - prepayment penalty > 2%;
  - floating rate;
  - collateral margin > 25%;
  - fees adding > 0.5 points.
- **Equity:**
  - post-money, the investor's %, the option pool, the founder's %, and the effective pre-money when the pool comes out of the pre-money;
  - exit waterfall at 0.5×, 1×, 2×, 3× and 5× post-money, with participating or non-participating liquidation preference.
  - Flags:
    - participating preference;
    - preference > 1×;
    - full ratchet;
    - pool from pre-money;
    - pool > 10%;
    - ≥ 2 board seats;
    - > 6 vetoes.

### 9.5 Monitoring (covenants)
For each quarter:
- DSCR = (EBITDA − tax) ÷ (interest + principal), with tax = rate × max(EBITDA − interest, 0);
- Debt/EBITDA = debt ÷ (EBITDA × 4).

The state is **breach** if below the covenant, **watch** if within 10% headroom, otherwise **ok**. The default covenants are DSCR ≥ 1.25 and Debt/EBITDA ≤ 3.5.

### 9.6 Investor Fit Score (matching a company to an investor's mandate)

| Criterion | Points |
|---|---|
| Sector in the mandate (or 15 if only a past sector) | 35 |
| Stage | 20 |
| Ticket fits the raise (or 10 if within ±25%) | 25 |
| Instrument | 10 |
| Track record in the sector | 10 |

Each criterion comes with its reason text.

### 9.7 Equity vs Debt Optimizer
A browser port of the Python package `optimizer/equity_debt`; the same numbers are tested against the Python.
- **Method:** it tests every debt share from 0% to 100% in 1% steps. For each mix it computes founder cash, the exit stake and DSCR over the horizon, then ranks the mixes by the chosen metric:
  - present value of founder wealth (default);
  - total cash;
  - undiscounted wealth;
  - PV of cash.
- **DSCR limits:** below 1.25 is "risky" and below 1.0 is "default". Mixes below `min_dscr_required` are excluded.
- **Defaults (rupees):**

| Input | Default | Input | Default |
|---|---|---|---|
| amount | 3 crore | horizon | 10 |
| pre-money | 6 crore | tax | 0 |
| profit/month | 12 lakh | exit multiple | 5 |
| growth | 30% then 15% | discount | 12% |
| interest | 15% | payout | 100% |
| tenure | 5 years | | |

- **Output:** the advice text and exports (CSV, PDF).

### 9.8 CMA funding report (`fundmix`)
- **Input:** an uploaded bank CMA workbook (Excel), parsed by row labels: net sales, PBIT, depreciation, interest, PBT, tax, PAT, net worth, term loans, current liabilities, and so on. The required rows are NET SALES, PBIT, PBT and PAT, and parsing fails clearly if one is missing. Also the project inputs.
- **Method:** it sizes the debt the company can carry from cash flow (DSCR). The stress floor is a minimum DSCR of 1.20 with EBITDA −20% and rate +2 points.
- **Output:** a recommended debt/equity split and a one-page PDF report.
- **Access:** advisors only.

### 9.9 Exit tax view
- Gain = sale − cost. ≥ 24 months is taxed at 12.5%; otherwise at the slab rate.
- Notes:
  - a sale before 6 months needs the founder's consent;
  - a sale below fair market value can be taxed under sections 50CA and 56(2)(x).

### 9.10 PDF and spreadsheet exports
- Every tool report can be downloaded as a PDF; the reference build generates it in the browser with jsPDF.
- Every workspace table can be searched, filtered, sorted and paged, and downloaded as CSV or .xlsx.
- Underlined numbers open a "glass box" panel showing the formula, every input and its source (founder, advisor, benchmark, registered valuer, schedule, or engine), and the line "no AI produced this number".

## 10. Provider integrations (KYC, e-signing, payments)

Each flow goes through a provider adapter. Until real accounts exist, a clearly labelled **stand-in** plays the provider: a page where the tester chooses the outcome. Stand-ins are switched off in production. Provider results arrive as **signed webhooks** (`POST /api/webhooks/<provider>`, HMAC-signed). Each event is stored first, so a repeated event is ignored ("duplicate"). The result is applied in one locked transaction, like any action, and is audited.

- **KYC (investors):**
  - **Start:** `POST /api/kyc/start {pan, name}`.
    - The PAN must match `AAAAA9999A`.
    - The name is required.
    - The investor must not already be verified.
    - The same PAN must not be verified on another account (checked via a keyed HMAC of the PAN; only the last 4 digits are kept).
    - Sets kyc = `pending` and returns a provider redirect URL.
  - **Verified:**
    - kyc = verified, `kyc_verified_at`, `pan_last4`;
    - the investor and advisors are notified;
    - **waiting suggestions are released (section 7.4).**
  - **Rejected:** kyc = not_started, a `kyc_note` with the reason, and the investor is notified.
- **E-signing:**
  - **NDA:** an investor with a granted intro. `POST /api/esign/nda {intro_id}` reuses an open request if there is one.
  - **Engagement letter:** the advisor sends it to the company's founder with a fee of Rs 1 lakh to Rs 1 crore. `POST /api/esign/engagement`. A re-sent letter replaces the unsigned one; once signed it cannot be re-sent. It sets `company.engagement`.
  - **Every document:** the exact text is stored with its SHA-256 hash, and the hash is printed on the signed PDF.
  - **Signed:**
    - the signed PDF is stored;
    - an NDA sets `intro.nda_signed_at`;
    - an engagement letter sets `engagement.status = signed`, and advisors are notified.
  - **Declined:** the status is recorded, and advisors are notified for engagement letters.
  - **Download:** the signed copy can be downloaded by the signer and by advisors.
  - In production `sign_nda` without e-signing is refused.
- **Payments:**
  - **Start:** `POST /api/pay/<invoice_id>`, by the invoice's payer only:
    - the founder for company invoices;
    - the investor or lender whose `payer_id` matches.

    Refused if already paid. The amount charged is the amount + GST.
  - **Paid:** the paid amount must equal the expected amount exactly. A mismatch marks the payment failed and alerts advisors. The invoice gets `paid_on`, `paid_via` and `payment_ref`, and advisors are notified.
  - **Failed:** recorded.
- **Email, SMS and WhatsApp** go through an **outbox** table, written in the same transaction as the change and sent by a worker (`send-outbox`). Today they are printed until a real sender is added. Emails sent today: password reset and investor invitation.

## 11. Website assistant (chat)
- It answers questions about the firm, the services, pricing, the rules above and how to use the workspace. It uses Claude when an API key is configured, with a fixed set of facts.
- Otherwise the page uses built-in quick answers. The API returns 503 `{offline:true}` and the page falls back.
- It never computes client numbers and points to the tools for figures.
- **Limits:** questions up to a maximum length, a short history, and 20 questions per user or IP per 10 minutes.
- It knows the current page and the user's role.

## 12. API reference

All bodies are JSON, and non-GET requests need `X-Requested-With: glassbox`.

| Method and path | Purpose |
|---|---|
| GET `/api/me` | `{user}` or `{user:null}` |
| POST `/api/login` | `{email, password}` → `{user}` or `{mfa_required:true}` |
| POST `/api/login/mfa` | `{code}` |
| POST `/api/logout` | End the session |
| POST `/api/signup` | `{name, email, password, role, org, sector, invite?}` |
| GET `/api/invite/<token>` | Invitation details for the sign-up page |
| POST `/api/password/forgot` / `/api/password/reset` | `{email}` / `{token, password}` |
| GET `/api/account/security` | Two-step status and devices |
| POST `/api/account/two-step/setup`, `/enable`, `/disable` | TOTP |
| POST `/api/account/password` | `{password, new_password}` |
| POST `/api/account/sign-out-others` | End other sessions |
| GET `/api/state` | Role-filtered state (section 5) |
| POST `/api/act/<name>` | Any action in section 6 → `{detail, company_id}`, or 403 `{error}` |
| POST `/api/upload` | Multipart upload |
| GET `/api/file/<id>` | Download (permission-checked) |
| POST `/api/enquiry` | Contact form (no login) |
| POST `/api/chat` | `{messages, page}` → `{reply}` or 503 offline |
| GET `/api/integrations`, `/api/kyc` | Provider status, the user's KYC checks |
| POST `/api/kyc/start` | Start KYC → `{redirect_url}` |
| POST `/api/esign/nda`, `/api/esign/engagement`, `/api/esign/<id>/start` | E-signing |
| GET `/api/esign/<id>/document` | Signed PDF |
| POST `/api/pay/<invoice_id>` | Start a payment → `{redirect_url}` |
| POST `/api/webhooks/<provider>` | Signed provider callbacks |
| GET `/healthz` | Health check |

Status codes:

| Code | Meaning |
|---|---|
| 400 | Bad input |
| 401 | Not signed in, or wrong password |
| 403 | A rule refused (`Denied`) |
| 404 | Not found |
| 409 | Conflict |
| 413 | Too large |
| 429 | Rate limited |
| 503 | Assistant offline |

## 13. Demo data (fictional)

Load it into an empty database, and offer "Reset demo data" in the demo. Every login uses the password `demo1234`.

| Role | Email | Person and organisation |
|---|---|---|
| Founder | `founder@demo.in` | Priya Nair, Kalyan Polymers Pvt Ltd |
| Investor | `investor@demo.in` | Meera Iyer, Konkan Growth Partners |
| Advisor | `advisor@demo.in` | CA Neha Joshi |
| Lender | `lender@demo.in` | Suresh Pillai, Harbour Bank |

Other sample accounts:
- **Founders:** `rahul@demo.in`, `farah@demo.in`.
- **Investors:** `angels@demo.in`, `familyoffice@demo.in`, `inv04@demo.in` … `inv25@demo.in`.
- **Lenders:** `nbfc@demo.in`, `konkanbank@demo.in`, `deccan@demo.in`.

The full seed, with companies, holdings, loans, offers (Kalyan Polymers is near its offer limit, with 195 of 200 used in FY 2026-27), valuations and so on, is `server/seed.py` in Appendix B. Seed dates are written as offsets from today (`rel(months, days)`), so lock-ins, overdue instalments and deadlines always look current; FY keys use the current financial year. Every workspace page shows a banner saying the data is fictional.

## 14. Acceptance checks (the rebuild must pass all of these)

These mirror the automated tests of the working product.

**Permissions and visibility:**
1. Each role sees only what section 5 says. A founder never sees an investor's name before consent. An investor never sees the cap table or twin. A lender sees only their own loans.
2. Every action refuses the wrong role with 403, and nothing is saved on refusal.
3. File downloads follow `can_see_file`.

**Pipeline, reports and offers:**

4. You cannot offer before an approved report and the approved/offering stage. You cannot offer to an investor without verified KYC.
5. Section 42:
   - with 195 of 200 used, sending to 6 new investors is refused and 5 succeed;
   - re-offering the same investor in the same FY and type does not count twice;
   - a different security type has its own 200;
   - off-platform offers count.

**Allotment and holdings:**

6. Allotment needs an interested offer. It is refused above 20 platform investors or 200 members, and it moves the stage to funded.
7. Lock-in: a sale request is refused before 6 months unless consent is recorded.

**Resales:**

8. The resale steps only run in order.
9. The ROFR is 15–30 days, and a buyer cannot be introduced before it ends without a waiver.
10. On completion, shares and cost move correctly and the seller is invoiced 0.3–0.5% + 18% GST.

**Loans:**

11. Disbursal raises a 2.5% debt success invoice.
12. The repayment schedule matches `domain.schedule` to the paisa.
13. A loan transfer needs a regulated lender, the minimum holding period, strict step order and a regulated buyer. On completion the lender changes and a fee invoice is raised.

**Invitations and suggestions:**

14. Investors cannot sign up without an invitation. The invitation link is single-use, expires after 30 days, is bound to its email, and only its hash is stored.
15. Suggest → confirm → KYC verified → the offer is sent automatically. A decline needs a reason. A blocked send records the reason.

**Accounts and security:**

16. Wrong-password limit; sessions end on sign-out, password change and reset. A two-step code cannot be reused.

**Integrations:**

17. A repeated webhook event is ignored. A payment for the wrong amount does not mark the invoice paid. The same PAN cannot be verified twice.

**Audit:**

18. Every action writes an audit entry with before/after values, and audit entries cannot be updated or deleted.

**Calculations:**

19. The calculations give the same results as Appendix B for the same inputs. The Funding Twin simulation with the fixed seed is reproducible.


---

# Appendix A. Screen-by-screen: what each login can see and do

This is the product's own feature list. Ignore any remarks about looks or motion; keep every function.

This document lists every feature in the project as it stands today. It is written for readers who are not software developers, such as someone writing a business report.

**What the product is.** Aegis Ascend is an independent advisory firm for growing Indian businesses. It tells a company whether to raise money as a loan (debt), by selling shares (equity), or a mix of both. It then helps make the deal happen and stays with the company for five years. The project has these parts:

- a public website;
- a private workspace with four kinds of login: founder, investor, lender and advisor;
- three analysis tools for advisors: the Funding Twin, the Equity vs Debt Optimizer and the CMA funding report;
- two standalone tools that run outside the website.

**Two versions of the website.**

- **The real app** runs on a server. Accounts, passwords and data are stored securely, and every rule is enforced by the server.
- **The demo** is a single shareable link: https://claude.ai/artifact/J9CP4uLM2vzRSm1DXFR3HG. It has the same screens and rules, but keeps fictional sample data in the visitor's own browser. It protects nothing and is for showing the product only.

**Demo logins.** All use the password `demo1234`:

| Role | Email | Person and organisation |
|---|---|---|
| Founder | `founder@demo.in` | Priya Nair, Kalyan Polymers |
| Investor | `investor@demo.in` | Meera Iyer, Konkan Growth Partners |
| Advisor | `advisor@demo.in` | CA Neha Joshi |
| Lender | `lender@demo.in` | Suresh Pillai, Harbour Bank |

Other sample accounts:
- **Founders:** `rahul@demo.in` and `farah@demo.in`.
- **Investors:** `angels@demo.in`, `familyoffice@demo.in`, and `inv04@demo.in` to `inv25@demo.in`.
- **Lenders:** `nbfc@demo.in`, `konkanbank@demo.in` and `deccan@demo.in`.

All companies, people, banks and figures in the sample data are fictional.

---

## 1. Features found everywhere

These apply across the whole product, not to one login.

- **"Glass box" numbers.** Most calculated numbers are underlined. Clicking one opens a side panel showing:
  - the formula;
  - every input used;
  - where each input came from (founder, advisor, benchmark, registered valuer, the schedule, or the calculation engine).

  The panel states that no AI produced the number.
- **The golden rule.** All maths is done by fixed calculation code, never by AI. Where the product writes a plain-language summary, a checker compares every number in the text with the engine's output.
- **Indian money formats.** Amounts show in full (Rs 1,23,45,678) or short form (Rs 1.23 Cr, Rs 45.6 L). Behind the scenes, money is stored in paise (whole numbers), so there are no rounding errors.
- **Tables.** Almost every list in the workspace can be:
  - searched;
  - filtered with drop-downs;
  - sorted by clicking a column header, with the header staying visible while you scroll;
  - split into pages;
  - downloaded as CSV or as an Excel (.xlsx) file.

  On a phone, each table row becomes a card.
- **Confirmation boxes.** Every important or irreversible step asks you to confirm before it happens. This covers completing a transfer, publishing a valuation, sharing an offer, moving a company, rejecting a request, and similar steps.
- **Pop-up messages ("toasts").** Success and error messages slide in at the bottom right of the screen.
- **Notifications page** for every login, with an unread count on the menu.
- **Activity or audit log** for every login. It is a permanent record of who did what and when; entries can never be edited or deleted. Advisors also see the before and after values of every change.
- **Motion:**
  - pages fade in;
  - lists appear one item after another;
  - numbers count up;
  - a value flashes green when it rises and red when it falls;
  - charts draw themselves when they scroll into view;
  - the current step on a progress timeline gently pulses.

  Every animation is short, and all of them switch off for people whose device is set to reduce motion.
- **Loading and empty states.** A grey placeholder layout shows while a page loads. Empty lists show a small emblem drawing and a suggested next step.
- **Light and dark mode.** The workspace follows the device's setting.
- **Phone-friendly.** Every page works on a screen 375 pixels wide.
- **Accessibility:**
  - every action can be done with the keyboard;
  - focus outlines are visible;
  - buttons that show only an icon have hidden text labels for screen readers;
  - text contrast meets the WCAG AA standard.
- **Private by design.** Workspace pages exist only behind sign-in and are marked so search engines do not index them. There are no public deal pages.

---

- **Website assistant ("Ask Aegis").** A chat button at the bottom right of every page, public and workspace, opens a chat panel.
  - It answers questions about services, fees, raises, exits, loans, compliance and how numbers are checked, with links to the relevant page. It suggests five starter questions.
  - **It guides people around the site.** It knows every public page and every workspace page for each role (from `site/sitemap.json`), and which page the visitor is on and whether they are signed in.
    - "Where is…" and "How do I…" get a link that opens the page.
    - "What can I do on this page?" explains the current page and suggests the next one.
    - "Show me around" gives a short tour, for a visitor or for the signed-in role.
    - A page from another role's workspace comes with sign-in directions; advisor-only tools come with an explanation.
    - Starter questions change with the role.
  - It gives general information only: no personal advice, no calculations (it points to the calculators or an advisor), and nothing beyond what the website says.
  - On the server it answers with Claude, using the website's own facts. Each visitor can ask at most 20 questions in 10 minutes.
  - Without Claude credentials, and on the demo, it answers from built-in quick answers and says so.
  - The conversation is kept for the browser tab session. It works with the keyboard (Enter to send, Esc to close) and becomes full screen on phones.

## 2. Public website (no login needed)

The look is black and gold, matching the Aegis Ascend logo.

### Header and footer (every public page)
- The logo and wordmark, plus menu links: Services, For investors, For lenders, Pricing, Trust & compliance, About, Sign in, and "Book an engagement".
- On phones the menu collapses behind a Menu button.

### Home page
Each item below is a section of the page, in the order a visitor scrolls through them.
1. **Opening animation.** The page opens on a 3D gold AA emblem, made of two upright A's with a floating diamond. It turns slowly and follows the pointer, and the name rises in under it. Browsers without WebGL, and visitors who prefer reduced motion, get a layered 2D version.
2. **Scroll intro.** As you scroll, the camera flies in, the two A's slide apart to the edges of the screen, and a city of lit buildings rises behind the headline. The diamond rises above the headline, and "Smarter Decisions. Stronger Futures." comes forward with a short description and two buttons: "Book an engagement" and "Try the live model".
3. **Live example.** A sample company needs Rs 12 crore. A split bar fills to show the recommended debt and equity shares, with three figures you can click to see their working:
   - how much better off the founder is than with all-equity;
   - the lowest repayment safety (DSCR);
   - a "Reviewed" stamp.
4. **Three promises:** for founders, for investors, and Aegis Ascend's role.
5. **"Protection, then ascent."** An annotated drawing of the emblem explains the brand: what Aegis, Ascend and the emblem mean, plus the firm's philosophy.
6. **What we stand for.** The firm's principles.
7. **How every report is made.** Eight steps in order, and the golden rule.
8. **Tools behind the advice.** A list of the tools, each linking into the workspace.
9. **The founders.** Photos of Hem Parekh, Yash Sharma and Vivan Shah, each a Co-founder.
10. **Closing call to action** with pricing from Rs 1 lakh.
- Sections fade in as you scroll, and the founder photos uncover from the bottom.

### Services
Each item below is a section of the Services page.
- **Debt vs equity advisory:** what is included.
- **Equity raise and early exit:** how a raise closes (8 steps) and how an early exit works (7 steps).
- **Debt:** arranging a loan (6 steps) and how monitoring works.
- A note that resales are private and negotiated.

### For investors
- Why investors see fewer but checked companies.
- Direct share ownership, and a way out after the minimum holding period.
- How deal rooms work.
- A tax table.
- An **exit tax calculator.** You enter the amount invested, sale price, months held, your tax slab and fair market value, and it shows the gain and the estimated tax: short-term at your slab rate, or long-term at 12.5% after 24 months. It warns when the price is below fair market value.
- A call to join the investor panel.

### For lenders
- The lender-side view, monitoring, and loan transfers.
- A **debt fee calculator.** You enter the loan, tenor, rate, monitoring fee % and transfer amount and fee %. It shows monitoring fees over the loan, the first-year monitoring fee and the transfer fee, with a bar chart by year.
- A call to become a partner lender.

### Pricing
- A fee schedule: the advisory fee from Rs 1 lakh, a 2.5% equity success fee, a 2.5% debt success fee on loans we arrange (paid by the company at disbursal), a 0.4% revenue share for 5 years, a 0.3–0.5% resale fee paid by an investor who sells (buying is free), and the lenders' arranging commission, monitoring and transfer fees. All fees are plus 18% GST.
- A **"What one deal is worth" calculator.** You enter the equity raised, revenue, revenue growth and advisory fee. It shows each fee and the 5-year total, with GST and a bar chart.
- Revenue share terms.

### Trust & compliance
- **Compliance by design:** how each activity is structured legally.
- **The firm's commitments**, and the legal opinions being obtained.
- **A security table.** This describes planned controls; see section 9.
- **Quality controls.**
- **The release checklist every report must pass.**

### About
- The founders.
- Who the firm serves first (the pilot target).
- How it compares with other players.
- A roadmap with four phases: Validate, MVP, Ongoing services, Debt desk.

### Contact
- An enquiry form (name, email, company, message). Submissions appear on the advisor's Enquiries page.

### Sign in and Create an account
- **Sign in** with email and password.
- **On the demo,** one-click buttons for each role, plus a "Reset demo data" link.
- **Create an account** as a founder, investor or lender. Founders also get a company record. Advisor accounts cannot be created this way; only an administrator can create them.
- **Lockout:** after 5 wrong passwords, the account is locked for 15 minutes.

---

## 3. Founder login

Menu groups: **Fundraise** (Fundraise tracker, Investors, Deal room, Cap table, Data room, Revenue share), **Debt** (Loans & monitoring, Fees) and **Account** (Company profile, Notifications, Activity log).

Founders do **not** have the analysis tools (Funding Twin, Optimizer, CMA report, Readiness Score, Term Sheet Analyser). Those are advisor-only, and the advisor prepares the founder's report.

### Overview (home)
- **Headline cards:** the company's stage with Aegis Ascend; the advisor-approved recommended mix; how many investors are interested out of those offered; and the report's status.
- **Next steps checklist:**
  1. complete the profile;
  2. upload the data room;
  3. the advisor prepares the report;
  4. the advisor signs it off;
  5. the offer is shared with investors;
  6. approve deal-room requests;
  7. shares are allotted.

  Completed steps are crossed out, and a "Reviewed by" stamp appears once the report is signed off.
- **Needs your decision:** investors asking for deal-room access, with Grant and Decline buttons.
- **Fundraise summary**, plus the latest covenant check: DSCR with an "Within covenants", "Close to limit" or "Breach" label.

### Fundraise tracker
- **A stage timeline:** Applied, Under review, Approved, Offering, Funded, Monitoring.
- **Offers sent this financial year.** Clicking the number shows how it is made up: offers made through Aegis Ascend plus offers the company made directly, against the limit of 200.
- **Investor counts:** how many are interested, how many committed, and the amount raised so far against the target.
- **Investor list:** interested and committed investors. Names appear only when the investor agreed to share them; otherwise "Name shared after the investor consents".
- **Documents still pending:** filings the advisor has not yet ticked off.

### Investors
- **Investor panel:** every investor on the platform, ranked by **Investor Fit Score** (out of 100), with the reasons for each score: sector, stage, ticket size and instrument.
- **Status on each card:** a deal-room request, an NDA signed, or the investor's response to the offer.
- **"Suggest to my advisor".** It sends the advisor a notification and a note. The founder cannot send offers directly, because offers count towards the legal limit.
- **Grant or decline deal-room requests.**

### Deal room
- **Documents:** add or remove document names in the deal-room list.
- **Who has access:** each investor, with their request status and when they signed the NDA.
- **"Who viewed what":** a log of every document opened, by whom and when.

### Cap table
- **Every shareholder:** founders, existing shareholders (one row can stand for a group, for example "12 friends and family") and platform investors, with share counts.
- **Ownership:** each holder's percentage today and after the planned round, on a fully diluted basis (including options and convertibles not yet issued).
- **Members:** the count of members against the 200 limit.
- **"Effect of the planned round" calculator.** You enter the equity to raise and the price per share. It shows the new shares, the fully diluted total, what new investors will own (click for the working), and the founders' stake before and after. The default amount is the equity share of the approved mix.

### Data room
- **Eight-item checklist with a progress bar:**
  1. audited accounts for 3 years;
  2. GST returns for 12 months;
  3. CMA data;
  4. cap table;
  5. board resolution;
  6. customer contracts;
  7. bank statements;
  8. the debt vs equity report.
- **Upload or replace a file for each item.** Accepted types are PDF, Excel, Word, CSV and images.
- **Other documents:** add or remove names, and download uploaded files.
- **Investor views:** a log of what investors who shared their name have viewed.

### Revenue share
- **Cards:** paid to date (including GST), amount due, and an estimated quarterly charge (annual revenue ÷ 4 × 0.4%; click for the working).
- **Statements table:** each quarter's amount, GST, due date, and Paid, Due or Overdue status.

### Loans & monitoring
- **Loans table:** lender, amount, rate, tenor and moratorium, amount outstanding, next EMI with its amount, any overdue instalments, and status.
- **Apply through Aegis Ascend.** Choose a lender, then enter the amount, expected rate, tenor and moratorium. The lender is notified.
- **Debt success fee.** A loan arranged through Aegis Ascend carries a 2.5% fee (plus GST), paid by the company. It is invoiced automatically when the lender disburses the loan, and the founder is notified.
- **Upload quarterly accounts.** The file goes to the advisor and lenders.
- **Covenant monitoring:**
  - a DSCR line chart by quarter against the covenant line;
  - a table of EBITDA, interest, principal, debt, DSCR, Debt/EBITDA and status;
  - an early-warning message when the latest quarter is close to or in breach of a covenant;
  - a form to add a new quarter.

### Fees
- The fee calculator for this company's raise and revenue, plus 18% GST.
- **Your invoices:** every invoice to the company (advisory, equity success, debt success, revenue share), with GST, due date and Paid, Due or Overdue status.

### Company profile
- Edit the company name, sector, stage, city, revenue and amount to raise.

### Notifications and Activity log
- **Notifications:** deal-room requests, and the founder's own updates.
- **Activity log:** everything done for this company.

---

## 4. Investor login

Menu: Portfolio, Opportunities, Curated deals, Deal rooms, Sell requests & exits, Notifications, Activity log.

### Portfolio (home), styled like a share (demat) account
- **Summary cards:**
  - total invested;
  - current value at the latest valuations;
  - gain or loss in rupees and %, green or red;
  - number of companies held;
  - **XIRR**, the annualised return. Click it to see the cash flows used.
- **Holdings table, one row per holding.** It shows:
  - the company and its sector;
  - the investment date and allotment date;
  - shares held;
  - ownership %, worked out as shares ÷ the company's total fully diluted shares (click for the working);
  - the amount invested and average cost per share;
  - the latest price per share and its valuation date;
  - the current value (click for the working);
  - gain or loss in rupees and %;
  - a status badge: "Locked until DD MMM YYYY" or "Eligible to sell". "Eligible: founder consent" appears when the founder allowed an early sale.
  - **Request to sell.** The button is greyed out, with the unlock date, until 6 months after allotment.
- **Chart:** portfolio value at each valuation date against the amount invested.

### Holding detail (click a company)
- **Cards:** shares and % of the company, current value, gain or loss, and holding status.
- **Sell request:** if one is open, its timeline appears here.
- **Charts:** valuation history (price per share at each quarterly revaluation) and your own value over time against the amount invested.
- **Valuations table:** date, method (DCF or market multiples), registered valuer, price, and a download link for the valuer's report when one was uploaded.
- **Tax view if sold today.** Labelled "Estimate". It shows the months held; whether the gain would be short-term (under 24 months, at your slab rate) or long-term (24 months or more, at 12.5%); the gain at today's valuation; and the estimated long-term tax, which you can click for the working.
- **Documents:** download a summary of the SSA (Share Subscription Agreement), the SHA (Shareholders' Agreement), the allotment letter and the PAS-4 offer letter. The signed originals are held by Aegis Ascend.
- **Company updates:** news posted by the advisor or founder.

### Sell request flow
1. **Choose what to sell:** the full stake (the default) or part of your shares. A note warns that a part sale adds a new shareholder.
2. **Optionally add** an indicative price per share, seen only by the advisor, and a note.
3. **Confirm.** The request reaches the advisor as "Submitted".
4. **Follow it on a timeline:** Submitted → Under review → First-refusal window (with the end date) → Buyer introduced → SPA (share purchase agreement) signed → Transfer complete. If the request is withdrawn or rejected, the timeline shows that, with the reason.
5. **Withdraw** the request while it is still early in the process.

### Sell requests & exits
- **Fees:** buying shares is free. When an investor sells, a resale fee of 0.3–0.5% of the sale value (plus GST) is charged once the transfer completes; the buyer pays nothing.
- Every sell request, each with its timeline. A completed sale shows the agreed price, the sale value and the resale fee.
- **Your invoices:** the investor's resale fee invoices, with GST, due date and status.
- The **exit tax calculator** (the same one as on the public site).

### Opportunities
- **Private offers** the advisor shared with this investor only, with a notice: "Private offer… do not forward".
- **Each offer card shows:**
  - the amount being raised;
  - the offer price per share;
  - the engine's best mix and lowest DSCR, including the stress case;
  - the "Reviewed by" stamp and the advisor's note.
- **Actions:**
  - **Read the advisor-reviewed report.** It opens watermarked with the investor's name, and the view is logged.
  - **Express interest.** You can choose to share your name with the founder.
  - **Decline.**

### Curated deals
- **Companies offered to this investor,** ranked by Investor Fit Score with the reasons, the engine's view, and the "Reviewed by" stamp.
- **Request deal-room access.** The founder decides.

### Deal rooms
- Rooms for which the founder granted access.
- **Sign the NDA online** first: tick the box, then press Sign. After that, the report summary cards and the document list appear.
- **Opening a document** watermarks it with the investor's name and logs the view for the founder.

### Notifications
- A new private offer has been shared.
- A revaluation has been published.
- Shares have been allotted.
- A company update has been posted.
- A sell request has changed status.
- The founder has decided on a deal-room request.
- **"Lock-in ends in N days"**, starting 7 days before the date. This is worked out automatically.

### Activity log
- The investor's own actions.

---

## 5. Lender login

Menu: Loan book, Lender desk, Applications, Monitoring, Loan transfers, Fees, Notifications, Activity log.

### Loan book (home)
- **Warning banner** if any loan has an overdue instalment, linking to it.
- **Summary cards:**
  - total lent;
  - principal outstanding (click for the working);
  - interest earned to date;
  - interest due this month;
  - next repayment (date, amount and borrower);
  - number of active loans.
- **Loans table.** It shows:
  - the borrower, with an "Overdue" flag where relevant;
  - sanction and disbursal dates;
  - the amount disbursed and the rate;
  - the tenor and moratorium;
  - principal repaid and principal pending;
  - interest earned and monthly interest;
  - the next instalment date and amount;
  - **the latest DSCR** with a coloured badge: green at 1.5 or above, amber from 1.25 to 1.5, red below 1.25. You can filter by DSCR colour.
- **Monthly interest income chart:** the last 12 months earned and the next 12 months projected, with projected bars shown lighter.

### Loan detail
- **Cards:** outstanding, interest earned, next instalment, latest DSCR.
- **Charts:** the outstanding balance after each instalment, with a "Now" marker, and the interest received each month.
- **Repayment schedule table.** Each row shows the instalment number, due date, opening balance, interest (click for the working), principal, closing balance and status: Paid with the date, Pending, or Overdue (overdue rows are highlighted). You can filter by status. **"Mark received"** records a payment for instalments due up to a month ahead.
- **How the schedule works:** interest only during the moratorium, then a level EMI. The last instalment clears the balance exactly.
- **Quarterly monitoring:** the same DSCR chart and covenant table the founder sees.
- **Documents:** the standard loan documents are held by Aegis Ascend, and any uploaded files can be downloaded.
- **"Sell this loan".** Enter an amount (or leave it blank for the full outstanding) and a note. The request goes to the advisor. Once a sale exists, its timeline appears here.

### Lender desk
- **Overview cards:** new applications, loans monitored, book size, covenant alerts.
- A list of loans whose latest quarter is close to or in breach of a covenant.

### Applications
- **Each application shows:** the company's debt readiness score, the lowest DSCR if the whole raise were a loan (including the stress case), the engine's best mix, and whether the advisor's report is approved.
- **Actions:** Sanction, Decline, then "Mark disbursed", which starts the repayment schedule from that day.

### Monitoring
- Quarterly covenant checks for every disbursed loan.

### Loan transfers
- **How a loan sale works:** the seven steps, in order, with who acts at each: you request; the advisor checks eligibility, gets the borrower's consent and introduces a regulated buyer; you and the buyer sign the deed; the charge is updated with the ROC; the loan moves and the 0.3–0.5% transfer fee is invoiced.
- **Each sale shows its step**, for example "Step 2 of 7: Eligibility is checked. Next: the borrower consents (your advisor)".
- **"Sell a loan" button** (also on the Loan book, and as a Sell button on every loan's row, next to the borrower's name; a loan already being sold shows "Sale in progress"). Pick one of your disbursed loans, enter the amount (blank for the full outstanding) and a note. The request goes to your Aegis Ascend advisor's Loan transfers queue, with a notification.
- **Each transfer request has a timeline:** Requested → Eligibility checked → Borrower consent → Buyer lender introduced → Assignment deed signed → Charge updated with the ROC (Registrar of Companies) → Transfer complete. A rejected transfer shows its reason.
- **Details shown:** the amount, the buyer and the fee.

### Fees
- **Invoices:** this lender's monitoring and transfer fee invoices, with GST, due date and status.
- **Debt fee calculator.**

### Notifications
- New loan applications.
- Transfer request status changes.
- A loan moved into this lender's book.

---

## 6. Advisor login (the Aegis Ascend team)

Menu groups: Today; **Deals** (Company pipeline, Companies, Investor directory, Deal rooms, Resale requests, Revaluation centre); **Debt** (Loan transfers, Loans & DSCR); **Practice** (Review queue, Compliance, Revenue, Notes & tasks, Message templates); **Tools** (Funding Twin, Equity vs Debt Optimizer, CMA funding report, Readiness Score, Term Sheet Analyser); **Admin** (Enquiries, Audit log, Settings).

### Today (home)
- **Cards:** items needing attention (with how many are overdue or blocked), open requests, reports to review, and tasks due in the next 3 days.
- **Alert lists, most urgent first,** each linking to where you fix it:
  - revaluations due or overdue;
  - requests waiting more than 5 days;
  - PAS-3 filing deadlines (15 days after allotment);
  - lock-ins ending this week;
  - companies near a limit (150 or more offers, 180 or more members, close to 20 platform investors);
  - repayment alerts (overdue instalments, or DSCR below 1.25);
  - tasks due, which you can tick off right there;
  - reports to review.

### Company pipeline
- **Board view.** Columns: Applied, Under review, Approved, Offering, Funded, Monitoring, Closed, Rejected.
  - **Each company card shows:** the raise amount and debt/equity mix, offers this year out of 200, interested and committed counts, platform investors out of 20, members out of 200, and days in the current stage.
  - **Moving a company:** drag a card to another column (the column highlights), or use its "Move to…" menu. You confirm, and the move is logged.
  - **The server refuses impossible moves,** for example approving a company with no signed-off report.
- **Table view** of the same information, with sorting and export.

### Company file (click a company)
- **Counters:** offers this financial year, members and platform investors. Each is a bar that turns amber at the warning level and red at the limit.
- **Cap table:**
  - founders, existing shareholders (with holder counts) and platform investors, with shares and fully diluted %;
  - add or edit founders and existing shareholders;
  - for a locked holding, **"Record founder consent"** allows an early sale;
  - **"Edit offer terms"** sets the offer price, the type of security (equity, preference or debentures) and the unissued options;
  - **off-platform offers:** record offers the company made directly this year, which count towards the 200.
- **Offer log:** every offer with its date, financial year, security and response. When a response is "interested", **"Record allotment"** asks for the shares, the amount received and the allotment date.
- **Valuation history:** a chart and a list, plus a "Publish revaluation" button.
- **Documents checklist:**
  1. the registered valuer's report;
  2. the special resolution (MGT-14);
  3. the PAS-4 offer letters;
  4. a separate bank account for the money raised;
  5. the share allotment;
  6. PAS-3, filed within 15 days of allotment, with a countdown;
  7. demat credit.

  Ticking an item asks for the date.
- **Fees:** this company's invoices, with "Raise invoice" and "Mark paid".
- **Notes and tasks** for this company.
- **Buttons:** Share offer, and Post update (which notifies the company's shareholders).

### Companies
- **Every client company:** sector, revenue, raise, debt and equity readiness scores, and report status, with a link to open the company in the Funding Twin.

### Investor directory
- **Every investor.** The table shows:
  - KYC status (Verified, Pending or Not started), with an Edit button;
  - whether they signed the platform NDA, and when;
  - whether they are accredited;
  - preferred sectors and ticket size;
  - total invested through the platform and companies held;
  - last active date;
  - Investor Fit Score for the chosen company.
- **Filters:** sector, ticket size, KYC and accreditation, plus a search box.
- **Sharing an offer:**
  1. pick a company in Approved or Offering status;
  2. see **"Offers this year: N / 200"** and how many are left;
  3. tick investors, or press **"Suggest a shortlist"**, which picks KYC-verified investors scoring 60 or more who have not had this offer;
  4. press **"Share offer"**.

  The confirmation shows the count before and after sending. Sending is blocked if it would pass 200, or if anyone selected has not completed KYC.
- **Every share is recorded as an offer:** company, investor, date, financial year, security type, and response (pending, interested, declined or invested).

### Deal rooms
- **Every deal-room request.** For each one you see:
  - the company and the investor;
  - the request status and when the NDA was signed;
  - the number of documents viewed;
  - the investor's offer response, with "Record allotment" when the investor is interested.

### Resale requests (equity)
- **Queue table.** Each request shows:
  - the investor and company;
  - shares and % of the company;
  - full or partial sale, with a "Adds a member" warning on partial sales;
  - the date the shares became eligible to sell;
  - the indicative price and the status;
  - how long the request has been waiting.
- **Workflow buttons:**
  1. **Start review.**
  2. **Start first-refusal window:** 15 to 30 days.
  3. **Introduce buyer.** The list shows only KYC-verified investors who keep the company within its 20-investor and 200-member limits. This does not count as a legal offer. Proceeding before the window ends needs a written waiver.
  4. **Record SPA signed:** the date and agreed price.
  5. **Complete transfer.** The advisor enters the resale fee (0.3–0.5% of the sale value, paid by the selling investor). The confirmation shows the sale value and the member and investor counts after the transfer. Completing updates both portfolios, the cap table and the member count.
  6. **Reject** with a reason, available at any step.

### Revaluation centre
- **Companies due for their quarterly revaluation,** sorted by due date. Overdue companies are shown in red.
- **The revaluation form:** valuation date, method (DCF or market multiples), price per share, registered valuer, and an upload of the valuer's report.
- **Before publishing,** a confirmation shows the change % and the total change across investors' portfolios.
- **Publishing** updates every investor's value and gain, and notifies them.

### Loan transfers
- **Queue:** borrower, selling lender, amount outstanding, remaining months, latest DSCR, and a status timeline.
- **Next-step button:**
  1. **Check eligibility:** the seller is regulated and has held the loan for the minimum period (3 months for loans of 2 years or less, otherwise 6).
  2. **Record borrower consent.**
  3. **Introduce a buyer lender:** regulated banks and NBFCs only.
  4. **Record the signed deed of assignment.**
  5. **Record the charge updated with the ROC.**
  6. **Complete,** with a transfer fee of 0.3% to 0.5%.

  Completing moves the loan to the buyer's book and raises the fee invoice automatically.
- **Reject** with a reason.

### Loans & DSCR
- **Every disbursed loan:** borrower, lender, amount, outstanding, next instalment, overdue status, and latest DSCR.

### Review queue
- **Reports waiting for sign-off,** each showing:
  - the best mix, net effect, break-even value and lowest DSCR, including the stress case;
  - the release checklist: validation, founder confirmation, the number check, and the engine version.
- **Approve and stamp,** or **Request changes**, with a review note. Approving moves the company to "Approved".

### Compliance
- **Per company:** the offer counter, the member counter and the platform investor counter, plus a list of missing filings.
- **Holding-period timers:** every holding still locked, with the days left and any founder consent.
- **A link to the audit log.**

### Revenue
- **Cards for each fee type,** showing paid and due:
  - advisory fees;
  - success fees (2.5%);
  - debt success fees (2.5% of loans arranged);
  - resale fees (0.3–0.5%, paid by selling investors);
  - revenue share (0.4%);
  - debt monitoring fees;
  - transfer fees.
- **Fees by month:** a stacked bar chart over 12 months.
- **Invoices table:** filter by fee type and status (Paid, Due, Overdue). Mark an invoice paid, or raise a new one with GST at 18% added.

### Notes & tasks
- **Notes on any investor, lender or company.** Adding a due date turns a note into a task. Tick tasks to complete them, and filter by subject or status.

### Message templates
- **One editable email template** with placeholders: investor name, firm, company name, sector, raise, offer price and advisor name. It is saved in the advisor's browser.
- **Pick a company** to get one individually addressed message for each investor who already has its offer. Each message has Email, WhatsApp and Copy buttons. Nothing is sent automatically; each button opens your own email or WhatsApp with one message for one person.

### Tools (advisor-only)
- **Funding Twin.** A live model of a company's finances, where the advisor prepares and submits the company's report.
  - **Inputs:** raise, valuation, growth, EBITDA, existing debt, rate, tenor, moratorium, tax, discount rate, minimum DSCR, and the range of outcomes. Each input is labelled with its source: founder, benchmark or advisor.
  - **Results:**
    - **Best mix:** every debt share from 0% to 100% in 5% steps, with feasibility tests at the expected case and at a stress case of sales -20% and rates +2 points.
    - **Net Effect Bridge:** the founder's value under all-equity, all-debt and the best mix.
    - **Break-even Value:** above this company value, debt wins.
    - **Best, expected and worst cases.**
    - **Stress sliders:** sales falling and interest rising, with DSCR redrawn each year.
    - **A 2,000-run simulation:** the chance that debt wins, the risk of a year where profit doesn't cover payments, and the range of outcomes. A fixed random seed makes the same inputs always give the same answer.
    - **The loan schedule.**
    - **A plain-language summary** with an automatic number check.
  - **Submitting the report:** a release checklist, then **"Submit for advisor review"**.
- **Equity vs Debt Optimizer.** It tests every mix from 0% to 100% equity in 1% steps, year by year, and finds the one that leaves the founder the most money.
  - **Headline:** the best mix, monthly take-home in year 1, total cash, wealth including the exit, and the comparison with 100% equity and 100% debt.
  - **Charts:** the outcome for every mix; where each month's profit goes (stacked bars by year); cumulative cash; DSCR by year.
  - **Analysis:** the longer-horizon table, a sensitivity table, written suggestions, the full table of mixes, and a step-by-step "Show the calculation".
- **CMA funding report.** It opens in a separate page.
  1. **Upload the bank CMA workbook** (Excel), or use the sample. The file is read inside the browser and never uploaded.
  2. **Enter the project and financing details.** Industry presets fill typical lender norms.
  3. **Read the result:** debt sized on repayment safety (DSCR), with the lender's minimum promoter contribution, a stress test, and charts.
  4. **Download a one-page A4 PDF** for lenders.

  **The tool is locked to advisors.** Anyone else sees an "Advisors only" page in the site's style.
- **Readiness Score.** Debt and equity readiness scores out of 100, each with a factor-by-factor breakdown, a verdict, and a fix-it plan.
- **Term Sheet Analyser:**
  - **Loan sanction letter:** the true all-in yearly cost, the instalment, the total paid, and flags for risky clauses (floating rate, personal guarantee, cross-default, prepayment penalty and similar).
  - **Equity term sheet:** the founder's stake after the round, the effective pre-money valuation, a "who gets what at exit" table, and flags for risky clauses (full-ratchet anti-dilution, participating preference, a large option pool and similar).

### Suggesting investors (invite-only investors)
- **Investors join only by invitation.** The public sign-up offers founder and lender; investors use a private link.
- **The founder suggests** investors they would like to pitch, on the Investors page: from the ranked panel ("Suggest to my advisor"), or someone new by name, email and firm ("Suggest a new investor"), with an optional note. "Your suggestions" shows each one's status: waiting for your advisor, invited to join, waiting for KYC, offer sent, declined (with the advisor's reason) or could not send.
- **The advisor confirms or declines** under "Suggestions from founders" (on Today and the Investor directory). A decline needs a reason the founder sees.
  - Confirming a platform investor sends the offer at once if their KYC is verified, otherwise as soon as it is, inside the Section 42 offer limit.
  - Confirming someone new creates an invitation: the server emails a private link (valid 30 days, single use, only its hash stored; the demo shows the link to the advisor instead). The invitee signs up with the invited email; their offer goes out automatically once their KYC is verified.
- The company must have a signed-off report and be Approved or Offering before an advisor can confirm investors.

### Downloading reports as PDF
- **Every tool has a "Download PDF" button** at the top of its page: the Funding Twin, the Equity vs Debt Optimizer, the Readiness Score and the Term Sheet Analyser. The CMA funding report keeps its own one-page PDF.
  - The PDF is branded and A4. It holds the tool's results as shown on screen (headline figures, tables, charts and written summary), followed by a table of every input used.
  - It is marked **"Working draft · not yet reviewed"**, because only a report signed off by an advisor is final.
- **The signed debt vs equity report** can be downloaded as a PDF:
  - **Advisor:** from each report in the Review queue (a report still in review is marked as a draft).
  - **Founder:** from the new "Debt vs equity report" panel on the Fundraise tracker, once the advisor has signed it off.
  - **Investor:** from each private offer under Opportunities. The PDF carries a watermark with the investor's name and the date, and each download is logged as a document view.
  - It carries the "Reviewed by" stamp, the recommended mix, the advisor's note and the release checklist. Founders and advisors also get the full working: founder value by route, the range of outcomes, DSCR by year, the loan schedule and every assumption. Investors get the reviewed summary only.
- PDFs are made in the browser with jsPDF (`site/jspdf.min.js`, laid out by `site/pdf.js`), so they work in the demo and on the server, and nothing is uploaded.

### Admin
- **Enquiries:** messages from the website's contact form.
- **Audit log:** every action, with filters by action, user and company, plus search. Each entry can be expanded to show the exact before and after values. You can export it.
- **Settings:** the platform-investor limit per company (default 20), with a summary of all limits.

### Advisor notifications
- New reports to review.
- Investors' interest or declines.
- New sell requests.
- Loan transfer requests.
- Investors suggested by founders.

---

## 7. Rules the system enforces

These are checked by the server on every action, so the screens cannot get around them. The demo copies them.

1. **Direct holding only.** Each investor holds shares in their own name. Investor money never passes through the platform.
2. **At most 20 platform investors per company.** The limit can be changed in Settings.
3. **Offer counter (Companies Act Section 42).** Each investor offered a company counts as one offer for that company, per financial year (April–March) and per type of security. Offers the company made outside the platform count too. The system warns at 150 and blocks anything above 200. Offering the same investor again in the same year does not count twice, and resale introductions do not count at all.
4. **Member counter (Section 2(68)).** Founders and existing shareholders plus platform investors are counted. The system warns at 180 and blocks any allotment or transfer that would go above 200.
5. **6-month minimum holding from the allotment date.** A sale can be requested earlier only if the advisor records the founder's written consent.
6. **Quarterly revaluation** by a registered valuer. Investors see their value against the latest valuation.
7. **Private resales.** There are no public listings, no prices shown to other investors, and no bidding. Each resale has a first-refusal window of 15–30 days and a one-to-one buyer introduction.
8. **Regulated lenders only.** Loans move only between regulated banks and NBFCs, after the RBI minimum holding period. Self-registered lenders are treated as unverified until confirmed.
9. **Investors need verified KYC** before they can receive an offer or be introduced as a buyer.
10. **Deal rooms:**
    - access only for companies already offered to the investor;
    - only that company's founder can grant access;
    - documents open only after the NDA is signed.
11. **Only advisors** prepare and submit reports, share offers, record allotments, publish valuations and move resales or loan transfers forward.
12. **Each role sees only its own data.** For example, an investor cannot see another investor's holdings, and a founder sees only their own company.
13. **Every change is permanently recorded** in the audit log, with who did it, when, and the before and after values.

---

## 8. Things that happen automatically

- **A company moves through the pipeline on its own:**
  - when a report is submitted → Under review;
  - when the report is approved → Approved;
  - when the first offer is shared → Offering;
  - when the first shares are allotted → Funded.
- **Recording an allotment** ticks "Shares allotted" on the checklist and starts the PAS-3 15-day countdown.
- **Completing a resale updates:** both investors' portfolios, the cap table, the member count and the platform investor count. The seller's cost is reduced in proportion to the shares sold.
- **Completing a loan transfer** moves the loan to the buyer's book and raises the transfer fee invoice.
- **Completing a resale** raises the selling investor's resale fee invoice (0.3–0.5% of the sale value, plus GST, due in 15 days) and notifies them.
- **Disbursing a loan** raises the company's 2.5% debt success fee invoice (plus GST, due in 15 days) and notifies the founder.
- **Worked out each time a page opens:**
  - revaluation due dates (3 months after the last valuation);
  - lock-in end dates;
  - overdue instalments;
  - interest earned and principal outstanding, taken from each loan's schedule;
  - DSCR alerts;
  - Today-page alerts;
  - lock-in reminders 7 days ahead.
- **Notifications** are created for each event listed under each login above.
- **An investor's "last active" date** updates when they sign in.
- **Fit-score shortlist:** the "Suggest a shortlist" button picks investors with a fit score of 60 or more.

---

## 9. In progress, partly built, or not yet built

- **AI document reading and AI-written narratives:** in progress. The public site describes an AI layer that reads documents and writes explanations. Today, summaries are written by fixed rules and checked against the engine. The only AI connected is the website assistant (section 1).
- **Real KYC checks:** in progress. KYC status is set by hand by the advisor; there is no connection to a KYC provider.
- **Sending emails, WhatsApp messages and notifications automatically:** in progress.
  - Notifications appear only inside the app.
  - Message templates open your own email or WhatsApp for you to send.
  - The contact form stores enquiries, but does not email anyone.
- **Signed legal documents:** in progress. SSA, SHA, allotment letter and PAS-4 downloads are summaries; the signed originals are not stored in the app.
- **Deal-room document previews:** in progress.
  - Opening a document records the view and the "watermarked" name.
  - There is no file viewer or actual watermark stamped onto files yet.
  - Deal-room documents are a list of names; real files go in the founder's Data room.
- **Security features described on the public Trust page but not yet built:**
  - multi-factor login;
  - row-level database security;
  - hosting in an Indian cloud region with encryption at rest;
  - consent and data-deletion flows under the Digital Personal Data Protection Act;
  - an independent security test.
- **Password reset ("forgot password"):** not built.
- **Payments:** the app records invoices and payments; it does not collect money or connect to a bank or payment gateway.
- **Demo limits:**
  - the demo keeps data only in the visitor's browser;
  - uploads are limited to 1.5 MB;
  - its access locks, including the CMA tool lock, are for show only.
- **Legal confirmations still pending,** as listed on the Trust page and raised during the build:
  - how SEBI advisory rules treat the Investor Fit Score and the resale fee;
  - the wording of the success-fee and revenue-share agreements;
  - DSA agreements and RBI digital lending rules;
  - whether off-platform offers count under Section 42, and whether founder consent can unlock early sales;
  - the first-refusal waiver wording;
  - the RBI minimum holding periods;
  - whether every investor type pays 12.5% long-term capital gains tax.
- **Roadmap phases** (from the About page): Validate → MVP → Ongoing services → Debt desk. The screens for all four phases exist in the app; the business gates for each phase (pilot clients, partner lenders, a live loan book) are still ahead.

---

## 10. Tools that run on their own (outside the website)

- **Equity vs Debt Optimizer, desktop app** (`optimizer/`). A downloadable program for Windows, macOS and Linux with the same model as the advisor's Optimizer tool, plus:
  - Excel, CSV and PDF exports;
  - a sensitivity "tornado" chart and heatmap;
  - saving and comparing up to 3 scenarios side by side;
  - a full monthly loan schedule;
  - light and dark mode.
- **CMA funding report, local version** (`fundmix/`). The same CMA tool as a small local web app that produces the PDF.
- **CMA funding report, hosted version.** A standalone browser version: https://claude.ai/artifact/U4eD5SHFMPxjnvnhABUmkk

---

## 11. Admin and settings

- **Create advisor accounts.** Advisors cannot sign themselves up; an administrator runs `flask --app server.app create-advisor`.
- **Set up an empty database** with `flask --app server.app init-db`, or load the sample data with `flask --app server.app seed-demo`.
- **Server settings** are set with environment variables:
  - `GB_SECRET_KEY` keeps people signed in across restarts and is required for production;
  - `GB_DATABASE` sets the database file;
  - `GB_UPLOADS` sets the folder for uploaded files;
  - `GB_SECURE_COOKIES=1` is for running behind HTTPS;
  - `GB_SEED_DEMO=0` starts the server without the sample accounts;
  - `ANTHROPIC_API_KEY` turns on Claude answers in the website assistant;
  - `GB_HOST` and `GB_PORT` set the address and port.
- **In-app setting:** the platform-investor limit per company (advisor → Settings).
- **Demo:** "Reset demo data" on the sign-in page and in the workspace menu.

---

## 12. Tech stack (one line)

A plain HTML/CSS/JavaScript website with hand-drawn SVG charts and no front-end framework, served by a Python Flask server with a SQLite database. The standalone tools use Python (Streamlit for the desktop Optimizer, a small web app for the CMA report). Automated tests in Python and JavaScript check that the browser and server give identical numbers.

## 13. How to run it

**Real app (on any computer with Python 3.11 or newer):**
```
pip install -r server/requirements.txt
python -m server.app
```
Then open http://127.0.0.1:8000 and sign in with a demo account above.

**Demo file:** run `python site/build.py`, then open `site/dist/index.html` in a browser. No server is needed.

**Shareable demo:** https://claude.ai/artifact/J9CP4uLM2vzRSm1DXFR3HG

**Tests:** `python -m pytest server/tests fundmix/tests` (needs Node.js for the browser-version checks).


---

# Appendix B. Source code of the rules and calculations (verbatim)

Copy these behaviours exactly. Python runs on the server; JavaScript runs in the browser. Port them to your stack line for line, or use them as they are.


## B1. `server/domain.py`

Shared maths: dates, financial year, loan schedule, counters, portfolio (Python; site/domain.js is the identical browser copy).

```python
"""Pure business arithmetic shared by the rules, the API and the tests.

Money is integer paise everywhere. Dates are ISO strings: "YYYY-MM-DD" for business dates.
site/domain.js is a line-for-line mirror for the browser; keep the two in step
(server/tests/test_parity.py runs both on the same inputs).
"""
import math
from datetime import date

SETTINGS_DEFAULT = dict(
    id="settings",
    max_platform_investors=20,
    offer_limit=200, offer_warn=150,
    member_limit=200, member_warn=180,
    lock_months=6,
)
SECURITY_TYPES = ("equity", "preference", "debentures")
PIPELINE = ("applied", "under_review", "approved", "offering", "funded", "monitoring", "closed", "rejected")
DOC_CHECKLIST = (
    ("valuation_report", "Registered valuer's report"),
    ("mgt14", "Special resolution filed (MGT-14)"),
    ("pas4", "PAS-4 offer letters issued"),
    ("bank_account", "Separate bank account for the issue"),
    ("allotment", "Shares allotted"),
    ("pas3", "PAS-3 filed (within 15 days of allotment)"),
    ("demat_credit", "Shares credited to demat"),
)


def d(s):
    return date.fromisoformat(s[:10])


def add_months(s, n):
    """Same day n calendar months later, clamped to the month's last day."""
    x = d(s)
    m = x.month - 1 + n
    y, m = x.year + m // 12, m % 12 + 1
    last = [31, 29 if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    return date(y, m, min(x.day, last)).isoformat()


def add_days(s, n):
    return date.fromordinal(d(s).toordinal() + n).isoformat()


def days_between(a, b):
    return d(b).toordinal() - d(a).toordinal()


def fy(s):
    """Indian financial year, April to March: 2026-10-19 -> '2026-27'."""
    x = d(s)
    y = x.year if x.month >= 4 else x.year - 1
    return "%d-%02d" % (y, (y + 1) % 100)


def half_up(x):
    return int(math.floor(x + 0.5))


# ---------------- loans ----------------
def schedule(loan, today):
    """Monthly schedule in paise. Interest-only during the moratorium, then a level EMI.
    Interest each month = opening x rate / 12, rounded to the paisa; the last instalment clears the balance."""
    P, bps = int(loan["amount_paise"]), int(loan["rate_bps"])
    T, M = int(loan["tenor_months"]), int(loan.get("moratorium_months") or 0)
    start, paid = loan.get("disbursal_date"), loan.get("payments") or {}
    if not start or P <= 0 or T <= 0:
        return []
    r = bps / 120000.0
    n = T - M
    f = 1.0
    for _ in range(n):
        f = f * (1 + r)
    emi = half_up(P * r * f / (f - 1)) if n > 0 and r > 0 else (half_up(P / n) if n > 0 else 0)
    rows, opening = [], P
    for k in range(1, T + 1):
        due = add_months(start, k)
        interest = half_up(opening * bps / 120000.0)
        if k <= M:
            principal = 0
        elif k == T:
            principal = opening
        else:
            principal = min(emi - interest, opening)
        closing = opening - principal
        status = "paid" if due in paid else ("overdue" if due < today else "pending")
        rows.append(dict(n=k, due=due, opening=opening, interest=interest, principal=principal,
                         payment=interest + principal, closing=closing, status=status, paid_on=paid.get(due)))
        opening = closing
    return rows


def loan_summary(loan, today):
    rows = schedule(loan, today)
    paid = [r for r in rows if r["status"] == "paid"]
    unpaid = [r for r in rows if r["status"] != "paid"]
    month = today[:7]
    nxt = unpaid[0] if unpaid else None
    repaid = sum(r["principal"] for r in paid)
    return dict(
        disbursed=int(loan["amount_paise"]) if rows else 0,
        principal_repaid=repaid,
        principal_pending=(int(loan["amount_paise"]) - repaid) if rows else 0,
        interest_earned=sum(r["interest"] for r in paid),
        interest_this_month=sum(r["interest"] for r in rows if r["due"][:7] == month),
        monthly_interest=nxt["interest"] if nxt else 0,
        next_due=nxt and nxt["due"], next_amount=nxt and nxt["payment"],
        overdue=sum(1 for r in rows if r["status"] == "overdue"),
        remaining_months=len(unpaid),
    )


def min_holding_months(loan):
    """RBI transfer of loan exposures (2021): 3 months for loans of 2 years or less, otherwise 6 months."""
    return 3 if int(loan["tenor_months"]) <= 24 else 6


# ---------------- cap table and counters ----------------
def platform_investors(st, cid):
    return sorted({h["investor_id"] for h in st["holdings"] if h["company_id"] == cid and h["shares"] > 0})


def members(st, cid):
    """Section 2(68): founders and existing shareholders (each row may stand for several holders) plus platform investors."""
    return sum(int(e.get("holders") or 1) for e in st["cap_table"] if e["company_id"] == cid and e["shares"] > 0) + len(platform_investors(st, cid))


def fd_shares(st, cid):
    c = next(x for x in st["companies"] if x["id"] == cid)
    return (sum(e["shares"] for e in st["cap_table"] if e["company_id"] == cid)
            + sum(h["shares"] for h in st["holdings"] if h["company_id"] == cid)
            + int(c.get("fd_extra_shares") or 0))


def offers_used(st, cid, year, sec):
    """Section 42: each person offered counts once per financial year and security type, plus offers the company made off-platform."""
    c = next(x for x in st["companies"] if x["id"] == cid)
    on = {o["investor_id"] for o in st["offers"] if o["company_id"] == cid and o["fy"] == year and o["security_type"] == sec}
    return len(on) + int(((c.get("external_offers") or {}).get(year) or {}).get(sec) or 0)


def latest_valuation(st, cid, on=None):
    v = [x for x in st["valuations"] if x["company_id"] == cid and (on is None or x["date"] <= on)]
    return max(v, key=lambda x: x["date"]) if v else None


def lock_until(h, settings):
    return add_months(h["allotment_date"], settings["lock_months"])


def holding_view(st, h, today, settings):
    v = latest_valuation(st, h["company_id"])
    cost = int(h["cost_paise"])
    price = v["price_per_share_paise"] if v else (cost // h["shares"] if h["shares"] else 0)
    value = h["shares"] * price
    unlock = lock_until(h, settings)
    return dict(
        id=h["id"], company_id=h["company_id"], shares=h["shares"], cost=cost,
        avg_cost=(cost / h["shares"]) if h["shares"] else 0,
        price=price, valuation_date=v and v["date"], value=value,
        gain=value - cost, gain_pct=((value - cost) / cost) if cost else 0,
        ownership=h["shares"] / fd_shares(st, h["company_id"]),
        lock_until=unlock, eligible=today >= unlock or bool(h.get("early_consent")),
    )


def portfolio(st, investor_id, today, settings):
    rows = [holding_view(st, h, today, settings) for h in st["holdings"] if h["investor_id"] == investor_id and h["shares"] > 0]
    inv, val = sum(r["cost"] for r in rows), sum(r["value"] for r in rows)
    return dict(rows=rows, invested=inv, value=val, gain=val - inv, gain_pct=((val - inv) / inv) if inv else 0, companies=len(rows))


def capital_gains_estimate(holding, view, today):
    """Unlisted shares: 24 months or more is long-term at 12.5%; shorter is short-term at the investor's slab rate."""
    months = days_between(holding["allotment_date"], today) / 30.4375
    long_term = months >= 24
    gain = view["gain"]
    return dict(months=months, long_term=long_term, gain=gain, tax=half_up(max(gain, 0) * 0.125) if long_term else None)
```


## B2. `server/actions.py`

Every rule and action, and who sees what (the source of truth for sections 5-8).

```python
"""Who can see what, and every change a signed-in user can make.

Each action takes (st, user, payload, today), checks the rules, mutates the loaded collections and returns
(detail, company_id). The API layer saves the changes and writes them, with before/after values, to the
append-only audit log. site/store.js mirrors this file for the browser-only demo.
"""
import re
import uuid
from datetime import datetime, timezone

from server import domain as D

COLLECTIONS = ("companies", "reports", "intros", "cap_table", "holdings", "offers", "valuations", "sell_requests", "transfers",
               "loans", "loan_transfers", "invoices", "notes", "notifications", "files", "enquiries", "settings", "suggestions", "invites")
COMPANY_FIELDS = ("name", "sector", "stage", "city", "revenue", "raise", "instrument", "twin", "readiness", "quarters", "covenants", "docs")
ADVISOR_COMPANY_FIELDS = ("offer_price_paise", "fd_extra_shares", "security_type", "raise_paise")
SELL_OPEN = ("submitted", "under_review", "rofr", "buyer_introduced", "spa_signed")
STATUS_LABEL = dict(submitted="submitted", under_review="under review", rofr="first-refusal window started", buyer_introduced="buyer introduced",
                    spa_signed="SPA signed", completed="transfer complete", rejected="rejected", withdrawn="withdrawn", eligibility="eligibility checked",
                    consent="borrower consent recorded", deed_signed="assignment deed signed", charge_updated="charge updated with the ROC")
LT_STEPS = ("submitted", "eligibility", "consent", "buyer_introduced", "deed_signed", "charge_updated", "completed")


class Denied(Exception):
    pass


def need(cond, msg):
    if not cond:
        raise Denied(msg)


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix):
    return prefix + "_" + uuid.uuid4().hex[:10]


def fnum(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and x not in (float("inf"), float("-inf")) else None


def inum(v):
    x = fnum(v)
    return int(x) if x is not None and x == int(x) else None


def valid_date(v, msg="Enter a valid date"):
    try:
        D.d(str(v))
        need(len(str(v)) == 10, msg)
    except ValueError:
        raise Denied(msg)
    return str(v)


def rs(paise):
    """Rs 1,23,45,678.90 (Indian grouping) for messages."""
    neg, p = paise < 0, abs(int(paise))
    r, ps = divmod(p, 100)
    s = str(r)
    head, tail = s[:-3], s[-3:]
    while len(head) > 2:
        tail = head[-2:] + "," + tail
        head = head[:-2]
    s = (head + "," + tail) if head else tail
    return ("-" if neg else "") + "Rs " + s + ("" if ps == 0 else ".%02d" % ps)


def grp(n):
    """Indian digit grouping: 2,50,000."""
    return rs(int(n) * 100)[3:] if n >= 0 else "-" + rs(-int(n) * 100)[3:]


def ddmmmyyyy(s):
    x = D.d(s)
    return "%d %s %d" % (x.day, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][x.month - 1], x.year)


# ---------------- lookups ----------------
def settings(st):
    return st.settings[0] if st.settings else dict(D.SETTINGS_DEFAULT)


def find(coll, id_):
    return next((x for x in coll if x["id"] == id_), None)


def company_of(st, cid):
    c = find(st.companies, cid)
    need(c, "Company not found")
    return c


def user_of(st, id_, role=None):
    u = next((x for x in st.users if x["id"] == id_), None)
    need(u and (role is None or u["role"] == role), (role or "User").capitalize() + " not found")
    return u


def label(u):
    return (u.get("firm") if u["role"] in ("investor", "lender") and u.get("firm") else u["name"])


def notify(st, user_id, kind, text, link):
    st.notifications.append(dict(id=uid("nt"), user_id=user_id, kind=kind, text=text, link=link, at=now(), read=False))


def notify_advisors(st, kind, text, link):
    for u in st.users:
        if u["role"] == "advisor":
            notify(st, u["id"], kind, text, link)


def owns(u, cid):
    return u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid)


def approved(st, cid):
    return any(r["company_id"] == cid and r["status"] == "approved" for r in st.reports)


def holder_ids(st, cid):
    return set(D.platform_investors(st, cid))


# ---------------- visibility ----------------
def pub(u, full=False):
    if not u:
        return None
    keys = ("id", "name", "role", "firm", "title", "company_id", "mandate") + (("profile", "email") if full else ())
    out = {k: u.get(k) for k in keys}
    if u["role"] == "lender":
        out["profile"] = u.get("profile")
    return out


def company_brief(st, c, today):
    """What an investor may see of a company: no twin, no readiness, no cap table."""
    rep = next((r for r in st.reports if r["company_id"] == c["id"] and r["status"] == "approved"), None)
    return dict(id=c["id"], name=c["name"], sector=c["sector"], stage=c["stage"], city=c["city"], revenue=c["revenue"], raise_paise=c.get("raise_paise"),
                security_type=c.get("security_type"), offer_price_paise=c.get("offer_price_paise"), updates=c.get("updates") or [],
                docs=c.get("docs") or [], fd_shares=D.fd_shares(st, c["id"]), report=rep and dict(title=rep["title"], summary=rep["summary"],
                reviewed_by=rep.get("reviewed_by"), reviewed_at=rep.get("reviewed_at"), review_note=rep.get("review_note")))


def lock_notices(st, user, today):
    s = settings(st)
    out = []
    for h in st.holdings:
        if h["investor_id"] == user["id"] and h["shares"] > 0:
            unlock = D.lock_until(h, s)
            left = D.days_between(today, unlock)
            if 0 < left <= 7:
                c = find(st.companies, h["company_id"])
                out.append(dict(id="lock_" + h["id"], user_id=user["id"], kind="lock", text="Lock-in for %s ends in %d day%s (%s)" % (c["name"], left, "" if left == 1 else "s", ddmmmyyyy(unlock)),
                                link="app-portfolio", at=today + "T00:00:00+00:00", read=False, computed=True))
    return out


def visible_state(st, user, audit_rows, today):
    role = user["role"]
    s = settings(st)
    base = dict(me=pub(user, True), today=today, settings=s,
                notifications=lock_notices(st, user, today) + sorted([n for n in st.notifications if n["user_id"] == user["id"]], key=lambda n: n["at"], reverse=True)[:60])
    advisors = [pub(u) for u in st.users if u["role"] == "advisor"]
    if role == "advisor":
        return dict(base, directory=[pub(u, True) for u in st.users if u["role"] != "founder"], founders=[pub(u) for u in st.users if u["role"] == "founder"],
                    **{c: getattr(st, c) for c in COLLECTIONS if c not in ("notifications", "settings")}, audit=audit_rows(None))
    if role == "founder":
        cid = user["company_id"]
        only = lambda coll: [x for x in coll if x.get("company_id") == cid]  # noqa: E731
        def offer_view(o):
            named = o.get("share_identity") or o["response"] == "invested"
            inv = user_of(st, o["investor_id"])
            return dict(o, investor_id=o["investor_id"] if named else None, investor_name=label(inv) if named else "Name shared after the investor consents", views=[] if not named else o.get("views", []))
        def sell_view(x):
            return dict(id=x["id"], company_id=x["company_id"], shares=x["shares"], full=x["full"], status=x["status"], rofr_until=x.get("rofr_until"), created_at=x["created_at"])
        return dict(base, directory=advisors + [pub(u) for u in st.users if u["role"] in ("lender", "investor")],
                    intros=[dict(i, investor_name=label(user_of(st, i["investor_id"]))) for i in only(st.intros)],
                    companies=[c for c in st.companies if c["id"] == cid], reports=only(st.reports), cap_table=only(st.cap_table),
                    holdings=[dict(h, investor_name=label(user_of(st, h["investor_id"]))) for h in only(st.holdings)],
                    offers=[offer_view(o) for o in only(st.offers)], valuations=only(st.valuations), sell_requests=[sell_view(x) for x in only(st.sell_requests)],
                    loans=only(st.loans), invoices=[i for i in st.invoices if i["company_id"] == cid and i["payer"] == "company"],
                    files=only(st.files), suggestions=only(st.suggestions), audit=audit_rows(("company_id", cid)))
    if role == "investor":
        mine = [o for o in st.offers if o["investor_id"] == user["id"]]
        hold = [h for h in st.holdings if h["investor_id"] == user["id"]]
        cids = {o["company_id"] for o in mine} | {h["company_id"] for h in hold}
        held = {h["company_id"] for h in hold if h["shares"] > 0}
        sells = [x for x in st.sell_requests if x["investor_id"] == user["id"]]
        return dict(base, directory=advisors, intros=[i for i in st.intros if i["investor_id"] == user["id"]],
                    companies=[company_brief(st, c, today) for c in st.companies if c["id"] in cids],
                    offers=mine, holdings=hold, valuations=[v for v in st.valuations if v["company_id"] in held or v["company_id"] in cids],
                    sell_requests=[dict(x, buyer_investor_id=None) for x in sells],
                    invoices=[i for i in st.invoices if i["payer"] == "investor" and i["payer_id"] == user["id"]],
                    transfers=[t for t in st.transfers if user["id"] in (t["from_investor_id"], t["to_investor_id"])],
                    files=[f for f in st.files if f["company_id"] in held and f["purpose"] == "valuation_report"], audit=audit_rows(("user_id", user["id"])))
    # lender
    loans = [l for l in st.loans if l["lender_id"] == user["id"]]
    lids = {l["id"] for l in loans}
    cids = {l["company_id"] for l in loans}
    return dict(base, directory=advisors + [pub(u) for u in st.users if u["role"] == "lender"],
                companies=[c for c in st.companies if c["id"] in cids], reports=[r for r in st.reports if r["status"] == "approved" and r["company_id"] in cids],
                loans=loans, loan_transfers=[t for t in st.loan_transfers if t["loan_id"] in lids or t["from_lender_id"] == user["id"]],
                invoices=[i for i in st.invoices if i["payer"] == "lender" and i["payer_id"] == user["id"]],
                files=[f for f in st.files if f["company_id"] in cids and f["purpose"] in ("monitoring", "loan_doc")], audit=audit_rows(("user_id", user["id"])))


def can_see_file(st, user, f):
    if user["role"] == "advisor":
        return True
    if user["role"] == "founder":
        return f["company_id"] == user["company_id"]
    if user["role"] == "investor":
        return f["purpose"] == "valuation_report" and any(h["investor_id"] == user["id"] and h["company_id"] == f["company_id"] and h["shares"] > 0 for h in st.holdings)
    return f["purpose"] in ("monitoring", "loan_doc") and any(l["lender_id"] == user["id"] and l["company_id"] == f["company_id"] for l in st.loans)


# ---------------- founder ----------------
def a_save_company(st, u, p, today):
    need(owns(u, p.get("company_id")), "Only the company's founder or an advisor can edit it")
    c = company_of(st, p["company_id"])
    patch = p.get("patch") or {}
    need(isinstance(patch, dict), "Bad request")
    allowed = COMPANY_FIELDS + (ADVISOR_COMPANY_FIELDS if u["role"] == "advisor" else ())
    for k, v in patch.items():
        need(k in allowed, "You cannot change " + k)
        if k in ("revenue", "raise"):
            need(fnum(v) is not None and fnum(v) > 0, "Revenue and raise must be positive numbers")
            v = fnum(v)
        elif k in ADVISOR_COMPANY_FIELDS and k != "security_type":
            need(inum(v) is not None and inum(v) >= 0, k + " must be a whole number")
            v = inum(v)
        elif k == "security_type":
            need(v in D.SECURITY_TYPES, "Choose equity, preference or debentures")
        elif k in ("name", "sector", "stage", "city", "instrument"):
            v = str(v).strip()[:120]
            need(v, "Enter a value for " + k)
        c[k] = v
    return "Updated " + ", ".join(patch.keys()), c["id"]


def a_submit_report(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor prepares and submits the debt vs equity report")
    c = company_of(st, p["company_id"])
    ch = p.get("checks") or {}
    need(ch.get("validation") and ch.get("founder_confirmed") and ch.get("verifier"), "All release checks must pass before review")
    need(not any(r["company_id"] == c["id"] and r["status"] == "in_review" for r in st.reports), "A report for this company is already in review")
    r = dict(id=uid("r"), company_id=c["id"], title=str(p.get("title") or "Debt vs equity report")[:120], status="in_review",
             engine_version=str(p.get("engine_version") or "")[:40], created_at=now(), submitted_by=u["id"],
             summary=p.get("summary") or {}, checks=ch, inputs=p.get("inputs") or {})
    st.reports.append(r)
    if c.get("pipeline_stage", "applied") == "applied":
        c.update(pipeline_stage="under_review", stage_since=today)
    notify_advisors(st, "review", "New report to review: " + c["name"], "app-review")
    return "Submitted for advisor review: " + r["title"], c["id"]


def a_apply_loan(st, u, p, today):
    cid = p.get("company_id")
    need(u["role"] == "founder" and u["company_id"] == cid, "Only the company's founder can apply")
    lender = user_of(st, p.get("lender_id"), "lender")
    amount, bps, tenor, mor = inum(p.get("amount_paise")), inum(p.get("rate_bps")), inum(p.get("tenor_months")), inum(p.get("moratorium_months") or 0)
    need(amount and amount > 0 and bps and 0 < bps < 5000 and tenor and 0 < tenor <= 240 and mor is not None and 0 <= mor < tenor, "Enter a valid amount, rate, tenor and moratorium")
    st.loans.append(dict(id=uid("l"), company_id=cid, lender_id=lender["id"], amount_paise=amount, rate_bps=bps, tenor_months=tenor, moratorium_months=mor,
                         status="applied", sanction_date=None, disbursal_date=None, payments={}, created_at=now()))
    notify(st, lender["id"], "loan", "New loan application from " + company_of(st, cid)["name"], "app-loanbook")
    return "Sent a %s loan application to %s" % (rs(amount), lender.get("firm")), cid


# ---------------- advisor: reports, pipeline, cap table ----------------
def a_review_report(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor can review reports")
    r = find(st.reports, p.get("report_id"))
    need(r, "Report not found")
    need(r["status"] == "in_review", "This report is not waiting for review")
    need(p.get("decision") in ("approve", "changes"), "Choose approve or request changes")
    r.update(status="approved" if p["decision"] == "approve" else "changes", reviewed_by=u["id"], reviewed_at=now(), review_note=str(p.get("note") or "")[:500])
    c = company_of(st, r["company_id"])
    if p["decision"] == "approve" and c.get("pipeline_stage") in ("applied", "under_review", None):
        c.update(pipeline_stage="approved", stage_since=today)
    return ("Approved report: " if p["decision"] == "approve" else "Requested changes: ") + r["title"], r["company_id"]


def a_set_stage(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor can move a company")
    c = company_of(st, p.get("company_id"))
    stage = p.get("stage")
    need(stage in D.PIPELINE, "Unknown stage")
    need(stage != c.get("pipeline_stage"), "The company is already in that stage")
    if stage in ("approved", "offering", "funded", "monitoring"):
        need(approved(st, c["id"]), "A company needs an advisor-approved report before it can be " + stage.replace("_", " "))
    old = c.get("pipeline_stage")
    c.update(pipeline_stage=stage, stage_since=today)
    return "Moved %s from %s to %s" % (c["name"], (old or "none").replace("_", " "), stage.replace("_", " ")), c["id"]


def a_save_cap_entry(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor maintains the cap table")
    c = company_of(st, p.get("company_id"))
    name, kind, shares, holders = str(p.get("holder_name") or "").strip()[:120], p.get("holder_type"), inum(p.get("shares")), inum(p.get("holders") or 1)
    need(name and kind in ("founder", "existing") and shares is not None and shares >= 0 and holders and holders >= 1, "Enter the holder, type (founder or existing), shares and number of holders")
    e = find(st.cap_table, p.get("entry_id")) if p.get("entry_id") else None
    if e:
        need(e["company_id"] == c["id"], "Entry not found")
        e.update(holder_name=name, holder_type=kind, shares=shares, holders=holders)
    else:
        st.cap_table.append(dict(id=uid("ct"), company_id=c["id"], holder_name=name, holder_type=kind, shares=shares, holders=holders))
    return "Cap table: %s holds %s shares (%d holder%s)" % (name, grp(shares), holders, "" if holders == 1 else "s"), c["id"]


def a_remove_cap_entry(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor maintains the cap table")
    e = find(st.cap_table, p.get("entry_id"))
    need(e, "Entry not found")
    st.cap_table.remove(e)
    return "Removed %s from the cap table" % e["holder_name"], e["company_id"]


def a_set_checklist(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor updates the compliance checklist")
    c = company_of(st, p.get("company_id"))
    item = p.get("item")
    need(item in dict(D.DOC_CHECKLIST), "Unknown checklist item")
    val = p.get("date")
    if val:
        D.d(val)
    c.setdefault("checklist", {})[item] = val or None
    if item == "allotment" and val:
        c["allotment_date"] = val
    return "%s: %s" % (dict(D.DOC_CHECKLIST)[item], "done " + ddmmmyyyy(val) if val else "not done"), c["id"]


def a_set_external_offers(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records offers")
    c = company_of(st, p.get("company_id"))
    year, sec, n = str(p.get("fy") or D.fy(today)), p.get("security_type") or "equity", inum(p.get("count"))
    need(sec in D.SECURITY_TYPES and n is not None and n >= 0, "Enter the number of off-platform offers")
    c.setdefault("external_offers", {}).setdefault(year, {})[sec] = n
    used = D.offers_used(st, c["id"], year, sec)
    need(used <= settings(st)["offer_limit"], "That would put %s at %d offers in FY %s; the limit is %d" % (c["name"], used, year, settings(st)["offer_limit"]))
    return "Off-platform %s offers for FY %s set to %d (total now %d)" % (sec, year, n, used), c["id"]


def a_post_update(st, u, p, today):
    need(owns(u, p.get("company_id")), "Only the company's founder or an advisor can post updates")
    c = company_of(st, p["company_id"])
    text = str(p.get("text") or "").strip()[:600]
    need(text, "Write the update")
    c.setdefault("updates", []).insert(0, dict(date=today, text=text))
    for iid in holder_ids(st, c["id"]):
        notify(st, iid, "update", "Company update from " + c["name"], "app-portfolio")
    return "Posted an update for " + c["name"], c["id"]


def a_set_investor_profile(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records KYC")
    inv = user_of(st, p.get("investor_id"), "investor")
    prof = inv["profile"] = inv.get("profile") or {}
    if p.get("kyc") is not None:
        need(p["kyc"] in ("verified", "pending", "not_started"), "Unknown KYC status")
        prof["kyc"] = p["kyc"]
    if p.get("accredited") is not None:
        prof["accredited"] = bool(p["accredited"])
    if prof.get("kyc") == "verified":
        release_waiting(st, inv["id"], u["id"], today)
    return "Updated %s: KYC %s, accredited %s" % (label(inv), prof.get("kyc"), "yes" if prof.get("accredited") else "no"), None


def a_save_settings(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor changes settings")
    s = settings(st)
    n = inum(p.get("max_platform_investors"))
    need(n and 1 <= n <= 200, "Platform investor limit must be between 1 and 200")
    s["max_platform_investors"] = n
    return "Platform investor limit set to %d per company" % n, None


# ---------------- advisor: offers and allotment (Section 42, Section 2(68)) ----------------
def a_share_offer(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor shares offers")
    c = company_of(st, p.get("company_id"))
    need(c.get("pipeline_stage") in ("approved", "offering") and approved(st, c["id"]), "Only a company in Approved or Offering status with a signed-off report can be offered")
    sec = p.get("security_type") or c.get("security_type") or "equity"
    need(sec in D.SECURITY_TYPES, "Choose equity, preference or debentures")
    ids = list(dict.fromkeys(p.get("investor_ids") or []))
    need(ids, "Select at least one investor")
    year = D.fy(today)
    already = {o["investor_id"] for o in st.offers if o["company_id"] == c["id"] and o["fy"] == year and o["security_type"] == sec}
    invs = [user_of(st, i, "investor") for i in ids]
    for inv in invs:
        need((inv.get("profile") or {}).get("kyc") == "verified", label(inv) + " has not completed KYC")
    new = [inv for inv in invs if inv["id"] not in already]
    need(new, "Every selected investor already has this offer for FY " + year)
    s = settings(st)
    used = D.offers_used(st, c["id"], year, sec)
    need(used + len(new) <= s["offer_limit"], "Blocked: %s has %d of %d %s offers used in FY %s. Sending %d more would exceed the Section 42 limit; %d left." % (
        c["name"], used, s["offer_limit"], sec, year, len(new), s["offer_limit"] - used))
    for inv in new:
        st.offers.append(dict(id=uid("o"), company_id=c["id"], investor_id=inv["id"], fy=year, security_type=sec, sent_at=now(), sent_by=u["id"],
                              response="pending", responded_at=None, share_identity=False, views=[]))
        notify(st, inv["id"], "offer", "New private offer: " + c["name"], "app-opportunities")
    if c["pipeline_stage"] == "approved":
        c.update(pipeline_stage="offering", stage_since=today)
    total = used + len(new)
    return "Shared %s with %d investor%s (%d of %d offers used in FY %s%s)" % (c["name"], len(new), "" if len(new) == 1 else "s", total, s["offer_limit"], year,
                                                                                "; already offered: %d" % (len(invs) - len(new)) if len(invs) > len(new) else ""), c["id"]


def check_new_holder(st, cid, investor_id, leaving=None):
    """A new holder must keep platform investors <= the limit and members <= 200. `leaving` is a seller who exits completely."""
    s = settings(st)
    current = holder_ids(st, cid)
    if investor_id in current:
        return
    plat = len(current) + 1 - (1 if leaving in current else 0)
    mem = D.members(st, cid) + 1 - (1 if leaving in current else 0)
    need(plat <= s["max_platform_investors"], "Blocked: this would make %d platform investors in the company; the limit is %d" % (plat, s["max_platform_investors"]))
    need(mem <= s["member_limit"], "Blocked: this would make %d members (shareholders); a private company may have at most %d" % (mem, s["member_limit"]))


def a_allot_shares(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records an allotment")
    o = find(st.offers, p.get("offer_id"))
    need(o, "Offer not found")
    need(o["response"] == "interested", "The investor must express interest before shares are allotted")
    c = company_of(st, o["company_id"])
    shares, amount, when = inum(p.get("shares")), inum(p.get("amount_paise")), valid_date(p.get("allotment_date") or today)
    need(shares and shares > 0 and amount and amount > 0, "Enter the shares allotted and the amount paid")
    need(when <= today, "The allotment date cannot be in the future")
    check_new_holder(st, c["id"], o["investor_id"])
    st.holdings.append(dict(id=uid("h"), investor_id=o["investor_id"], company_id=c["id"], shares=shares, allotment_date=when, invested_at=when,
                            cost_paise=amount, origin="allotment", early_consent=None))
    o.update(response="invested", responded_at=o.get("responded_at") or now())
    c["allotment_date"] = when
    c.setdefault("checklist", {})["allotment"] = when
    if c.get("pipeline_stage") == "offering":
        c.update(pipeline_stage="funded", stage_since=today)
    notify(st, o["investor_id"], "allotment", "%s shares of %s allotted to you" % (grp(shares), c["name"]), "app-portfolio")
    return "Allotted %s shares of %s to %s for %s" % (grp(shares), c["name"], label(user_of(st, o["investor_id"])), rs(amount)), c["id"]


def a_publish_valuation(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor publishes valuations")
    c = company_of(st, p.get("company_id"))
    when, price, method, valuer = p.get("date"), inum(p.get("price_per_share_paise")), p.get("method"), str(p.get("valuer") or "").strip()[:120]
    need(when and D.d(when) and when <= today, "Enter a valuation date that is not in the future")
    need(price and price > 0, "Enter the price per share")
    need(method in ("DCF", "Market multiples"), "Choose DCF or market multiples")
    need(valuer, "Enter the registered valuer's name")
    f = find(st.files, p.get("file_id")) if p.get("file_id") else None
    need(not p.get("file_id") or (f and f["company_id"] == c["id"]), "Report file not found")
    prev = D.latest_valuation(st, c["id"])
    st.valuations.append(dict(id=uid("v"), company_id=c["id"], date=when, price_per_share_paise=price, method=method, valuer=valuer,
                              report_file=f and f["id"], published_at=now(), published_by=u["id"]))
    for iid in holder_ids(st, c["id"]):
        notify(st, iid, "valuation", "Revaluation published: %s at %s a share" % (c["name"], rs(price)), "app-portfolio")
    return "Published %s valuation of %s: %s a share (was %s)" % (method, c["name"], rs(price), rs(prev["price_per_share_paise"]) if prev else "none"), c["id"]


# ---------------- investor ----------------
def a_respond_offer(st, u, p, today):
    o = find(st.offers, p.get("offer_id"))
    need(o and u["role"] == "investor" and o["investor_id"] == u["id"], "Offer not found")
    need(o["response"] in ("pending", "interested", "declined"), "This offer is closed")
    need(p.get("response") in ("interested", "declined"), "Choose interested or decline")
    o.update(response=p["response"], responded_at=now(), share_identity=bool(p.get("share_identity")) and p["response"] == "interested")
    c = company_of(st, o["company_id"])
    notify_advisors(st, "offer", "%s %s %s" % (label(u), "is interested in" if p["response"] == "interested" else "declined", c["name"]), "app-directory")
    return ("Expressed interest in " if p["response"] == "interested" else "Declined the offer for ") + c["name"], c["id"]


def a_view_doc(st, u, p, today):
    o = find(st.offers, p.get("offer_id"))
    need(o and u["role"] == "investor" and o["investor_id"] == u["id"] and o["response"] != "declined", "Offer not found")
    c = company_of(st, o["company_id"])
    need(p.get("doc") in (c.get("docs") or []) or p.get("doc") == "Advisor-reviewed report", "Document not found")
    o.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


# ---------------- deal rooms: investor asks, founder grants, investor signs the NDA ----------------
def a_request_intro(st, u, p, today):
    need(u["role"] == "investor", "Only investors can ask for deal-room access")
    cid = p.get("company_id")
    c = company_of(st, cid)
    need(any(o["company_id"] == cid and o["investor_id"] == u["id"] and o["response"] != "declined" for o in st.offers),
         "Deal rooms open only for companies your advisor has offered to you")
    need(not any(i["company_id"] == cid and i["investor_id"] == u["id"] for i in st.intros), "You have already asked for access to this deal room")
    st.intros.append(dict(id=uid("i"), company_id=cid, investor_id=u["id"], status="requested", created_at=now(), nda_signed_at=None, views=[]))
    for f in st.users:
        if f["role"] == "founder" and f.get("company_id") == cid:
            notify(st, f["id"], "intro", label(u) + " asked for access to your deal room", "app-investors")
    return "Asked for access to the %s deal room" % c["name"], cid


def a_decide_intro(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i, "Introduction not found")
    need(u["role"] == "founder" and u["company_id"] == i["company_id"], "Only the company's founder can decide")
    need(i["status"] == "requested", "This request was already decided")
    need(p.get("decision") in ("grant", "decline"), "Choose grant or decline")
    i["status"] = "granted" if p["decision"] == "grant" else "declined"
    notify(st, i["investor_id"], "intro", "%s %s your deal-room request" % (company_of(st, i["company_id"])["name"], "granted" if i["status"] == "granted" else "declined"), "app-rooms")
    return ("Granted deal-room access to " if i["status"] == "granted" else "Declined ") + label(user_of(st, i["investor_id"])), i["company_id"]


def a_sign_nda(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i and u["role"] == "investor" and i["investor_id"] == u["id"], "Introduction not found")
    need(i["status"] == "granted", "The founder has not granted access yet")
    i["nda_signed_at"] = i.get("nda_signed_at") or now()
    return "Signed the NDA for " + company_of(st, i["company_id"])["name"], i["company_id"]


def a_view_room_doc(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i and u["role"] == "investor" and i["investor_id"] == u["id"] and i["status"] == "granted" and i.get("nda_signed_at"), "Sign the NDA to open documents")
    c = company_of(st, i["company_id"])
    need(p.get("doc") in (c.get("docs") or []), "Document not found")
    i.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


# ---------------- investor suggestions: the founder suggests, the advisor confirms, then the offer goes out ----------------
# Investors join only by invitation. A founder may suggest an investor already on the platform, or a new one by name and
# email; the advisor confirms or declines. On confirmation a platform investor receives the offer at once (or as soon as
# their KYC is verified); a new investor gets an invitation (the server emails the private link) and receives the offer
# once they have joined and passed KYC.
SUGGESTION_OPEN = ("suggested", "invited", "waiting_kyc")


def offerable(c, st):
    return c.get("pipeline_stage") in ("approved", "offering") and approved(st, c["id"])


def send_offer(st, c, inv, by_id, today):
    """One offer to one KYC-verified investor, inside the Section 42 limit. Returns the offer (an existing one if already sent)."""
    need(offerable(c, st), "Only a company in Approved or Offering status with a signed-off report can be offered")
    need((inv.get("profile") or {}).get("kyc") == "verified", label(inv) + " has not completed KYC")
    sec, year = c.get("security_type") or "equity", D.fy(today)
    old = next((o for o in st.offers if o["company_id"] == c["id"] and o["investor_id"] == inv["id"] and o["fy"] == year and o["security_type"] == sec), None)
    if old:
        return old
    s, used = settings(st), D.offers_used(st, c["id"], year, sec)
    need(used + 1 <= s["offer_limit"], "Blocked: %s has used all %d %s offers for FY %s (Section 42)." % (c["name"], s["offer_limit"], sec, year))
    o = dict(id=uid("o"), company_id=c["id"], investor_id=inv["id"], fy=year, security_type=sec, sent_at=now(), sent_by=by_id,
             response="pending", responded_at=None, share_identity=False, views=[])
    st.offers.append(o)
    notify(st, inv["id"], "offer", "New private offer: " + c["name"], "app-opportunities")
    if c["pipeline_stage"] == "approved":
        c.update(pipeline_stage="offering", stage_since=today)
    return o


def release_suggestion(st, sg, by_id, today):
    """A confirmed suggestion: send the offer if the investor can receive it now, otherwise wait for their KYC."""
    inv, c = user_of(st, sg["investor_id"], "investor"), company_of(st, sg["company_id"])
    if (inv.get("profile") or {}).get("kyc") != "verified":
        sg["status"] = "waiting_kyc"
        return
    try:
        o = send_offer(st, c, inv, by_id, today)
        sg.update(status="offered", offer_id=o["id"], reason=None)
        notify(st, sg["by"], "suggest", "Your advisor sent the offer to %s" % label(inv), "app-fundraise")
    except Denied as e:
        sg.update(status="blocked", reason=str(e))
        notify_advisors(st, "suggest", "Could not send %s's offer to %s: %s" % (c["name"], label(inv), e), "app-directory")


def release_waiting(st, investor_id, by_id, today):
    """Called when an investor's KYC is verified: every confirmed suggestion waiting for it goes out."""
    for sg in st.suggestions:
        if sg.get("investor_id") == investor_id and sg["status"] == "waiting_kyc":
            release_suggestion(st, sg, by_id, today)


def a_suggest_investor(st, u, p, today):
    need(u["role"] == "founder", "Only founders suggest investors")
    c = company_of(st, u["company_id"])
    note = str(p.get("note") or "").strip()[:300]
    inv = None
    if p.get("investor_id"):
        inv = user_of(st, p.get("investor_id"), "investor")
    else:
        email = str(p.get("email") or "").strip().lower()[:254]
        name = str(p.get("name") or "").strip()[:80]
        need(name and re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email), "Enter the investor's name and a valid email")
        existing = next((x for x in st.users if (x.get("email") or "").lower() == email), None)
        if existing:
            need(existing["role"] == "investor", "That email belongs to an account that is not an investor")
            inv = existing
    if inv:
        need(not any(o["investor_id"] == inv["id"] and o["company_id"] == c["id"] for o in st.offers), label(inv) + " already has your offer")
        need(not any(x.get("investor_id") == inv["id"] and x["company_id"] == c["id"] and x["status"] in SUGGESTION_OPEN for x in st.suggestions),
             "You have already suggested " + label(inv))
        who = dict(investor_id=inv["id"], name=inv["name"], email=None, firm=inv.get("firm"))
    else:
        need(not any((x.get("email") or "") == email and x["company_id"] == c["id"] and x["status"] in SUGGESTION_OPEN for x in st.suggestions),
             "You have already suggested " + email)
        who = dict(investor_id=None, name=name, email=email, firm=str(p.get("firm") or "").strip()[:120] or None)
    sg = dict(id=uid("sg"), company_id=c["id"], by=u["id"], at=now(), note=note or None, status="suggested",
              decided_by=None, decided_at=None, reason=None, offer_id=None, invite_id=None, **who)
    st.suggestions.append(sg)
    shown = label(inv) if inv else (who["name"] + (" (" + who["firm"] + ")" if who["firm"] else ""))
    text = "%s suggests offering to %s" % (u["name"], shown)
    st.notes.append(dict(id=uid("n"), subject_type="company", subject_id=c["id"], text=text + ".", due=None, done=False, by=u["id"], at=now()))
    notify_advisors(st, "suggest", text + " (" + c["name"] + ")", "app-directory")
    return "Suggested %s to your advisor. Your advisor decides who receives the offer." % shown, c["id"]


def a_decide_suggestion(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor confirms suggested investors")
    sg = find(st.suggestions, p.get("suggestion_id"))
    need(sg, "Suggestion not found")
    need(sg["status"] == "suggested", "This suggestion was already decided")
    c = company_of(st, sg["company_id"])
    shown = sg["name"] + (" (" + sg["firm"] + ")" if sg.get("firm") else "")
    if p.get("decision") == "decline":
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give the founder a reason")
        sg.update(status="declined", reason=reason, decided_by=u["id"], decided_at=now())
        notify(st, sg["by"], "suggest", "Your advisor declined %s: %s" % (shown, reason), "app-investors")
        return "Declined %s for %s" % (shown, c["name"]), c["id"]
    need(p.get("decision") == "approve", "Choose approve or decline")
    need(offerable(c, st), "Approve %s's report and move it to Approved before confirming investors" % c["name"])
    sg.update(decided_by=u["id"], decided_at=now())
    if sg.get("investor_id"):
        release_suggestion(st, sg, u["id"], today)
        what = {"offered": "offer sent", "waiting_kyc": "the offer goes out once their KYC is verified"}.get(sg["status"], sg.get("reason") or sg["status"])
        return "Confirmed %s for %s: %s" % (shown, c["name"], what), c["id"]
    inv = dict(id=uid("iv"), company_id=c["id"], suggestion_id=sg["id"], name=sg["name"], email=sg["email"], firm=sg.get("firm"),
               status="pending", created_at=now(), created_by=u["id"], sent_at=None, accepted_at=None, user_id=None)
    st.invites.append(inv)
    sg.update(status="invited", invite_id=inv["id"])
    notify(st, sg["by"], "suggest", "Your advisor confirmed %s; an invitation is on its way" % shown, "app-investors")
    return "Confirmed %s for %s and invited %s to join" % (shown, c["name"], sg["email"]), c["id"]


def accept_invite(st, invite_id, user, today):
    """A new investor signed up through their invitation: link them to the suggestion; the offer follows their KYC."""
    inv = find(st.invites, invite_id)
    need(inv and inv["status"] == "pending", "This invitation has already been used or withdrawn")
    inv.update(status="accepted", accepted_at=now(), user_id=user["id"])
    sg = find(st.suggestions, inv["suggestion_id"])
    if sg and sg["status"] == "invited":
        sg.update(investor_id=user["id"], status="waiting_kyc")
        notify(st, sg["by"], "suggest", "%s accepted the invitation" % inv["name"], "app-investors")
    notify_advisors(st, "suggest", "%s joined by invitation; verify their KYC to send the offer" % inv["name"], "app-directory")
    return inv


def a_request_sell(st, u, p, today):
    h = find(st.holdings, p.get("holding_id"))
    need(h and u["role"] == "investor" and h["investor_id"] == u["id"], "Holding not found")
    need(h["shares"] > 0, "You no longer hold these shares")
    need(not any(x["holding_id"] == h["id"] and x["status"] in SELL_OPEN for x in st.sell_requests), "A sell request for this holding is already open")
    s = settings(st)
    unlock = D.lock_until(h, s)
    need(today >= unlock or h.get("early_consent"), "Locked: you can request to sell from %s, %d months after allotment" % (ddmmmyyyy(unlock), s["lock_months"]))
    n = inum(p.get("shares")) if p.get("shares") not in (None, "") else h["shares"]
    need(n and 0 < n <= h["shares"], "Enter between 1 and %s shares" % grp(h["shares"]))
    price = inum(p.get("indicative_price_paise")) if p.get("indicative_price_paise") not in (None, "") else None
    need(price is None or price > 0, "The indicative price must be positive")
    c = company_of(st, h["company_id"])
    x = dict(id=uid("s"), holding_id=h["id"], investor_id=u["id"], company_id=c["id"], shares=n, full=n == h["shares"], indicative_price_paise=price,
             note=str(p.get("note") or "")[:500], status="submitted", rofr_days=None, rofr_until=None, buyer_investor_id=None, spa_date=None,
             price_paise=None, reason=None, created_at=now(), history=[dict(status="submitted", at=now(), by=u["id"])])
    st.sell_requests.append(x)
    notify_advisors(st, "sell", "Sell request: %s, %s shares of %s" % (label(u), grp(n), c["name"]), "app-requests")
    return "Requested to sell %s %s shares of %s" % ("all" if x["full"] else "", grp(n), c["name"]), c["id"]


def a_withdraw_sell(st, u, p, today):
    x = find(st.sell_requests, p.get("request_id"))
    need(x and u["role"] == "investor" and x["investor_id"] == u["id"], "Request not found")
    need(x["status"] in ("submitted", "under_review", "rofr"), "This request can no longer be withdrawn")
    x["status"] = "withdrawn"
    x["history"].append(dict(status="withdrawn", at=now(), by=u["id"]))
    return "Withdrew a sell request", x["company_id"]


def a_read_notifications(st, u, p, today):
    n = 0
    for x in st.notifications:
        if x["user_id"] == u["id"] and not x["read"]:
            x["read"] = True
            n += 1
    return "Marked %d notification%s read" % (n, "" if n == 1 else "s"), None


# ---------------- advisor: equity resales ----------------
def a_record_consent(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records the founder's consent")
    h = find(st.holdings, p.get("holding_id"))
    need(h, "Holding not found")
    note = str(p.get("note") or "").strip()[:300]
    need(note, "Describe the written consent (who signed and when)")
    h["early_consent"] = dict(by=u["id"], at=now(), note=note)
    notify(st, h["investor_id"], "sell", "The founder's written consent allows an early sale of your %s shares" % company_of(st, h["company_id"])["name"], "app-portfolio")
    return "Recorded founder consent for an early sale: " + note, h["company_id"]


def a_sell_step(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor moves a sell request")
    x = find(st.sell_requests, p.get("request_id"))
    need(x, "Request not found")
    step = p.get("step")
    c = company_of(st, x["company_id"])
    h = find(st.holdings, x["holding_id"])
    if step == "reject":
        need(x["status"] in SELL_OPEN, "This request is closed")
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give a reason")
        x.update(status="rejected", reason=reason)
    elif step == "review":
        need(x["status"] == "submitted", "Only a submitted request can be put under review")
        x["status"] = "under_review"
    elif step == "rofr":
        need(x["status"] == "under_review", "Review the request first")
        days = inum(p.get("days"))
        need(days and 15 <= days <= 30, "The first-refusal window is 15 to 30 days")
        x.update(status="rofr", rofr_days=days, rofr_until=D.add_days(today, days))
    elif step == "buyer":
        need(x["status"] == "rofr", "Start the first-refusal window first")
        need(today >= x["rofr_until"] or p.get("waived"), "The first-refusal window runs until %s. Record a written waiver to proceed early." % ddmmmyyyy(x["rofr_until"]))
        buyer = user_of(st, p.get("buyer_investor_id"), "investor")
        need(buyer["id"] != x["investor_id"], "The buyer cannot be the seller")
        need((buyer.get("profile") or {}).get("kyc") == "verified", label(buyer) + " has not completed KYC")
        check_new_holder(st, c["id"], buyer["id"], leaving=x["investor_id"] if x["full"] else None)
        x.update(status="buyer_introduced", buyer_investor_id=buyer["id"], rofr_waived=bool(p.get("waived")) and today < x["rofr_until"])
    elif step == "spa":
        need(x["status"] == "buyer_introduced", "Introduce a buyer first")
        price, when = inum(p.get("price_paise")), valid_date(p.get("spa_date") or today)
        need(price and price > 0, "Enter the agreed price per share")
        need(when <= today, "The SPA date cannot be in the future")
        x.update(status="spa_signed", price_paise=price, spa_date=when)
    elif step == "complete":
        need(x["status"] == "spa_signed", "Record the signed SPA first")
        need(h and h["shares"] >= x["shares"], "The seller no longer holds these shares")
        rate = fnum(p.get("fee_rate"))
        need(rate is not None and RESALE_FEE_MIN <= rate <= RESALE_FEE_MAX, "The resale fee is 0.3% to 0.5% of the sale value")
        buyer = user_of(st, x["buyer_investor_id"], "investor")
        leaving = x["investor_id"] if x["shares"] == h["shares"] else None
        check_new_holder(st, c["id"], buyer["id"], leaving=leaving)
        cost_moved = h["cost_paise"] * x["shares"] // h["shares"]
        h["shares"] -= x["shares"]
        h["cost_paise"] -= cost_moved
        st.holdings.append(dict(id=uid("h"), investor_id=buyer["id"], company_id=c["id"], shares=x["shares"], allotment_date=today, invested_at=today,
                                cost_paise=x["shares"] * x["price_paise"], origin="transfer", early_consent=None))
        st.transfers.append(dict(id=uid("t"), sell_request_id=x["id"], company_id=c["id"], from_investor_id=x["investor_id"], to_investor_id=buyer["id"],
                                 shares=x["shares"], price_paise=x["price_paise"], spa_date=x["spa_date"], completed_at=now()))
        x["status"] = "completed"
        notify(st, buyer["id"], "sell", "%s shares of %s transferred to you" % (grp(x["shares"]), c["name"]), "app-portfolio")
        # the selling investor pays the resale fee; buying never carries a fee
        fee = D.half_up(x["shares"] * x["price_paise"] * rate)
        x.update(fee_rate=rate, fee_paise=fee)
        st.invoices.append(dict(id=uid("f"), kind="resale", company_id=c["id"], payer="investor", payer_id=x["investor_id"],
                                period="Resale of %s %s shares" % (grp(x["shares"]), c["name"]), amount_paise=fee, gst_paise=fee * 18 // 100, issued=today, due=D.add_days(today, 15), paid_on=None))
        notify(st, x["investor_id"], "fee", "Resale fee for your %s shares: %s + GST (%s of the sale value), due %s" % (c["name"], rs(fee), pctf(rate), ddmmmyyyy(D.add_days(today, 15))), "app-sells")
    else:
        raise Denied("Unknown step")
    x["history"].append(dict(status=x["status"], at=now(), by=u["id"]))
    notify(st, x["investor_id"], "sell", "Your sell request for %s: %s" % (c["name"], x["status"].replace("_", " ")), "app-portfolio")
    return "Resale of %s %s shares by %s: %s" % (grp(x["shares"]), c["name"], label(user_of(st, x["investor_id"])), STATUS_LABEL[x["status"]]), c["id"]


RESALE_FEE_MIN, RESALE_FEE_MAX = 0.003, 0.005   # paid by the selling investor when a resale completes


def pctf(rate):
    return ("%.2f" % (rate * 100)).rstrip("0").rstrip(".") + "%"


# ---------------- lender ----------------
DEBT_SUCCESS_PERMILLE = 25   # 2.5% of a loan arranged through Aegis Ascend, paid by the company at disbursal

def a_lender_decide(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    nxt = {"sanction": ("applied", "sanctioned"), "decline": ("applied", "declined"), "disburse": ("sanctioned", "disbursed")}.get(p.get("decision"))
    need(nxt and l["status"] == nxt[0], "That step is not available now")
    l["status"] = nxt[1]
    if nxt[1] == "sanctioned":
        l["sanction_date"] = today
    if nxt[1] == "disbursed":
        l.update(disbursal_date=today, payments={})
        # loans arranged through Aegis Ascend: the company pays a 2.5% debt success fee on the amount disbursed
        fee = l["amount_paise"] * DEBT_SUCCESS_PERMILLE // 1000
        c = company_of(st, l["company_id"])
        st.invoices.append(dict(id=uid("f"), kind="debt_success", company_id=c["id"], payer="company", payer_id=c["id"],
                                period="Loan from " + label(u), amount_paise=fee, gst_paise=fee * 18 // 100, issued=today, due=D.add_days(today, 15), paid_on=None))
        for f in st.users:
            if f["role"] == "founder" and f.get("company_id") == c["id"]:
                notify(st, f["id"], "fee", "Your %s loan from %s is disbursed. Aegis Ascend's 2.5%% debt success fee: %s + GST, due %s" % (rs(l["amount_paise"]), label(u), rs(fee), ddmmmyyyy(D.add_days(today, 15))), "app-fees")
    return "Loan %s (%s)" % (l["status"], rs(l["amount_paise"])), l["company_id"]


def a_record_repayment(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] in ("lender", "advisor") and (u["role"] == "advisor" or l["lender_id"] == u["id"]), "Not your loan")
    row = next((r for r in D.schedule(l, today) if r["due"] == p.get("due")), None)
    need(row, "Instalment not found")
    need(row["status"] != "paid", "Already marked as received")
    need(row["due"] <= D.add_days(today, 31), "You can only record instalments due in the next month or earlier")
    l.setdefault("payments", {})[row["due"]] = today
    return "Recorded the %s instalment of %s (due %s)" % (company_of(st, l["company_id"])["name"], rs(row["payment"]), ddmmmyyyy(row["due"])), l["company_id"]


def a_request_loan_transfer(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    need(l["status"] == "disbursed", "Only a disbursed loan can be transferred")
    need((u.get("profile") or {}).get("regulated"), "Only regulated banks and NBFCs can transfer loans")
    need(not any(t["loan_id"] == l["id"] and t["status"] not in ("completed", "rejected") for t in st.loan_transfers), "A transfer for this loan is already open")
    pending = D.loan_summary(l, today)["principal_pending"]
    amount = inum(p.get("amount_paise")) if p.get("amount_paise") not in (None, "") else None
    need(amount is not None or p.get("amount_paise") in (None, ""), "Enter the amount as a number")
    need(amount is None or 0 < amount <= pending, "The amount must be up to the outstanding %s" % rs(pending))
    st.loan_transfers.append(dict(id=uid("lt"), loan_id=l["id"], from_lender_id=u["id"], amount_paise=amount, note=str(p.get("note") or "")[:500],
                                  status="submitted", buyer_lender_id=None, fee_rate=None, fee_paise=None, created_at=now(),
                                  history=[dict(status="submitted", at=now(), by=u["id"])]))
    notify_advisors(st, "transfer", "Loan sale request: %s wants to sell its %s loan" % (label(u), company_of(st, l["company_id"])["name"]), "app-loantransfers")
    return "Asked Aegis Ascend to transfer %s of the %s loan" % (rs(amount or pending), company_of(st, l["company_id"])["name"]), l["company_id"]


def a_loan_transfer_step(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor arranges loan transfers")
    t = find(st.loan_transfers, p.get("transfer_id"))
    need(t and t["status"] not in ("completed", "rejected"), "No open transfer")
    l = find(st.loans, t["loan_id"])
    step = p.get("step")
    if step == "reject":
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give a reason")
        t.update(status="rejected", reason=reason)
    else:
        need(step in LT_STEPS and LT_STEPS.index(step) == LT_STEPS.index(t["status"]) + 1, "Do the steps in order: next is " + LT_STEPS[LT_STEPS.index(t["status"]) + 1].replace("_", " "))
        if step == "eligibility":
            seller = user_of(st, t["from_lender_id"], "lender")
            need((seller.get("profile") or {}).get("regulated"), "The selling lender is not a regulated bank or NBFC")
            held = D.days_between(l["disbursal_date"], today) / 30.4375
            mhp = D.min_holding_months(l)
            need(held >= mhp, "Minimum holding period not met: %d months needed, %.1f held" % (mhp, held))
            t["eligibility"] = dict(checked_at=now(), months_held=round(held, 1), min_holding=mhp)
        elif step == "consent":
            t["borrower_consent_at"] = valid_date(p.get("date") or today)
        elif step == "buyer_introduced":
            buyer = user_of(st, p.get("buyer_lender_id"), "lender")
            need(buyer["id"] != t["from_lender_id"], "The buyer must be a different lender")
            need((buyer.get("profile") or {}).get("regulated"), "Loans move only between regulated banks and NBFCs")
            t["buyer_lender_id"] = buyer["id"]
        elif step == "deed_signed":
            t["deed_date"] = valid_date(p.get("date") or today)
        elif step == "charge_updated":
            t["charge_date"] = valid_date(p.get("date") or today)
        elif step == "completed":
            rate = fnum(p.get("fee_rate"))
            need(rate is not None and 0.003 <= rate <= 0.005, "The transfer fee is 0.3% to 0.5%")
            base = t["amount_paise"] or D.loan_summary(l, today)["principal_pending"]
            fee = D.half_up(base * rate)
            t.update(fee_rate=rate, fee_paise=fee)
            l["lender_id"] = t["buyer_lender_id"]
            st.invoices.append(dict(id=uid("f"), kind="transfer", company_id=l["company_id"], payer="lender", payer_id=t["from_lender_id"],
                                    period="Loan transfer " + t["id"], amount_paise=fee, gst_paise=fee * 18 // 100, issued=today, due=D.add_days(today, 15), paid_on=None))
            notify(st, t["buyer_lender_id"], "transfer", "A %s loan has moved to your book" % company_of(st, l["company_id"])["name"], "app-loanbook")
        t["status"] = step
    t["history"].append(dict(status=t["status"], at=now(), by=u["id"]))
    notify(st, t["from_lender_id"], "transfer", "Loan transfer for %s: %s" % (company_of(st, l["company_id"])["name"], t["status"].replace("_", " ")), "app-loanbook")
    return "Loan transfer of the %s loan from %s: %s" % (company_of(st, l["company_id"])["name"], label(user_of(st, t["from_lender_id"])), STATUS_LABEL[t["status"]]), l["company_id"]


# ---------------- advisor: notes, invoices ----------------
def a_save_note(st, u, p, today):
    need(u["role"] == "advisor", "Only advisors keep notes")
    kind, sid, text = p.get("subject_type"), p.get("subject_id"), str(p.get("text") or "").strip()[:600]
    need(kind in ("investor", "lender", "company") and sid and text, "Write the note and choose who it is about")
    if kind == "company":
        company_of(st, sid)
    else:
        user_of(st, sid, kind)
    due = p.get("due") or None
    if due:
        D.d(due)
    st.notes.append(dict(id=uid("n"), subject_type=kind, subject_id=sid, text=text, due=due, done=False, by=u["id"], at=now()))
    return "Added a note" + (" due " + ddmmmyyyy(due) if due else ""), sid if kind == "company" else None


def a_toggle_note(st, u, p, today):
    need(u["role"] == "advisor", "Only advisors keep notes")
    n = find(st.notes, p.get("note_id"))
    need(n, "Note not found")
    n["done"] = not n["done"]
    return ("Completed" if n["done"] else "Reopened") + " a task", n["subject_id"] if n["subject_type"] == "company" else None


def a_mark_invoice_paid(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records payments")
    f = find(st.invoices, p.get("invoice_id"))
    need(f and not f["paid_on"], "Invoice not found or already paid")
    f["paid_on"] = valid_date(p.get("date") or today)
    return "Invoice %s marked paid (%s + GST)" % (f["id"], rs(f["amount_paise"])), f["company_id"]


def a_save_invoice(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor raises invoices")
    kind = p.get("kind")
    need(kind in ("advisory", "success", "debt_success", "revenue_share", "monitoring", "transfer"), "Unknown fee type")
    c = company_of(st, p.get("company_id"))
    amount = inum(p.get("amount_paise"))
    need(amount and amount > 0, "Enter the amount")
    payer = "lender" if kind in ("monitoring", "transfer") else "company"
    payer_id = c["id"] if payer == "company" else user_of(st, p.get("payer_id"), "lender")["id"]
    due = valid_date(p.get("due") or D.add_days(today, 15))
    st.invoices.append(dict(id=uid("f"), kind=kind, company_id=c["id"], payer=payer, payer_id=payer_id, period=str(p.get("period") or "")[:60],
                            amount_paise=amount, gst_paise=amount * 18 // 100, issued=today, due=due, paid_on=None))
    return "Raised a %s invoice for %s: %s + GST" % (kind.replace("_", " "), c["name"], rs(amount)), c["id"]


ACTIONS = {name[2:]: fn for name, fn in list(globals().items()) if name.startswith("a_") and callable(fn)}
```


## B3. `backend/integrations/service.py`

KYC, e-signing and payments: starting them and applying provider results.

```python
"""Starting KYC checks, signings and payments, and applying the providers' signed results.

Results are applied in one transaction behind the same write lock as every other action, through the same Store, with an
audit entry and notifications, so they look and behave like any other change. A provider event is recorded before it is
applied; the same event arriving again is ignored."""
import hashlib
import hmac
import re
from datetime import date

from sqlalchemy import insert, select, update

from backend import db as T
from backend.auth import utcnow
from backend.config import settings
from backend.integrations import documents as DOCS
from backend.integrations.providers import Event, provider
from backend.storage import storage
from backend.store import Store, diff, now, uid, write_audit
from server.actions import Denied, find, label, notify, notify_advisors, release_waiting

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def need(cond, msg):
    if not cond:
        raise Denied(msg)


def today():
    return settings.today or date.today().isoformat()


def nice_date(iso):
    d = date.fromisoformat(iso[:10])
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)


def pan_hash(pan):
    return hmac.new(settings.secret_key.encode(), ("pan:" + pan).encode(), hashlib.sha256).hexdigest()


def _save(conn, st, user, action, detail, company_id=None):
    changes = st.save()
    write_audit(conn, user, action, detail, company_id, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes])


def _user(st, uid_):
    return next((u for u in st.users if u["id"] == uid_), None)


# ---------- KYC ----------
def start_kyc(conn, user, pan, name):
    need(user["role"] == "investor", "Identity checks are for investors")
    pan, name = str(pan or "").strip().upper(), str(name or "").strip()[:120]
    need(PAN_RE.match(pan), "Enter a valid PAN: 5 letters, 4 digits, 1 letter (for example ABCDE1234F)")
    need(name, "Enter your name as it appears on your PAN card")
    T.write_lock(conn)
    st = Store(conn)
    me = _user(st, user["id"])
    prof = me["profile"] = me.get("profile") or {}
    need(prof.get("kyc") != "verified", "Your identity is already verified")
    h = pan_hash(pan)
    other = conn.execute(select(T.kyc_checks.c.user_id).where(T.kyc_checks.c.pan_hash == h, T.kyc_checks.c.status == "verified",
                                                               T.kyc_checks.c.user_id != user["id"])).first()
    need(not other, "This PAN is already verified on another account. Contact your advisor.")
    check = dict(id=uid("kyc"), user_id=user["id"], name_given=name, pan_last4=pan[-4:])
    p = provider("kyc")
    ref, url = p.start_kyc(check, me, settings.public_url + "/#app-kyc")
    conn.execute(insert(T.kyc_checks).values(provider=p.name, provider_ref=ref, status="started", pan_hash=h, created_at=utcnow(), **check))
    prof["kyc"] = "pending"
    _save(conn, st, user, "kyc_started", "Started an identity check (PAN ending %s) with %s" % (pan[-4:], p.name))
    return dict(redirect_url=url)


def kyc_status(conn, user):
    rows = conn.execute(select(T.kyc_checks).where(T.kyc_checks.c.user_id == user["id"]).order_by(T.kyc_checks.c.created_at.desc()).limit(5)).all()
    return dict(kyc=(user.get("profile") or {}).get("kyc") or "not_started",
                checks=[dict(id=r.id, status=r.status, pan_last4=r.pan_last4, provider=r.provider, reason=r.reason,
                             started=r.created_at.isoformat(), completed=r.completed_at and r.completed_at.isoformat()) for r in rows])


def _apply_kyc(conn, st, ev, provider_name):
    r = conn.execute(select(T.kyc_checks).where(T.kyc_checks.c.provider == provider_name, T.kyc_checks.c.provider_ref == ev.ref)).first()
    need(r, "Unknown KYC check")
    if r.status != "started":
        return "already decided"
    inv = _user(st, r.user_id)
    prof = inv["profile"] = inv.get("profile") or {}
    if ev.outcome == "verified":
        conn.execute(update(T.kyc_checks).where(T.kyc_checks.c.id == r.id).values(status="verified", completed_at=utcnow()))
        prof.update(kyc="verified", kyc_verified_at=now(), kyc_ref=r.id, pan_last4=r.pan_last4, kyc_note=None)
        notify(st, inv["id"], "kyc", "Your identity is verified. You can now receive private offers.", "app-kyc")
        notify_advisors(st, "kyc", "KYC verified: " + label(inv), "app-directory")
        release_waiting(st, inv["id"], None, today())   # confirmed suggestions waiting for this KYC get their offers
        _save(conn, st, inv, "kyc_verified", "Identity verified by %s (PAN ending %s)" % (provider_name, r.pan_last4))
    else:
        reason = str(ev.data.get("reason") or "The details could not be verified")[:300]
        conn.execute(update(T.kyc_checks).where(T.kyc_checks.c.id == r.id).values(status="rejected", reason=reason, completed_at=utcnow()))
        prof.update(kyc="not_started", kyc_note=reason)
        notify(st, inv["id"], "kyc", "Your identity check did not go through: " + reason, "app-kyc")
        _save(conn, st, inv, "kyc_rejected", "Identity check not passed (%s): %s" % (provider_name, reason))
    return "applied"


# ---------- e-signing ----------
def _new_request(conn, kind, subject_id, company_id, signer, created_by, title, body, terms=None):
    req = dict(id=uid("sig"), kind=kind, subject_id=subject_id, company_id=company_id, signer_id=signer["id"], created_by=created_by,
               title=title, body=body, doc_hash=DOCS.doc_hash(body), terms=terms, provider=settings.esign_provider, status="created", created_at=utcnow())
    conn.execute(insert(T.esign_requests).values(**req))
    return req


def _send(conn, req, signer, return_path):
    p = provider("esign")
    ref, url = p.start_esign(req, signer, settings.public_url + return_path)
    conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == req["id"]).values(provider=p.name, provider_ref=ref, status="sent"))
    return url


def start_nda(conn, user, intro_id):
    T.write_lock(conn)
    st = Store(conn)
    i = find(st.intros, intro_id)
    need(i and user["role"] == "investor" and i["investor_id"] == user["id"], "Introduction not found")
    need(i["status"] == "granted", "The founder has not granted access yet")
    need(not i.get("nda_signed_at"), "You have already signed this NDA")
    c = find(st.companies, i["company_id"])
    me = _user(st, user["id"])
    old = conn.execute(select(T.esign_requests).where(T.esign_requests.c.kind == "nda", T.esign_requests.c.subject_id == i["id"],
                                                      T.esign_requests.c.status.in_(("created", "sent")))).first()
    req = dict(old._mapping) if old else _new_request(conn, "nda", i["id"], c["id"], me, user["id"], *DOCS.nda(c, me, nice_date(today())))
    write_audit(conn, user, "esign_started", "Opened the NDA for %s for e-signing" % c["name"], c["id"])
    return dict(redirect_url=_send(conn, req, me, "/#app-rooms"))


def send_engagement(conn, user, company_id, fee_lakh):
    need(user["role"] == "advisor", "Only an advisor sends engagement letters")
    try:
        fee_paise = int(round(float(fee_lakh) * 100_000 * 100))
    except (TypeError, ValueError):
        fee_paise = 0
    need(fee_paise >= 100_000 * 100, "The advisory fee starts at Rs 1 lakh")
    need(fee_paise <= 1_00_00_000 * 100, "Check the advisory fee: it is above Rs 1 crore")
    T.write_lock(conn)
    st = Store(conn)
    c = find(st.companies, company_id)
    need(c, "Company not found")
    founder = next((u for u in st.users if u["role"] == "founder" and u.get("company_id") == c["id"]), None)
    need(founder, "This company has no founder account to sign")
    eng = c.get("engagement") or {}
    need(eng.get("status") != "signed", "This company has already signed its engagement letter")
    if eng.get("esign_id"):   # a resent letter replaces the unsigned one
        conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == eng["esign_id"], T.esign_requests.c.status.in_(("created", "sent")))
                     .values(status="replaced"))
    req = _new_request(conn, "engagement", c["id"], c["id"], founder, user["id"], *DOCS.engagement(c, founder, fee_paise, nice_date(today())),
                       terms=dict(fee_paise=fee_paise))
    c["engagement"] = dict(status="sent", esign_id=req["id"], fee_paise=fee_paise, sent_at=now(), signed_at=None)
    notify(st, founder["id"], "esign", "Your engagement letter from Aegis Ascend is ready to sign", "app")
    _save(conn, st, user, "engagement_sent", "Sent the engagement letter to %s (advisory fee Rs %s lakh)" % (c["name"], "{:g}".format(fee_paise / 10_000_000)), c["id"])
    return dict(esign_id=req["id"])


def start_esign(conn, user, esign_id):
    r = conn.execute(select(T.esign_requests).where(T.esign_requests.c.id == esign_id)).first()
    need(r and r.signer_id == user["id"], "Document not found")
    need(r.status in ("created", "sent"), "This document is already %s" % r.status)
    me = dict(conn.execute(select(T.users).where(T.users.c.id == user["id"])).first()._mapping)
    write_audit(conn, user, "esign_started", "Opened \"%s\" for e-signing" % r.title, r.company_id)
    return dict(redirect_url=_send(conn, dict(r._mapping), me, "/#app-rooms" if r.kind == "nda" else "/#app"))


def esign_document(conn, user, esign_id):
    """The signed copy, for the signer and advisors."""
    r = conn.execute(select(T.esign_requests).where(T.esign_requests.c.id == esign_id)).first()
    need(r and (r.signer_id == user["id"] or user["role"] == "advisor"), "Document not found")
    need(r.status == "signed" and r.signed_key, "This document has not been signed yet")
    return r, storage().get(r.signed_key)


def _apply_esign(conn, st, ev, provider_name):
    r = conn.execute(select(T.esign_requests).where(T.esign_requests.c.provider == provider_name, T.esign_requests.c.provider_ref == ev.ref)).first()
    need(r, "Unknown signing request")
    if r.status != "sent":
        return "already decided"
    signer = _user(st, r.signer_id)
    if ev.outcome != "signed":
        conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == r.id).values(status="declined"))
        if r.kind == "engagement":
            c = find(st.companies, r.subject_id)
            c["engagement"] = dict(c.get("engagement") or {}, status="declined")
            notify_advisors(st, "esign", "%s declined the engagement letter" % c["name"], "app-companyfile/" + c["id"])
        _save(conn, st, signer, "esign_declined", "Declined to sign \"%s\"" % r.title, r.company_id)
        return "applied"
    signed_at, ip = utcnow(), str(ev.data.get("ip") or "")[:64] or None
    req = dict(r._mapping, signed_at=signed_at, signer_ip=ip)
    pdf = provider("esign").fetch_signed(ev.ref) or DOCS.signed_pdf(req, signer, "%s e-sign" % provider_name)
    key = "esign_%s.pdf" % r.id
    storage().put(key, pdf, "application/pdf")
    conn.execute(update(T.esign_requests).where(T.esign_requests.c.id == r.id).values(status="signed", signed_at=signed_at, signer_ip=ip, signed_key=key))
    if r.kind == "nda":
        i = find(st.intros, r.subject_id)
        i["nda_signed_at"] = i.get("nda_signed_at") or signed_at.isoformat()
        i["nda_esign_id"] = r.id
        _save(conn, st, signer, "nda_esigned", "Signed the NDA for %s by e-sign" % find(st.companies, r.company_id)["name"], r.company_id)
    else:
        c = find(st.companies, r.subject_id)
        c["engagement"] = dict(c.get("engagement") or {}, status="signed", signed_at=signed_at.isoformat())
        notify_advisors(st, "esign", "%s signed the engagement letter" % c["name"], "app-companyfile/" + c["id"])
        _save(conn, st, signer, "engagement_signed", "Signed the engagement letter by e-sign", c["id"])
    return "applied"


# ---------- payments ----------
def start_payment(conn, user, invoice_id):
    T.write_lock(conn)
    st = Store(conn)
    f = find(st.invoices, invoice_id)
    mine = f and ((f["payer"] == "company" and user["role"] == "founder" and user.get("company_id") == f["company_id"])
                  or (f["payer"] in ("investor", "lender") and f.get("payer_id") == user["id"]))
    need(mine, "Invoice not found")
    need(not f.get("paid_on"), "This invoice is already paid")
    total = f["amount_paise"] + f["gst_paise"]
    pay = dict(id=uid("pay"), invoice_id=f["id"], payer_user_id=user["id"], amount_paise=total)
    p = provider("payment")
    back = {"founder": "/#app-fees", "investor": "/#app-sells", "lender": "/#app-lfees"}.get(user["role"], "/#app")
    ref, url = p.start_payment(pay, f, user, settings.public_url + back)
    conn.execute(insert(T.payments).values(provider=p.name, provider_ref=ref, status="created", currency="INR", created_at=utcnow(), **pay))
    write_audit(conn, user, "payment_started", "Started an online payment of invoice %s (Rs %s incl. GST)" % (f["id"], "{:,.2f}".format(total / 100)), f["company_id"])
    return dict(redirect_url=url)


def _apply_payment(conn, st, ev, provider_name):
    r = conn.execute(select(T.payments).where(T.payments.c.provider == provider_name, T.payments.c.provider_ref == ev.ref)).first()
    need(r, "Unknown payment")
    if r.status == "paid":
        return "already decided"
    payer = _user(st, r.payer_user_id)
    if ev.outcome != "paid":
        conn.execute(update(T.payments).where(T.payments.c.id == r.id).values(status="failed", error=str(ev.data.get("reason") or "")[:300]))
        return "applied"
    amount = int(ev.data.get("amount_paise") or -1)
    if amount != r.amount_paise:   # never mark an invoice paid for a different sum
        conn.execute(update(T.payments).where(T.payments.c.id == r.id).values(status="failed", error="Amount %s does not match %s" % (amount, r.amount_paise)))
        notify_advisors(st, "payment", "A payment for invoice %s arrived with the wrong amount. Check it with the provider." % r.invoice_id, "app-revenue")
        _save(conn, st, payer, "payment_mismatch", "Online payment for invoice %s did not match the amount due" % r.invoice_id)
        return "mismatch"
    conn.execute(update(T.payments).where(T.payments.c.id == r.id).values(status="paid", paid_at=utcnow()))
    f = find(st.invoices, r.invoice_id)
    if not f.get("paid_on"):
        f.update(paid_on=today(), paid_via=provider_name, payment_ref=str(ev.data.get("payment_id") or ev.ref)[:120])
    notify_advisors(st, "payment", "Invoice %s paid online by %s" % (f["id"], label(payer)), "app-revenue")
    _save(conn, st, payer, "invoice_paid_online", "Paid invoice %s online (Rs %s incl. GST, %s)" % (f["id"], "{:,.2f}".format(r.amount_paise / 100), provider_name), f["company_id"])
    return "applied"


# ---------- provider events ----------
APPLY = {"kyc": _apply_kyc, "esign": _apply_esign, "payment": _apply_payment}


def process_event(provider_name, ev: Event):
    """Apply a verified provider event once. Returns what happened, for the webhook's reply."""
    need(ev.kind in APPLY, "Unknown event kind")
    with T.engine().begin() as conn:
        T.write_lock(conn)
        seen = conn.execute(select(T.webhook_events.c.event_id).where(T.webhook_events.c.provider == provider_name, T.webhook_events.c.event_id == ev.id)).first()
        if seen:
            return "duplicate"
        conn.execute(insert(T.webhook_events).values(provider=provider_name, event_id=ev.id, kind=ev.kind, received_at=utcnow(),
                                                     payload=dict(ref=ev.ref, outcome=ev.outcome, data=ev.data)))
        return APPLY[ev.kind](conn, Store(conn), ev, provider_name)
```


## B4. `site/calc.js`

Calculation engine: Funding Twin, simulation, Readiness, term sheets, monitoring, fit score, fees, exit tax.

```javascript
/* Aegis Ascend calculation engine (browser and Node).
   Deterministic: no network, no AI, no randomness except a seeded generator for simulations.
   Money in Rs crore unless a name says otherwise. */
(function (root) {
  "use strict";
  const ENGINE_VERSION = "gb-engine 1.0.0";

  // ---------- small helpers ----------
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(rand) { // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- loans ----------
  /** Equal yearly instalment: P x r / (1 - (1 + r)^-n). */
  function annuity(P, r, n) {
    if (n <= 0) return 0;
    return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  }
  /** Yearly schedule with optional interest-only moratorium. Repays to exactly zero. */
  function loanSchedule(P, r, tenor, moratorium = 0) {
    const rows = [];
    let bal = P;
    const pay = annuity(P, r, tenor);
    for (let t = 1; t <= moratorium + tenor; t++) {
      const interest = bal * r;
      let principal = t > moratorium ? pay - interest : 0;
      if (t === moratorium + tenor) principal = bal; // close rounding drift
      rows.push({ year: t, opening: bal, interest, principal, payment: interest + principal, closing: bal - principal });
      bal -= principal;
    }
    return rows;
  }
  /** Internal rate of return of yearly cash flows cf[0..n] by bisection. */
  function irr(cf) {
    const npv = (r) => cf.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 5;
    if (npv(lo) * npv(hi) > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  // ---------- Funding Twin ----------
  const TWIN_DEFAULTS = {
    raise: 12, pre_money: 60, value_growth: 0.18, horizon: 7, loan_rate: 0.11, tenor: 7, moratorium: 0,
    tax_rate: 0.25, discount_rate: 0.14, ebitda0: 5, ebitda_growth: 0.12, existing_ds: 1.5, dscr_min: 1.25,
    cash: 3, growth_sigma: 0.08, sales_drop: 0.2, rate_shock: 0.02, op_leverage: 1.5,
  };

  /** Cash flow test for a loan L: DSCR each year = CFADS / (existing debt service + loan payment). */
  function dscrPath(q, L, opt = {}) {
    const drop = opt.salesDrop || 0, shock = opt.rateShock || 0, egr = opt.ebitdaGrowth !== undefined ? opt.ebitdaGrowth : q.ebitda_growth;
    const sch = loanSchedule(L, q.loan_rate + shock, q.tenor, q.moratorium);
    const years = Math.max(q.horizon, sch.length);
    const out = [];
    for (let t = 1; t <= years; t++) {
      const row = sch[t - 1] || { interest: 0, principal: 0, payment: 0, closing: 0 };
      const ebitda = q.ebitda0 * Math.pow(1 + egr, t) * (1 - clamp(drop * q.op_leverage, 0, 1));
      const tax = q.tax_rate * Math.max(ebitda - row.interest, 0);
      const cfads = ebitda - tax;
      const ds = q.existing_ds + row.payment;
      out.push({ year: t, ebitda, tax, cfads, interest: row.interest, principal: row.principal, ds, dscr: ds > 0 ? cfads / ds : Infinity, cash_after: cfads - ds, outstanding: row.closing });
    }
    return out;
  }
  const minDscr = (path) => Math.min(...path.map((r) => r.dscr));

  /** Founder value at the horizon for a given loan L and equity E (founder starts at 100%). */
  function founderValue(q, L, E, valueGrowth) {
    const g = valueGrowth !== undefined ? valueGrowth : q.value_growth;
    const Vn = (q.pre_money + q.raise) * Math.pow(1 + g, q.horizon);
    const sch = loanSchedule(L, q.loan_rate, q.tenor, q.moratorium);
    const inHorizon = sch.slice(0, q.horizon);
    const paid = sum(inHorizon.map((r) => r.payment));
    const shield = sum(inHorizon.map((r) => r.interest)) * q.tax_rate;
    const outstanding = inHorizon.length ? inHorizon[inHorizon.length - 1].closing : L;
    const debtCost = paid - shield + outstanding; // cash the company gives up for the loan
    const stake = E > 0 ? E / (q.pre_money + E) : 0;
    return { Vn, debtCost, paid, shield, outstanding, stake, value: (1 - stake) * (Vn - debtCost) };
  }

  function twin(input) {
    const q = Object.assign({}, TWIN_DEFAULTS, input || {});
    const A = q.raise;
    const sch = loanSchedule(A, q.loan_rate, q.tenor, q.moratorium);
    const debt = founderValue(q, A, 0), eq = founderValue(q, 0, A);
    const disc = Math.pow(1 + q.discount_rate, q.horizon);
    const net = (debt.value - eq.value) / disc;
    // break-even company value: (1 - s) V = V - C  =>  V = C / s
    const breakEven = eq.stake > 0 ? debt.debtCost / eq.stake : Infinity;
    const breakEvenGrowth = Math.pow(breakEven / (q.pre_money + A), 1 / q.horizon) - 1;
    const cases = {
      best: q.value_growth + q.growth_sigma, expected: q.value_growth, worst: q.value_growth - q.growth_sigma,
    };
    const range = {};
    for (const k in cases) {
      const d = founderValue(q, A, 0, cases[k]), e = founderValue(q, 0, A, cases[k]);
      range[k] = { growth: cases[k], debt: d.value, equity: e.value, net: (d.value - e.value) / disc };
    }
    // DSCR paths for all-debt
    const expPath = dscrPath(q, A);
    const stressPath = dscrPath(q, A, { salesDrop: q.sales_drop, rateShock: q.rate_shock });
    // Best mix: debt share 0..100% in 5% steps
    const mixes = [];
    for (let i = 0; i <= 20; i++) {
      const share = i / 20, L = A * share, E = A - L;
      const fv = founderValue(q, L, E);
      const exp = minDscr(dscrPath(q, L)), str = minDscr(dscrPath(q, L, { salesDrop: 0.2, rateShock: 0.02 }));
      mixes.push({ share, loan: L, equity: E, value: fv.value, stake: fv.stake, dscr: exp, dscr_stress: str, ok: exp >= q.dscr_min && str >= 1.0 });
    }
    const feasible = mixes.filter((m) => m.ok);
    const best = feasible.length ? feasible.reduce((a, b) => (b.value > a.value ? b : a)) : mixes[0];
    return {
      q, version: ENGINE_VERSION, schedule: sch, payment: annuity(A, q.loan_rate, q.tenor),
      total_repaid: sum(sch.map((r) => r.payment)), total_interest: sum(sch.map((r) => r.interest)),
      debt, equity: eq, net, break_even: breakEven, break_even_growth: breakEvenGrowth, range,
      dscr_expected: expPath, dscr_stress: stressPath, min_dscr: minDscr(expPath), min_dscr_stress: minDscr(stressPath),
      mixes, best,
    };
  }

  /** Seeded simulation: chance that all-debt beats all-equity, and chance of a year with DSCR below 1. */
  function simulate(input, runs = 2000, seed = 20261013) {
    const q = Object.assign({}, TWIN_DEFAULTS, input || {});
    const rand = mulberry32(seed);
    let debtWins = 0, defaults = 0, bestWins = 0;
    const t = twin(q), bestL = t.best.loan;
    const nets = [];
    for (let i = 0; i < runs; i++) {
      const g = q.value_growth + q.growth_sigma * normal(rand);
      const eg = q.ebitda_growth + q.growth_sigma * normal(rand);
      const shock = clamp(0.1 * normal(rand), -0.5, 0.5); // one-off level shock to EBITDA
      const d = founderValue(q, q.raise, 0, g).value, e = founderValue(q, 0, q.raise, g).value;
      nets.push(d - e);
      if (d > e) debtWins++;
      const qq = Object.assign({}, q, { ebitda0: q.ebitda0 * (1 + shock) });
      if (minDscr(dscrPath(qq, q.raise, { ebitdaGrowth: eg })) < 1) defaults++;
      const bm = founderValue(q, bestL, q.raise - bestL, g).value;
      if (bm > e) bestWins++;
    }
    nets.sort((a, b) => a - b);
    const pick = (p) => nets[Math.min(nets.length - 1, Math.floor(p * nets.length))];
    return { runs, seed, p_debt_better: debtWins / runs, p_default: defaults / runs, p_bestmix_better: bestWins / runs,
      p10: pick(0.1), p50: pick(0.5), p90: pick(0.9) };
  }

  // ---------- Funding Readiness Score ----------
  const READINESS_DEFAULTS = {
    dscr: 1.4, collateral_cover: 1.2, gst_on_time: 10, audited_years: 3, credit_score: 760, debt_to_ebitda: 2.4,
    revenue_growth: 0.22, ebitda_positive_years: 3, board_in_place: true, clean_cap_table: true,
    data_room_ready: false, team_complete: true, market_story: true,
  };
  function readiness(input) {
    const a = Object.assign({}, READINESS_DEFAULTS, input || {});
    const debt = [], eq = [];
    const add = (list, name, pts, max, ok, fix) => list.push({ name, pts, max, ok, fix });
    add(debt, "Repayment safety (DSCR " + a.dscr.toFixed(2) + ")", a.dscr >= 1.5 ? 25 : a.dscr >= 1.25 ? 18 : a.dscr >= 1 ? 8 : 0, 25, a.dscr >= 1.25,
      "Lift DSCR above 1.25: cut the loan size, lengthen the tenor or improve operating cash flow.");
    add(debt, "Collateral cover " + a.collateral_cover.toFixed(2) + "x", a.collateral_cover >= 1.5 ? 20 : a.collateral_cover >= 1 ? 12 : 4, 20, a.collateral_cover >= 1.25,
      "Raise collateral cover to 1.25x or more, or apply for a CGTMSE-backed loan.");
    add(debt, "GST returns filed on time (" + a.gst_on_time + " of 12 months)", Math.round(15 * clamp(a.gst_on_time, 0, 12) / 12), 15, a.gst_on_time >= 11,
      "File every GST return on time for the next 6 months; lenders check the last 12.");
    add(debt, "Audited accounts (" + a.audited_years + " years)", a.audited_years >= 3 ? 10 : a.audited_years === 2 ? 6 : 2, 10, a.audited_years >= 3,
      "Complete 3 years of audited accounts before applying.");
    add(debt, "Credit score " + a.credit_score, a.credit_score >= 750 ? 15 : a.credit_score >= 700 ? 10 : 3, 15, a.credit_score >= 750,
      "Clear overdue accounts and keep utilisation of existing limits below 70% to lift the credit score above 750.");
    add(debt, "Debt / EBITDA " + a.debt_to_ebitda.toFixed(1) + "x", a.debt_to_ebitda <= 2 ? 15 : a.debt_to_ebitda <= 3.5 ? 9 : 2, 15, a.debt_to_ebitda <= 3,
      "Bring debt to EBITDA below 3x before adding new term debt.");
    add(eq, "Revenue growth " + Math.round(a.revenue_growth * 100) + "% a year", a.revenue_growth >= 0.25 ? 25 : a.revenue_growth >= 0.15 ? 18 : a.revenue_growth >= 0.08 ? 10 : 3, 25, a.revenue_growth >= 0.15,
      "Show a credible plan for 15%+ growth; investors price equity on growth.");
    add(eq, "EBITDA positive for " + a.ebitda_positive_years + " years", a.ebitda_positive_years >= 2 ? 15 : a.ebitda_positive_years === 1 ? 8 : 0, 15, a.ebitda_positive_years >= 2,
      "Reach two years of positive EBITDA, or present a clear path to it.");
    add(eq, "Board and statutory compliance", a.board_in_place ? 15 : 3, 15, !!a.board_in_place, "Hold regular board meetings and bring ROC filings up to date.");
    add(eq, "Clean cap table", a.clean_cap_table ? 15 : 3, 15, !!a.clean_cap_table, "Settle informal promises of shares and document every shareholder.");
    add(eq, "Data room ready", a.data_room_ready ? 10 : 2, 10, !!a.data_room_ready, "Put audited accounts, GST returns, key contracts and the cap table in the data room.");
    add(eq, "Management team complete", a.team_complete ? 10 : 4, 10, !!a.team_complete, "Name a finance lead who can answer investor diligence.");
    add(eq, "Market and use-of-funds story", a.market_story ? 10 : 3, 10, !!a.market_story, "Write a one-page use-of-funds and market note.");
    const score = (l) => sum(l.map((x) => x.pts));
    const verdict = (s) => (s >= 75 ? "Ready" : s >= 55 ? "Nearly ready" : "Not yet ready");
    return { debt: { items: debt, score: score(debt), verdict: verdict(score(debt)) }, equity: { items: eq, score: score(eq), verdict: verdict(score(eq)) },
      plan: debt.concat(eq).filter((x) => !x.ok).map((x) => x.fix) };
  }

  // ---------- Term Sheet Analyser ----------
  const LOAN_TS_DEFAULTS = { amount: 10, rate: 0.105, tenor: 7, processing_fee: 0.01, other_fees: 0.05, prepayment_penalty: 0.02,
    floating: true, personal_guarantee: true, cross_default: false, collateral_margin: 0.25 };
  function loanTermSheet(input) {
    const a = Object.assign({}, LOAN_TS_DEFAULTS, input || {});
    const pay = annuity(a.amount, a.rate, a.tenor);
    const fees = a.amount * a.processing_fee + a.other_fees;
    const cf = [a.amount - fees].concat(Array(a.tenor).fill(-pay));
    const allIn = irr(cf);
    const flags = [];
    if (a.personal_guarantee) flags.push(["high", "Personal guarantee: the founder's own assets are at risk if the company defaults."]);
    if (a.cross_default) flags.push(["high", "Cross-default: a missed payment on any other loan triggers default on this one."]);
    if (a.prepayment_penalty > 0.02) flags.push(["medium", "Prepayment penalty above 2% makes refinancing expensive."]);
    if (a.floating) flags.push(["medium", "Floating rate: a 1-point rise adds about Rs " + (a.amount * 0.01 * a.tenor / 2).toFixed(2) + " cr over the loan."]);
    if (a.collateral_margin > 0.25) flags.push(["medium", "Collateral margin above 25% ties up more assets than usual."]);
    if (allIn - a.rate > 0.005) flags.push(["low", "Fees add " + ((allIn - a.rate) * 100).toFixed(2) + " points to the headline rate."]);
    return { a, payment: pay, fees, all_in: allIn, total_paid: pay * a.tenor + fees, flags };
  }
  const EQ_TS_DEFAULTS = { pre_money: 60, investment: 12, option_pool: 0.08, pool_pre_money: true, liq_pref: 1, participating: false,
    anti_dilution: "broad", board_seats: 1, vetoes: 4 };
  function equityTermSheet(input) {
    const a = Object.assign({}, EQ_TS_DEFAULTS, input || {});
    const post = a.pre_money + a.investment;
    const inv = a.investment / post;
    const pool = a.option_pool;
    const founder = 1 - inv - pool;
    const effPre = a.pool_pre_money ? a.pre_money - pool * post : a.pre_money;
    const pref = a.liq_pref * a.investment;
    const exits = [0.5, 1, 2, 3, 5].map((m) => {
      const exit = post * m;
      let investor;
      if (a.participating) investor = Math.min(exit, pref) + inv * Math.max(exit - pref, 0);
      else investor = Math.max(Math.min(exit, pref), inv * exit);
      const rest = Math.max(exit - investor, 0);
      const founderGets = rest * founder / (founder + pool);
      return { multiple: m, exit, investor, founder: founderGets, founder_pct: exit > 0 ? founderGets / exit : 0 };
    });
    const flags = [];
    if (a.participating) flags.push(["high", "Participating preference: the investor takes the preference and then shares in the rest (double dip)."]);
    if (a.liq_pref > 1) flags.push(["high", a.liq_pref + "x liquidation preference: the investor gets " + a.liq_pref + " times their money first."]);
    if (a.anti_dilution === "full") flags.push(["high", "Full-ratchet anti-dilution: a lower future price resets the investor's whole stake."]);
    if (a.pool_pre_money && pool > 0) flags.push(["medium", "Option pool carved from the pre-money: the effective pre-money is Rs " + effPre.toFixed(1) + " cr, not Rs " + a.pre_money + " cr."]);
    if (pool > 0.1) flags.push(["medium", "Option pool above 10% dilutes the founder more than most SME deals need."]);
    if (a.board_seats >= 2) flags.push(["medium", a.board_seats + " investor board seats can shift control."]);
    if (a.vetoes > 6) flags.push(["medium", a.vetoes + " veto rights: day-to-day decisions may need investor consent."]);
    return { a, post, investor_pct: inv, pool_pct: pool, founder_pct: founder, effective_pre: effPre, exits, flags };
  }

  // ---------- Post-funding monitoring ----------
  const COVENANTS = { dscr_min: 1.25, debt_ebitda_max: 3.5 };
  function monitor(quarters, cov) {
    const c = Object.assign({}, COVENANTS, cov || {});
    return (quarters || []).map((q) => {
      const ds = q.interest + q.principal;
      const tax = (q.tax_rate || 0.25) * Math.max(q.ebitda - q.interest, 0);
      const dscr = ds > 0 ? (q.ebitda - tax) / ds : Infinity;
      const lev = q.ebitda > 0 ? q.debt / (q.ebitda * 4) : Infinity;
      const h1 = dscr / c.dscr_min - 1, h2 = 1 - lev / c.debt_ebitda_max;
      const state = (h) => (h < 0 ? "breach" : h < 0.1 ? "watch" : "ok");
      const worst = [state(h1), state(h2)].includes("breach") ? "breach" : [state(h1), state(h2)].includes("watch") ? "watch" : "ok";
      return Object.assign({}, q, { dscr, debt_ebitda: lev, dscr_headroom: h1, lev_headroom: h2, state: worst });
    });
  }

  // ---------- Investor Fit Score ----------
  function fitScore(company, inv) {
    const m = inv.mandate || {}, reasons = [];
    let s = 0;
    if ((m.sectors || []).includes(company.sector)) { s += 35; reasons.push("Invests in " + company.sector); }
    else if ((m.past_sectors || []).includes(company.sector)) { s += 15; reasons.push("Has a past deal in " + company.sector); }
    else reasons.push("Sector outside mandate");
    if ((m.stages || []).includes(company.stage)) { s += 20; reasons.push("Backs " + company.stage + " companies"); }
    const r = company.raise;
    if (r >= m.ticket_min && r <= m.ticket_max) { s += 25; reasons.push("Ticket Rs " + m.ticket_min + "-" + m.ticket_max + " cr fits Rs " + r + " cr"); }
    else if (r >= m.ticket_min * 0.75 && r <= m.ticket_max * 1.25) { s += 10; reasons.push("Ticket close to Rs " + r + " cr"); }
    else reasons.push("Ticket Rs " + m.ticket_min + "-" + m.ticket_max + " cr does not fit");
    if ((m.instruments || []).includes(company.instrument || "equity")) { s += 10; reasons.push("Takes " + (company.instrument || "equity")); }
    if ((m.past_sectors || []).includes(company.sector) && (m.sectors || []).includes(company.sector)) { s += 10; reasons.push("Track record in the sector"); }
    return { score: s, reasons };
  }

  // ---------- Fees ----------
  function dealFees(input) {
    const a = Object.assign({ raise: 10, revenue: 50, revenue_growth: 0, advisory_lakh: 1, success_rate: 0.025, rev_share: 0.004, years: 5, gst: 0.18 }, input || {});
    const years = [];
    for (let y = 1; y <= a.years; y++) years.push({ year: y, revenue: a.revenue * Math.pow(1 + a.revenue_growth, y - 1), fee_lakh: a.revenue * Math.pow(1 + a.revenue_growth, y - 1) * a.rev_share * 100 });
    const success = a.raise * a.success_rate * 100;
    const share = sum(years.map((y) => y.fee_lakh));
    const total = a.advisory_lakh + success + share;
    return { a, advisory: a.advisory_lakh, success, share, years, total, gst: total * a.gst };
  }
  function debtFees(input) {
    const a = Object.assign({ loan: 10, tenor: 7, rate: 0.105, monitoring: 0.0035, transfer_amount: 6, transfer_fee: 0.004 }, input || {});
    const sch = loanSchedule(a.loan, a.rate, a.tenor);
    const mon = sch.map((r) => ({ year: r.year, outstanding: r.opening, fee_lakh: r.opening * a.monitoring * 100 }));
    return { a, monitoring: mon, monitoring_total: sum(mon.map((m) => m.fee_lakh)), transfer_lakh: a.transfer_amount * a.transfer_fee * 100 };
  }

  // ---------- Early exit tax view ----------
  function exitTax(input) {
    const a = Object.assign({ cost: 1, sale: 1.4, months: 14, slab: 0.3, fmv: 1.4 }, input || {});
    const gain = a.sale - a.cost, longTerm = a.months >= 24;
    const rate = longTerm ? 0.125 : a.slab;
    const notes = [];
    if (a.months < 6) notes.push("Minimum holding is 6 months; an earlier sale needs the founder's written consent.");
    if (a.sale < a.fmv) notes.push("Sale below fair market value: sections 50CA and 56(2)(x) can tax seller and buyer on the gap of Rs " + (a.fmv - a.sale).toFixed(2) + " cr.");
    return { a, gain, long_term: longTerm, rate, tax: Math.max(gain, 0) * rate, net: a.sale - Math.max(gain, 0) * rate, notes };
  }

  const api = { ENGINE_VERSION, TWIN_DEFAULTS, READINESS_DEFAULTS, LOAN_TS_DEFAULTS, EQ_TS_DEFAULTS, COVENANTS,
    annuity, loanSchedule, irr, twin, simulate, dscrPath, founderValue, readiness, loanTermSheet, equityTermSheet, monitor, fitScore, dealFees, debtFees, exitTax };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GB = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```


## B5. `site/optimizer.js`

Equity vs Debt Optimizer (browser port of optimizer/equity_debt).

```javascript
/* Equity vs Debt Optimizer: browser port of optimizer/equity_debt (model.py, analysis.py, advice.py).
   Same formulas and same numbers as the Python package; tests compare the two.
   Money in rupees; rates as fractions. No network, no AI. */
(function (root) {
  "use strict";
  const MIX = Array.from({ length: 101 }, (_, i) => i / 100);
  const DSCR_RISKY = 1.25, DSCR_DEFAULT = 1.0;
  const METRICS = {
    npv_wealth: "Present value of founder wealth (cash + exit stake)",
    total_cash: "Total founder cash over the horizon",
    wealth: "Exit-inclusive wealth (cash + exit stake, not discounted)",
    npv_cash: "Present value of founder cash only",
  };
  const DEFAULTS = {
    amount: 3e7, pre_money: 6e7, profit_month: 12e5, growth_y1: 0.30, growth_y2: 0.15, interest_rate: 0.15,
    tenure_years: 5, horizon_years: 10, tax_rate: 0, exit_multiple: 5, discount_rate: 0.12, debt_fee: 0, equity_cost: 0,
    payout_ratio: 1, growth_boost_equity: 0, growth_boost_debt: 0, min_dscr_required: 1.0, metric: "npv_wealth",
  };

  // ---------- Indian formatting ----------
  function groupIndian(n) {
    const s = String(Math.abs(Math.round(n)));
    if (s.length <= 3) return s;
    let head = s.slice(0, -3); const tail = s.slice(-3); const parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    return parts.join(",") + "," + tail;
  }
  function inr(x, short, d = 2, sym = "Rs ") {
    if (x === null || x === undefined || Number.isNaN(x)) return "-";
    if (!Number.isFinite(x)) return "n/a";
    const sign = x < 0 ? "-" : "", a = Math.abs(x);
    const f = (v) => v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
    if (short) { if (a >= 1e7) return sign + sym + f(a / 1e7) + " Cr"; if (a >= 1e5) return sign + sym + f(a / 1e5) + " L"; }
    return sign + sym + groupIndian(a);
  }
  const mixLabel = (e) => { const p = Math.round(e * 100); return p + "% equity / " + (100 - p) + "% debt"; };
  const ratio = (x) => (Number.isFinite(x) ? x.toFixed(2) + "x" : "no loan");
  const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";

  // ---------- validation ----------
  function validate(p) {
    const errors = [], warnings = [];
    if (!(p.amount > 0)) errors.push("The amount to raise must be more than zero.");
    if (!(p.pre_money > 0)) errors.push("The pre-money valuation must be more than zero.");
    if (p.profit_month < 0) errors.push("Profit per month cannot be negative. If the company makes a loss, this model does not apply.");
    for (const [n, v] of [["Year-1 growth", p.growth_y1], ["Year-2+ growth", p.growth_y2]]) {
      if (!(v > -1)) errors.push(n + " must be above -100%."); else if (v > 2) warnings.push(n + " of " + pct(v, 0) + " a year is very high. Check it is not a typo.");
    }
    if (!(p.interest_rate >= 0 && p.interest_rate <= 1)) errors.push("The interest rate must be between 0% and 100%.");
    if (!(p.tenure_years >= 1 && p.tenure_years <= 30)) errors.push("The loan tenure must be between 1 and 30 years.");
    if (!(p.horizon_years >= 1 && p.horizon_years <= 20)) errors.push("The analysis horizon must be between 1 and 20 years.");
    if (!(p.tax_rate >= 0 && p.tax_rate < 1)) errors.push("The tax rate must be between 0% and 100%.");
    if (p.exit_multiple < 0) errors.push("The exit multiple cannot be negative.");
    if (!(p.discount_rate > -0.5 && p.discount_rate <= 1)) errors.push("The discount rate must be between -50% and 100%.");
    if (!(p.debt_fee >= 0 && p.debt_fee < 1) || !(p.equity_cost >= 0 && p.equity_cost < 1)) errors.push("Fees must be between 0% and 100%.");
    if (!(p.payout_ratio >= 0 && p.payout_ratio <= 1)) errors.push("The payout ratio must be between 0% and 100%.");
    if (!(p.min_dscr_required >= 1 && p.min_dscr_required <= 3)) errors.push("The minimum DSCR you accept must be between 1.00 and 3.00.");
    if (!METRICS[p.metric]) errors.push("Unknown ranking metric.");
    if (errors.length) return { errors, warnings };
    if (p.amount > p.pre_money) warnings.push("You are raising more than the company is worth today. All-equity would hand investors over half the company.");
    if (p.tenure_years > p.horizon_years) warnings.push("The loan runs past the analysis horizon. The unpaid balance is deducted from the exit value.");
    if (p.interest_rate > 0.24) warnings.push("Interest above 24% a year is unusually expensive for a business loan.");
    return { errors, warnings };
  }

  // ---------- building blocks ----------
  /** Post-money ownership: equity / (pre-money + equity). */
  const investorOwnership = (eq, pre) => (eq > 0 ? eq / (pre + eq) : 0);
  /** EMI = P x r x (1+r)^n / ((1+r)^n - 1), r = annual / 12, n = months; P / n at 0%. */
  function emi(P, annual, years) {
    const n = Math.round(years * 12), r = annual / 12;
    if (n <= 0) throw new Error("tenure must be at least one month");
    if (r === 0) return P / n;
    const g = Math.pow(1 + r, n);
    return (P * r * g) / (g - 1);
  }
  function amortization(P, annual, years) {
    const n = years * 12, r = annual / 12, pay = emi(P, annual, years), rows = [];
    let bal = P;
    for (let m = 1; m <= n; m++) {
      const i = bal * r, p = m < n ? pay - i : bal;
      rows.push({ month: m, opening: bal, emi: i + p, interest: i, principal: p, closing: bal - p });
      bal -= p;
    }
    return rows;
  }
  /** Yearly interest / principal / EMI / closing balance for one loan over the horizon. */
  function yearlyDebt(D, annual, tenure, H) {
    const nm = tenure * 12, r = annual / 12, pay = emi(D, annual, tenure);
    const interest = new Array(H).fill(0), principal = new Array(H).fill(0), closing = new Array(H).fill(0);
    let bal = D;
    for (let m = 1; m <= H * 12; m++) {
      const y = Math.floor((m - 1) / 12);
      if (m <= nm) { const i = bal * r, p = m === nm ? bal : pay - i; interest[y] += i; principal[y] += p; bal -= p; }
      if (m % 12 === 0) closing[y] = bal;
    }
    return { emiMonth: pay, interest, principal, emi: interest.map((v, k) => v + principal[k]), closing };
  }

  // ---------- projection for one mix ----------
  function projectMix(p, e) {
    const H = p.horizon_years, E = p.amount * e, D = p.amount - E;
    const inv = investorOwnership(E, p.pre_money), fdr = 1 - inv;
    const boost = e * p.growth_boost_equity + (1 - e) * p.growth_boost_debt;
    const g1 = p.growth_y1 + boost, g2 = p.growth_y2 + boost;
    const ds = yearlyDebt(D, p.interest_rate, p.tenure_years, H);
    const disc = (y) => Math.pow(1 + p.discount_rate, -y);
    const yrs = [];
    let cum = 0, retCum = 0, npvCash = 0;
    for (let k = 0; k < H; k++) {
      const profit = 12 * p.profit_month * (1 + g1) * Math.pow(1 + g2, k);
      const interest = ds.interest[k], principal = ds.principal[k], emiY = ds.emi[k];
      const tax = p.tax_rate * Math.max(profit - interest, 0);
      const shield = p.tax_rate * profit - tax;
      const fees = k === 0 ? p.debt_fee * D + p.equity_cost * E : 0;
      const after = profit - emiY - tax - fees;
      const pos = Math.max(after, 0), shortfall = Math.min(after, 0);
      const dist = p.payout_ratio * pos, retained = pos - dist;
      const investor = inv * dist, founder = fdr * dist + shortfall;
      cum += founder; retCum += retained; npvCash += founder * disc(k + 1);
      const value = p.exit_multiple * profit - ds.closing[k] + retCum;
      yrs.push({ year: k + 1, profit, interest, principal, emi: emiY, tax, shield, fees, after, dist, retained, investor, founder, shortfall,
        cum, outstanding: ds.closing[k], value, wealthToDate: cum + fdr * Math.max(value, 0), dscr: emiY > 0 ? profit / emiY : Infinity });
    }
    const last = yrs[H - 1];
    const exitStake = fdr * Math.max(last.value, 0);
    const minDscr = Math.min(...yrs.map((y) => y.dscr));
    return { e, equity: E, debt: D, inv, fdr, emiMonth: ds.emiMonth, years: yrs, total_cash: cum, npv_cash: npvCash, exit_stake: exitStake,
      wealth: cum + exitStake, npv_wealth: npvCash + exitStake * disc(H), min_dscr: minDscr,
      years_below_risky: yrs.filter((y) => y.dscr < DSCR_RISKY).length, years_below_one: yrs.filter((y) => y.dscr < DSCR_DEFAULT).length };
  }

  function firstLastingLead(a, b) {
    const ahead = a.map((v, i) => v >= b[i] - 1e-6);
    if (!ahead[ahead.length - 1]) return null;
    let y = ahead.length;
    while (y > 0 && ahead[y - 1]) y--;
    return y + 1;
  }

  /** Test every equity share 0..100% and pick the founder's best allowed mix. */
  function optimize(input) {
    const p = Object.assign({}, DEFAULTS, input || {});
    const { errors } = validate(p);
    if (errors.length) throw new Error(errors[0]);
    const mixes = MIX.map((e) => projectMix(p, e));
    const req = Math.max(DSCR_DEFAULT, p.min_dscr_required) - 1e-12;
    const feasible = mixes.map((m) => m.min_dscr >= req);
    const risky = mixes.map((m, i) => feasible[i] && m.min_dscr < DSCR_RISKY);
    let best = 0, bestScore = -Infinity;
    mixes.forEach((m, i) => { if (feasible[i] && m[p.metric] > bestScore) { bestScore = m[p.metric]; best = i; } });
    const eq = mixes[100], dt = mixes[0];
    return {
      p, mixes, best, feasible, risky, metric: (i) => mixes[i][p.metric],
      breakevenCash: firstLastingLead(dt.years.map((y) => y.cum), eq.years.map((y) => y.cum)),
      breakevenWealth: firstLastingLead(dt.years.map((y) => y.wealthToDate), eq.years.map((y) => y.wealthToDate)),
    };
  }

  // ---------- analyses ----------
  const HORIZONS = [3, 5, 7, 10, 15, 20];
  function horizonTable(p) {
    return HORIZONS.map((h) => {
      const r = optimize(Object.assign({}, p, { horizon_years: h })), m = r.metric;
      return { horizon: h, best_equity: MIX[r.best], best_score: m(r.best), all_equity: m(100), all_debt: r.feasible[0] ? m(0) : null,
        gap_vs_equity: m(r.best) - m(100), gap_debt_vs_equity: m(0) - m(100), breakeven: r.breakevenCash };
    });
  }
  function horizonExplanation(rows) {
    const a = rows[0], b = rows[rows.length - 1];
    let s = "Over " + a.horizon + " years the best mix is " + mixLabel(a.best_equity) + "; over " + b.horizon + " years it is " + mixLabel(b.best_equity) + ". ";
    s += a.gap_debt_vs_equity < b.gap_debt_vs_equity
      ? "The longer the horizon, the more debt is worth to the founder. A loan costs a fixed amount and stops when the tenure ends, but shares sold to investors keep taking their slice of every year's profit and of the exit value."
      : "Over this range a longer horizon does not favour debt more, usually because the loan runs past the horizon or growth is low.";
    return s;
  }
  const SENS = [
    ["Profit growth", "-10 pts", (p) => ({ growth_y1: p.growth_y1 - 0.1, growth_y2: p.growth_y2 - 0.1 })],
    ["Profit growth", "-5 pts", (p) => ({ growth_y1: p.growth_y1 - 0.05, growth_y2: p.growth_y2 - 0.05 })],
    ["Profit growth", "+5 pts", (p) => ({ growth_y1: p.growth_y1 + 0.05, growth_y2: p.growth_y2 + 0.05 })],
    ["Profit growth", "+10 pts", (p) => ({ growth_y1: p.growth_y1 + 0.1, growth_y2: p.growth_y2 + 0.1 })],
    ["Interest rate", "-2 pts", (p) => ({ interest_rate: Math.max(p.interest_rate - 0.02, 0) })],
    ["Interest rate", "+2 pts", (p) => ({ interest_rate: p.interest_rate + 0.02 })],
    ["Valuation", "-20%", (p) => ({ pre_money: p.pre_money * 0.8 })],
    ["Valuation", "+20%", (p) => ({ pre_money: p.pre_money * 1.2 })],
    ["Loan tenure", "-2 yrs", (p) => ({ tenure_years: Math.max(p.tenure_years - 2, 1) })],
    ["Loan tenure", "+2 yrs", (p) => ({ tenure_years: p.tenure_years + 2 })],
  ];
  function sensitivity(p) {
    const base = optimize(p), bs = base.metric(base.best);
    const rows = [];
    for (const [v, c, fn] of SENS) {
      const q = Object.assign({}, p, fn(p));
      if (q.growth_y1 <= -1 || q.growth_y2 <= -1) continue;
      const r = optimize(q), s = r.metric(r.best);
      rows.push({ variable: v, case: c, best_equity: MIX[r.best], best_score: s, change: s - bs, moved: Math.round((MIX[r.best] - MIX[base.best]) * 100) });
    }
    return { base_equity: MIX[base.best], base_score: bs, rows };
  }
  const downside = (p) => optimize(Object.assign({}, p, { growth_y1: p.growth_y1 / 2, growth_y2: p.growth_y2 / 2 }));

  /** Plain-English suggestions from the numbers (mirror of advice.py). */
  function suggestions(r, down, hrows, short = true) {
    const p = r.p, b = r.best, M = r.mixes, mb = M[b], m = r.metric, f = (x) => inr(x, short);
    const out = [];
    const why = ["Best mix: **" + mixLabel(mb.e) + "**, ranked by " + METRICS[p.metric].toLowerCase() + "."];
    if (b === 0) why.push("All debt wins because the loan costs " + pct(p.interest_rate) + " a year for " + p.tenure_years + " years and then stops, while selling equity would hand investors " + pct(M[100].inv) + " of every year's profit and of the exit value, forever.");
    else if (b === 100) why.push("All equity wins: with these numbers the EMI eats too much of the profit, or the loan breaks your minimum repayment cover, so giving away shares costs the founder less than servicing the debt.");
    else why.push("This is the most debt your profit can safely carry (lowest DSCR " + ratio(mb.min_dscr) + " against your minimum of " + Math.max(1, p.min_dscr_required).toFixed(2) + "x). More debt would be cheaper still, but would leave a year where profit does not cover the EMI with enough room.");
    why.push("Against 100% equity the founder is better off by **" + f(m(b) - m(100)) + "**" + (r.feasible[0] && b !== 0 ? "; against 100% debt by **" + f(m(b) - m(0)) + "**." : "."));
    why.push("Why the answer is usually at one end: each extra rupee of equity dilutes you a little less than the one before (ownership = equity / (valuation + equity)), so mixing rarely beats the better pure option. A mix wins when the loan has to be capped by cash flow, or when the two routes change growth differently.");
    if (p.tax_rate) why.push("Interest is tax-deductible: at " + pct(p.tax_rate) + " tax the loan saves " + f(mb.years.reduce((a, y) => a + y.shield, 0)) + " of tax over the horizon.");
    if (r.breakevenCash) why.push("Pure equity gives more cash in the early years; 100% debt overtakes it in cumulative founder cash from year " + r.breakevenCash + ".");
    out.push(["Why this mix wins", why]);
    const risks = [], db = down.mixes[b];
    if (mb.debt > 0) {
      risks.push(mb.min_dscr < DSCR_RISKY ? "Repayment cover is thin: in the weakest year profit is only " + ratio(mb.min_dscr) + " the EMI. Lenders usually want 1.25x or more." : "Repayment cover is healthy: profit is at least " + ratio(mb.min_dscr) + " the EMI in every year of the loan.");
      risks.push(db.min_dscr < 1 ? "**Growth miss:** if profit grows at half the rate you expect, this mix cannot pay its EMI in some years (DSCR " + ratio(db.min_dscr) + "). You would have to put in " + f(-db.years.reduce((a, y) => a + y.shortfall, 0)) + " of your own money." : "**Growth miss:** at half the expected growth, cover drops to " + ratio(db.min_dscr) + " but the EMI is still paid.");
      risks.push("**Interest-rate risk:** if the loan is on a floating rate, a 2-point rise adds about " + f(mb.debt * 0.02 * p.tenure_years / 2) + " of interest over the loan.");
      risks.push("A term loan usually needs collateral and often a personal guarantee from the founder.");
    }
    if (mb.equity > 0) {
      risks.push("**Dilution:** investors would own " + pct(mb.inv) + " for good; you keep " + pct(mb.fdr) + ".");
      risks.push("**Investor rights:** read the term sheet for board seats, veto rights, liquidation preference and anti-dilution clauses.");
    }
    out.push(["Risks", risks]);
    const fund = ["Debt is cheaper when profit is stable and growth is predictable: the cost is fixed and ends with the tenure.",
      "Equity is safer for uncertain or early businesses: there is no EMI to pay in a bad year.",
      "Keep DSCR above 1.25 in every year so a bad quarter does not become a default.",
      "In India, more than 50% of the votes controls ordinary resolutions, and more than 25% can block special resolutions (which need 75%). Avoid dropping below 51%, and never below 26%, if you want to keep control."];
    if (!p.tax_rate) fund.push("Tax is set to 0%, so the tax shield on interest is not counted. Enter your tax rate under Advanced to include it.");
    if (mb.fdr < 0.51) fund.push("Warning: this mix leaves you " + pct(mb.fdr) + ", below 51%. You would lose sole control of ordinary resolutions.");
    if (mb.fdr <= 0.26) fund.push("Warning: " + pct(mb.fdr) + " is at or below 26%. You could no longer block special resolutions.");
    out.push(["Fundamentals", fund]);
    const dm = (i) => down.mixes[i][p.metric];
    const dd = ["If profit grows at half your expectation (" + pct(p.growth_y1 / 2) + " in year 1, " + pct(p.growth_y2 / 2) + " after), the best mix becomes **" + mixLabel(MIX[down.best]) + "**.",
      "The recommended mix would then give " + f(dm(b)) + " instead of " + f(m(b)) + " (" + f(dm(b) - m(b)) + ")."];
    if (db.years_below_one) dd.push("In " + db.years_below_one + " year(s) profit would not cover the EMI.");
    out.push(["Downside: growth at half the plan", dd]);
    if (hrows) out.push(["If the horizon changes", [horizonExplanation(hrows)]]);
    return out;
  }

  const api = { MIX, METRICS, DEFAULTS, DSCR_RISKY, DSCR_DEFAULT, groupIndian, inr, mixLabel, ratio, pct, validate, investorOwnership, emi,
    amortization, yearlyDebt, projectMix, optimize, firstLastingLead, horizonTable, horizonExplanation, sensitivity, downside, suggestions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EDO = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```


## B6. `fundmix/engine.py`

CMA funding report engine: parses the CMA workbook and sizes debt by DSCR.

```python
"""Debt vs equity engine: reads a CMA workbook + project inputs, sizes debt from cash flow (DSCR),
and produces numbers for a one-page report. All money in Rs crore unless noted."""
import re, math
import openpyxl

# ---------- 1. CMA parsing ----------
LABELS = {
    "net_sales": [r"^NET SALES"],
    "pbit": [r"^PROFIT BEFORE INTEREST & TAX"],
    "dep": [r"Depreciation"],
    "interest": [r"^Interest & Other Financial Charges"],
    "pbt": [r"^PROFIT BEFORE TAX"],
    "tax": [r"^Current Tax"],
    "pat": [r"^NET PROFIT"],
    "dividend": [r"Dividend Paid \(i\) Amt"],
    "cop": [r"^COST OF PRODUCTION:"],
    "rm": [r"^B\. Indigenous", r"^A\. Imported"],
    "stock_trade": [r"^A\. Stock in Trade"],
    "packing": [r"^B\. Packing Material"],
    "power": [r"Power & Fuel"],
    "labour": [r"Direct Labour"],
    "cost_services": [r"Cost of services"],
    "other_exp": [r"^\(ix\) Other Expenses"],
    "sga": [r"^Selling, General"],
    "net_worth": [r"^NET WORTH"],
    "term_loans": [r"^Term Loans"],
    "tl_current": [r"^Instalments of Term loans"],
    "st_bank": [r"^\(i\) from applicant bank", r"^\(ii\) from other banks"],
    "cash": [r"^Cash and Bank Balances"],
    "liquid1": [r"Govt\. & other securities"],
    "liquid2": [r"Fixed deposits with banks"],
    "tcl": [r"^TOTAL CURRENT LIABILITIES"],
    "ttl": [r"^TOTAL TERM LIABILITIES"],
}

REQUIRED = {"net_sales": "NET SALES", "pbit": "PROFIT BEFORE INTEREST & TAX (PBIT)",
            "pbt": "PROFIT BEFORE TAX", "pat": "NET PROFIT/LOSS (PAT)"}
STRESS_FLOOR = 1.20   # minimum DSCR under stress (EBITDA -20%, rate +2 points)

def _num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

def parse_cma(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[wb.sheetnames[0]]
    # find header row with years and status row
    years, cols, status = [], [], {}
    for r in range(1, 12):
        vals = [ws.cell(r, c).value for c in range(2, 6)]
        if all(isinstance(v, (int, float)) and 1990 < v < 2100 for v in vals):
            years = [int(v) for v in vals]; cols = list(range(2, 6))
            for c in cols: status[c] = str(ws.cell(r + 1, c).value or "")
            break
    if not years:
        raise ValueError("Could not find the year header row in the CMA sheet")
    data = {}
    for key, pats in LABELS.items():
        tot = [0.0] * len(cols); found = False
        for r in range(1, ws.max_row + 1):
            lab = str(ws.cell(r, 1).value or "").strip()
            if any(re.search(p, lab, re.I) for p in pats):
                found = True
                for i, c in enumerate(cols):
                    tot[i] += _num(ws.cell(r, c).value) or 0.0
                if key not in ("rm", "st_bank"):
                    break
        data[key] = tot if found else [0.0] * len(cols)
        if not found and key in REQUIRED:
            raise ValueError(f"The CMA has no '{REQUIRED[key]}' row in column A of sheet '{ws.title}'")
    if not any(v > 0 for v in data["net_sales"]):
        raise ValueError("The 'NET SALES' row has no positive value in any year column")
    # base year = last column with real sales
    base_i = max(i for i, v in enumerate(data["net_sales"]) if v and v > 0)
    hist = {k: v[:base_i + 1] for k, v in data.items()}
    # growth: CAGR of net sales over available years
    s = hist["net_sales"]
    g = (s[-1] / s[0]) ** (1 / (len(s) - 1)) - 1 if len(s) > 1 and s[0] > 0 else 0.05
    return {"years": years[:base_i + 1], "status": [status[c] for c in cols][:base_i + 1],
            "hist": hist, "base": {k: v[base_i] for k, v in data.items()}, "growth": g}

# ---------- 2. Industry presets (editable defaults) ----------
PRESETS = {
    "manufacturing": dict(min_equity=0.25, dscr_target=1.50, tenor=7, moratorium=1, asset_life=15,
        unit_label="units/yr", note="Asset-heavy: plant & machinery is bankable security, so lenders fund up to ~75% of project cost."),
    "service": dict(min_equity=0.40, dscr_target=1.60, tenor=5, moratorium=0, asset_life=8,
        unit_label="billable units/yr", note="Asset-light: little hard collateral, so lenders expect more promoter equity and stronger cover."),
    "other": dict(min_equity=0.30, dscr_target=1.50, tenor=5, moratorium=0, asset_life=10,
        unit_label="units/yr", note="Trading/retail: funding is mostly working capital; term debt sized on cash flow, WC limits on drawing power."),
}

# ---------- 3. Model ----------
def _schedule(L, rate, tenor, morat):
    n = morat + tenor; bal = L; rows = []
    for t in range(1, n + 1):
        intr = bal * rate
        prin = L / tenor if t > morat else 0.0
        rows.append(dict(year=t, opening=bal, interest=intr, principal=prin, closing=bal - prin))
        bal -= prin
    return rows

def run(cma, p):
    b = cma["base"]; pre = PRESETS[p["industry"]]
    q = {**pre, **{k: v for k, v in p.items() if v is not None}}
    rate, tenor, morat = q["rate"], int(q["tenor"]), int(q["moratorium"])
    n = morat + tenor
    tax_rate = min(max(b["tax"] / b["pbt"], 0.15), 0.35) if b["pbt"] > 0 else 0.25
    g = q.get("growth") if q.get("growth") is not None else cma["growth"]

    # current unit economics (from CMA + current volume)
    units0 = q["existing_capacity"] * q["current_util"]
    if units0 <= 0: raise ValueError("Existing capacity and utilisation must be above zero")
    cop = b["cop"] if b["cop"] > 0 else max(b["net_sales"] - b["pbit"] - b["sga"], 0)
    if q["industry"] == "service":
        var0 = b["cost_services"] + b["labour"]          # people cost scales with billable volume
    else:
        var0 = b["rm"] + b["stock_trade"] + b["packing"] + b["power"]
    if var0 <= 0: var0 = 0.6 * cop                      # fallback when the CMA has no cost split
    b = {**b, "cop": cop}
    price = b["net_sales"] / units0 if units0 else 0
    vc0 = var0 / units0; cpu0 = b["cop"] / units0
    vc_new = vc0 * (1 - q["efficiency_gain"])
    capex = q["project_cost"] - q["wc_margin"]
    sga_ratio = b["sga"] / b["net_sales"] if b["net_sales"] else 0
    dep_p = capex / q["asset_life"]

    def project(L, ebitda_shock=0.0, rate_shock=0.0):
        sch = _schedule(L, rate + rate_shock, tenor, morat)
        out = []
        for i, row in enumerate(sch):
            util = q["ramp"][min(i, len(q["ramp"]) - 1)]
            units = q["new_capacity"] * util
            rev = units * price
            sga_var = rev * sga_ratio * q.get("sga_variable_share", 0.7)   # selling & distribution that scales with sales
            ebitda = (units * (price - vc_new) - sga_var - q["plant_fixed_cost"]) * (1 - ebitda_shock)
            pbt = ebitda - dep_p - row["interest"]
            tax = max(pbt, 0) * tax_rate
            pat = pbt - tax
            cfads = pat + dep_p + row["interest"]
            ds = row["interest"] + row["principal"]
            out.append(dict(**row, util=util, units=units, revenue=rev, ebitda=ebitda, pat=pat,
                            cfads=cfads, ds=ds, dscr=(cfads / ds if ds > 0 else None),
                            fcf_after_ds=cfads - ds))
        return out

    def min_dscr(rows, only_repay=True):
        vals = [r["dscr"] for r in rows if r["dscr"] is not None and (r["principal"] > 0 or not only_repay)]
        return min(vals) if vals else float("inf")

    # company-level cash flow (bank view): existing CFADS grows with sales
    ebitda0 = b["pbit"] + b["dep"]
    def company(L):
        rows = project(L); res = []
        for i, r in enumerate(rows):
            f = (1 + g) ** (i + 1)
            base_cfads = (b["pat"] + b["dep"] + b["interest"]) * f
            existing_ds = b["interest"] + b["tl_current"]
            cf = base_cfads + r["cfads"]
            ds = existing_ds + r["ds"]
            div = b["dividend"] * f
            res.append(dict(year=r["year"], cfads=cf, ds=ds, dscr=cf / ds if ds else None,
                            after_div=cf - div - ds))
        return res

    # solve max project-level debt with DSCR >= target (ring-fenced: the plant must carry its own debt)
    lo, hi = 0.0, q["project_cost"] * 50
    for _ in range(80):
        mid = (lo + hi) / 2
        if min_dscr(project(mid)) >= q["dscr_target"]: lo = mid
        else: hi = mid
    cap_project = lo
    cap_policy = q["project_cost"] * (1 - q["min_equity"])
    debt = min(cap_project, cap_policy)
    debt = math.floor(debt / 5) * 5  # round down to Rs 5 cr
    stress_cut = 0.0
    while debt > 0 and min_dscr(project(debt, ebitda_shock=0.20, rate_shock=0.02)) < STRESS_FLOOR:
        debt -= 5; stress_cut += 5   # cut until the stress case still covers 1.20x
    equity = q["project_cost"] - debt

    rows = project(debt); comp = company(debt)
    stress = project(debt, ebitda_shock=0.20, rate_shock=0.02)
    liquid = b["cash"] + b["liquid1"] + b["liquid2"]
    buffer = q.get("cash_buffer", 0.0)
    internal = max(liquid - buffer, 0)
    new_equity = max(equity - internal, 0)

    ss = rows[-1]
    units_ss = ss["units"]
    cpu_new = (b["cop"] + units_ss * vc_new + q["plant_fixed_cost"] + dep_p) / (units0 + units_ss)
    after_tax_kd = rate * (1 - tax_rate)
    after_tax_cash = q.get("treasury_yield", 0.07) * (1 - tax_rate)
    ke = q.get("cost_of_equity", 0.12)
    base_cfads = b["pat"] + b["dep"] + b["interest"]
    cf_uplift = ss["cfads"] / (base_cfads * (1 + g) ** len(rows))
    binding = "cash flow (DSCR)" if cap_project < cap_policy else "minimum promoter equity"
    if stress_cut: binding = "stress test"
    return dict(q=q, tax_rate=tax_rate, growth=g, price=price, vc0=vc0, vc_new=vc_new, cpu0=cpu0, cpu_new=cpu_new,
                units0=units0, units_ss=units_ss, capex=capex, dep_p=dep_p,
                cap_project=cap_project, cap_policy=cap_policy, debt=debt, equity=equity,
                debt_pct=debt / q["project_cost"], equity_pct=equity / q["project_cost"],
                internal=internal, new_equity=new_equity, rows=rows, company=comp, stress=stress,
                min_dscr=min_dscr(rows), min_dscr_stress=min_dscr(stress),
                min_dscr_company=min(c["dscr"] for c in comp), ebitda0=ebitda0,
                cap_increase=q["new_capacity"] / q["existing_capacity"],
                cum_fcf=sum(r["fcf_after_ds"] for r in rows), ss_cfads=ss["cfads"],
                payback=q["project_cost"] / (sum(r["cfads"] for r in rows) / len(rows)),
                after_tax_kd=after_tax_kd, after_tax_cash=after_tax_cash, ke=ke, binding=binding, stress_cut=stress_cut, liquid=liquid,
                base_cfads=base_cfads, cf_uplift=cf_uplift, sga_ratio=sga_ratio,
                ebitda_margin_ss=ss["ebitda"] / ss["revenue"] if ss["revenue"] else 0)
```


## B7. `server/seed.py`

Fictional demo data.

```python
"""Fictional demo data, defined once.

seed_data(rel) builds every collection. `rel(months, days, ts=False)` turns an offset from today into a date,
so the demo never goes stale. The server passes a resolver; site/build.py passes a marker writer
("@m,d" / "@T m,d") and site/store.js resolves the markers in the browser, so both modes start identical.
"""
from server.domain import SETTINGS_DEFAULT

INVESTORS = [  # id suffix, name, firm, sectors, ticket lakh (min, max), kyc, accredited
    ("", "Meera Iyer", "Konkan Growth Partners", ["Auto components", "Plastics & packaging"], (500, 2000), "verified", True),
    ("2", "Vikram Bhatt", "Sahyadri Angels Network", ["Chemicals", "Food processing"], (200, 1000), "verified", True),
    ("3", "Arvind Rao", "Rao Family Office", ["Plastics & packaging", "Auto components"], (1000, 3000), "verified", True),
    ("04", "Ananya Kulkarni", "Kulkarni Family Office", ["Auto components", "Engineering"], (50, 300), "verified", True),
    ("05", "Rohan Mehta", "Mehta Holdings", ["Plastics & packaging"], (50, 200), "verified", False),
    ("06", "Sneha Patil", "Patil Angels", ["Food processing", "Chemicals"], (25, 150), "verified", False),
    ("07", "Karan Shah", "Shah Capital", ["Auto components"], (100, 500), "verified", True),
    ("08", "Divya Menon", "Menon Investments", ["Plastics & packaging", "Pharma"], (50, 250), "verified", True),
    ("09", "Aditya Joshi", "Joshi Family Trust", ["Engineering"], (25, 100), "verified", False),
    ("10", "Pooja Agarwal", "Agarwal Ventures", ["Textiles", "Auto components"], (50, 300), "verified", True),
    ("11", "Nikhil Rane", "Rane Partners", ["Chemicals"], (100, 400), "verified", True),
    ("12", "Kavya Reddy", "Reddy Growth Fund", ["Pharma", "Chemicals"], (200, 800), "verified", True),
    ("13", "Siddharth Gupta", "Gupta Family Office", ["Auto components", "Electronics"], (100, 600), "verified", True),
    ("14", "Meenal Desai", "Desai Angels", ["Food processing"], (25, 100), "verified", False),
    ("15", "Harsh Vora", "Vora Capital", ["Plastics & packaging", "Engineering"], (50, 250), "verified", True),
    ("16", "Ishita Banerjee", "Banerjee Holdings", ["Textiles"], (25, 150), "verified", False),
    ("17", "Varun Nair", "Nair Ventures", ["Auto components", "Plastics & packaging"], (100, 500), "verified", True),
    ("18", "Tanvi Kapoor", "Kapoor Family Trust", ["Electronics"], (50, 200), "verified", True),
    ("19", "Omkar Sawant", "Sawant Investments", ["Engineering", "Auto components"], (25, 120), "verified", False),
    ("20", "Ritu Malhotra", "Malhotra Partners", ["Pharma"], (100, 400), "verified", True),
    ("21", "Farhan Qureshi", "Qureshi Capital", ["Chemicals", "Plastics & packaging"], (50, 300), "verified", True),
    ("22", "Gauri Bhosale", "Bhosale Family Office", ["Chemicals"], (25, 150), "verified", True),
    ("23", "Manish Jain", "Jain Ventures", ["Plastics & packaging", "Textiles"], (50, 250), "pending", False),
    ("24", "Leela Krishnan", "Krishnan Angels", ["Food processing", "Pharma"], (25, 100), "verified", True),
    ("25", "Deepak Chawla", "Chawla Holdings", ["Auto components"], (100, 500), "pending", True),
]
LAKH = 100_000 * 100  # one lakh rupees in paise
CRORE = 100 * LAKH


def inv_id(sfx):
    return "u_investor" + sfx


def seed_data(rel):
    T = lambda m=0, dd=0: rel(m, dd, True)  # noqa: E731
    D = lambda m=0, dd=0: rel(m, dd, False)  # noqa: E731
    users = [
        dict(id="u_founder", email="founder@demo.in", name="Priya Nair", role="founder", company_id="c_kalyan", title="Managing Director"),
        dict(id="u_founder2", email="rahul@demo.in", name="Rahul Deshmukh", role="founder", company_id="c_vasai", title="Founder"),
        dict(id="u_founder3", email="farah@demo.in", name="Farah Shaikh", role="founder", company_id="c_taloja", title="Director"),
        dict(id="u_advisor", email="advisor@demo.in", name="CA Neha Joshi", role="advisor", firm="Aegis Ascend Financial Advisors", title="Reviewing advisor"),
        dict(id="u_lender", email="lender@demo.in", name="Suresh Pillai", role="lender", firm="Harbour Bank (sample)", title="Credit manager",
             profile=dict(regulated=True, lender_type="Bank", reg_no="Sample bank licence")),
        dict(id="u_lender2", email="nbfc@demo.in", name="Kavita Rane", role="lender", firm="Sahyadri Finance NBFC (sample)", title="Head of SME lending",
             profile=dict(regulated=True, lender_type="NBFC", reg_no="Sample RBI CoR")),
        dict(id="u_lender3", email="konkanbank@demo.in", name="Mahesh Gawde", role="lender", firm="Konkan Co-operative Bank (sample)", title="Branch credit head",
             profile=dict(regulated=True, lender_type="Bank", reg_no="Sample bank licence")),
        dict(id="u_lender4", email="deccan@demo.in", name="Neelam Sethi", role="lender", firm="Deccan Capital NBFC (sample)", title="Credit lead",
             profile=dict(regulated=True, lender_type="NBFC", reg_no="Sample RBI CoR")),
    ]
    emails = {"": "investor@demo.in", "2": "angels@demo.in", "3": "familyoffice@demo.in"}
    for k, (sfx, name, firm, sectors, (tmin, tmax), kyc, acc) in enumerate(INVESTORS):
        users.append(dict(id=inv_id(sfx), email=emails.get(sfx, "inv%s@demo.in" % sfx), name=name, role="investor",
                          firm=firm + ("" if sfx in emails else " (sample)"),
                          mandate=dict(sectors=sectors, past_sectors=[], stages=["Growth", "Expansion"], ticket_min=tmin / 100, ticket_max=tmax / 100, instruments=["equity"]),
                          profile=dict(kyc=kyc, accredited=acc, nda_signed_at=T(-10 - k % 7, -k) if kyc == "verified" else None,
                                       ticket_min_paise=tmin * LAKH, ticket_max_paise=tmax * LAKH, last_active=T(0, -(k * 3) % 40))))

    cov = dict(dscr_min=1.25, debt_ebitda_max=3.5)
    full = {k: D(-8, -5 + i) for i, k in enumerate(["valuation_report", "mgt14", "pas4", "bank_account", "allotment", "pas3", "demat_credit"])}
    companies = [
        dict(id="c_kalyan", name="Kalyan Polymers Pvt Ltd", sector="Plastics & packaging", stage="Growth", city="Bhiwandi", revenue=68, instrument="equity",
             **{"raise": 12}, raise_paise=12 * CRORE, pipeline_stage="offering", stage_since=D(0, -20), security_type="equity", offer_price_paise=24000,
             fd_extra_shares=150_000, external_offers={"@fy": {"equity": 175}},
             checklist=dict(valuation_report=D(0, -25), mgt14=D(0, -18)), updates=[],
             twin={}, readiness={}, covenants=cov, quarters=[
                 dict(q="Q1 FY26", ebitda=1.6, interest=0.18, principal=0.55, debt=5.2), dict(q="Q2 FY26", ebitda=1.5, interest=0.17, principal=0.55, debt=4.7),
                 dict(q="Q3 FY26", ebitda=1.2, interest=0.15, principal=0.55, debt=4.1), dict(q="Q4 FY26", ebitda=0.95, interest=0.14, principal=0.55, debt=3.6)],
             docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "CMA data FY25-FY28", "Cap table", "Debt vs equity report"]),
        dict(id="c_vasai", name="Vasai Precision Castings Pvt Ltd", sector="Auto components", stage="Growth", city="Vasai", revenue=112, instrument="equity",
             **{"raise": 25}, raise_paise=25 * CRORE, pipeline_stage="monitoring", stage_since=D(-7), security_type="equity", offer_price_paise=16000,
             allotment_date=D(-8), fd_extra_shares=200_000, external_offers={}, checklist=full,
             updates=[dict(date=D(-1, -4), text="Q1 FY27 revenue up 14% on last year; second casting line commissioned on schedule."),
                      dict(date=D(-4), text="Signed a three-year supply contract with a two-wheeler OEM.")],
             twin={"raise": 25, "pre_money": 140, "ebitda0": 13, "existing_ds": 3}, readiness=dict(dscr=1.62, collateral_cover=1.6, gst_on_time=12, data_room_ready=True), covenants=cov, quarters=[
                 dict(q="Q1 FY26", ebitda=3.4, interest=0.46, principal=0.9, debt=17.1), dict(q="Q2 FY26", ebitda=3.6, interest=0.44, principal=0.9, debt=16.2),
                 dict(q="Q3 FY26", ebitda=3.5, interest=0.42, principal=0.9, debt=15.3), dict(q="Q4 FY26", ebitda=3.9, interest=0.4, principal=0.9, debt=14.4)],
             docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "Customer contracts", "Cap table", "Debt vs equity report"]),
        dict(id="c_taloja", name="Taloja Specialty Chemicals Pvt Ltd", sector="Chemicals", stage="Expansion", city="Taloja", revenue=45, instrument="equity",
             **{"raise": 8}, raise_paise=8 * CRORE, pipeline_stage="funded", stage_since=D(-5, -20), security_type="equity", offer_price_paise=9500,
             allotment_date=D(-6, 5), fd_extra_shares=80_000, external_offers={},
             checklist={k: v for k, v in dict(valuation_report=D(-6, -2), mgt14=D(-6, 0), pas4=D(-6, 1), bank_account=D(-6, 1), allotment=D(-6, 5), pas3=D(-6, 14)).items()},
             updates=[dict(date=D(-1, -12), text="Solvent recovery unit approved by the pollution control board.")],
             twin={"raise": 8, "pre_money": 36, "ebitda0": 4.2, "existing_ds": 0.8}, readiness=dict(dscr=1.3, audited_years=2), covenants=cov, quarters=[],
             docs=["Audited accounts FY25-FY26", "Cap table"]),
        dict(id="c_nashik", name="Nashik Agro Foods Pvt Ltd", sector="Food processing", stage="Expansion", city="Nashik", revenue=38, instrument="equity",
             **{"raise": 6}, raise_paise=6 * CRORE, pipeline_stage="under_review", stage_since=D(0, -3), security_type="equity", offer_price_paise=0,
             fd_extra_shares=0, external_offers={}, checklist={}, updates=[],
             twin={"raise": 6, "pre_money": 30, "ebitda0": 3.1, "existing_ds": 0.5}, readiness=dict(dscr=1.4, audited_years=3), covenants=cov, quarters=[],
             docs=["Audited accounts FY24-FY26"]),
    ]
    checks = dict(validation=True, founder_confirmed=True, verifier=True)
    reports = [
        dict(id="r_vasai", company_id="c_vasai", title="Debt vs equity: Rs 25 cr expansion", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(-9, -12), submitted_by="u_founder2", reviewed_by="u_advisor", reviewed_at=T(-9, -2),
             review_note="Assumptions within sector benchmarks. Stress case holds.", summary=dict(best_share=0.55, net=6.1, break_even=210, min_dscr=1.48, min_dscr_stress=1.07), checks=checks),
        dict(id="r_kalyan", company_id="c_kalyan", title="Debt vs equity: Rs 12 cr growth raise", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(0, -32), submitted_by="u_founder", reviewed_by="u_advisor", reviewed_at=T(0, -25),
             review_note="Debt capacity limited by the falling DSCR; equity-heavy mix is right.", summary=dict(best_share=0.25, net=1.4, break_even=96, min_dscr=1.31, min_dscr_stress=1.04), checks=checks),
        dict(id="r_taloja", company_id="c_taloja", title="Debt vs equity: Rs 8 cr capacity add", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(-7, -10), submitted_by="u_founder3", reviewed_by="u_advisor", reviewed_at=T(-7), review_note="Approved with a 40% debt cap.",
             summary=dict(best_share=0.4, net=1.2, break_even=58, min_dscr=1.31, min_dscr_stress=1.02), checks=checks),
        dict(id="r_nashik", company_id="c_nashik", title="Debt vs equity: Rs 6 cr cold-chain expansion", status="in_review", engine_version="gb-engine 1.0.0",
             created_at=T(0, -3), submitted_by="u_advisor", summary=dict(best_share=0.5, net=0.9, break_even=44, min_dscr=1.38, min_dscr_stress=1.06), checks=checks),
    ]
    cap = [
        dict(id="ct_k1", company_id="c_kalyan", holder_name="Priya Nair", holder_type="founder", shares=3_000_000, holders=1),
        dict(id="ct_k2", company_id="c_kalyan", holder_name="Suresh Nair", holder_type="founder", shares=1_200_000, holders=1),
        dict(id="ct_k3", company_id="c_kalyan", holder_name="Friends and family", holder_type="existing", shares=400_000, holders=12),
        dict(id="ct_v1", company_id="c_vasai", holder_name="Rahul Deshmukh", holder_type="founder", shares=4_200_000, holders=1),
        dict(id="ct_v2", company_id="c_vasai", holder_name="Anita Deshmukh", holder_type="founder", shares=1_800_000, holders=1),
        dict(id="ct_v3", company_id="c_vasai", holder_name="Employees and early shareholders", holder_type="existing", shares=900_000, holders=158),
        dict(id="ct_v4", company_id="c_vasai", holder_name="Konkan Angels LLP", holder_type="existing", shares=300_000, holders=1),
        dict(id="ct_t1", company_id="c_taloja", holder_name="Farah Shaikh", holder_type="founder", shares=2_000_000, holders=1),
        dict(id="ct_t2", company_id="c_taloja", holder_name="Imran Shaikh", holder_type="founder", shares=800_000, holders=1),
        dict(id="ct_t3", company_id="c_taloja", holder_name="Early backers", holder_type="existing", shares=250_000, holders=6),
        dict(id="ct_n1", company_id="c_nashik", holder_name="Sunil Pawar", holder_type="founder", shares=1_500_000, holders=1),
        dict(id="ct_n2", company_id="c_nashik", holder_name="Rekha Pawar", holder_type="founder", shares=1_000_000, holders=1),
    ]

    # Vasai: 19 platform investors (the limit test sits at 19 / 20); Taloja: 4, still inside the 6-month lock.
    vasai = [("", 400), ("3", 300)] + list(zip(["%02d" % i for i in range(4, 21)], [80, 64, 48, 120, 96, 40, 56, 72, 88, 104, 48, 64, 32, 40, 56, 80, 72]))
    taloja = [("", 120), ("2", 80), ("21", 60), ("22", 50)]
    holdings, offers = [], []
    for sfx, lakh in vasai:
        shares = lakh * LAKH // 16000
        holdings.append(dict(id="h_v" + (sfx or "1"), investor_id=inv_id(sfx), company_id="c_vasai", shares=shares, allotment_date=D(-8),
                             invested_at=D(-8, -12), cost_paise=shares * 16000, origin="allotment", early_consent=None))
        offers.append(dict(id="o_v" + (sfx or "1"), company_id="c_vasai", investor_id=inv_id(sfx), fy="@fy" + rel(-9, 0, False), security_type="equity",
                           sent_at=T(-9), sent_by="u_advisor", response="invested", responded_at=T(-9, 6), share_identity=True, views=[]))
    for sfx, lakh in taloja:
        shares = lakh * LAKH // 9500
        holdings.append(dict(id="h_t" + (sfx or "1"), investor_id=inv_id(sfx), company_id="c_taloja", shares=shares, allotment_date=D(-6, 5),
                             invested_at=D(-6, -8), cost_paise=shares * 9500, origin="allotment", early_consent=None))
        offers.append(dict(id="o_t" + (sfx or "1"), company_id="c_taloja", investor_id=inv_id(sfx), fy="@fy" + rel(-6, -20, False), security_type="equity",
                           sent_at=T(-6, -20), sent_by="u_advisor", response="invested", responded_at=T(-6, -14), share_identity=True, views=[]))
    for sfx in ("23", "24"):
        offers.append(dict(id="o_t" + sfx, company_id="c_taloja", investor_id=inv_id(sfx), fy="@fy" + rel(-6, -20, False), security_type="equity",
                           sent_at=T(-6, -20), sent_by="u_advisor", response="declined", responded_at=T(-6, -15), share_identity=False, views=[]))
    # Kalyan: 20 platform offers this year + 175 made off-platform = 195 / 200.
    responses = {"2": ("interested", True), "3": ("declined", False), "05": ("interested", False), "08": ("interested", True), "10": ("declined", False)}
    for k, sfx in enumerate(["", "2", "3"] + ["%02d" % i for i in range(4, 21)]):
        resp, share = responses.get(sfx, ("pending", False))
        offers.append(dict(id="o_k" + (sfx or "1"), company_id="c_kalyan", investor_id=inv_id(sfx), fy="@fy", security_type="equity",
                           sent_at=T(0, -6 - k % 5), sent_by="u_advisor", response=resp, responded_at=T(0, -2) if resp != "pending" else None,
                           share_identity=share, views=[]))

    valuations = [
        dict(id="v_v1", company_id="c_vasai", date=D(-8), price_per_share_paise=16000, method="Market multiples", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-8), published_by="u_advisor"),
        dict(id="v_v2", company_id="c_vasai", date=D(-5), price_per_share_paise=17200, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-5, 2), published_by="u_advisor"),
        dict(id="v_v3", company_id="c_vasai", date=D(-2), price_per_share_paise=18400, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-2, 2), published_by="u_advisor"),
        dict(id="v_t1", company_id="c_taloja", date=D(-6, 5), price_per_share_paise=9500, method="DCF", valuer="Mehta & Associates, Registered Valuers (sample)", report_file=None, published_at=T(-6, 5), published_by="u_advisor"),
        dict(id="v_t2", company_id="c_taloja", date=D(-3, -10), price_per_share_paise=9100, method="Market multiples", valuer="Mehta & Associates, Registered Valuers (sample)", report_file=None, published_at=T(-3, -8), published_by="u_advisor"),
        dict(id="v_k1", company_id="c_kalyan", date=D(0, -25), price_per_share_paise=24000, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(0, -24), published_by="u_advisor"),
    ]
    sell_requests = [dict(id="s_1", holding_id="h_v3", investor_id=inv_id("3"), company_id="c_vasai", shares=300 * LAKH // 16000, full=True,
                          indicative_price_paise=19000, note="Rebalancing the family office book.", status="submitted", rofr_days=None, rofr_until=None,
                          buyer_investor_id=None, spa_date=None, price_paise=None, reason=None, created_at=T(0, -2),
                          history=[dict(status="submitted", at=T(0, -2), by=inv_id("3"))])]
    # loans: payments recorded for every instalment already due, except the latest one on l_2 (overdue)
    loans = [
        dict(id="l_1", lender_id="u_lender", company_id="c_vasai", amount_paise=18 * CRORE, rate_bps=1025, tenor_months=84, moratorium_months=6, sanction_date=D(-18, -20), disbursal_date=D(-18), skip_last=0),
        dict(id="l_2", lender_id="u_lender", company_id="c_kalyan", amount_paise=6 * CRORE, rate_bps=1150, tenor_months=60, moratorium_months=0, sanction_date=D(-20, -15), disbursal_date=D(-20, -10), skip_last=1),
        dict(id="l_3", lender_id="u_lender", company_id="c_taloja", amount_paise=35 * CRORE // 10, rate_bps=1100, tenor_months=48, moratorium_months=3, sanction_date=D(-7, -12), disbursal_date=D(-7), skip_last=0),
        dict(id="l_4", lender_id="u_lender2", company_id="c_kalyan", amount_paise=25 * CRORE // 10, rate_bps=1250, tenor_months=36, moratorium_months=0, sanction_date=D(-14, -9), disbursal_date=D(-14), skip_last=0),
        dict(id="l_5", lender_id="u_lender3", company_id="c_vasai", amount_paise=5 * CRORE, rate_bps=975, tenor_months=60, moratorium_months=0, sanction_date=D(-30, -14), disbursal_date=D(-30), skip_last=0),
        dict(id="l_6", lender_id="u_lender4", company_id="c_nashik", amount_paise=15 * CRORE // 10, rate_bps=1300, tenor_months=24, moratorium_months=0, sanction_date=D(-5, -10), disbursal_date=D(-5), skip_last=0),
    ]
    for l in loans:
        l.update(status="disbursed", created_at=l["sanction_date"], payments="@paid:%d" % l.pop("skip_last"))
    loan_transfers = [dict(id="lt_1", loan_id="l_4", from_lender_id="u_lender2", amount_paise=None, note="Portfolio rebalancing: reducing plastics exposure.",
                           status="submitted", buyer_lender_id=None, fee_rate=None, fee_paise=None, created_at=T(0, -3),
                           history=[dict(status="submitted", at=T(0, -3), by="u_lender2")])]

    def inv(id_, kind, cid, payer, payer_id, period, amount, issued, due, paid):
        return dict(id=id_, kind=kind, company_id=cid, payer=payer, payer_id=payer_id, period=period, amount_paise=amount,
                    gst_paise=amount * 18 // 100, issued=issued, due=due, paid_on=paid)
    vasai_raised = sum(h["cost_paise"] for h in holdings if h["company_id"] == "c_vasai")
    taloja_raised = sum(h["cost_paise"] for h in holdings if h["company_id"] == "c_taloja")
    q_rev_vasai = 112 * CRORE // 4 * 4 // 1000  # 0.4% of a quarter's revenue
    invoices = [
        inv("f_1", "advisory", "c_vasai", "company", "c_vasai", "Engagement", LAKH, D(-10), D(-9, -15), D(-9, -18)),
        inv("f_2", "advisory", "c_kalyan", "company", "c_kalyan", "Engagement", LAKH, D(-2), D(-1, -15), D(-1, -20)),
        inv("f_3", "advisory", "c_taloja", "company", "c_taloja", "Engagement", LAKH, D(-8), D(-7, -15), D(-7, -10)),
        inv("f_4", "advisory", "c_nashik", "company", "c_nashik", "Engagement", LAKH, D(0, -12), D(0, 3), None),
        inv("f_5", "success", "c_vasai", "company", "c_vasai", "Equity raise", vasai_raised * 25 // 1000, D(-8), D(-7, -15), D(-7, -12)),
        inv("f_6", "success", "c_taloja", "company", "c_taloja", "Equity raise", taloja_raised * 25 // 1000, D(-6, 5), D(-5, -10), D(-5, -12)),
        inv("f_7", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 1", q_rev_vasai, D(-5), D(-4, -15), D(-4, -16)),
        inv("f_8", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 2", q_rev_vasai, D(-2), D(-1, -15), D(-1, -14)),
        inv("f_9", "revenue_share", "c_taloja", "company", "c_taloja", "Quarter 1", 45 * CRORE // 4 * 4 // 1000, D(-3, 5), D(0, -5), None),
        inv("f_10", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 3", q_rev_vasai, D(0, -5), D(0, 10), None),
        inv("f_11", "monitoring", "c_vasai", "lender", "u_lender", "Loan l_1, last quarter", 18 * CRORE * 35 // 10000 // 4, D(-1), D(0, -15), D(0, -14)),
        inv("f_12", "monitoring", "c_kalyan", "lender", "u_lender2", "Loan l_4, last quarter", 25 * CRORE // 10 * 35 // 10000 // 4, D(-1), D(0, -15), None),
        # 2.5% debt success fee, paid by the company when a loan arranged through Aegis Ascend is disbursed
        inv("f_13", "debt_success", "c_vasai", "company", "c_vasai", "Loan from Harbour Bank (sample)", 18 * CRORE * 25 // 1000, D(-18), D(-18, 15), D(-18, 10)),
        inv("f_14", "debt_success", "c_kalyan", "company", "c_kalyan", "Loan from Harbour Bank (sample)", 6 * CRORE * 25 // 1000, D(-20, -10), D(-20, 5), D(-20, 2)),
        inv("f_15", "debt_success", "c_taloja", "company", "c_taloja", "Loan from Harbour Bank (sample)", 35 * CRORE // 10 * 25 // 1000, D(-7), D(-7, 15), D(-7, 12)),
        inv("f_16", "debt_success", "c_kalyan", "company", "c_kalyan", "Loan from Sahyadri Finance NBFC (sample)", 25 * CRORE // 10 * 25 // 1000, D(-14), D(-14, 15), D(-14, 9)),
        inv("f_17", "debt_success", "c_vasai", "company", "c_vasai", "Loan from Konkan Co-operative Bank (sample)", 5 * CRORE * 25 // 1000, D(-30), D(-30, 15), D(-30, 11)),
        inv("f_18", "debt_success", "c_nashik", "company", "c_nashik", "Loan from Deccan Capital NBFC (sample)", 15 * CRORE // 10 * 25 // 1000, D(-5), D(-5, 15), D(-5, 14)),
    ]
    notes = [
        dict(id="n_1", subject_type="company", subject_id="c_taloja", text="Chase the depository for the demat credit confirmation.", due=D(0, 2), done=False, by="u_advisor", at=T(0, -4)),
        dict(id="n_2", subject_type="investor", subject_id=inv_id("05"), text="Call Rohan about his Kalyan interest and ticket size.", due=D(0, -1), done=False, by="u_advisor", at=T(0, -3)),
        dict(id="n_3", subject_type="lender", subject_id="u_lender2", text="Share the l_4 monitoring pack with interested buyers.", due=D(0, 5), done=False, by="u_advisor", at=T(0, -2)),
    ]
    notifications = [
        dict(id="nt_1", user_id=inv_id(""), kind="offer", text="New private offer: Kalyan Polymers Pvt Ltd", link="app-opportunities", at=T(0, -6), read=False),
        dict(id="nt_2", user_id=inv_id(""), kind="valuation", text="Revaluation published: Vasai Precision Castings at Rs 184.00 a share", link="app-portfolio", at=T(-2, 2), read=True),
        dict(id="nt_3", user_id=inv_id("3"), kind="sell", text="Your sell request for Vasai Precision Castings was submitted", link="app-portfolio", at=T(0, -2), read=False),
        dict(id="nt_4", user_id="u_lender2", kind="transfer", text="Loan transfer request for Kalyan Polymers received by Aegis Ascend", link="app-loanbook", at=T(0, -3), read=False),
    ]
    intros = [
        dict(id="i_1", company_id="c_kalyan", investor_id=inv_id("2"), status="requested", created_at=T(0, -1), nda_signed_at=None, views=[]),
        dict(id="i_2", company_id="c_kalyan", investor_id=inv_id("08"), status="granted", created_at=T(0, -4), nda_signed_at=T(0, -3),
             views=[dict(doc="Audited accounts FY24-FY26", at=T(0, -3)), dict(doc="CMA data FY25-FY28", at=T(0, -2))]),
        dict(id="i_3", company_id="c_vasai", investor_id=inv_id(""), status="granted", created_at=T(-9, 2), nda_signed_at=T(-9, 3),
             views=[dict(doc="Debt vs equity report", at=T(-9, 3))]),
    ]
    return dict(users=users, companies=companies, reports=reports, intros=intros, cap_table=cap, holdings=holdings, offers=offers, valuations=valuations,
                sell_requests=sell_requests, transfers=[], loans=loans, loan_transfers=loan_transfers, invoices=invoices, notes=notes,
                notifications=notifications, files=[], enquiries=[], settings=[dict(SETTINGS_DEFAULT)])


def finalize(data, today):
    """Resolve the two markers that need today or another field: "@fy[date]" and a loan's "@paid:N"."""
    from server.domain import add_months, fy

    def walk(x):
        if isinstance(x, dict):
            return {(fy(today) if k == "@fy" else k): walk(v) for k, v in x.items()}
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, str) and x.startswith("@fy"):
            return fy(x[3:] or today)
        return x
    data = walk(data)
    for l in data["loans"]:
        skip = int(str(l["payments"]).split(":")[1])
        due = [add_months(l["disbursal_date"], k) for k in range(1, l["tenor_months"] + 1)]
        due = [x for x in due if x < today]
        l["payments"] = {x: x for x in due[:len(due) - skip]}
    return data


def resolved(today):
    from server.domain import add_days, add_months
    return finalize(seed_data(lambda m, dd, ts: (lambda s: s + "T10:00:00+00:00" if ts else s)(add_days(add_months(today, m), dd))), today)


def markers():
    """The same data with relative-date markers, for the browser demo to resolve on first load."""
    return seed_data(lambda m, dd, ts: ("@T" if ts else "@") + "%d,%d" % (m, dd))
```
