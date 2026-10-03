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
| Model server URL | A remote URL would send the user's documents off the machine | `isLocalUrl()` on entry and on restore (D-007) | `main.js` |
| User's Markdown files | Personal notes; may contain hostile HTML | Sanitised with DOMPurify (D-006); sent only to the local model server | `main.js` |
| Model replies | Can contain HTML or prompt-injected content from a file | Sanitised with DOMPurify; titles set as text | `main.js` |
| CDN scripts | A compromised CDN has full page access, including the user's documents | Exact versions with SRI; checked by `tests/check_structure.py` | `index.html` |

Script injection could read the user's documents and send them anywhere, so DOMPurify and SRI stay required (D-006).
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

If a Gemini key was saved by a version before P1-06, restoring the session deletes it; revoke it in Google AI Studio
anyway. If a committed file contains a secret, tell the maintainer before any history rewrite.
