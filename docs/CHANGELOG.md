# Changelog

User-visible changes, newest first, in plain words. This is not a copy of the git log. Add to "Unreleased" as
changes land.

## Unreleased

<!-- Keep only headings that contain entries. -->

### Added
- Type your own questions about the current file in the new "Ask about this file" box.

### Changed
- AI features now use a model server on your own machine (Ollama or OpenAI-compatible) instead of Google Gemini.
  Choose it with the new **Model** button. API keys are gone, and a key saved by an older version is deleted.

### Fixed
- An AI answer that arrives after you switch files is no longer shown under the wrong file; the status line says
  it was dropped.
- The Model list now opens and lets you pick any model. Models that cannot chat, such as embedding models, are
  shown but cannot be picked.
- HTML inside a Markdown file or an AI reply can no longer run scripts on the page.

## 2025-07-17

### Added
- Load Markdown files or scan a folder; browse them with PREV/NEXT.
- Summarize, suggested questions, and Ask All using Google Gemini with your own API key.
- Save, restore, and restart sessions in the browser.
