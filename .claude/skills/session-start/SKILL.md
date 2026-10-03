---
name: session-start
description: Orient at the start of a Chidi.md work session - read the handoff, check the tree, run fast checks, propose scope. Use when starting or resuming work in this repo.
---

1. Read `docs/HANDOFF.md` (Current state, Next steps, Open questions) and `ROADMAP.md`.
2. Run `git status` and `git log --oneline -10`. Note any work not described in the handoff's session log.
3. Run `python3 tests/check_structure.py && python3 tools/check_docs.py`. Compare with HANDOFF's "Verified" table.
4. If the user named a task, find its roadmap item and read the matching parts of `docs/ARCHITECTURE.md` and
   `docs/TESTING.md`. Otherwise take the first item in HANDOFF's "Next steps" that is not blocked by an open question.
5. Report in a few lines: state of the tree, check results, any drift from the handoff, and the proposed scope
   (one roadmap item) with the branch name `feature/<id>-<topic>`. Wait for confirmation before editing code.
