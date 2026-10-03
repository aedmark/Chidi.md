# Session Handoff

Read this first when resuming work. Rewrite the top half whenever current state changes materially or work pauses.
The session log below is append-only history. "Current state" fits in about 80 lines.

Protocol: see [AGENTS.md](../AGENTS.md) (`CLAUDE.md` imports it). Plan: [ROADMAP.md](../ROADMAP.md).
Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Decisions: [DECISIONS.md](DECISIONS.md).
Tests: [TESTING.md](TESTING.md). Security: [SECURITY.md](SECURITY.md).
Changes: [CHANGELOG.md](CHANGELOG.md). Older sessions: [archive/](archive/README.md).

---

## Current state

_Last updated: 2026-10-03, session 2, on `main`: DOMPurify and pinned CDN scripts merged; P1-06 starting._

**Where things stand, in one paragraph:** The app works as released on 2025-07-17. Phase 0 (workflow) is done. All open
questions are answered (D-004 to D-008). Rendering is sanitised (P1-01, P1-02, P1-04). The code still
uses Gemini with a stored key until P1-06. There is no automated browser test yet.

**Verified** (2026-10-03, on the session-2 branch, Linux, Python 3, Chromium in the Claude desktop app)

| Suite | Result |
| --- | --- |
| `python3 tests/check_structure.py` | **0 errors** |
| `python3 tools/check_docs.py` | **0 errors** |
| Hostile Markdown (TESTING.md) | img onerror, script, javascript: link all stripped |

**What works** (from reading the code, not run this session)
- **Safe rendering** (D-006). Raw HTML in files and replies is sanitised.
- **Reading** (`main.js` file loading and display). Add files or scan a folder; PREV/NEXT; duplicate files skipped.
- **AI** (D-002, superseded by D-007; code not yet changed). Summarize, Suggest, follow-up on suggested questions, Ask All.
- **Sessions** (D-003). Save, restore on load, restart.

**Not verified**
- The manual smoke has not been run; nothing has been run in Firefox.
- Hostile-Markdown test not run without the fix (the temporary revert was blocked by the agent's permissions).

**Gotchas for the next session**
- Agents merge and push their own branches (D-009).

## Next steps (in order)

1. P1-06: replace Gemini with a local Ollama / OpenAI-compatible provider.
2. P4-01: Playwright smoke test with a stubbed model endpoint.

## Open questions for maintainers

None open.

## Session log

Newest first. Past 10 entries, move the oldest to `docs/archive/`.

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
**Left undone:** none; merged to `main` (D-009).
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
