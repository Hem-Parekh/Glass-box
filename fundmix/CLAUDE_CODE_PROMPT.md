# Prompt for Claude Code: Debt vs Equity Funding Report (localhost web app)

Copy everything below the line into Claude Code, run from an empty folder (or from the `fundmix` starter folder to extend it).

---

## Goal

Build a local web app that runs at **http://localhost:8000**. A user uploads a company's **CMA workbook (.xlsx)**, enters details of the project they want to fund (for example a new manufacturing plant), and downloads a **one-page A4 PDF report** that answers:

1. How much of the project should be funded by **debt** and how much by **equity**, in rupees and percent, with clear reasons.
2. **How much debt the business can bear**, sized from the cash flow it generates (DSCR), not from a rule of thumb.
3. Where the equity comes from: internal accruals first, new shares only for any shortfall.
4. What the funds are used for (uses and sources table).
5. For a capacity project: **net increase in capacity**, **change in cost per unit**, and **increase in yearly cash flow**.
6. Two charts: **project cash flow vs debt service** (with DSCR labelled each year) and **loan repayment** (principal, interest, outstanding balance).
7. A year-by-year table: utilisation, revenue, EBITDA, CFADS, interest, principal, DSCR, outstanding.

Golden rule: **all numbers come from deterministic Python code. No AI or network calls inside the calculation engine.**

## Stack and structure

- Python 3.11+, Flask, openpyxl, matplotlib, reportlab. `requirements.txt` with these.
- Files: `engine.py` (CMA parsing + model), `report.py` (charts + PDF), `app.py` (Flask routes), `templates/index.html`, `templates/result.html`, `sample/sample_cma.xlsx`, `tests/test_engine.py`, `README.md`.
- Routes: `GET /` input form; `POST /analyse` builds the report and shows it embedded with a **Download PDF** button; `GET /reports/<file>` serves the PDF.
- Brand colours: navy `#12263F`, teal `#1AA6A0`, orange `#F2A541`, light row `#F2F6FA`, grey text `#5B6B7C`. Font Arial/Helvetica.
- Money in **Rs crore**; never use floats for display without rounding; keep `Decimal` for any schedule you test to the paisa.

## Step 1: Read the CMA

CMA workbooks follow the Indian bank format (Form II operating statement, Form III balance sheet). Find rows by **label text in column A** (case-insensitive regex), not fixed row numbers. Find the year header row (cells that are 4-digit years) and the status row below it (Actuals / Estimated / Projections). Use the **latest column that has non-zero net sales** as the base year.

Extract: net sales; PBIT; depreciation; interest & finance charges; PBT; current tax; PAT; dividend paid; cost of production; raw materials (imported + indigenous); stock in trade; packing; power & fuel; direct labour; cost of services; other manufacturing expenses; selling, general & admin; net worth; term loans; term-loan instalments due within 1 year; short-term bank borrowings; cash and bank; liquid investments (govt securities, fixed deposits); total current and term liabilities.

Derive: sales growth (CAGR across available years, user can override); tax rate = current tax / PBT (clamp 15 to 35%); EBITDA = PBIT + depreciation; existing debt service = interest + current term-loan instalments; liquid funds = cash + liquid investments.

If a required row is missing, show a clear error naming the row, never silently use zero for net sales or PAT.

## Step 2: Project inputs (form)

Industry (manufacturing / service / trading-other) sets defaults that the user can edit:

| Input | Manufacturing | Service | Trading / other |
|---|---|---|---|
| Minimum own contribution | 25% | 40% | 30% |
| Target DSCR | 1.50 | 1.60 | 1.50 |
| Repayment period | 7 yrs | 5 yrs | 5 yrs |
| Moratorium | 1 yr | 0 | 0 |
| Asset life for depreciation | 15 yrs | 8 yrs | 10 yrs |
| What a "unit" is | tonnes, pieces, litres | billable hours, beds, seats, rooms | units sold, stores, sq ft |
| Variable cost from CMA | raw material + stock in trade + packing + power | cost of services + direct labour | purchases (stock in trade) |

Other inputs: company name; purpose of funds; total project cost and how much of it is working-capital margin; existing capacity and current utilisation; new capacity; utilisation ramp by year (Y1 = construction if moratorium > 0); variable-cost saving per unit in the new facility; new fixed cost per year; share of SG&A that scales with sales; loan rate; cash safety buffer; cost of equity; pre-tax yield on surplus cash.

Basis for defaults (cite in the PDF footer): Indian bank project appraisal commonly requires DSCR of at least 1.25 to 1.50 and promoter contribution of 25 to 33% of project cost; set the loan rate with reference to the current RBI repo rate (5.50% after the 7 October 2026 MPC decision) plus the borrower's spread.

## Step 3: Current unit economics

