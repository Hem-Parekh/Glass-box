# Prompt: rebuild the Aegis Ascend website

Copy everything below the line into the website builder (Emergent, base44, Lovable, v0, Bolt or similar). It is written to stand on its own.

---

Build a complete website and client workspace for **Aegis Ascend Financial Advisors**, an independent funding advisory firm in Mumbai. The firm advises growing Indian businesses whether to raise **debt, equity or a mix**, then helps deliver the deal. Tagline: **"Smarter Decisions. Stronger Futures."**

The product has two halves:
1. **Public website:** nine pages, no login.
2. **Workspace:** sign-in for four roles (founder, investor, lender, advisor), each with its own dashboard.

Build every part described here. Do not invent clients, testimonials, awards or statistics. All companies and people in the demo data are fictional, and every workspace page shows the banner **"Demo: fictional companies and people, kept in this browser"** (or "...in this database" with a backend).

## 1. Tech stack

- React 19, React Router, Tailwind CSS, shadcn/ui (Radix), framer-motion, recharts, react-hook-form with zod, sonner for toasts, lucide-react icons.
- A backend with a real database and session login. **Every business rule in section 9 is enforced on the server**, never only in the UI.
- Seed the database with the demo data in section 10, and add a "Reset demo data" action.
- Money is stored as integer paise (1 rupee = 100 paise). It is shown in Indian style: Rs 12 crore, Rs 4.9 cr, Rs 54.95 L, 2,50,000 shares.
- Every page works from 360px phone width to 1440px desktop, with no sideways scroll.

## 2. Brand and design system (keep exactly)

**Colours (CSS variables):**

| Token | Value | Use |
|---|---|---|
| obsidian | #0D0E10 | public page background |
| obsidian-raised | #151411 | raised panels on dark |
| obsidian-high | #1D1C18 | hover, current nav item |
| obsidian-edge | #29271F | input borders on dark |
| gold-light | #E8C77B | highlights, gold text on dark |
| gold | #C9A04F | primary buttons, rules, markers |
| gold-deep | #8E6A2A | gradient base |
| gold-ink | #7B5C1F | gold text on white (never #C9A04F on white) |
| gold-line | rgba(201,160,79,.28) | hairline rules |
| ivory | #F1ECE2 | text on dark |
| ivory-soft | #ABA497 | secondary text on dark |
| stone | #F2F1EE | workspace background (light mode) |
| panel | #FFFFFF | workspace cards |
| ink | #16171A | text on light |
| debt series | #3F6EA6 (dark mode #5C88C4) | |
| equity series | #B8892F (dark #B08433) | |
| mix series | #1E8C68 (dark #2FA38A) | |
| good / warn / bad | #1D7A4C / #946100 / #B0281E | status colours |

**Type:**
- **Cinzel** 500 with positive tracking for every heading, name and the wordmark.
- **Hanken Grotesk** for body text, labels and numbers.
- **Caveat** 600, only for handwritten sticky notes.

**Shape:**
- Nearly square corners: 2px chips, 3px buttons, 4px inputs, 6px workspace cards.
- Glass panels are the one exception, at 12px.

**Marker:** a small rotated gold square (diamond), 6–11px. It is used for bullets, the current nav item, checklist ticks and chip dots. Never use round dots.

**Signature details:**
- **Glass-box numbers:** every figure that has a formula has a dashed gold underline. Clicking it opens a right-side panel, "How this number is made", with the formula, every input, and each input's source label (founder, benchmark, advisor or engine).
- **"Reviewed" stamp:** Cinzel 12px uppercase, gold, 1px border, a leading diamond, for example "REVIEWED BY CA NEHA JOSHI · 02 OCT 2026".

