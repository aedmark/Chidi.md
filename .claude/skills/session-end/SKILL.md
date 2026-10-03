---
name: session-end
description: Close out a Chidi.md work session - run checks, update roadmap, docs and handoff per the update triggers. Use when finishing or pausing work in this repo.
---

Follow "Finishing a change" in `AGENTS.md`:

1. Run the checks `docs/TESTING.md`'s change-to-check matrix requires. Note anything not run (e.g. manual smoke).
2. `git diff` review: unrelated edits, API keys, stale names, doc drift.
3. Apply `docs/README.md` "Update triggers": roadmap item status with evidence and date; DECISIONS, ARCHITECTURE,
   SECURITY, CHANGELOG only if triggered.
4. Rewrite HANDOFF "Current state", "Verified" (today's date, commit, environment) and "Next steps"; add a
   session-log entry from the template with the next session number.
5. Run `python3 tools/check_docs.py` until it reports 0 errors.
6. Report results. Commit to the working branch only if the user asked; never push or merge without permission.
