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
  stripped, Chromium via the in-app browser (2026-10-03). Not done: the run without the fix, to see it fail.
- [x] P1-02 Build the AI output heading with `textContent` (`appendAiOutput`). Evidence: the structure check flags
  the old template-string `innerHTML` and passes on the new code (2026-10-03). Not seen with a live model reply.
- [-] P1-03 Send the Gemini key in a header instead of the URL (dropped, D-007: Gemini and API keys are removed).
- [x] P1-04 Pin `marked` 18.0.14 (`lib/marked.umd.js`) and DOMPurify 3.4.16 with SRI sha384. Evidence: both load
  in Chromium with integrity checked; the structure check fails on an unpinned CDN script (2026-10-03)
- [-] P1-05 Make saving the API key opt-in (dropped, D-007: no API keys).
- [ ] P1-06 Replace Gemini with a local provider (D-007): a settings dialog for base URL, API style (Ollama or
  OpenAI-compatible) and model; reject non-local URLs; remove all key handling and delete `apiKey` from restored
  sessions. Done when Summarize works against a local Ollama and a llama.cpp server, and a saved session from the
  previous version restores without its key.

## Phase 2: Core experience

Goal: reading and chatting feel reliable.

- [ ] P2-01 Free-text follow-up questions on the current file (today only suggested-question buttons exist).
- [ ] P2-02 Show a clear message when `localStorage` is full instead of failing silently on Save.
- [ ] P2-03 Warn before "Ask All" when the combined files are likely to exceed the model's context.

## Phase 3: Output / sharing

- [ ] P3-01 Export the current file's AI notes (summary, Q&A) as Markdown.

## Phase 4: Quality: robustness, accessibility, automation

- [ ] P4-01 Playwright smoke test (D-008) for load, PREV/NEXT, save and restore, with a stubbed local model endpoint.
- [ ] P4-02 Run the fast checks in CI on every push.
- [ ] P4-03 Keyboard navigation and focus handling for modals and question buttons.

## Phase 5: Later / only if wanted

Not committed. Decide only after the phases above ship.

- [-] P5-01 Pluggable hosted AI providers (dropped for now, D-007: local servers only).

## Phase 6: Non-code items

- [ ] P6-01 Fill in a private security contact in `docs/SECURITY.md`.
- [ ] P6-02 Tag the first release `v0.2.0` once Phase 1 lands (D-005).
