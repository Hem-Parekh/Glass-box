"""Builds the Aegis Ascend demo website (one self-contained page) into site/dist/.
   python site/build.py   ->  site/dist/index.html (demo store) + site/dist/fundmix.html (CMA tool)"""
import json
import os
import shutil
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(HERE, p), encoding="utf-8").read()

def seed_markers():
    """The demo starts from the same seed as the server (server/seed.py), with dates relative to the visitor's today."""
    sys.path.insert(0, os.path.dirname(HERE))
    from server.seed import markers
    return json.dumps(markers(), separators=(",", ":"))


def scripts_inline():
    parts = [read("calc.js"), read("optimizer.js"), read("ui.js"), read("domain.js"), read("kit.js"),
             "window.GB_SEED = " + seed_markers() + ";", read("store.js"),
             'window.GB_API = window.GBStore; window.GB_CMA_URL = "fundmix.html"; window.GB_ASSETS = "assets/";',
             read("public.js"), read("portal.js"), read("ws-investor.js"), read("ws-lender.js"), read("ws-advisor.js"), read("ws-founder.js")]
    return "\n".join("<script>\n" + p.replace("</script", "<\\/script") + "\n</script>" for p in parts)

def main():
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    html = read("shell.html").replace("<!--SCRIPTS-->", scripts_inline())
    open(os.path.join(HERE, "dist", "index.html"), "w", encoding="utf-8").write(html)
    # founder portraits travel beside the page
    os.makedirs(os.path.join(HERE, "dist", "assets"), exist_ok=True)
    for f in os.listdir(os.path.join(HERE, "assets")):
        shutil.copy(os.path.join(HERE, "assets", f), os.path.join(HERE, "dist", "assets", f))
    # the CMA tool is advisors-only: fundmix.html shows the advisors-only page unless the demo session is an advisor's,
    # and the tool itself (cma-tool.html) sends anyone else back. The demo protects nothing; the server enforces this for real.
    guard = ('<script>(function(){var ok=false;try{var id=localStorage.getItem("gb_demo_session_v2"),db=JSON.parse(localStorage.getItem("gb_demo_db_v2")||"null");'
             'var u=db&&id&&db.users.filter(function(x){return x.id===id})[0];ok=!!(u&&u.role==="advisor");}catch(e){}%s})();</script>')
    lock = read("cma-lock.html").replace("</head>", guard % 'if(ok)location.replace("cma-tool.html")' + "</head>")
    open(os.path.join(HERE, "dist", "fundmix.html"), "w", encoding="utf-8").write(lock)
    cma = open(os.path.join(HERE, "..", "fundmix", "web", "index.html"), encoding="utf-8").read()
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="robots" content="noindex">' + guard % 'if(!ok)location.replace("fundmix.html")' +
            "<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>" + cma + "</body></html>")
    open(os.path.join(HERE, "dist", "cma-tool.html"), "w", encoding="utf-8").write(page)
    print("wrote site/dist/index.html", len(html) // 1024, "KB, fundmix.html (advisors-only gate) and cma-tool.html")

if __name__ == "__main__":
    main()
