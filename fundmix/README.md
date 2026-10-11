# Debt vs Equity Funding Report (local web app)

Upload a CMA workbook, enter project details, and download a one-page debt vs equity recommendation.

## Run it

```
pip install -r requirements.txt
python app.py
```

Then open **http://localhost:8000** in your browser. Leave the file field empty to try the sample CMA.

## Browser version (no install)

`web/index.html` is the same tool running entirely in the browser: the engine is ported to `web/engine.js`
(it gives the same numbers as `engine.py`), the sample CMA is built in, and the PDF is made on the page.
The CMA is read on the page and never uploaded anywhere.

- Hosted link: https://claude.ai/artifact/U4eD5SHFMPxjnvnhABUmkk (private until shared from its Share menu)
- After editing `web/src.html` or `web/engine.js`, rebuild with `python web/build.py`.

## What the tool needs

- **CMA workbook (.xlsx)** in the Indian bank format. The first sheet is read. Years (4-digit) go in columns B to E
  of a header row within the first 11 rows, with the status (Actuals / Estimated / Projections) in the row below.
  Rows are found by the label text in column A. NET SALES, PBIT, PROFIT BEFORE TAX and NET PROFIT (PAT) are required;
  other rows count as zero when missing. Figures in Rs crore.
- **Project inputs** from the DPR: project cost and working-capital margin, existing capacity and utilisation, new capacity,
  utilisation ramp, variable cost saving, new fixed cost, loan rate and terms. Industry presets fill the lender norms.

## Files

- `engine.py`: reads the CMA and sizes debt from cash flow (DSCR); no AI or network calls.
- `report.py`: charts and the one-page PDF.
- `app.py` + `templates/`: the local website.
- `sample/sample_cma.xlsx`: the CMA used for the sample report.
- `sample_report.pdf`: example output (plant inputs are illustrative).
- `CLAUDE_CODE_PROMPT.md`: full specification to rebuild or extend this with Claude Code.
