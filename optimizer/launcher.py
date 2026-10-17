"""Entry point for the packaged desktop app.

Starts the Streamlit app on a free local port (127.0.0.1 only, nothing leaves this
computer), opens it in the default browser, and keeps running until the window
(console) is closed. Also works unpackaged:  python launcher.py
"""
import os
import socket
import sys
import threading
import webbrowser


def base_dir() -> str:
    # PyInstaller unpacks bundled files to sys._MEIPASS; otherwise use this file's folder.
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def free_port(preferred: int = 8501) -> int:
    for port in [preferred] + list(range(8502, 8600)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> None:
    root = base_dir()
    sys.path.insert(0, root)
    os.chdir(root)  # so Streamlit finds .streamlit/config.toml
    port = free_port()
    url = f"http://127.0.0.1:{port}"
    if os.environ.get("EDO_NO_BROWSER") != "1":
        threading.Timer(2.0, lambda: webbrowser.open(url)).start()
    print(f"\n  Equity vs Debt Optimizer is running at {url}\n  Close this window to quit.\n", flush=True)
    from streamlit.web import cli as stcli
    sys.argv = ["streamlit", "run", os.path.join(root, "app", "ui.py"),
                "--global.developmentMode=false", "--server.headless=true", "--server.address=127.0.0.1",
                f"--server.port={port}", "--browser.gatherUsageStats=false", "--server.fileWatcherType=none",
                "--client.toolbarMode=minimal"]
    sys.exit(stcli.main())


if __name__ == "__main__":
    main()
