# Architecture

How Chidi.md fits together, for a session that has never seen it. Keep it short enough to read in five minutes;
update it when the shape changes, not for every change inside `main.js`.

Why things are this way lives in [DECISIONS.md](DECISIONS.md).

## The shape, in one paragraph

The browser loads `index.html`, which pulls `marked` from jsDelivr, fonts from Google Fonts, `style.css`, and
`main.js`. On `DOMContentLoaded`, `main.js` collects every element into `elements`, keeps all data in one `state`
object, and offers to restore a saved session from `localStorage`. Files arrive through the file picker or the
directory picker as `{name, content}` objects. Displaying a file renders it with `marked.parse` into
`#markdownDisplay` and seeds a Gemini chat history with the full file text. AI buttons send that history (or, for
Ask All, every file concatenated) to the Gemini `generateContent` endpoint and append the reply below the file.
Nothing else leaves the device. D-007 replaces Gemini with a local Ollama or
OpenAI-compatible server and removes the key (P1-06); until then this paragraph describes the current code.

## Code map

All in `main.js`, in this order:

| Area | Entry point | Talks to |
| --- | --- | --- |
| Elements and state | `elements`, `state` | everything |
| Input modal | `showInputModal()` | `#inputModal` |
| API key | `getApiKey()`, `getApiUrl()` | input modal, `state.apiKey` |
| Sessions | `saveSession()`, `restoreSession()`, `restartSession()` | `localStorage` key `chidiMdSession` |
| UI state | `updateUI()` | button enabled/disabled states |
| File loading | `addFilesAndDisplay()`, `handleDirectoryScan()` | file input, `showDirectoryPicker` |
| Display and history | `displayFile()`, `pickAndDisplayRandomFile()` | `marked`, `state.history` |
| AI | `callGeminiApi()`, `appendAiOutput()`, `handleQuestionClick()` | Gemini REST API |
| Wiring | event listeners, `initialize()` | DOM |

## Interfaces and data flow

```text
.md file / folder -> {name, content} -> state.loadedFiles -> marked.parse -> #markdownDisplay
current file + question -> geminiChatHistory -> Gemini generateContent -> marked.parse -> appended below file
state -> JSON -> localStorage["chidiMdSession"] -> restored on next load
```

| Interface | Producer | Consumer | Contract / compatibility |
| --- | --- | --- | --- |
| `chidiMdSession` (localStorage) | `saveSession()` | `restoreSession()` | `{loadedFiles, history, historyIndex, apiKey, geminiChatHistory}`; missing fields default (D-003) |
| Gemini `v1beta/models/gemini-2.5-flash:generateContent` | `callGeminiApi()` | Google | `{contents}` in; first candidate's first text part out; anything else becomes an `Error:` string |
| Element IDs | `index.html` | `elements` in `main.js` | Checked by `tests/check_structure.py` |

## Invariants

- Every element ID `main.js` looks up exists exactly once in `index.html`. Enforced by: `tests/check_structure.py`.
- All persisted data lives under one localStorage key. Enforced by: nothing yet (review only).
- Rendered Markdown cannot run script. Enforced by: **nothing; currently false** (P1-01, D-006).
- No build step; the repository is servable as-is (D-001). Enforced by: nothing (convention).

## Boundaries

| Boundary | Comes in as | Checked by | Rule |
| --- | --- | --- | --- |
| User's Markdown files | text from File / directory handles | only the `.md` suffix | Untrusted: rendered via `marked` into `innerHTML` unsanitised today (P1-01) |
| Gemini reply | JSON | optional chaining on `candidates[0]` | Untrusted: rendered via `marked` into `innerHTML` (P1-01, P1-02) |
| API key | text from the input modal | non-empty | Sent in the URL query and stored in `localStorage`; removed by P1-06 |
| CDN scripts | `marked` from jsDelivr, unpinned | nothing | Full page trust (P1-04) |

## Dependencies

A new one needs maintainer approval; record it here the same session.

| Dependency | Version | For | Why this one |
| --- | --- | --- | --- |
| `marked` | unpinned, latest from jsDelivr | Markdown to HTML | Small, fast, no build (D-001); pin in P1-04 |
| Google Fonts: Space Mono, VT323 | n/a | Console look | Style only |
| Gemini API | `gemini-2.5-flash`, `v1beta` | All AI features | D-002; replaced by P1-06 (D-007) |

## State and caches

| What | Where | Written by | Reset by | Committed? |
| --- | --- | --- | --- | --- |
| Saved session, including API key and file contents | `localStorage["chidiMdSession"]` on the page's origin | Save button, entering a key | Restart button, or clearing site data | n/a |

Note the origin: a session saved on `http://localhost:8000` is not visible on `:8001` or `file://`.

## Failure modes and observability

| Failure | User-visible behaviour | Detection | Recovery |
| --- | --- | --- | --- |
| No/invalid API key | "Error: …" text appended as the AI output | status line, console | Restart clears the saved key |
| Gemini HTTP error or empty reply | `Error: HTTP error! status: N` appended | console | Retry |
| `localStorage` quota exceeded on Save | Uncaught exception; no confirmation (P2-02) | console | Load fewer files |
| `file://` or non-Chromium | Scan Folder shows an alert | alert | Serve from localhost in Chrome/Edge |

Only status strings are logged; never log the key or file contents. See [SECURITY.md](SECURITY.md).

## Claims vs. code

- The README says "chat and memory": chat is limited to suggested-question buttons (P2-01), and "memory" is the
  per-file chat history, reset whenever another file is displayed.
- `saveSession()` reports `"success"` as a message type, but `showMessage` only distinguishes `error` and `warn`.
