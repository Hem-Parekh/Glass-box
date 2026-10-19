"""The browser-only demo (site/store.js) must follow the same rules as the server: runs site/tests/store.test.js."""
import os, shutil, subprocess, sys
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pytestmark = pytest.mark.skipif(not shutil.which("node"), reason="node is not installed")


def test_demo_store_mirrors_the_server():
    r = subprocess.run(["node", os.path.join(ROOT, "site", "tests", "store.test.js")], cwd=ROOT, capture_output=True, text=True,
                       env=dict(os.environ, PYTHON=sys.executable), timeout=300)
    assert r.returncode == 0, r.stdout + r.stderr
