# Chidi.md: Markdown Analyzer
An LLM-enabled markdown analyzer with chat and memory.

## Run it

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in Chrome or Edge. AI features need a local model server: [Ollama](https://ollama.com)
(`http://localhost:11434`) or any OpenAI-compatible server (llama.cpp, LM Studio, vLLM). Click **Model** to choose
it. Your files never leave your machine.

## Developing

Start with [AGENTS.md](AGENTS.md) (the working rules), [docs/HANDOFF.md](docs/HANDOFF.md) (current state) and
[ROADMAP.md](ROADMAP.md). Before committing: `python3 tests/check_structure.py && python3 tools/check_docs.py`.
