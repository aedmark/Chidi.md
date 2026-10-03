# Chidi.md

Chidi.md is a single-page, no-build browser app for reading a personal collection of Markdown files and talking
about them with a local LLM. It loads `.md` files or whole folders, shows them one at a time in
a retro console UI, and can summarise, suggest questions, answer follow-ups, and answer one question across all
loaded files. Everything runs in the browser: `index.html`, `main.js`, `style.css`, plus `marked` and DOMPurify
from a CDN. AI runs on a local Ollama or OpenAI-compatible server the user picks; there are no API keys (D-007).

This is the canonical instruction file for coding agents. `CLAUDE.md` imports it; do not duplicate these rules in
tool-specific files. Project facts belong in the documents linked below, not in an agent's private memory.

## Start here

1. Read `docs/HANDOFF.md` for the current state, active work, and gotchas. (`/session-start` does steps 1 to 4.)
2. Read the relevant roadmap item and the parts of `docs/ARCHITECTURE.md` and `docs/TESTING.md` that apply.
3. Inspect `git status` and recent history. Do not overwrite work you did not create.
4. Verify important inherited claims before relying on them. Use the fastest relevant check first.
5. State the intended scope briefly, then work on one independently reviewable change at a time.

If the request conflicts with these instructions or the working tree contains overlapping edits, stop and ask the
maintainer.

## While working

- Reference roadmap IDs (`P2-03`) where one exists. Do not invent an ID for an incidental, self-contained fix.
- Keep changes scoped. Do not mix opportunistic refactors with requested work.
- Preserve user changes. Never reset, clean, or rewrite history without explicit permission.
- Record a decision in `docs/DECISIONS.md` when reasonable maintainers could revisit the choice later.
- Update documentation in the same change when behaviour, interfaces, commands, risks, or project structure change.
- Distinguish observed facts from inference. Include the command, date, browser, or source behind volatile claims.
- Prefer enforcement to prose: important invariants should have a check in `tests/` or `tools/`.
- Markdown files and model replies are untrusted input: they reach the DOM only through DOMPurify (D-006, P1-01).
- No API keys and no hosted AI services (D-007). AI calls go only to a user-configured local URL.
- Add newly discovered work to `ROADMAP.md` only when it is genuinely out of scope for the current change.

## Finishing a change

1. Run the checks appropriate to the change, following `docs/TESTING.md`. Record failures and anything not run.
2. Review the diff for unrelated edits, credentials, stale names, and documentation drift.
3. Update `docs/HANDOFF.md` if work will continue in another session or the repository's state changed.
4. Update the roadmap item, decision record, architecture, security notes, and changelog only when their update
   trigger applies (see `docs/README.md`).
5. Run `python3 tools/check_docs.py` and `python3 tests/check_structure.py` and report the results.

`/session-end` walks through these steps. Do not manufacture ceremony: typo-only or mechanical changes do not need a
decision, changelog entry, or handoff rewrite unless they alter a claim those documents make.

## Working agreement

Agent-merged branch workflow (D-009).

- Default branch: `main`. Agents work on a branch per roadmap item, push it, and merge it to `main` (`--no-ff`) once
  the branch's CI run is green and the docs are updated.
- Docs-only changes may be committed straight to `main` (D-009).
- Working branch pattern: `feature/<roadmap-id>-<topic>` or `fix/<topic>`.
- Commit format: imperative subject line, roadmap ID in the subject when one exists (`P1-01: sanitise rendered HTML`).
- Release/version scheme: semver git tags plus matching changelog headings; not shown in the UI or README (D-005).
- Agents may commit, push, and merge without asking (D-009). Adding a dependency (including a CDN script) and
  changing the saved-session format still need the maintainer's explicit permission; D-006 to D-008 already approve
  DOMPurify, the local-model settings, and Playwright.

Never force-push, rewrite shared history, or publish without explicit permission.

## Maintainer preferences

Record durable preferences here so they survive agent and session changes.

- **Writing:** plain, short sentences; British or American spelling is fine but keep one per document.
- **Code comments:** explain why, not what; match the existing `// --- Section ---` banners in `main.js`.
- **Asking vs. doing:** ask before adding dependencies, adding a non-local AI endpoint, or changing what is stored.
- **Reporting:** lead with the result; list checks run and checks skipped.

