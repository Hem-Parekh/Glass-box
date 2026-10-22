# Aegis Ascend Financial Advisors: complete feature list

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

## 2. Public website (no login needed)

The look is black and gold, matching the Aegis Ascend logo.

### Header and footer (every public page)
- The logo and wordmark, plus menu links: Services, For investors, For lenders, Pricing, Trust & compliance, About, Sign in, and "Book an engagement".
- On phones the menu collapses behind a Menu button.

### Home page
Each item below is a section of the page, in the order a visitor scrolls through them.
1. **Opening animation.** The page opens on the emblem: both A's draw upward, the diamond lands on top, and the name rises in.
2. **Scroll intro.** As you scroll, the two A's slide apart to the edges of the screen. The diamond rises above the headline, and "Smarter Decisions. Stronger Futures." comes forward with a short description and two buttons: "Book an engagement" and "Try the live model".
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
- A fee schedule: the advisory fee from Rs 1 lakh, a 2.5% success fee, a 0.4% revenue share for 5 years, an investor diligence fee, and debt fees paid by lenders. All fees are plus 18% GST.
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
- **Upload quarterly accounts.** The file goes to the advisor and lenders.
- **Covenant monitoring:**
  - a DSCR line chart by quarter against the covenant line;
  - a table of EBITDA, interest, principal, debt, DSCR, Debt/EBITDA and status;
  - an early-warning message when the latest quarter is close to or in breach of a covenant;
  - a form to add a new quarter.

### Fees
- The fee calculator for this company's raise and revenue, plus 18% GST.

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
- Every sell request, each with its timeline.
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
- **"Request loan transfer".** Enter an amount (or leave it blank for the full outstanding) and a note. The request goes to the advisor. Once a transfer exists, its timeline appears here.

### Lender desk
- **Overview cards:** new applications, loans monitored, book size, covenant alerts.
- A list of loans whose latest quarter is close to or in breach of a covenant.

### Applications
- **Each application shows:** the company's debt readiness score, the lowest DSCR if the whole raise were a loan (including the stress case), the engine's best mix, and whether the advisor's report is approved.
- **Actions:** Sanction, Decline, then "Mark disbursed", which starts the repayment schedule from that day.

### Monitoring
- Quarterly covenant checks for every disbursed loan.

### Loan transfers
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
  5. **Complete transfer.** The confirmation shows the member and investor counts after the transfer. Completing updates both portfolios, the cap table and the member count.
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

- **AI document reading and AI-written narratives:** in progress. The public site describes an AI layer that reads documents and writes explanations. Today, summaries are written by fixed rules and checked against the engine. No AI is connected.
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
- **Public text out of date:** the Services, For investors and Trust pages still say "at most 3 investors per deal". The workspace now enforces "at most 20 platform investors per company". These pages need updating.
- **Legal confirmations still pending,** as listed on the Trust page and raised during the build:
  - how SEBI advisory rules treat the Investor Fit Score and the investor diligence fee;
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
