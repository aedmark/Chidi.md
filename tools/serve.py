#!/usr/bin/env python3
"""Serve Chidi.md on localhost and open it in Chrome.

    python3 tools/serve.py              # port 8000, or the next free one
    python3 tools/serve.py --port 9000
    python3 tools/serve.py --no-browser

Serves the repository root on 127.0.0.1 only. Scan Folder needs an http://localhost page in Chrome or Edge,
which is why this exists. Saved sessions belong to the origin, so keep to one port to keep your session.
Falls back to the default browser if Chrome is not found. Ctrl+C stops the server. Standard library only.
"""
import argparse
import functools
import http.server
import shutil
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CHROME_NAMES = ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "chrome"]
CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def find_chrome():
    for name in CHROME_NAMES:
        if path := shutil.which(name):
            return path
    return next((p for p in CHROME_PATHS if Path(p).is_file()), None)


def open_browser(url):
    chrome = find_chrome()
    if chrome:
        subprocess.Popen([chrome, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return "Chrome"
    webbrowser.open(url)
    return "the default browser (Chrome not found; Scan Folder needs Chrome or Edge)"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Revalidate every file, so an edited main.js or style.css shows up on a normal reload.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        pass  # Request logs drown out the URL; errors still show in the browser console.


def make_server(port, tries=20):
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    for candidate in range(port, port + tries):
        try:
            return http.server.ThreadingHTTPServer(("127.0.0.1", candidate), handler)
        except OSError:
            continue
    sys.exit(f"No free port between {port} and {port + tries - 1}.")


def main():
    parser = argparse.ArgumentParser(description="Serve Chidi.md and open it in Chrome.")
    parser.add_argument("--port", type=int, default=8000, help="first port to try (default 8000)")
    parser.add_argument("--no-browser", action="store_true", help="serve only")
    args = parser.parse_args()

    server = make_server(args.port)
    url = f"http://localhost:{server.server_address[1]}/"
    if server.server_address[1] != args.port:
        print(f"Port {args.port} is busy; saved sessions from that port will not appear here.")
    print(f"Serving Chidi.md at {url}  (Ctrl+C to stop)")
    if not args.no_browser:
        threading.Timer(0.3, lambda: print(f"Opened in {open_browser(url)}.")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
