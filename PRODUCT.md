# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Founders of client companies**: profitable Indian SMEs (pilot: asset-heavy manufacturing, Rs 20-150 crore revenue, Mumbai clusters) deciding how to fund the next stage, debt, equity or a mix. They model options, check readiness, compare term sheets and approve investor introductions.
- **Advisors**: the Aegis Ascend team (co-founders Hem Parekh, Yash Sharma, Vivan Shah and reviewing advisors). They review and sign off every report, run the CMA funding report and the Equity vs Debt Optimizer for clients, move deals, exits and loan transfers.
- **Investors**: see only advisor-approved deals, request introductions, sign NDAs, use deal rooms, request exits.
- **Lenders** (banks, NBFCs): review applicants with the same analysis, sanction and monitor loans, request transfers.

## Product Purpose

Aegis Ascend Financial Advisors is an independent funding advisory firm. It answers one question for growing businesses: debt, equity or a mix, and what each really costs the founder. Every number comes from tested calculation code, is explained in plain words, and is signed off by an advisor before anyone else sees it. It then delivers the deal: curated investor introductions (at most 3 investors per deal, early exit after 6 months) and debt arranging, monitoring and transfer.

## Positioning

Independent: sells no loan and runs no fund. Every number can be traced to its formula, inputs and source, and every shared report carries a named advisor's "Reviewed by" stamp.

## Operating Context

The website has a public marketing site and a signed-in workspace per role. Demo version runs in the browser with fictional data; the real app is a Flask server (server/) with hashed passwords and server-side permissions. Separate desktop Equity vs Debt Optimizer (optimizer/, Streamlit) also exists.

## Capabilities and Constraints

- Founder and advisor workspaces both include the CMA funding report tool and the Equity vs Debt Optimizer (confirmed 17 Oct 2026). Founders keep Funding Twin, Readiness Score, Term Sheet Analyser, investors, deal room, loans and monitoring, fees.
- Fees: advisory from Rs 1 lakh, 2.5% success fee, 0.4% revenue share for 5 years; lenders pay debt fees.
- Money in Indian rupees, lakh / crore conventions.
- Structures and fees are subject to legal and tax review; figures are illustrative estimates, not guarantees.

## Brand Commitments

- Name: **Aegis Ascend Financial Advisors** (formerly working name Glass-Box Advisory).
- Tagline: **"Smarter Decisions. Stronger Futures."**
- Logo: gold geometric emblem with a diamond at its peak, on black; wordmark in spaced capitals with gold rules either side of "FINANCIAL ADVISORS".
- Meaning (user's words): Aegis = protection and trusted guidance; Ascend = progress and pursuit of greater potential. Geometric emblem = structure, strategic thinking, upward ambition; diamond = clarity of vision and sound financial judgment; gold = value creation and excellence; black = authority, trust, professionalism.
- Keep the existing site's page structure and features ("same old template"); redesign the look with motion.

## Evidence on Hand

- Logo: `site/assets/emblem.png` (cut from the uploaded logo image).
- Founder portraits: `site/assets/founder-hem.jpg`, `founder-yash.jpg`, `founder-vivan.jpg` (cropped from the uploaded team photo). Titles: "Co-founder" for all three; no bios yet.
- Content: the investor pitch (version 2.0, October 2026).
- No real clients, testimonials, press or performance figures exist. Demo companies, investors and lenders are fictional and must stay labelled.

## Product Principles

1. Numbers from code, words from people: the AI never does the maths.
2. Every figure can explain itself.
3. Ranges, not false precision.
4. Human sign-off before anything is shared.
5. The founder owns the data.
