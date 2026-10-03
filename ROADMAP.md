# Roadmap

Item IDs are permanent: `P<phase>-<nn>`. Never renumber; append new items at the end of their phase.
`[ ]` open · `[~]` in progress (who holds it, since when, and what is left) · `[x]` done · `[-]` dropped (say why,
and the decision). An item held `[~]` by someone else is theirs until they or a maintainer release it.

A finished item says what was done, the decision if any, the evidence, and the date. A new item says where it came
from and the date. Keep an item's history in it. Bugs are items too, filed under the phase they belong to.

## Phase 0: Development workflow

Goal: the repository carries its own project memory and a minimal enforced check.

- [x] P0-01 Adopt the agent template: AGENTS, ROADMAP, docs/, `tools/check_docs.py`, session skills. Evidence:
  `python3 tools/check_docs.py` reports 0 errors (2026-10-03)
- [x] P0-02 Structure check that every `elements` ID in `main.js` exists in `index.html` (`tests/check_structure.py`).
  Evidence: passes; fails when an ID is removed from `index.html` (2026-10-03)

## Phase 1: Safety foundations

Goal: untrusted Markdown and model output cannot run script, and the API key stops leaking. Source: code review
during P0-01 (2026-10-03).

- [x] P1-01 Sanitise rendered HTML (file content and model replies) with DOMPurify before `innerHTML` (D-006).
  `convertMarkdownToHtml` sanitises every render; `tests/check_structure.py` rejects any other `innerHTML` source.
  Evidence: a restored session with `<img onerror>`, `<script>` and a `javascript:` link renders with all three
  stripped, Chromium via the in-app browser (2026-10-03). With the fix removed, the `onerror` payload ran and the
  `javascript:` link kept its `href`; restored, neither survived (2026-10-03, session 4).
- [x] P1-02 Build the AI output heading with `textContent` (`appendAiOutput`). Evidence: the structure check flags
  the old template-string `innerHTML` and passes on the new code (2026-10-03). Not seen with a live model reply.
- [-] P1-03 Send the Gemini key in a header instead of the URL (dropped, D-007: Gemini and API keys are removed).
- [x] P1-04 Pin `marked` 18.0.14 (`lib/marked.umd.js`) and DOMPurify 3.4.16 with SRI sha384. Evidence: both load
  in Chromium with integrity checked; the structure check fails on an unpinned CDN script (2026-10-03)
- [-] P1-05 Make saving the API key opt-in (dropped, D-007: no API keys).
- [x] P1-06 Replace Gemini with a local provider (D-007): Model dialog for server type (Ollama or OpenAI-compatible),
  URL and model, with List Models; non-local URLs refused when entered and when restored; key handling removed;
  `apiKey` and `geminiChatHistory` deleted from old saved sessions. Evidence, Chromium + Ollama 11434 with
  `llama3.1:8b`: Summarize on `/api/chat`; Suggest and a follow-up on `/v1/chat/completions`; save stores
  `modelSettings` and `chatHistory` only; an old session with a key restores without it; a saved remote URL is
  dropped on restore (2026-10-03). Not run: a real llama.cpp server (Ollama's `/v1` stood in for it).

## Phase 2: Core experience

Goal: reading and chatting feel reliable.

- [x] P2-01 Free-text follow-up questions: an "Ask about this file" box under the file. Typed and suggested questions
  share the file's conversation; one question at a time (box and buttons disabled while waiting); empty questions
  ignored. Evidence: two browser tests (conversation history sent, Enter and button, focus kept; second question
  blocked while waiting), both fail on the old code and the blocking one fails without the guard; answered by
  `llama3.1:8b` on a real Ollama (2026-10-03).
- [ ] P2-02 Show a clear message when `localStorage` is full instead of failing silently on Save.
- [ ] P2-03 Warn before "Ask All" when the combined files are likely to exceed the model's context.
- [x] P2-04 Model picker: the Model field is now a `<select>` filled from the server when the dialog opens, when the
  type or URL changes, and on Refresh List. Models that cannot chat (Ollama `/api/show` capabilities; `embed` in the
  name for OpenAI-compatible) are listed last, disabled, and never preselected; the saved model stays selected.
  Also fixes the maintainer's report that the old field only ever offered the first model (a `<datalist>` filters to
  entries matching the text already in the field). Evidence: new browser test, both APIs, Chromium and Firefox,
  fails on the old code; against a real Ollama, 8 chat models listed, `nomic-embed-text` disabled, keyboard pick of
  a second model works (2026-10-03). Not seen: the native dropdown popup itself (not in screenshots).
- [x] P2-05 Late answers: each displayed file is a new view (`state.viewId`, also bumped by Restart); Summarize,
  Suggest, questions and Ask All drop a reply whose view has changed and say so in the status line. A typed or
  suggested question's answer is kept in its own file's conversation, not the new one's. Found while doing P2-01.
  Evidence: four browser tests fail on the old code; the history test fails if the answer goes to the current
  conversation (2026-10-03).

## Phase 3: Output / sharing

- [ ] P3-01 Export the current file's AI notes (summary, Q&A) as Markdown.

## Phase 4: Quality: robustness, accessibility, automation

- [x] P4-01 Playwright smoke test (D-008), `tests/e2e/`: 8 tests (load, duplicates, PREV/NEXT, save/restore/restart,
  hostile Markdown, non-local URL refused, Ollama and OpenAI-compatible calls, Ask All, old-key cleanup) in Chromium
  and Firefox, offline: CDN files from `node_modules` (same SRI bytes), stub model, any other request fails the
  test. Evidence: 16/16 pass; removing DOMPurify, the text heading, the local-URL check, or the key cleanup each
  fails its test (2026-10-03). Not covered: Scan Folder (needs a native picker).
- [x] P4-02 GitHub Actions (`.github/workflows/checks.yml`) runs the fast checks and the browser smoke on every push
  and pull request; actions pinned to commit SHAs; Playwright results uploaded on failure. Evidence: green run
  37134115368 (16 passed); a commit renaming one element ID failed both jobs, run 37134197807, then reverted
  (2026-10-03).
- [ ] P4-03 Keyboard navigation and focus handling for modals and question buttons.

## Phase 5: Later / only if wanted

Not committed. Decide only after the phases above ship.

- [-] P5-01 Pluggable hosted AI providers (dropped for now, D-007: local servers only).

## Phase 6: Non-code items

- [ ] P6-01 Fill in a private security contact in `docs/SECURITY.md`.
- [ ] P6-02 Tag the first release `v0.2.0` once Phase 1 lands (D-005).
