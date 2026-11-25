# Task Records

Every non-trivial change leaves a record here. The lifecycle that produces these
records is defined in [`../workflow.md`](../workflow.md).

---

## Structure

```text
docs/tasks/<task-name>/
  plan.md        the plan, kept current while the work runs
  report.md      the delivery record, written at the end
  evidence/      command output, JSON, logs and screenshots
```

`<task-name>` is short, lowercase and hyphenated, for example
`invoice-number-uniqueness` or `clients-server-component-migration`.

---

## Rules

1. Create the folder during phase 1 of the workflow, not after the code is done.
2. `plan.md` states the outcome, acceptance criteria, out-of-scope items and the
   ordered steps.
3. `evidence/` files are named by what they prove, for example:

   ```text
   01-lint.txt
   02-tsc.txt
   03-build.txt
   04-api-response.json
   05-after.png
   ```
4. `report.md` follows the template in [`../workflow.md`](../workflow.md),
   section 7.
5. Reports and evidence notes are written in English.
6. Never delete a record. A superseded task is marked as superseded and linked to
   its replacement.

---

## What does not need a task folder

- A typo or comment fix.
- A dependency bump with no behaviour change.
- A read-only investigation that produces no code change (put the findings in the
  relevant document instead).

Everything else does. When in doubt, create the folder; an empty evidence
directory is cheaper than an unverifiable claim.
