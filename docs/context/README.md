# Context Snapshots

This folder holds durable context that is too specific for the governance
documents but too useful to rediscover on every session.

---

## What belongs here

| File | Purpose |
| ---- | ------- |
| `environment.md` | Machine, runtime, port and database notes that are true for this workspace |
| `decisions.md` | Short decision log with date, decision and reason |
| `<topic>.md` | Focused investigations that future agents should not repeat |

## What does not belong here

- Secrets, tokens, passwords or connection strings with credentials.
- Customer data or database dumps.
- Temporary notes that belong in `docs/tasks/<task>/`.

---

## Snapshot format

A context note answers four questions:

1. **Observed:** what was measured or read, with the command or file.
2. **Meaning:** what it implies for the work.
3. **Valid until:** when the observation expires (a date, a version, a migration).
4. **Owner:** who can confirm it.

Context is not law. If a snapshot disagrees with
[`../constitution.md`](../constitution.md) or the code, the code and the
constitution win, and the snapshot must be corrected.