**Glass and New York skyline (public pages, sign-in):**
- **Skyline:** a fixed New York skyline at night sits at the bottom of the screen.
  - It is a black SVG silhouette in three depth layers (far #221F1A, mid #15140F, near #0A0A0B) with about 430 tiny gold lit windows (#E8C77B).
  - It includes the Chrysler Building, the Empire State Building (with a beacon), 432 Park Avenue and One World Trade Center (with a beacon), over a soft gold glow at the horizon.
- **Glass panels:**
  - Tint rgba(20,19,16,.6), backdrop blur 14px with saturate 1.25.
  - 1px edge rgba(232,199,123,.22), 12px radius.
  - Shadow `inset 0 1px 0 rgba(255,241,214,.07), 0 30px 60px -34px rgba(0,0,0,.85)`.
  - Used on the header, page headers, cards, the sign-in card, the contact form, the explain panel and the footer.
- **Readability rule:**
  - Text never sits directly on the skyline: always on glass tinted at least 60%, or on a section background of 90% or more.
  - The header is tinted 80% (90% on phones).
  - Phones get near-solid panels without blur. `prefers-reduced-transparency` gets solid panels.
- **Workspace:**
  - The left rail shows the skyline faintly at its foot.
  - Each page title sits in a dark "masthead" band with the skyline at the right.
  - Tables, KPI tiles and working panels stay solid white (dark mode: #17191D on #101114).

## 3. The logo (use this exact geometry)

The emblem is two upright A shapes sharing a chevron crossbar, crowned by a diamond. It is **always upright**: the peaks point up and the diamond sits on top.

```html
<svg viewBox="62 52 420 400">
  <defs>
    <linearGradient id="goldv2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E8C77B"/><stop offset=".55" stop-color="#C9A04F"/><stop offset="1" stop-color="#9C7330"/>
    </linearGradient>
    <clipPath id="emclipL"><rect x="0" y="0" width="600" height="414"/><rect x="236" y="0" width="20" height="441"/></clipPath>
    <clipPath id="emclipR"><rect x="0" y="0" width="600" height="414"/><rect x="290" y="0" width="20" height="441"/></clipPath>
    <clipPath id="emclipC"><rect x="0" y="0" width="600" height="395"/></clipPath>
  </defs>
  <g fill="none" stroke="url(#goldv2)" stroke-width="17" stroke-linejoin="miter" stroke-miterlimit="12">
    <path d="M80 412 L246 136 L246 440" clip-path="url(#emclipL)"/>
    <path d="M466 412 L300 136 L300 440" clip-path="url(#emclipR)"/>
    <path d="M172 404 L273 289 L374 404" clip-path="url(#emclipC)"/>
  </g>
  <polygon points="273,62 302,91 273,120 244,91" fill="url(#goldv2)"/>
</svg>
```

**Wordmark:**
- "AEGIS" in ivory and "ASCEND" in gold-light, Cinzel, letter-spacing .16em.
- Under it, "FINANCIAL ADVISORS" in small gold Cinzel caps, tracking .42em, with a short gold rule on each side.

## 4. Home page hero: 3D emblem scroll intro

The hero is a section 250vh tall with a sticky full-screen stage. It has a radial background from #1B1A16 to obsidian and a faint grain texture.

1. **3D solid emblem:**
   - Split the logo into three pieces: the left A (with the left half of the crossbar), the right A (with the right half) and the diamond.
   - Render each piece as a gold front face over **16 stacked copies set back 1.7px apart in depth** (CSS `transform-style: preserve-3d`, `translateZ`).
   - The back copies use a darker gold gradient (#A27935 to #5E451C). The very back copy is darker still (#4A3615 to #241A0A).
   - The stage has `perspective: 1300px`.
2. **Motion on load:**
   - Both A's draw upward with stroke-dash animation, 1.3s.
   - The diamond lands from above with a small rotation.
   - The wordmark ("AEGIS ASCEND / FINANCIAL ADVISORS") rises in under the emblem, then a "SCROLL" cue with a pulsing gold line.
3. **Idle motion:**
   - The mark sways gently: rotateY about ±14° on a slow sine, rotateX about 4±4°.
   - It leans toward the pointer (up to 12° yaw, 7° pitch, eased).
   - It never turns far enough to look upside down.
   - The front face brightens slightly as it turns.
4. **Scroll:**
   - As the visitor scrolls, the two A's slide apart to the screen edges and scale up 15%.
   - While parting, they **swing open like doors**: rotateY up to 24°, peaking mid-way and settling back to 0.
   - The diamond rises and shrinks to crown the headline. The wordmark fades.
   - The skyline rises from below and its windows switch on in three groups.
   - A glass panel fades in behind the copy, and the copy comes forward item by item (rise, scale, de-blur):
     - the H1 "Smarter Decisions. *Stronger Futures.*" (second line in gold-light);
     - the lede "Independent advice on debt, equity or the right mix for growing Indian businesses. Every number traced, checked and signed off before it reaches you, then we deliver the deal.";
     - the buttons "Book an engagement" (gold) and "Try the live model" (ghost).
   - Once the headline settles, a hand-drawn gold underline draws under "Futures." only.
5. **Phones:** the A's partly leave the screen and dim behind the text. Set opacity on the slices, not on the 3D group (opacity on a 3D group flattens it).
6. **Reduced motion:** no animation. The finished layout shows, with the emblem held still at rotateY(-16deg) rotateX(6deg).

## 5. Home page: the rest, in order

1. **Live example strip (glass):**
   - "Kalyan Polymers needs **Rs 12 crore**. Debt, equity or a mix?" with a small label "Sample company · live model".
   - A split bar fills to the engine's best mix (blue debt, gold equity), with a diamond-keyed legend "Debt 60% / Equity 40%".
   - Three stats: "Founder better off than all-equity", "Lowest repayment safety (DSCR)", and "Signed off before it is shared" with a REVIEWED stamp.
   - All figures are glass-box numbers computed by the engine in section 8 with its defaults.
   - A hint below: "Click any underlined number to see its formula, inputs and where each input came from."
2. **Three promises:** FOR FOUNDERS, FOR INVESTORS, OUR ROLE, each under a gold top rule.
3. **"Protection, then ascent":**
   - An annotated line drawing of the emblem with leader lines: DIAMOND (clarity of vision, sound judgment) and THE FRAME (structure, strategy, upward ambition).
   - A definition list: AEGIS (protection and trusted guidance), ASCEND (progress and the pursuit of greater potential), THE EMBLEM.
4. **What we stand for:** six principles with diamond bullets:
   - Debt vs equity specialists
   - Every number explained
   - Curated deals
   - Advisor accountability
   - Independence
   - Founder-owned data
5. **How every report is made:** eight numbered steps on a gold rule, each with a diamond:
   1. Upload: accounts, GST returns, CMA data.
   2. Read: figures extracted into a strict format.
   3. Confirm: the founder checks every figure.
   4. Validate: balances, totals and sudden jumps checked.
   5. Calculate: code computes every number; no AI does maths.
   6. Stress: best, expected, worst; sales −20%, rates +2 points.
   7. Verify: every number in the summary matched to the engine.
   8. Sign off: a named advisor reviews and stamps the report.

   Then "The golden rule": the AI never does the maths.
6. **Tools behind the advice:** seven linked cards:
   - Funding Twin
   - Net Effect Bridge
   - Break-even Value
   - Stress Slider
   - Equity vs Debt Optimizer
   - CMA funding report
   - Investor Fit Score
7. **The founders:**
   - Portraits in a 4:5 frame with an inset gold hairline: **Hem Parekh, Yash Sharma, Vivan Shah**, each "Co-founder".
   - Portraits uncover from the bottom on scroll. Use placeholder portraits until real photos are supplied.
8. **Closing call to action:** "Should you raise debt, equity or a mix?", fees from Rs 1 lakh plus GST, and a "Talk to an advisor" button.

Sections rise in on scroll: 22px, 0.8s, staggered 80ms. Nothing loops.

## 6. Whiteboard motion layer (home page)

Over the live example strip and the method steps, add a decorative, `aria-hidden`, pointer-events-none overlay. It never moves the layout.

- **Collaboration cursors:**
  - Two cursors: **"Advisor"** (gold arrow pointer with a gold name chip) and **"Founder"** (ivory pointer, ivory chip).
  - Dark outline and drop shadow. The chip sits at the pointer tip with corners 3px top-left and 10px on the others.
  - They glide between targets with ease-in-out, tap with an expanding ring, and fade out when their walk ends.
- **Hand-drawn ink:**
  - Gold-light #E8C77B, 2.4px, round caps.
  - Loops are slightly uneven ellipses that overshoot their start; underlines are wavy; arrows are curved with a two-stroke head.
  - Everything draws on with stroke-dashoffset. Use a seeded random generator so the drawing is identical every visit.
- **Sticky notes:**
  - Gold #E8C77B paper, dark #1B160C text, Caveat 600 21px, 196px wide, tilted ±3°.
  - A translucent tape strip on top. They drop in with a spring overshoot.
  - Notes only repeat facts already on the page, and appear only where there is at least 250px of room beside the strip (never on phones).
- **Live example sequence** (starts when the strip is 45% visible, after its rise-in settles):
  1. The Advisor moves to "Debt 60%", taps, and loops the whole "◆ Debt 60%" label.
  2. An arrow draws to a left note: "Every mix tested, from 0% to 100% debt".
  3. The Founder comes in from the right, taps the DSCR figure, and draws a wavy underline under the number only.
  4. The Advisor moves to the REVIEWED stamp, taps, and loops it (not touching the label above).
  5. An arrow draws to a right note: "A named advisor signs every report".
  6. The cursors fade at about 7.4s.
- **Method sequence:**
  - The Advisor walks the step numbers 1 to 8, about 380ms per step.
  - A curved arrow draws from each number to the next, only when both are on the same row.
  - It ends by looping the words "Sign off". Measure text with a Range, not the full-width block.
- **Reduced motion:** show the finished ink and notes, with no cursors.
- **Resize:** redraw anything already played in its finished state.

## 7. Public pages

- **Header and footer:**
  - Glass sticky header: wordmark, then Services, For investors, For lenders, Pricing, Trust & compliance, About, then "Sign in" (ghost) and "Book an engagement" (gold).
  - The current page is marked by a gold diamond under the link. Below 1240px the menu collapses behind a "Menu" button.
  - Footer columns: SERVICES, FIRM, WORKSPACE, plus a fine-print disclaimer.
- **Services:**
  - Debt vs equity advisory.
  - Equity raise and early exit: how a raise closes (8 steps) and how an early exit works (7 steps: notice, first refusal, buyer introduction, fresh valuation, SPA, board approval and transfer, FEMA for non-residents).
  - Debt: arranging a loan (6 steps), monitoring, and loan transfers.
  - Note: resales are private and negotiated.
- **For investors:**
  - Why investors see fewer but checked companies, direct share ownership, and deal rooms.
  - A tax table.
  - An **exit tax calculator** with inputs: invested, sale price, months held, tax slab, fair market value.
    - Short-term gain is taxed at the slab rate; long-term (24+ months) at 12.5%.
    - It warns when the sale price is below fair market value.
- **For lenders:**
  - Lender-side view, monitoring and transfers.
  - A **debt fee calculator**: loan, tenor, rate, monitoring fee % (0.25–0.5%), transfer amount and fee % (0.3–0.5%). Show the totals and a bar chart by year.
- **Pricing:**
  - Fee schedule: advisory from Rs 1 lakh; 2.5% equity success fee; 2.5% debt success fee on loans we arrange (paid by the company at disbursal); 0.4% revenue share for 5 years; investor diligence fee; lenders pay the arranging commission, monitoring and transfer fees. All fees are +18% GST.
  - A **"What one deal is worth" calculator**: equity raised, revenue, growth and advisory fee give each fee and a 5-year total, with a bar chart.
- **Trust & compliance:** compliance by design (table), commitments, legal opinions being obtained, planned security controls (labelled as planned), quality controls and the release checklist.
- **About:** founders, the pilot target, a comparison with other players, and a roadmap (Validate → MVP → Ongoing services → Debt desk).
- **Contact:** a glass enquiry form (name, email, company, message). Submissions appear on the advisor's Enquiries page.
- **Sign in / Create account:**
  - Email and password. On the demo, one-click role buttons (Founder, Investor, Advisor, Lender; password `demo1234`) and "Reset demo data".
  - Sign up as founder, investor or lender; founders also get a company record. Advisors can only be created by an admin.
  - After 5 wrong passwords the account locks for 15 minutes.

## 8. Calculation engine (deterministic, no AI)

**Defaults** (money in Rs crore):

| Input | Default | Input | Default |
|---|---|---|---|
| raise | 12 | ebitda0 | 5 |
| pre_money | 60 | ebitda_growth | 12% |
| value_growth | 18% | existing debt service | 1.5 a year |
| horizon | 7 years | dscr_min | 1.25 |
| loan rate | 11% | growth_sigma | 8% |
| tenor | 7 years | sales_drop | 20% |
| moratorium | 0 | rate_shock | 2 points |
| tax_rate | 25% | op_leverage | 1.5 |
| discount_rate | 14% | | |

**Loan schedule:** interest only during the moratorium, then a level annual EMI (annuity). The last payment clears the balance exactly.

**DSCR path for a loan L, each year t:**
- EBITDA = ebitda0 × (1+g)^t × (1 − min(sales_drop × op_leverage, 1)), where the drop term applies only in the stress case.
- tax = 25% × max(EBITDA − interest, 0).
- CFADS = EBITDA − tax.
- DSCR = CFADS ÷ (existing debt service + loan payment).
- The stress case uses sales −20% and the loan rate +2 points.

**Founder value for loan L and equity E:**
- V = (pre_money + raise) × (1 + value_growth)^horizon.
- debtCost = payments within the horizon − (interest × tax rate) + balance outstanding at the horizon.
- stake = E ÷ (pre_money + E).
- value = (1 − stake) × (V − debtCost).

**Outputs:**
- **Best mix:** debt share 0% to 100% in 5% steps. Keep mixes with expected minimum DSCR ≥ dscr_min and stress minimum DSCR ≥ 1.00. Choose the highest founder value.
- **Net effect** vs all-equity, in today's money: (value at best mix − value all-equity) ÷ (1 + discount)^horizon.
- **Break-even company value:** debtCost(all-debt) ÷ stake(all-equity). Above it, debt wins.
- **Best, expected and worst cases:** growth ± 8%.
- **Simulation:** 2,000 runs with a fixed seed (mulberry32, seed 20261013). Report the chance debt wins, the chance of a year with DSCR below 1, and the outcome range.

## 9. Rules the server enforces

1. **Direct holding:** investors hold shares in their own name; money never passes through the platform.
2. **Platform investors:** at most 20 per company (editable in advisor Settings).
3. **Offer counter (Companies Act s.42):**
   - One offer per investor, per company, per financial year (April–March) and per security type.
   - Off-platform offers count too. Re-offering the same investor in the same year doesn't count twice; resale introductions don't count.
   - Warn at 150; block above 200.
4. **Member counter (s.2(68)):** founders, existing holders and platform investors are counted. Warn at 180; block any allotment or transfer above 200.
5. **Minimum holding:** 6 months from the allotment date; earlier only with the founder's recorded consent.
6. **Revaluation:** quarterly, by a registered valuer.
7. **Private resales:** no listings, prices or bidding. A 15–30 day first-refusal window and a one-to-one buyer introduction.
8. **Loan transfers:** only between regulated banks and NBFCs, after holding 3 months (loans of 2 years or less) or 6 months.
9. **KYC:** verified KYC is required before an offer or a buyer introduction.
10. **Deal rooms:** only for companies already offered to the investor; only that founder grants access; documents open only after the NDA is signed online.
11. **Advisor-only actions:** prepare and submit reports, share offers, record allotments, publish valuations, and move resales and loan transfers forward.
12. **Data isolation:** each role sees only its own data.
13. **Audit log:** every change is recorded with who, when, and before and after values.

**Automatic pipeline:** report submitted → Under review; approved → Approved; first offer → Offering; first allotment → Funded. Recording an allotment starts a 15-day PAS-3 countdown.

## 10. Demo data (fictional)

**Users:**

| Role | Email (password demo1234) | Name |
|---|---|---|
| Founder | founder@demo.in | Priya Nair, Managing Director, Kalyan Polymers |
| Investor | investor@demo.in | Meera Iyer, Konkan Growth Partners |
| Advisor | advisor@demo.in | CA Neha Joshi, reviewing advisor |
| Lender | lender@demo.in | Suresh Pillai, Harbour Bank (sample) |

Also seed:
- Founders Rahul Deshmukh (Vasai) and Farah Shaikh (Taloja).
- Lenders Sahyadri Finance NBFC, Konkan Co-operative Bank and Deccan Capital NBFC (all "sample").
- About 20 investors with sectors, ticket sizes, KYC status and accreditation, for example: Vikram Bhatt (Sahyadri Angels Network), Arvind Rao (Rao Family Office), Ananya Kulkarni, Karan Shah, Kavya Reddy, Farhan Qureshi.

**Companies:**

| Company | Sector | City | Revenue | Raise | Stage |
|---|---|---|---|---|---|
| Kalyan Polymers Pvt Ltd | Plastics & packaging | Bhiwandi | Rs 68 cr | Rs 12 cr | Offering (report approved, 25% debt) |
| Vasai Precision Castings Pvt Ltd | Auto components | Vasai | Rs 112 cr | Rs 25 cr | Monitoring |
| Taloja Specialty Chemicals Pvt Ltd | Chemicals | Taloja | Rs 45 cr | Rs 8 cr | Funded |
| Nashik Agro Foods Pvt Ltd | Food processing | Nashik | Rs 38 cr | Rs 6 cr | Under review |

**Kalyan cap table:** Priya Nair 30,00,000 shares; Suresh Nair 12,00,000; "Friends and family" 4,00,000 (12 holders); 1,50,000 unissued options.

Also seed:
- Investor holdings in Vasai and Taloja.
- Quarterly valuations.
- Three loans for the lender: Vasai Rs 18 cr at 10.25%, Kalyan Rs 6 cr at 11.5% with one overdue instalment, and Taloja Rs 3.5 cr at 11%.
- Covenant quarters (one in breach).
- Invoices, a resale request, a loan transfer, deal-room requests and notifications.

Dates are relative to today.

## 11. Workspace (all roles)

**Layout:**
- **Rail:** a left obsidian rail, 248px wide, with the wordmark at the top over a gold hairline.
  - Nav groups have small uppercase labels.
  - The current item is gold, 600 weight, with a diamond at its left.
  - The signed-in person, Sign out and "Reset demo data" sit in a glass card at the foot.
- **Phones:** the rail becomes a top bar with horizontally scrolling tabs.
- **Pages:** each page opens with a dark masthead (title, subtitle, actions).

**Shared components:**
- Data tables with search, filters, sortable sticky headers, paging, and CSV and Excel export; they become labelled cards on phones.
- Dialogs with a focus trap.
- Toasts.
- Count-up KPI figures that flash green or red on change.
- Status timelines (the current step pulses).
- A kanban board with drag and a "Move to…" menu.
- Skeletons, and empty states with the emblem line drawing.

**Motion:** everything under 400ms; off with reduced motion.

### Founder (Kalyan Polymers)

Menu:
- **Fundraise:** Fundraise tracker, Investors, Deal room, Cap table, Data room, Revenue share.
- **Debt:** Loans & monitoring, Fees.
- **Account:** Company profile, Notifications, Activity log.

Pages:
- **Overview:**
  - Cards: stage, advisor-approved mix, interested investors out of those offered, report status.
  - A 7-step next-steps checklist (done steps crossed out); a Reviewed stamp once signed off.
  - "Needs your decision" (deal-room requests with Grant and Decline).
  - Fundraise summary, and the latest covenant check with a status chip.
- **Fundraise tracker:** stage timeline; offers this financial year out of 200 (glass-box); interested and committed counts; amount raised; investor names only if they consented; pending documents.
- **Investors:** every investor ranked by Investor Fit Score out of 100, with reasons (sector, stage, ticket size, instrument). "Suggest to my advisor" (founders cannot send offers). Grant or decline deal-room requests.
- **Deal room:** document list, who has access with NDA dates, and "who viewed what".
- **Cap table:** fully diluted ownership now and after the round; members out of 200; an "Effect of the planned round" calculator.
- **Data room:** an 8-item checklist with a progress bar and uploads (PDF, Excel, Word, CSV, images).
- **Revenue share:** paid to date, amount due, and the quarterly estimate (revenue ÷ 4 × 0.4%); a statements table.
- **Loans & monitoring:** loans table; apply through Aegis Ascend; upload quarterly accounts; DSCR chart against the covenant line; covenant table; early-warning banner.
- **Fees, Company profile, Notifications, Activity log.**

Founders do **not** get the analysis tools; the advisor runs them.

### Investor (Meera Iyer)

Menu: Portfolio, Opportunities, Curated deals, Deal rooms, Sell requests & exits, Notifications, Activity log.

- **Portfolio** (styled like a demat account):
  - Cards: total invested, current value, gain or loss in Rs and % (green or red), companies held, and XIRR (glass-box).
  - Holdings table: company, dates, shares, ownership %, invested, average cost, latest price and its date, value, gain, and a lock badge ("Locked until…" or "Eligible to sell").
  - "Request to sell" stays disabled until 6 months after allotment.
  - A portfolio-value line chart against the amount invested.
- **Holding detail:**
  - Cards, a valuation history chart, and a valuations table with a valuer report download.
  - **Tax if sold today:** labelled as an estimate.
  - Document summaries (SSA, SHA, allotment letter, PAS-4) and company updates.
- **Sell flow:**
  - Choose full or part of the stake, with an optional indicative price.
  - Then a timeline: Submitted → Under review → First-refusal window → Buyer introduced → SPA signed → Transfer complete.
  - The investor can withdraw while the request is early.
- **Opportunities:** private offers ("do not forward"), with the engine view, the Reviewed stamp and the advisor's note. Actions: read the report (watermarked, view logged), express interest (optionally share name), or decline.
- **Curated deals:** companies ranked by Fit Score, with "Request deal-room access".
- **Deal rooms:** tick and sign the NDA online, then the documents appear (opening one logs a watermarked view).
- **Notifications:** includes "Lock-in ends in N days" from 7 days before.

### Lender (Suresh Pillai, Harbour Bank)

Menu: Loan book, Lender desk, Applications, Monitoring, Loan transfers, Fees, Notifications, Activity log.

- **Loan book:**
  - An overdue banner.
  - Cards: total lent, principal outstanding, interest earned, interest due this month, next repayment, active loans.
  - Loans table with DSCR badges: green ≥ 1.5, amber 1.25–1.5, red < 1.25, with a filter.
  - Monthly interest chart: the last 12 months and the next 12 projected (projected bars lighter).
- **Loan detail:**
  - Balance chart with a "Now" marker; interest chart.
  - Repayment schedule with Paid, Pending and Overdue statuses, and "Mark received".
  - Quarterly monitoring.
  - "Request loan transfer".
- **Lender desk, Applications** (Sanction, Decline, Mark disbursed, which starts the schedule), **Monitoring.**
- **Loan transfers:** a timeline (Requested → Eligibility checked → Borrower consent → Buyer lender introduced → Assignment deed signed → Charge updated with the ROC → Transfer complete).
- **Fees:** invoices and the debt fee calculator.

### Advisor (CA Neha Joshi)

Menu:
- **Today**
- **Deals:** Company pipeline, Companies, Investor directory, Deal rooms, Resale requests, Revaluation centre.
- **Debt:** Loan transfers, Loans & DSCR.
- **Practice:** Review queue, Compliance, Revenue, Notes & tasks, Message templates.
- **Tools:** Funding Twin, Equity vs Debt Optimizer, CMA funding report, Readiness Score, Term Sheet Analyser.
- **Admin:** Enquiries, Audit log, Settings.

Pages:
- **Today:**
  - Cards: needs attention, open requests, reports to review, tasks due in 3 days.
  - Alert lists, most urgent first: revaluations due, requests waiting over 5 days, PAS-3 deadlines, lock-ins ending, companies near limits, repayment alerts, tasks, reports to review.
- **Company pipeline:**
  - Kanban columns: Applied, Under review, Approved, Offering, Funded, Monitoring, Closed, Rejected.
  - Cards show the raise and mix, offers out of 200, interested and committed counts, investors out of 20, members out of 200, and days in stage.
  - Moving a card needs confirmation, and the server refuses impossible moves. A table view is also available.
- **Company file:**
  - Counter meters that turn amber at the warning and red at the limit.
  - Cap table editing, "Record founder consent", "Edit offer terms", off-platform offers.
  - Offer log with "Record allotment".
  - Valuation history and "Publish revaluation".
  - A 7-item filing checklist (valuer report, MGT-14, PAS-4, separate bank account, allotment, PAS-3 with countdown, demat credit).
  - Fees, notes, "Share offer" and "Post update".
- **Investor directory:**
  - Filters for KYC, NDA, accreditation, sector and ticket size.
  - Share an offer: shows the "Offers this year: N / 200" counter, a "Suggest a shortlist" button (KYC-verified, Fit Score ≥ 60, not yet offered), and a confirmation with before and after counts.
- **Resale requests:** Start review, Start first-refusal window, Introduce buyer (only eligible investors), Record SPA signed, Complete transfer (updates portfolios, cap table and counters), Reject.
- **Revaluation centre:** a form, plus a confirmation showing the change % across portfolios. Publishing notifies investors.
- **Loan transfers:** step buttons; completing moves the loan and raises a 0.3–0.5% fee invoice.
- **Review queue:** the report summary and release checklist, with "Approve and stamp" or "Request changes".
- **Compliance, Revenue** (cards per fee type, a stacked monthly bar chart, invoices), **Notes & tasks, Message templates** (placeholders; Email, WhatsApp and Copy buttons; nothing sent automatically).

**Tools:**
- **Funding Twin:**
  - Inputs, each labelled with its source.
  - Outputs: best mix, Net Effect Bridge, Break-even Value, best/expected/worst cases, stress sliders, the 2,000-run simulation, the loan schedule, and a plain-language summary with an automatic number check.
  - "Submit for advisor review".
- **Equity vs Debt Optimizer:** every equity share 0–100% in 1% steps, year by year. Best mix, take-home, charts and a sensitivity table.
- **CMA funding report:**
  - A separate page, locked to advisors; others see an "Advisors only" glass page.
  - Reads the bank CMA Excel file in the browser, sizes debt on DSCR, and exports a one-page A4 PDF.
- **Readiness Score:** debt and equity scores out of 100, with factors and a fix-it plan.
- **Term Sheet Analyser:** for a loan, the all-in cost and risky clauses; for equity, dilution, effective valuation, an exit waterfall and risky clauses.

**Admin:** Enquiries; the audit log (filters, before and after, export); Settings (the platform-investor limit).

## 12. Quality bar

- WCAG AA contrast everywhere.
- Visible gold focus rings, keyboard access to every action, and `prefers-reduced-motion` honoured.
- No horizontal scroll at 360px.
- Every figure with a formula is a glass-box number.
- Charts are hand-styled to the palette; gold is used as a series colour only for equity.
- Test the business rules and the engine with unit tests.
