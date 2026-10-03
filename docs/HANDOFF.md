# Session Handoff

Read this first when resuming work. Rewrite the top half whenever current state changes materially or work pauses.
The session log below is append-only history. "Current state" fits in about 80 lines.

Protocol: see [AGENTS.md](../AGENTS.md) (`CLAUDE.md` imports it). Plan: [ROADMAP.md](../ROADMAP.md).
Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Decisions: [DECISIONS.md](DECISIONS.md).
Tests: [TESTING.md](TESTING.md). Security: [SECURITY.md](SECURITY.md).
Changes: [CHANGELOG.md](CHANGELOG.md). Older sessions: [archive/](archive/README.md).

---

## Current state

_Last updated: 2026-10-03, session 8, on `main`: P2-01 free-text questions merged._

**Where things stand, in one paragraph:** Phase 0 and Phase 1 are done: rendering is sanitised, CDN scripts are
pinned, and AI runs only on a local Ollama or OpenAI-compatible server with no API keys. P4-01 adds an offline
Playwright suite in Chromium and Firefox. CI runs both on every push
(P4-02). The biggest gap: Scan Folder is only manually tested.

**Verified** (2026-10-03, on `main` after the P1-06 merge, Linux, Python 3, Chromium in the Claude desktop app,
Ollama on port 11434 with `llama3.1:8b`)

| Suite | Result |
| --- | --- |
| `python3 tests/check_structure.py` | **0 errors** |
| `python3 tools/check_docs.py` | **0 errors** |
| `cd tests/e2e && npm test` (Playwright 1.63.0, Chromium + Firefox) | **24/24**; each of 4 fixes removed fails its test; P2-04 test fails on the old picker |
| GitHub Actions `checks` | green on the P4-02 branch; a broken element ID failed both jobs |
| Hostile Markdown (TESTING.md), session 4 | with fix: payload stripped, nothing ran; fix removed: `onerror` ran (test can fail) |
| Manual smoke step 6, Ollama and OpenAI-compatible (`/v1`) | Summarize, Suggest, follow-up all answered; remote URL refused |
| Old session with `apiKey` | restored; key and Gemini chat removed from storage |

**What works**
- **Reading** (`main.js` file loading and display). Add files or scan a folder; PREV/NEXT; duplicates skipped.
- **Safe rendering** (D-006). Raw HTML in files and replies is sanitised.
- **Local AI** (D-007, P1-06, P2-04). Model dialog with a model list from the server, Summarize, Suggest, typed and suggested follow-ups, Ask All.
- **Sessions** (D-003). Save, restore on load, restart; model settings included.

**Not verified**
- Ask All against a live model; a real llama.cpp or LM Studio server; Scan Folder; Safari.

**Gotchas for the next session**
- Agents merge and push their own branches after branch CI is green (D-009).
- Large local models can take a minute per reply; wait for the loader rather than retrying.
- `python3 -m http.server` responses get cached; hard-refresh after changing CSS or JS.

## Next steps (in order)

1. P2-05 (answers landing under the wrong file), then P2-02 (storage full).
2. P4-03: keyboard and focus handling.
3. P6-02: tag `v0.2.0` now that Phase 1 is done (D-005).

## Open questions for maintainers

None open.

## Session log

Newest first. Past 10 entries, move the oldest to `docs/archive/`.

### Session 8: 2026-10-03: free-text questions

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P2-01.
**Done:** P2-01; filed P2-05.
**Changed:** `index.html` adds the ask form; `style.css` styles it; `main.js` adds `askAboutCurrentFile()` shared with
suggested questions and a `state.isAsking` guard (not saved); two browser tests.
**Decisions:** none.
**Verified:** 24/24 browser smoke and branch CI; new tests fail on the old code, and the blocking test fails without
the guard; real Ollama answered a typed question, box disabled while waiting.
**Not verified:** Firefox by hand (covered by the suite only).
**Problems / surprises:** the in-app browser kept an old `style.css` until reloaded (pitfall added to TESTING). A doc
script failed mid-chain and the code merged before its docs; docs followed in a docs-only commit.
**Corrections:** none.
**Left undone:** none.
**Next session should start with:** P2-05.

### Session 7: 2026-10-03: model picker

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P2-04, plus the maintainer's report that the Model list never let them pick another model.
**Done:** P2-04.
**Changed:** `index.html` Model field is a `<select>`, button renamed Refresh List; `main.js` adds `ollamaCanChat()`,
`fillModelSelect()`, auto-listing on open/type/URL change with a guard against stale responses; e2e stub lists three
models and answers `/api/show`; new P2-04 test for both APIs; other localhost ports refuse in tests.
**Decisions:** none.
**Verified:** 20/20 browser smoke (Chromium, Firefox); the P2-04 test fails on the old `main.js` and `index.html`;
real Ollama: 8 chat models, embedder disabled, keyboard selection of `llama3.1:8b`.
**Not verified:** the native dropdown popup by eye (screenshots do not show it); maintainer to confirm in Chrome.
**Problems / surprises:** root cause was the `<datalist>`, which filters suggestions by the field's current text.
**Corrections:** none.
**Left undone:** none.
**Next session should start with:** P2-01.

