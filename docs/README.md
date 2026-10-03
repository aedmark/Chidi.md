# Documentation map

This directory stores durable project knowledge. Each fact has one authoritative home; other documents link to it.

## Audiences and ownership

| Document | Primary audience | Owns | Does not own |
| --- | --- | --- | --- |
| `../README.md` | Users and newcomers | Purpose, quick start | Internal workflow or session state |
| `../AGENTS.md` | Coding agents and maintainers | Standing working rules and conventions | Feature history or rationale |
| `../ROADMAP.md` | Maintainers and contributors | Planned scope and status | Implementation notes |
| `HANDOFF.md` | The next work session | Current state, next steps | Permanent design rules |
| `ARCHITECTURE.md` | Developers | Shape, interfaces, invariants, data flow | History |
| `DECISIONS.md` | Future decision-makers | Rationale; open questions | Routine detail |
| `TESTING.md` | Contributors | Check commands, coverage limits, pitfalls | Current results |
| `SECURITY.md` | Users and developers | Assets, trust boundaries, reporting | Incident history |
| `CONTRIBUTING.md` | Contributors | The development loop and submission | Agent-only instructions |
| `CHANGELOG.md` | Users | User-visible changes | Commit history |

## Update triggers

Update documents because a relevant fact changed, not merely because a session ended.

| Change | Required documentation |
| --- | --- |
| User-visible behaviour | README if onboarding changed; CHANGELOG |
| Component, interface, dependency, or data-flow change | ARCHITECTURE |
| Durable tradeoff or reversal | DECISIONS; mark the old decision superseded |
| Check command or known limitation change | TESTING |
| Key handling, trust boundary, or data sent to a provider | SECURITY |
| Work pauses with context another session needs | HANDOFF |
| Contribution workflow change | CONTRIBUTING and, if agents are affected, AGENTS |
| New planned work | ROADMAP, with origin and acceptance evidence |

## Style and evidence

- Lead with the reader's task or the current truth.
- Use exact commands and repository-relative paths.
- Label examples as examples. Never write a real-looking API key.
- Date volatile observations and name the browser and commit when it matters.
- Link to the source of truth instead of restating it.
