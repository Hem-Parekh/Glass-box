"""Local web app: upload a CMA + project inputs -> one-page debt vs equity PDF report.
Run:  pip install flask openpyxl matplotlib reportlab   then   python app.py   then open http://localhost:8000"""
import os, uuid
from flask import Flask, render_template, request, send_from_directory, redirect, url_for
from engine import parse_cma, run, PRESETS
from report import build_pdf

BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)
os.makedirs(os.path.join(BASE, "reports"), exist_ok=True)

FIELDS = [  # name, label, default, kind
    ("company", "Company name", "Sample FMCG Co.", "text"),
    ("purpose", "Purpose of funds", "New manufacturing plant for the base product", "text"),
    ("unit_name", "Unit of capacity (plural)", "tonnes", "text"),
    ("project_cost", "Total project cost (Rs crore)", 1200, "num"),
    ("wc_margin", "of which working-capital margin (Rs crore)", 150, "num"),
    ("existing_capacity", "Existing installed capacity (units / year)", 1000000, "num"),
    ("current_util", "Current capacity utilisation (%)", 85, "pct"),
    ("new_capacity", "New plant capacity (units / year)", 60000, "num"),
    ("ramp", "Utilisation by year, % (Y1 = construction)", "0,50,70,85", "list"),
    ("efficiency_gain", "Variable cost saving per unit in new plant (%)", 6, "pct"),
    ("plant_fixed_cost", "New plant fixed cost excl. depreciation (Rs crore / yr)", 60, "num"),
    ("sga_variable_share", "Share of selling & admin cost that scales with sales (%)", 70, "pct"),
    ("rate", "Term loan interest rate (%)", 8.5, "pct"),
    ("tenor", "Repayment period (years, after moratorium)", None, "int"),
    ("moratorium", "Moratorium (years)", None, "int"),
    ("dscr_target", "Minimum DSCR required", None, "num"),
    ("min_equity", "Minimum own contribution (% of project cost)", None, "pct"),
    ("asset_life", "Asset life for depreciation (years)", None, "int"),
    ("cash_buffer", "Cash to keep aside as safety buffer (Rs crore)", 2000, "num"),
    ("cost_of_equity", "Return expected by new equity investors (%)", 12, "pct"),
    ("treasury_yield", "Pre-tax yield earned on surplus cash (%)", 7, "pct"),
]

def _read(form):
    p = {"industry": form.get("industry", "manufacturing")}
    for name, _, default, kind in FIELDS:
        v = (form.get(name) or "").strip()
        if v == "":
            if default is None: p[name] = None; continue     # use the industry preset
            v = str(default)
        if kind == "text": p[name] = v
        elif kind == "num": p[name] = float(v)
        elif kind == "int": p[name] = int(float(v))
        elif kind == "pct": p[name] = float(v) / 100
        elif kind == "list": p[name] = [float(x) / 100 for x in v.split(",") if x.strip()]
    return {k: v for k, v in p.items() if v is not None}

@app.route("/")
def index():
    return render_template("index.html", fields=FIELDS, presets=PRESETS)

@app.route("/analyse", methods=["POST"])
def analyse():
    try:
        f = request.files.get("cma")
        rid = uuid.uuid4().hex[:10]
        path = os.path.join(BASE, "reports", rid + ".xlsx")
        if f and f.filename:
            f.save(path)
        else:
            path = os.path.join(BASE, "sample", "sample_cma.xlsx")
        cma = parse_cma(path)
        p = _read(request.form)
        r = run(cma, p)
        meta = dict(company=p["company"], purpose=p["purpose"], base_year=cma["years"][-1], base_status=cma["status"][-1],
                    assumption_note="Project inputs entered by the user.")
        build_pdf(r, meta, os.path.join(BASE, "reports", rid + ".pdf"))
        return render_template("result.html", rid=rid, r=r, p=p, meta=meta)
    except Exception as e:
        return render_template("index.html", fields=FIELDS, presets=PRESETS, error=str(e)), 400

@app.route("/reports/<path:name>")
def report_file(name):
    return send_from_directory(os.path.join(BASE, "reports"), name)

if __name__ == "__main__":
    print("\n  Open http://localhost:8000 in your browser\n")
    app.run(host="127.0.0.1", port=8000, debug=False)