- Current volume = existing capacity × current utilisation.
- Average realisation per unit = net sales / current volume.
- Current variable cost per unit = variable cost (industry rule above) / current volume.
- Current cost per unit = cost of production / current volume. For service companies with no cost-of-production row, use net sales − PBIT − SG&A.
- New variable cost per unit = current × (1 − saving %).

## Step 4: Project cash flows, year by year

For each year t = 1 … (moratorium + repayment years):

- Units = new capacity × utilisation(t)
- Revenue = units × realisation
- Variable selling cost = revenue × (SG&A / sales) × scaling share
- EBITDA = units × (realisation − new variable cost) − variable selling cost − new fixed cost
- Depreciation = (project cost − WC margin) / asset life
- Interest = loan rate × opening loan balance
- PBT = EBITDA − depreciation − interest; tax = max(PBT, 0) × tax rate; PAT = PBT − tax
- **CFADS = PAT + depreciation + interest**
- Loan: interest only during moratorium, then equal principal instalments (Indian bank practice).
- **DSCR = CFADS / (principal + interest)**, the bank appraisal formula. Ignore moratorium years when taking the minimum.

## Step 5: How much debt the business can bear

1. **Cash-flow limit:** find the largest loan L such that the minimum DSCR over repayment years ≥ target. Use bisection (DSCR falls as L rises). This is "debt the project can bear".
2. **Policy limit:** project cost × (1 − minimum own contribution).
3. **Recommended debt** = the smaller of the two, rounded down to Rs 5 crore. Record which one binds; the report must say so.
4. **Equity** = project cost − debt.
5. **Equity source:** internal accruals = liquid funds − cash safety buffer (floor 0). New share issue = max(equity − internal accruals, 0).
6. **Company-level check:** add the project to the existing business (base CFADS grown at the sales growth rate; existing debt service unchanged) and report minimum company DSCR.
7. **Stress test:** project EBITDA −20% and interest rate +2 points; report minimum DSCR. If it falls below 1.20, cut debt until it passes and say so.

## Step 6: Choosing between debt and equity (rules the reasons text must follow)

- After-tax cost of debt = rate × (1 − tax rate). Compare with cost of new equity (default 12%) and the after-tax yield on surplus cash.
- Prefer debt up to the recommended limit when it is cheaper than new equity, because it is tax-deductible and avoids dilution.
- If internal cash alone could fund the whole project and its after-tax yield is below the after-tax cost of debt, state the alternative (fund from cash) and its annual saving, and explain that the recommended mix preserves liquidity and dividend capacity.
- If cash flow, not policy, limits debt, say the business cannot safely carry more and the gap must be equity.
- Service businesses: stress that limited hard collateral means a higher equity share. Trading businesses: point out that most funding is working capital, sized on drawing power, and only fixed assets should be term-funded.

## Step 7: Headline outputs

- Capacity added: new capacity / existing capacity, and units per year.
- Cost per unit: blended steady-state cost = (current cost of production + new units × new variable cost + new fixed cost + new depreciation) / (current volume + new units); show the change in %.
- Extra cash flow: steady-state project CFADS per year, and as % of the company's projected CFADS.
- Payback = project cost / average project CFADS.

## Step 8: The one-page PDF (A4 portrait, reportlab)

Top to bottom:

1. Navy header band: title "Funding Recommendation: Debt vs Equity", company, purpose, industry, project cost, base year and status, date.
2. Recommendation strip: a horizontal bar split navy (debt %) / orange (equity %), amounts underneath, loan terms and equity source on the left.
3. Four KPI boxes: capacity added; cost per unit change; extra cash flow a year; debt the business can bear (with min DSCR and stress DSCR).
4. Two charts side by side: (a) bars of project CFADS per year with debt service as an orange line and DSCR labels; (b) stacked principal + interest bars with outstanding balance as a teal line on a second axis.
5. "Why this mix": 4 to 5 bullet reasons generated from the rules in Step 6, using the actual numbers.
6. Uses and sources table.
7. Year-by-year table.
8. Footer: method, formulas, norms used with sources, which inputs are user-supplied, "Estimates, not guarantees; subject to lender appraisal and advisor review."

Everything must fit on one page. Render the PDF to PNG and look at it before finishing; fix any overlapping text.

## Step 9: Tests (must pass before you say you are done)

- Loan schedule repays to exactly zero; total principal equals loan.
- DSCR at the solved loan is ≥ target and within 0.01 of it when cash flow binds.
- Debt + equity = project cost; debt% + equity% = 100%.
- Parsing the sample CMA returns net sales 65,075 and PAT ≈ 10,982 for FY2027 (Estimated).
- A service-industry run and a trading run both produce a PDF without errors.
- A CMA with a missing net-sales row returns a readable error.

## Step 10: Run it

- `pip install -r requirements.txt`, then `python app.py`, then print: `Open http://localhost:8000`.
- Bind to 127.0.0.1 only. Never send CMA data to any external service.
- README: how to run, what each input means, and the method summary above.
