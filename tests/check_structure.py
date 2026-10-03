#!/usr/bin/env python3
"""Check that main.js and index.html agree.

    python3 tests/check_structure.py     # from anywhere

Errors (exit 1):
  - an ID passed to document.getElementById in main.js that index.html does not define
  - an ID defined twice in index.html
  - a local script or stylesheet in index.html that does not exist
  - an innerHTML assignment in main.js that is neither a string literal nor convertMarkdownToHtml(...) (D-006)
  - a CDN script in index.html without an exact version and an integrity hash (P1-04)

Proves the page's wiring is intact. Does not prove anything runs: see docs/TESTING.md.
Standard library only.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    js = (ROOT / "main.js").read_text(encoding="utf-8")
    errors = []

    defined = re.findall(r'\bid="([^"]+)"', html)
    for dup in sorted({i for i in defined if defined.count(i) > 1}):
        errors.append(f"index.html: id {dup!r} is defined more than once")

    for used in sorted(set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js))):
        if used not in defined:
            errors.append(f"main.js: getElementById({used!r}) but index.html has no such id")

    for ref in re.findall(r'(?:src|href)="(\./[^"]+)"', html):
        if not (ROOT / ref).exists():
            errors.append(f"index.html: {ref} does not exist")

    for m in re.finditer(r"\.innerHTML\s*=\s*([^;]+);", js):
        value = m.group(1).strip()
        if not (re.fullmatch(r"'[^']*'|\"[^\"]*\"", value) or value.startswith("convertMarkdownToHtml(")):
            line = js.count("\n", 0, m.start()) + 1
            errors.append(f"main.js:{line}: innerHTML set from {value[:50]!r}; sanitise via convertMarkdownToHtml")

    for tag in re.findall(r"<script\b[^>]*\bsrc=\"https?://[^>]*>", html):
        if not re.search(r"@\d+\.\d+\.\d+/", tag) or "integrity=\"sha" not in tag:
            errors.append(f"index.html: CDN script not pinned with integrity: {tag[:80]}")

    for line in errors:
        print(f"ERROR {line}")
    print(f"{len(errors)} error(s); {len(set(defined))} ids in index.html")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
