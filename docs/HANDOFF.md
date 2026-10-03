# Session Handoff

Read this first when resuming work. Rewrite the top half whenever current state changes materially or work pauses.
The session log below is append-only history. "Current state" fits in about 80 lines.

Protocol: see [AGENTS.md](../AGENTS.md) (`CLAUDE.md` imports it). Plan: [ROADMAP.md](../ROADMAP.md).
Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Decisions: [DECISIONS.md](DECISIONS.md).
Tests: [TESTING.md](TESTING.md). Security: [SECURITY.md](SECURITY.md).
Changes: [CHANGELOG.md](CHANGELOG.md). Older sessions: [archive/](archive/README.md).

---

## Current state

_Last updated: 2026-10-03, session 1, on `main`: agent workflow docs, checks and session skills committed and pushed;
app code unchanged; `agent-template/` removed._

**Where things stand, in one paragraph:** The app works as released on 2025-07-17. Phase 0 (workflow) is done. All open
questions are answered (D-004 to D-008). The code still uses Gemini with a stored key and renders unsanitised HTML;
Phase 1 (DOMPurify, local models only) fixes both. There is no automated browser test yet.

**Verified** (2026-10-03, on the session-1 commit, Linux, Python 3)

| Suite | Result |
| --- | --- |
| `python3 tests/check_structure.py` | **0 errors** |
| `python3 tools/check_docs.py` | **0 errors** |

**What works** (from reading the code, not run this session)
- **Reading** (`main.js` file loading and display). Add files or scan a folder; PREV/NEXT; duplicate files skipped.
- **AI** (D-002, superseded by D-007; code not yet changed). Summarize, Suggest, follow-up on suggested questions, Ask All.
- **Sessions** (D-003). Save, restore on load, restart.

**Not verified**
- The manual smoke has not been run this session; nothing has been run in Firefox.

**Gotchas for the next session**
- Direct pushes to `main` were a one-time permission for session 1 (D-004); use a branch from now on.

## Next steps (in order)

1. P1-01 and P1-04: add DOMPurify and pin both CDN scripts with SRI; P1-02 alongside.
2. P1-06: replace Gemini with a local Ollama / OpenAI-compatible provider.
3. P4-01: Playwright smoke test with a stubbed model endpoint.

## Open questions for maintainers

None open.

## Session log

Newest first. Past 10 entries, move the oldest to `docs/archive/`.

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
