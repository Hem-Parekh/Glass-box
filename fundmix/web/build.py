"""Builds web/index.html: inlines engine.js and the sample CMA into src.html.
Run from anywhere:  python web/build.py"""
import base64, os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "src.html"), encoding="utf-8").read()
engine = open(os.path.join(HERE, "engine.js"), encoding="utf-8").read()
sample = base64.b64encode(open(os.path.join(HERE, "..", "sample", "sample_cma.xlsx"), "rb").read()).decode()
out = src.replace("/*ENGINE*/", engine).replace("__SAMPLE_B64__", sample)
open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(out)
print("wrote web/index.html", len(out) // 1024, "KB")
