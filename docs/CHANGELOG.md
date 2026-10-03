# Changelog

User-visible changes, newest first, in plain words. This is not a copy of the git log. Add to "Unreleased" as
changes land.

## Unreleased

<!-- Keep only headings that contain entries. -->

### Changed
- AI features now use a model server on your own machine (Ollama or OpenAI-compatible) instead of Google Gemini.
  Choose it with the new **Model** button. API keys are gone, and a key saved by an older version is deleted.

### Fixed
- HTML inside a Markdown file or an AI reply can no longer run scripts on the page.

## 2025-07-17

### Added
- Load Markdown files or scan a folder; browse them with PREV/NEXT.
- Summarize, suggested questions, and Ask All using Google Gemini with your own API key.
- Save, restore, and restart sessions in the browser.
