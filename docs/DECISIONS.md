# Decisions

Short, append-only record of choices that a future session might otherwise re-litigate. Newest at the bottom. To
reverse a decision, add a new entry that supersedes it; the old one keeps its text and only its status changes.
Record pre-existing choices too, the first time a session has to understand them.

Format:

```
## D-NNN Title  (YYYY-MM-DD, status: proposed | accepted | rejected | superseded by D-MMM)
**Context:** why this came up.
**Decision:** what we chose.
**Alternatives:** what else was considered, and why not.
**Consequences:** what it costs or constrains.
**Review trigger:** an event that should cause reconsideration. Optional.
```

---

## D-001 Static site, no build step  (2025-07-17, status: accepted, recorded 2026-10-03)
**Context:** Inherited from the initial release; recorded while adopting the agent template.
**Decision:** Three hand-written files (`index.html`, `main.js`, `style.css`) plus CDN libraries; no bundler, no npm.
**Alternatives:** A Vite/npm build (more tooling to maintain for a small app).
**Consequences:** Anyone can run it with a static file server. Libraries come from CDNs, so they must be pinned with
SRI (P1-04). Tests cannot rely on a JS toolchain being present.
**Review trigger:** `main.js` grows past roughly 1,500 lines or needs a second library with its own dependencies.

## D-002 Gemini called directly from the browser with the user's own key  (2025-07-17, status: superseded by D-007)
**Context:** Inherited. There is no server.
**Decision:** The user pastes a Gemini API key; the browser calls `generativelanguage.googleapis.com` directly.
**Alternatives:** A proxy server holding the key (needs hosting and accounts).
**Consequences:** The key lives in the browser and is visible to any script on the page, which makes P1-01 and
P1-04 security issues, not cosmetic ones. Provider choice is revisited in P5-01.

## D-003 One localStorage key for the whole session  (2025-07-17, status: accepted, recorded 2026-10-03)
**Context:** Inherited.
**Decision:** All saved state is one JSON object under `chidiMdSession`; missing fields fall back to defaults.
**Alternatives:** IndexedDB (larger quota, more code).
**Consequences:** Roughly 5 MB limit including file contents (P2-02). Changing the shape needs a migration that reads
the old shape.

## D-004 Maintainer-reviewed branches  (2026-10-03, status: superseded by D-009)
**Context:** Adopting the agent template requires an agreed workflow.
**Decision:** Agents work on `feature/…` or `fix/…` branches; the maintainer reviews and merges to `main`.
**Alternatives:** Direct to `main` (simpler for a solo project, but no review point for agent work); GitHub PRs.
**Consequences:** One extra merge step per change.
**Review trigger:** CI exists (P4-02) and GitHub PRs become worthwhile.
Update 2026-10-03: the maintainer allowed one direct commit and push to `main` for the workflow setup (P0-01); that
permission does not carry over to later changes.

## D-005 Version numbers as git tags only  (2026-10-03, status: accepted)
**Context:** Q-002.
**Decision:** Releases get semver git tags (`v0.2.0`) for tracking; the changelog uses the same numbers as headings.
The UI and README do not display or promote a version.
**Consequences:** Tagging is a maintainer action (pushing tags needs permission, AGENTS "Working agreement").

## D-006 DOMPurify sanitises all rendered HTML  (2026-10-03, status: accepted)
**Context:** Q-003; P1-01. File content and model replies reach `innerHTML` through `marked`.
**Decision:** Every `marked.parse` result passes through DOMPurify before it touches the DOM. DOMPurify loads from a
pinned CDN URL with SRI, like `marked` (D-001).
**Alternatives:** `marked` has no built-in sanitiser; a hand-written allowlist is easy to get wrong.
**Consequences:** One more CDN dependency; Markdown with raw HTML loses scripts and event handlers.

## D-007 Local models only: Ollama or OpenAI-compatible servers, no API keys  (2026-10-03, status: accepted)
**Context:** Q-004. Supersedes D-002.
**Decision:**
1. Remove Gemini and every API-key prompt, field and saved key.
2. The user configures one base URL to a local server: Ollama's native API or any OpenAI-compatible
   `/v1/chat/completions` endpoint (llama.cpp, LM Studio, vLLM, Ollama's `/v1`), plus a model name.
3. Only local URLs are accepted for now (`localhost`, `127.0.0.1`, `[::1]`).
**Alternatives:** Keep Gemini as an option (keeps the key-theft risk); a proxy server (needs hosting).
**Consequences:** Nothing leaves the machine. The local server must allow the page's origin (CORS; for Ollama,
`OLLAMA_ORIGINS`). Saved sessions from older versions may contain an `apiKey` field, which must be deleted on restore.
**Review trigger:** A request for remote or hosted providers.
Update 2026-10-03: implemented in P1-06. OpenAI-compatible base URLs include `/v1` (as OpenAI clients expect);
Ollama's is the server root.

## D-008 Playwright allowed as a development-only dependency  (2026-10-03, status: accepted)
**Context:** Q-005; P4-01.
**Decision:** Browser tests may use Node and Playwright, kept under `tests/` with their own `package.json`. The shipped
app stays dependency-free (D-001).
**Consequences:** Running the browser suite needs Node and a Chromium download; the Python fast checks stay
toolchain-free.

## D-009 Agents commit, push, and merge  (2026-10-03, status: accepted)
**Context:** The maintainer granted standing git permission after reviewing the P1-01 branch. Supersedes D-004.
**Decision:** Agents keep one branch per roadmap item and merge it to `main` with `--no-ff` and push, once the fast
checks pass and the docs are updated. Force-pushes and history rewrites still need explicit permission.
**Consequences:** No review point before `main`; the merge commit and HANDOFF session log are the record.
**Review trigger:** A bad merge reaches `main`, or CI exists (P4-02).
Update 2026-10-03: docs-only changes may go straight to `main`, without a branch (maintainer).
Update 2026-10-03: CI exists (P4-02). Merges now wait for a green CI run on the branch; otherwise unchanged.

## Open questions

- **Q-001** ~~Which workflow: maintainer-reviewed branches (D-004), GitHub pull requests, or direct to `main`?~~ Answered 2026-10-03: reviewed branches by default; this setup went direct to `main` by one-time permission, D-004.
- **Q-002** ~~Should releases be versioned (tags plus changelog sections), or is `main` always the release?~~ Answered 2026-10-03: git tags for tracking, not shown to users, D-005.
- **Q-003** ~~May we add DOMPurify from a pinned CDN URL with SRI?~~ Answered 2026-10-03: yes, required, D-006.
- **Q-004** ~~Should the API key be saved with the session at all?~~ Answered 2026-10-03: no API keys at all; local Ollama or OpenAI-compatible servers only, D-007.
- **Q-005** ~~Is a Node/Playwright dev dependency acceptable for automated browser tests, outside the shipped app?~~ Answered 2026-10-03: yes, D-008.
