# Contributing

The workflow shared by human and automated contributors. Agent-specific instructions are in
[AGENTS.md](../AGENTS.md).

## Before changing code

1. Read the README, the relevant roadmap item, the architecture section, and test guidance.
2. No setup beyond Python 3 and a Chromium browser; see [TESTING.md](TESTING.md).
3. Check `git status` and confirm your change will not overlap unrelated work.
4. For a change to the saved-session format or a new dependency, agree on it with the maintainer first.

## The development loop

1. **Pick** an open roadmap item (or file one, with its origin and date). Mark it `[~]` with your name and the date.
2. **Branch** from `main`: `feature/P1-01-sanitise-html`.
3. **Prove the problem** where possible: a failing check or a written manual reproduction.
4. **Change** the code in one focused step.
5. **Verify** with the checks the change-to-check matrix in [TESTING.md](TESTING.md) asks for.
6. **Document** per [the update triggers](README.md#update-triggers): the roadmap item to `[x]` with evidence and
   date, a decision if one was made, the changelog if users will notice.
7. **Hand off**: update [HANDOFF.md](HANDOFF.md) and add a session-log entry.
8. **Submit** the branch for the maintainer to review and merge.

## Verify

```bash
python3 tests/check_structure.py
python3 tools/check_docs.py
```

Report the exact checks run and any skipped; a partial pass is not a full pass.

## Submit and review

Branches are `feature/<roadmap-id>-<topic>` or `fix/<topic>`. Commit subjects are imperative and start with the
roadmap ID when one exists. The maintainer reviews and merges to `main` (D-004). A change is ready when its scope is
clear, checks pass, migration impact is described, no key or personal data is present, and the docs it invalidated
are updated.

## Compatibility and migrations

Saved sessions must keep restoring after an update. A change to the `chidiMdSession` shape reads the old shape and
writes the new one, and the manual smoke step 5 is run with a session saved by the previous version.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md).