### Session 6: 2026-10-03: CI

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P4-02.
**Done:** P4-02.
**Changed:** added `.github/workflows/checks.yml`; AGENTS (CI row, merge waits for green CI), TESTING, D-009 note.
**Decisions:** D-009 update: merges wait for branch CI.
**Verified:** run 37134115368 green (fast 4 s, browser 57 s, 16 passed). A pushed commit renaming `fileCountDisplay`
failed both jobs (structure check error; 12 of 16 browser tests), and the artifact uploaded; reverted with a new commit.
**Not verified:** pull-request trigger (no PR opened).
**Problems / surprises:** GitHub warns `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19.
**Corrections:** none.
**Left undone:** none.
**Next session should start with:** P2-04.

### Session 5: 2026-10-03: Playwright browser smoke

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P4-01.
**Done:** P4-01; D-009 note that docs-only changes may go to `main`.
**Changed:** added `tests/e2e/` (`package.json`, lockfile, `playwright.config.js`, `smoke.spec.js`, `.gitignore`);
AGENTS, TESTING, ARCHITECTURE, CONTRIBUTING updated.
**Decisions:** none new (D-008).
**Verified:** 16/16 in Chromium and Firefox. Mutations, one at a time, each failing its intended test: no DOMPurify;
heading via `innerHTML`; local-URL check always true; `apiKey` not deleted. `main.js` restored after each.
**Not verified:** Scan Folder; Safari.
**Problems / surprises:** the npm copies of `marked` and DOMPurify are byte-identical to jsDelivr's, so SRI works
offline.
**Corrections:** none.
**Left undone:** none.
**Next session should start with:** P4-02.

### Session 4: 2026-10-03: hostile-Markdown mutation check

**Contributor:** Claude Code (Opus 5.5)
**Goal:** Run the hostile-Markdown test with the fix removed, now that the maintainer allowed it.
**Done:** P1-01 evidence completed.
**Changed:** docs only; `main.js` edited temporarily and restored with `git checkout`.
**Decisions:** none.
**Verified:** without DOMPurify the `onerror` payload set a localStorage flag and the `javascript:` href survived; with
it, the flag stayed unset and both were stripped. Chromium in the Claude desktop app.
**Not verified:** Firefox.
**Problems / surprises:** none.
**Corrections:** none.
**Left undone:** none.
**Next session should start with:** P4-01.

### Session 3: 2026-10-03: local models only

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P1-06, after merging session 2's branch.
**Done:** P1-06; D-009 recorded (standing git permission).
**Changed:** `main.js` drops Gemini and key handling, adds the Model dialog, `callModel()` for Ollama and
OpenAI-compatible servers, local-URL checks, and old-session cleanup; `index.html` adds the Model button and dialog;
`style.css` adds dialog label and error styles; README, ARCHITECTURE, SECURITY, TESTING, CHANGELOG updated.
**Decisions:** D-009.
**Verified:** see Current state; all against a real Ollama, both API styles.
**Not verified:** Ask All live; llama.cpp; Firefox; hostile Markdown without the fix.
**Problems / surprises:** List Models may preselect an embedding model (P2-04). `#restoreSessionModal` is never
shown (ARCHITECTURE, "Claims vs. code").
**Corrections:** none.
**Left undone:** none.
**Next session should start with:** P4-01.

### Session 2: 2026-10-03: sanitise rendered HTML

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P1-01, P1-02, P1-04 on a branch.
**Done:** P1-01, P1-02, P1-04
**Changed:** `index.html` loads `marked` 18.0.14 and DOMPurify 3.4.16 with SRI; `main.js` sanitises in
`convertMarkdownToHtml` and builds AI headings as text; `tests/check_structure.py` checks `innerHTML` sources and CDN
pinning; `.claude/launch.json` serves the app on port 8000.
**Decisions:** none new (D-006).
**Verified:** fast checks 0 errors; structure check fails on the pre-change files; hostile Markdown stripped in Chromium.
**Not verified:** hostile Markdown without the fix; manual smoke; live AI replies; Firefox.
**Problems / surprises:** `marked` 18 has no `marked.min.js`; the UMD build is `lib/marked.umd.js`.
**Corrections:** none.
**Left undone:** none; merged to `main` in session 3 (D-009).
**Next session should start with:** P1-06.

### Session 1: 2026-10-03: adopt the agent workflow

**Contributor:** Claude Code (Opus 5.5)
**Goal:** Set up a development workflow and project template from `agent-template/`.
**Done:** P0-01, P0-02
**Changed:** removed `agent-template/`; added AGENTS, CLAUDE, ROADMAP, docs/, `tools/check_docs.py` (Layout check now reads AGENTS'
"Repository map"), `tests/check_structure.py`, `.claude/skills/session-start` and `session-end`.
**Decisions:** D-001 to D-003 recorded as inherited; D-004 to D-008 from the maintainer's answers to Q-001 to Q-005.
**Verified:** both fast checks, 0 errors; structure check fails when an ID is removed from `index.html`.
**Not verified:** manual smoke.
**Problems / surprises:** security gaps found while documenting boundaries; filed as Phase 1.
**Corrections:** none.
**Left undone:** none; committed and pushed to `main` with permission. `agent-template/` deleted.
**Next session should start with:** Next steps above.

### Template

```
### Session N: YYYY-MM-DD: short title

**Contributor:** person or agent/tool
**Goal:**
**Done:** roadmap IDs
**Changed:** files / behaviour
**Decisions:** D-numbers added
**Verified:** checks and results
**Not verified:** checks skipped or environments unavailable
**Problems / surprises:**
**Corrections:** earlier notes found wrong, and what was actually true
**Left undone:**
**Next session should start with:**
```
