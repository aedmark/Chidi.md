# Testing

How to run every check, what each one proves, and what it cannot. Read this before claiming anything works.
Results live in HANDOFF's "Verified" table; this file is how to get them.

## The suites

| Suite | File | Proves | Does not prove | Time, needs |
| --- | --- | --- | --- | --- |
| Structure | `tests/check_structure.py` | Every ID `main.js` looks up exists once in `index.html`; local assets exist; `innerHTML` only from sanitised renders; CDN scripts pinned with SRI | That anything runs | under a second, Python 3 |
| Docs | `tools/check_docs.py` | Doc links, roadmap IDs, decisions and questions are consistent | That the docs are true | under a second, Python 3 |
| Manual smoke | below | A person's path through the app works in one browser | Other browsers; AI answer quality | 5 minutes, Chromium, optional local model |

No automated browser test exists yet; P4-01 adds a Playwright suite (D-008).

**The fast set** (before every commit): `python3 tests/check_structure.py && python3 tools/check_docs.py`.
**The full set** (after deleting or moving code, and before merging to `main`): fast set plus the manual smoke.

## Before any run

- **Clean state:** use a fresh browser profile or click Restart. A saved session restores files, history and key, so
  a leftover session can make a broken load path look fine.
- **Serve over HTTP:** `python3 -m http.server 8000` from the repo root. `file://` disables Scan Folder.
- **Model:** until P1-06, AI steps need a throwaway Gemini key. After it, run Ollama locally (`OLLAMA_ORIGINS`
  set to the page's origin). Without a model, test only the non-AI steps and say so.

## Running each suite

### Structure and docs

```bash
python3 tests/check_structure.py && python3 tools/check_docs.py
```

- A pass ends with `0 error(s)` from each and exit code 0. `check_docs` warnings do not fail the run.

### Manual smoke

1. Load two or more `.md` files with ADD FILES; the first renders, FILES count updates.
2. Load one of them again: status says it was skipped as a duplicate.
3. NEXT shows a different file; PREV returns to the previous one.
4. Scan Folder on a folder with nested `.md` files (Chrome/Edge only).
5. Save, reload the page, choose Restore: same files and current file.
6. With a key: Summarize, Suggest, click a suggested question, Ask All. Each appends a section below the file.
7. Restart: everything clears, reload shows no restore prompt.

### Hostile Markdown (after touching rendering)

In the browser console, save a session whose one file contains `<img src=x onerror=alert(1)>`, a `<script>` and
a `[x](javascript:alert(1))` link under the `chidiMdSession` key, reload, restore, and inspect `#markdownDisplay`:
none of the three may survive. Restart afterwards.

### Adding a check

- Structural checks go in `tests/` as standard-library Python scripts that exit non-zero on failure.
- Assert on what happened, not on words in a message.
- Before trusting a new check, make it fail: undo the fix (only the fix) and run it.

## Runs that vary

AI output comes from Gemini and varies run to run. Judge AI features on whether a reply arrives and is displayed,
not on its wording. To test error handling, inject the failure (a wrong key, offline mode in devtools) rather than
waiting for one.

## Change-to-check matrix

| Changed area | Minimum checks | Additional evidence |
| --- | --- | --- |
| Documentation only | `python3 tools/check_docs.py` | |
| `index.html` IDs or `elements` | structure check | manual smoke steps touching that element |
| File loading, history, sessions | fast set | manual smoke 1 to 5, 7 |
| AI calls or rendering | fast set | manual smoke 6; a hostile `.md` file once P1-01 lands |
| Security boundary (P1) | fast set | the item's own "done when" test, run before and after the fix |

## Manual checks (before merging to `main`)

- The full manual smoke in current Chrome or Edge.
- Firefox: steps 1 to 3 and 5 (Scan Folder is expected to show its warning).

## Environment recipes

Only Python 3 and a browser are needed. In a sandbox without a browser, run the fast set and report the manual
smoke as not run.

## Known pitfalls

- **A saved session hides load bugs.** Restore brings files back without the load path running. Restart first.
- **Different port, different storage.** Sessions are per origin; `:8000` and `:8080` do not share one.
- **A mutation check must break the fix, not the test.** Remove just the fix.
