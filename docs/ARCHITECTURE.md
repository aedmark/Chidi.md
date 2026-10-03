# Architecture

How Chidi.md fits together, for a session that has never seen it. Keep it short enough to read in five minutes;
update it when the shape changes, not for every change inside `main.js`.

Why things are this way lives in [DECISIONS.md](DECISIONS.md).

## The shape, in one paragraph

The browser loads `index.html`, which pulls pinned `marked` and DOMPurify from jsDelivr, fonts from Google Fonts,
`style.css`, and `main.js`. On `DOMContentLoaded`, `main.js` collects every element into `elements`, keeps all data
in one `state` object, and restores a saved session from `localStorage`. Files arrive through the file picker or the
directory picker as `{name, content}` objects. Displaying a file renders it with `marked` then DOMPurify into
`#markdownDisplay` and seeds a chat history with the full file text. AI buttons send that history (or, for Ask All,
every file concatenated) to a local model server chosen in the Model dialog, and append the sanitised reply below
the file. Nothing leaves the machine except font and library downloads (D-007).

## Code map

All in `main.js`, in this order:

| Area | Entry point | Talks to |
| --- | --- | --- |
| Elements and state | `elements`, `state` | everything |
| Input modal | `showInputModal()` | `#inputModal` (Ask All) |
| Model settings | `showModelSettings()`, `isLocalUrl()`, `modelEndpoints()`, `listModels()`, `fillModelSelect()` | `#modelSettingsModal`, model server |
| Rendering | `convertMarkdownToHtml()` | `marked`, DOMPurify |
| Sessions | `saveSession()`, `restoreSession()`, `restartSession()` | `localStorage` key `chidiMdSession` |
| UI state | `updateUI()` | button enabled/disabled states |
| File loading | `addFilesAndDisplay()`, `handleDirectoryScan()` | file input, `showDirectoryPicker` |
| Display and history | `displayFile()`, `pickAndDisplayRandomFile()` | `state.history`, `state.chatHistory` |
| AI | `callModel()`, `appendAiOutput()`, `handleQuestionClick()` | model server |
| Wiring | event listeners, `initialize()` | DOM |

## Interfaces and data flow

```text
.md file / folder -> {name, content} -> state.loadedFiles -> marked -> DOMPurify -> #markdownDisplay
current file + question -> chatHistory [{role, content}] -> local model server -> marked -> DOMPurify -> appended
state -> JSON -> localStorage["chidiMdSession"] -> restored on next load
```

| Interface | Producer | Consumer | Contract / compatibility |
| --- | --- | --- | --- |
| `chidiMdSession` (localStorage) | `saveSession()` | `restoreSession()` | `{loadedFiles, history, historyIndex, chatHistory, modelSettings}`; missing fields default; pre-D-007 `apiKey` and `geminiChatHistory` are deleted on restore (D-003) |
| Ollama | `callModel()`, `listModels()` | local server | `POST {base}/api/chat` `{model, messages, stream:false}` → `message.content`; `GET {base}/api/tags` → `models[].name`; `POST {base}/api/show` `{model}` → `capabilities` (`completion` = can chat) |
| OpenAI-compatible | `callModel()`, `listModels()` | local server | `POST {base}/chat/completions` → `choices[0].message.content`; `GET {base}/models` → `data[].id`; `base` ends in `/v1` |
| Element IDs | `index.html` | `elements` in `main.js` | Checked by `tests/check_structure.py` |

## Invariants

- Every element ID `main.js` looks up exists exactly once in `index.html`. Enforced by: `tests/check_structure.py`.
- All persisted data lives under one localStorage key. Enforced by: nothing yet (review only).
- Rendered Markdown cannot run script: every `innerHTML` is a literal or `convertMarkdownToHtml()`, which runs
  DOMPurify. Enforced by: `tests/check_structure.py` (D-006).
- No build step; the repository is servable as-is (D-001). Enforced by: nothing (convention).

## Boundaries

| Boundary | Comes in as | Checked by | Rule |
| --- | --- | --- | --- |
| User's Markdown files | text from File / directory handles | only the `.md` suffix | Untrusted: `marked`, then DOMPurify (D-006) |
| Model reply | JSON | type check on the reply text in `callModel()` | Untrusted: `marked`, then DOMPurify; headings as text |
| Model server URL | text from the Model dialog or a restored session | `isLocalUrl()` | Only `localhost`, `127.0.0.1`, `[::1]`, `*.localhost` (D-007) |
| CDN scripts | `marked`, DOMPurify from jsDelivr | SRI hashes | Pinned versions only |

## Dependencies

A new one needs maintainer approval; record it here the same session.

| Dependency | Version | For | Why this one |
| --- | --- | --- | --- |
| `marked` | 18.0.14, jsDelivr, SRI | Markdown to HTML | Small, fast, no build (D-001) |
| DOMPurify | 3.4.16, jsDelivr, SRI | Sanitising rendered HTML | D-006 |
| Google Fonts: Space Mono, VT323 | n/a | Console look | Style only |
| A local model server | user's choice | All AI features | D-007 |
| `@playwright/test` (dev only) | 1.63.0, `tests/e2e/package.json` | Browser smoke tests | D-008; also pins `marked` and DOMPurify copies for offline runs |

## State and caches

| What | Where | Written by | Reset by | Committed? |
| --- | --- | --- | --- | --- |
| Saved session: file contents, chat, model settings | `localStorage["chidiMdSession"]` on the page's origin | Save button, entering a key | Restart button, or clearing site data | n/a |

Note the origin: a session saved on `http://localhost:8000` is not visible on `:8001` or `file://`.

## Failure modes and observability

| Failure | User-visible behaviour | Detection | Recovery |
| --- | --- | --- | --- |
| No model configured | Model dialog opens; cancelling appends "Error: No local model configured." | status line | Choose a model |
| Server down or CORS refused | `Error: Failed to fetch` appended | console | Start the server; for Ollama set `OLLAMA_ORIGINS` |
| Server HTTP error or empty reply | `Error: HTTP error! status: N` appended | console | Retry |
| `localStorage` quota exceeded on Save | Uncaught exception; no confirmation (P2-02) | console | Load fewer files |
| `file://` or non-Chromium | Scan Folder shows an alert | alert | Serve from localhost in Chrome/Edge |

Only status strings are logged; never log file contents. See [SECURITY.md](SECURITY.md).

## Claims vs. code

- `#restoreSessionModal` exists in `index.html` but nothing shows it: a saved session is restored on load without
  asking.
- The README says "chat and memory": chat is limited to suggested-question buttons (P2-01), and "memory" is the
  per-file chat history, reset whenever another file is displayed.
- `saveSession()` reports `"success"` as a message type, but `showMessage` only distinguishes `error` and `warn`.
