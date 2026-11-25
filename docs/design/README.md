# Design Notes

This folder holds design exploration that supports the binding contract in
[`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). It never overrides that document.

---

## What belongs here

| Item | Format |
| ---- | ------ |
| Screen explorations and alternatives | Markdown with links to images in `docs/tasks/<task>/evidence/` |
| Design decisions that are not yet tokens | Markdown with a date, context and decision |
| Component proposals | Markdown that names the primitive and the token mapping |
| Review notes from a UI audit | Markdown with findings and the fix that landed |

## What does not belong here

- Production components. They live in `components/`.
- Tokens. They live in `app/globals.css` and are documented in
  [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).
- Large binary files. Screenshots belong in the evidence folder of the task that
  produced them, so they stay tied to a verifiable claim.
- A competing style guide. If a note disagrees with the design system, the design
  system wins until it is amended through review.

---

## Naming

`YYYY-MM-DD-<topic>.md`, for example `2026-11-25-invoice-list-density.md`.

Every note ends with:

1. **Decision:** what was chosen.
2. **Reason:** why it beats the alternative.
3. **Follow-up:** the task that implements it, or "none".

Task records and their evidence follow
[`../tasks/README.md`](../tasks/README.md). The lifecycle that produces them is in
[`../workflow.md`](../workflow.md).
