"""Builds the demo website (one self-contained page) into site/dist/.
   python site/build.py   ->  site/dist/index.html (demo store) + site/dist/fundmix.html (CMA tool)"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(HERE, p), encoding="utf-8").read()

def scripts_inline():
    parts = [read("calc.js"), read("ui.js"), read("store.js"),
             'window.GB_API = window.GBStore; window.GB_CMA_URL = "fundmix.html";',
             read("public.js"), read("portal.js")]
    return "\n".join("<script>\n" + p.replace("</script", "<\\/script") + "\n</script>" for p in parts)

def main():
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    html = read("shell.html").replace("<!--SCRIPTS-->", scripts_inline())
    open(os.path.join(HERE, "dist", "index.html"), "w", encoding="utf-8").write(html)
    # the CMA tool is a second page, so it needs its own document skeleton
    cma = open(os.path.join(HERE, "..", "fundmix", "web", "index.html"), encoding="utf-8").read()
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            "<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>" + cma + "</body></html>")
    open(os.path.join(HERE, "dist", "fundmix.html"), "w", encoding="utf-8").write(page)
    print("wrote site/dist/index.html", len(html) // 1024, "KB and site/dist/fundmix.html")

if __name__ == "__main__":
    main()