## Protected areas

| Path or thing | Rule | Why |
| --- | --- | --- |
| `LICENSE` | Do not edit | Maintainer-owned legal text |
| `chidiMdSession` localStorage key and its shape (`loadedFiles`, `history`, `historyIndex`, `chatHistory`, `modelSettings`) | Do not rename or restructure without a migration | Users' saved sessions would silently vanish (D-003) |

## Names and terms

| Canonical term | Meaning | Formerly / not to be confused with |
| --- | --- | --- |
| Chidi.md | The product | "chidi.md" in the UI title; same thing |
| Session | Loaded files, view history, chat history and model settings, saved to `localStorage` | A work session in `HANDOFF.md` |
| History | The list of file indexes viewed, driving PREV/NEXT | Chat history (`chatHistory`) |
| Model settings | `{apiStyle, baseUrl, model}` for the local server | An API key: there is none |
| Ask All | One question over every loaded file | Follow-up questions, which use only the current file |

## Repository map

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup, element IDs, CDN script and font links |
| `main.js` | All behaviour: state, sessions, file loading, rendering, model calls |
| `style.css` | Retro console styling |
| `AGENTS.md` | Canonical agent instructions |
| `CLAUDE.md` | Imports `AGENTS.md` for Claude Code |
| `ROADMAP.md` | Planned work with stable IDs |
| `docs/README.md` | Documentation map and update triggers |
| `docs/HANDOFF.md` | Current state, next steps, gotchas, and session history |
| `docs/ARCHITECTURE.md` | Components, boundaries, invariants, state, and failure modes |
| `docs/DECISIONS.md` | Append-only decisions; open questions |
| `docs/TESTING.md` | Checks, commands, limitations |
| `docs/SECURITY.md` | Assets, trust boundaries, secret handling, and reporting |
| `docs/CONTRIBUTING.md` | Human and agent contribution workflow |
| `docs/CHANGELOG.md` | User-visible release notes |
| `docs/archive/` | Historical material no longer current |
| `tools/check_docs.py` | Documentation consistency checks |
| `tests/check_structure.py` | Checks that every element ID `main.js` uses exists in `index.html` |
| `tests/e2e/` | Playwright browser smoke tests (D-008); dev-only, its own `package.json` |
| `.github/workflows/checks.yml` | CI: fast checks and browser smoke on every push |
| `.claude/skills/` | `/session-start` and `/session-end` workflow skills |

## Engineering conventions

- Plain ES2020+ JavaScript in one file, no build step, no framework, no npm in the app (D-001). Python 3 standard
  library for tooling; Node and Playwright only under `tests/e2e/` (D-008).
- Targets current desktop Chromium (Chrome, Edge) fully; Firefox and Safari work except "Scan Folder", which needs
  the File System Access API. Mobile is not a target.
- All DOM lookups go through the `elements` object; all mutable data lives in `state`.
- Persisted data lives only under the `chidiMdSession` localStorage key (D-003).
- A new dependency or CDN script needs maintainer approval and a row in ARCHITECTURE "Dependencies".
- No generated files.

## Environments

| Environment | Can access | Cannot access / caveats |
| --- | --- | --- |
| Local development | A browser on `http://localhost:8000` via `python3 -m http.server`; the CDN; a local Ollama or OpenAI-compatible server if running | `file://` disables Scan Folder; the model server must allow the page's origin (CORS) |
| CI (GitHub Actions, `.github/workflows/checks.yml`) | Ubuntu, Python 3, Node 22, Playwright Chromium and Firefox | No model server, no secrets; `gh run watch` to follow a run |
| Playwright (`tests/e2e`) | Node 22, cached Chromium and Firefox; no network needed | Scan Folder cannot be automated |

## Run and verify

- Setup: none to run the app. For browser tests: `cd tests/e2e && npm ci && npx playwright install chromium firefox`.
- Run: `python3 -m http.server 8000`, then open `http://localhost:8000`.
- Fast checks: `python3 tests/check_structure.py && python3 tools/check_docs.py`.
- Full checks: fast checks, then `cd tests/e2e && npm test`, then the manual checks in `docs/TESTING.md`.
- Detailed test guidance: `docs/TESTING.md`.
