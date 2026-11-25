# Governance Bootstrap - Plan

**Task:** establish the evidence-driven engineering workspace: vendored skills,
governance documents, verification scripts and task records.
**Owner:** Principal Lead Architect (System Custodian).
**Started:** 2026-11-25.
**Status:** complete.

---

## 1. Outcome

A new agent or developer can clone the repository, read one entry document, and
know exactly which rules bind the work, where each module lives, how the data is
modelled, how to prove a change, and which external skills are available and
pinned.

## 2. Acceptance criteria

| # | Criterion | How it is proven |
| - | --------- | ---------------- |
| 1 | Five external skill repositories exist under `.agents/skills/`, pinned by commit | `docs/tooling/skills.lock.json` plus directory listing |
| 2 | Skills are documented and locked | `docs/tooling/skills.md`, `docs/tooling/skills.lock.json` |
| 3 | Seven governance documents exist and cross-link | `docs/scripts/verify-project.py` link check |
| 4 | Documentation is English and free of em dashes | `docs/scripts/verify-project.py` language and dash checks |
| 5 | A verification script runs green | `docs/scripts/verify-project.py` exit 0 |
| 6 | Vendored skills do not break the app gates | `pnpm lint`, `tsc --noEmit`, `pnpm build` |
| 7 | The task leaves a durable record | this folder |

## 3. Out of scope

- Rewriting application code.
- Fixing the known debt (money as `Float`, zod coverage, native controls, RTL).
- Committing or pushing: the working tree already had 284 uncommitted entries.
- Pruning the `rea` monorepo.

## 4. Steps

1. Inspect the brownfield repository: stack, schema, scripts, git state.
2. Create the required directory structure.
3. Clone the five skill repositories with `--depth 1`, record the commit, remove
   nested `.git` directories.
4. Exclude `.agents` and `.opencode` from TypeScript, ESLint and the dash check.
5. Write the tooling inventory and lock file.
6. Write the governance documents and cross-link them.
7. Write `docs/scripts/verify-project.py` and `docs/scripts/check-ui-controls.py`.
8. Run the scripts, then the full application gate.
9. Record evidence and write the delivery report.

## 5. Risks considered

| Risk | Handling |
| ---- | -------- |
| Shell restarts kill long clones | Run clones in a detached process with a log file, then verify |
| Vendored code breaks lint or tsc | Exclude `.agents` and `.opencode` explicitly |
| Documentation drifts from code | Verify counts against a real scan; correct numbers before publishing |
| Large vendor tree | Pin commits and report the size as an accepted risk |
| Overwriting user work | Read-only inspection; no application file deleted or rewritten |
