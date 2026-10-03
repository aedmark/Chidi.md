# Security

This document describes the project's security assumptions and reporting path. It is not a claim that the project
is vulnerability-free.

## Supported versions

| Version / branch | Security fixes |
| --- | --- |
| `main` | supported |

## Report a vulnerability

Report suspected vulnerabilities privately to the maintainer through GitHub's private vulnerability reporting on the
repository (a dedicated contact is P6-01). Include impact, reproduction steps, and any workaround. Do not include real
API keys or personal documents.

## Assets and boundaries

| Asset or boundary | Sensitivity / threat | Protection and validation | Owner |
| --- | --- | --- | --- |
| Gemini API key (being removed) | Billing abuse if stolen | Stored in `localStorage` and sent in the URL today; removed entirely by P1-06 (D-007) | `main.js` |
| User's Markdown files | Personal notes; may contain hostile HTML | Rendered unsanitised today (P1-01); sent to Google today; only to a local server after P1-06 | `main.js` |
| Model replies | Can contain HTML or prompt-injected content from a file | Rendered unsanitised today (P1-01, P1-02) | `main.js` |
| CDN scripts | A compromised CDN has full page access, including the key and documents | Unpinned today (P1-04) | `index.html` |

Until P1-06 lands, any script injection (P1-01, P1-02, P1-04) means key theft. After it, injection can still read
the user's documents and call the local model server, so DOMPurify stays required (D-006).
Architecture details are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Secure development rules

- No API keys and no hosted AI endpoints (D-007); only `localhost`, `127.0.0.1` or `[::1]` URLs.
- Treat file content and model output as untrusted: sanitise before `innerHTML`, use `textContent` for plain text.
- Do not rely on prompt text as a security control.
- Pin CDN scripts to exact versions with `integrity` and `crossorigin` attributes.
- Tell the user before sending more of their data to a third party than a feature needs.

## Security verification

No automated security checks yet. Each P1 item carries its own "done when" test; record the result in HANDOFF.

## Incident response

If a key is exposed: revoke it in Google AI Studio, create a new one, and clear the saved session (Restart). If a
committed file contains a key, tell the maintainer before any history rewrite.
