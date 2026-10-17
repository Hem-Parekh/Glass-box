"""Build a one-file desktop app with PyInstaller for the OS you run it on.

    pip install -r requirements-dev.txt
    python build.py

Output: dist/EquityDebtOptimizer.exe on Windows, dist/EquityDebtOptimizer on macOS and Linux.
PyInstaller cannot cross-compile: build on each OS (the GitHub workflow does all three).
"""
import os

import PyInstaller.__main__

HERE = os.path.dirname(os.path.abspath(__file__))
SEP = os.pathsep  # ';' on Windows, ':' elsewhere


def main():
    args = [
        os.path.join(HERE, "launcher.py"),
        "--name=EquityDebtOptimizer",
        "--noconfirm", "--clean",
        f"--distpath={os.path.join(HERE, 'dist')}", f"--workpath={os.path.join(HERE, 'build')}", f"--specpath={os.path.join(HERE, 'build')}",
        # the app's own code and config travel as data; Streamlit runs ui.py from disk
        f"--add-data={os.path.join(HERE, 'app')}{SEP}app",
        f"--add-data={os.path.join(HERE, 'equity_debt')}{SEP}equity_debt",
        f"--add-data={os.path.join(HERE, '.streamlit')}{SEP}.streamlit",
        # Streamlit ships its web front end as package data and reads its own version at runtime
        "--collect-all=streamlit", "--copy-metadata=streamlit",
        "--collect-data=plotly", "--collect-submodules=plotly",
        # imported by ui.py at runtime, so PyInstaller cannot see them from launcher.py
        "--hidden-import=equity_debt", "--hidden-import=openpyxl", "--hidden-import=reportlab", "--collect-submodules=reportlab.graphics",
        "--exclude-module=tkinter", "--exclude-module=matplotlib", "--exclude-module=IPython", "--exclude-module=pytest",
    ]
    # One file on every OS. It runs with a small console window that shows the address
    # and quits the app when closed (on macOS, double-clicking opens it in Terminal).
    args += ["--onefile", "--console"]
    PyInstaller.__main__.run(args)


if __name__ == "__main__":
    main()
