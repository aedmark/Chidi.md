# Testing

How to run every check, what each one proves, and what it cannot. Read this before claiming anything works.
Results live in HANDOFF's "Verified" table; this file is how to get them.

## The suites

| Suite | File | Proves | Does not prove | Time, needs |
| --- | --- | --- | --- | --- |
| Structure | `tests/check_structure.py` | Every ID `main.js` looks up exists once in `index.html`; local assets exist; `innerHTML` only from sanitised renders; CDN scripts pinned with SRI | That anything runs | under a second, Python 3 |
| Docs | `tools/check_docs.py` | Doc links, roadmap IDs, decisions and questions are consistent | That the docs are true | under a second, Python 3 |
| Browser smoke | `tests/e2e/smoke.spec.js` | Load, navigate, sessions, sanitising, local-URL rule, both model APIs, old-key cleanup, in Chromium and Firefox; no request leaves the allowed hosts | Scan Folder; Safari; real model output; real CDN availability | ~5 s, Node 22, Playwright browsers |
| Manual smoke | below | A person's path through the app works in one browser | Other browsers; AI answer quality | 5 minutes, Chromium, optional local model (Ollama) |

**The fast set** (before every commit): `python3 tests/check_structure.py && python3 tools/check_docs.py`.
**Before merging code to `main`:** fast set plus the browser smoke, locally and in CI on the pushed branch.
**The full set** (after deleting or moving code, and before a release): both, plus the manual smoke.

## Before any run

- **Clean state:** use a fresh browser profile or click Restart. A saved session restores files, history and model, so
  a leftover session can make a broken load path look fine.
- **Serve over HTTP:** `python3 tools/serve.py` (or `python3 -m http.server 8000` from the repo root). `file://` disables Scan Folder.
- **Model:** run Ollama (`ollama serve`; it allows `http://localhost:*` origins by default) with a small chat model
  such as `llama3.1:8b`. Ollama's `/v1` stands in for an OpenAI-compatible server. Without a model, test only the
  non-AI steps and say so.

## Running each suite

### Structure and docs

```bash
python3 tests/check_structure.py && python3 tools/check_docs.py
```

- A pass ends with `0 error(s)` from each and exit code 0. `check_docs` warnings do not fail the run.

### Browser smoke

```bash
cd tests/e2e && npm ci && npm test
```

- Starts its own server on port 8123 (`playwright.config.js`), so it does not clash with a dev server on 8000.
- Serves `marked` and DOMPurify from `tests/e2e/node_modules`. Their bytes match the SRI hashes in `index.html`, so
  a version bump in `index.html` must be matched in `tests/e2e/package.json` or the scripts fail to load.
- Stubs the model server at `http://localhost:11434` (both APIs; models `stub-chat`, `other-chat`, and `stub-embed`,
  which cannot chat); set `net.modelReply` in a test to change the reply. Other localhost ports refuse connections.
- Any request to another host fails the test (the `net` fixture). Google Fonts are aborted silently.
- A pass ends with `20 passed`. Options: `npx playwright test --project=chromium`, `-g "<test name>"`.
- Writes `test-results/` on failure (gitignored).

### CI

`.github/workflows/checks.yml` runs two jobs on every push and pull request: "Structure and docs" and "Browser
smoke (Chromium, Firefox)". Follow a run with `gh run list --limit 3` and `gh run watch <id> --exit-status`. On
failure, the `playwright-results` artifact holds traces and screenshots for 7 days. A failing browser run takes
about 3 minutes longer than a passing one, because each failed assertion waits out its timeout.

### Manual smoke

1. Load two or more `.md` files with ADD FILES; the first renders, FILES count updates.
2. Load one of them again: status says it was skipped as a duplicate.
3. NEXT shows a different file; PREV returns to the previous one.
4. Scan Folder on a folder with nested `.md` files (Chrome/Edge only).
5. Save, reload the page, choose Restore: same files and current file.
6. Model: the dialog lists models on open; embedding models show "(cannot chat)" and are disabled. Try
   `https://example.com` (refused), then `http://localhost:11434`, open the Model dropdown, pick a non-first model, Save.
   Summarize, Suggest, click a suggested question, Ask All: each appends a section below the file. Repeat Suggest
   with OpenAI-compatible and `http://localhost:11434/v1`.
7. Restart: everything clears, reload shows no restore prompt.

### Hostile Markdown (after touching rendering)

1. Serve the app and open `http://localhost:8000` in Chrome, then open devtools (F12) > Console.
2. Paste this, press Enter, and the page reloads with one hostile file:

   ```js
   localStorage.setItem('chidiMdSession', JSON.stringify({loadedFiles: [{name: 'evil.md', content:
     '# Evil\n\n<img src=x onerror="alert(\'img\')"> <script>alert(\'script\')</script> [click](javascript:alert(\'link\'))'}],
     history: [0], historyIndex: 0})); location.reload();
   ```

3. Pass: no alert appears, and clicking "click" does nothing. In Elements, `#markdownDisplay` shows the `<img>`
   with no `onerror`, no `<script>`, and an `<a>` with no `href`.
4. To prove the test can fail: in `main.js`, change `DOMPurify.sanitize(marked.parse(markdownText))` to
   `marked.parse(markdownText)`, reload with step 2: an "img" alert appears. Undo the change (`git checkout main.js`)
   and reload: no alert.
5. Clean up: `localStorage.removeItem('chidiMdSession')` in the console, or click Restart.

### Adding a check

- Structural checks go in `tests/` as standard-library Python scripts that exit non-zero on failure.
- Assert on what happened, not on words in a message.
- Before trusting a new check, make it fail: undo the fix (only the fix) and run it.

## Runs that vary

AI output comes from a local model and varies run to run. Judge AI features on whether a reply arrives and is displayed,
not on its wording. To test error handling, inject the failure (a wrong key, offline mode in devtools) rather than
waiting for one.

## Change-to-check matrix

| Changed area | Minimum checks | Additional evidence |
| --- | --- | --- |
| Documentation only | `python3 tools/check_docs.py` | |
| `index.html` IDs or `elements` | structure check, browser smoke | manual smoke steps touching that element |
| File loading, history, sessions | fast set, browser smoke | manual smoke 4 (Scan Folder) |
| AI calls or rendering | fast set, browser smoke | manual smoke 6 against a real model |
| Security boundary (P1) | fast set | the item's own "done when" test, run before and after the fix |

## Manual checks (before merging to `main`)

- The full manual smoke in current Chrome or Edge.
- Firefox: steps 1 to 3 and 5 (Scan Folder is expected to show its warning).

## Environment recipes

The app needs only Python 3 and a browser. The browser smoke needs Node 22 and Playwright's browsers
(`npx playwright install chromium firefox`; cached under `~/.cache/ms-playwright`). In a sandbox without them, run
the fast set and report the browser and manual smoke as not run.

## Known pitfalls

- **A saved session hides load bugs.** Restore brings files back without the load path running. Restart first.
- **Different port, different storage.** Sessions are per origin; `:8000` and `:8080` do not share one.
- **A mutation check must break the fix, not the test.** Remove just the fix.
