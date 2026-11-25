# Task Workflow and Risk Register

> The mandatory lifecycle for any non-trivial change, the evidence a task must
> leave behind, and the live list of known risks. Skipping a phase is a process
> defect even when the code works.

**Related:** [`constitution.md`](constitution.md), [`../AGENTS.md`](../AGENTS.md),
[`project-guide.md`](project-guide.md).

---

## 1. When this workflow applies

| Change size | Phases required |
| ----------- | --------------- |
| Typo, comment, one-line copy fix | 1, 2, 4, 6 |
| Single-file bug fix | 1, 2, 4, 5, 6 |
| Feature touching more than two files | all six |
| Schema change | all six, plus the database evidence in phase 4 |
| Security-sensitive change (auth, payments, exports) | all six, plus the security review in phase 5 |
| UI change | all six, plus the browser evidence in phase 4 |

A task that cannot complete a phase is reported as blocked, with the reason.
Silent partial completion is prohibited.

---

## 2. Phase 1 - Define the outcome

Write down, before touching code:

1. **Outcome:** one sentence describing the observable result.
2. **Acceptance criteria:** a numbered list where each item can be proven by a
   command, a request or a screenshot.
3. **Out of scope:** what will not change, to stop scope creep.
4. **Existing code reviewed:** the files and screens inspected first.
5. **Risk guess:** what could break, and who is affected.

If the ask is ambiguous, stop and ask one question at a time. Guessing the
requirement is a defect (see the zero-hallucination rule in
[`../AGENTS.md`](../AGENTS.md)).

**Exit criteria:** the owner agrees the acceptance criteria are correct.

---

## 3. Phase 2 - Capture the context snapshot

Record the state before the change:

```powershell
git status --short
git log --oneline -5
git branch --show-current
```

Then:

1. Read the files you intend to change, and their callers.
2. Confirm no uncommitted work already touches them. Never overwrite user work.
3. Note the migration state (`prisma/migrations/`) and the current data shape if
   the task touches the database.
4. Note the dev server port actually in use.
5. Save the snapshot in the task folder as `evidence/context.txt`.

**Exit criteria:** you can explain how the current code works without guessing.

---

## 4. Phase 3 - Implement incrementally

1. One logical change at a time. Do not mix a refactor with a behaviour change.
2. Write the smallest slice that can be verified, then verify it.
3. For logic, write the failing test first, then make it pass, then refactor.
4. Keep the diff reviewable. If it exceeds roughly 400 changed lines, split it.
5. Update `plan.md` as you go: what was done, what was learned, what changed.
6. Do not touch unrelated files to "clean up" while implementing.

**Exit criteria:** each slice is independently reviewable and verifiable.

---

## 5. Phase 4 - Verification and proof

Evidence is produced, not claimed.

### 5.1 Universal gate

```powershell
pnpm lint
npx tsc --noEmit
pnpm build
python docs/scripts/verify-project.py
```

All four must pass. `pnpm lint` also enforces the no-em-dash rule.

### 5.2 Conditional gate

| Change type | Additional evidence |
| ----------- | ------------------- |
| Database or schema | `pnpm db:migrate`, `pnpm db:generate`, `pnpm db:smoke`, plus the affected query result |
| Money or invoices | `pnpm check:money`, plus a reconciliation of the affected totals |
| Server Action or API | A real request and the resulting database row or response body |
| Auth or permissions | A negative test: unauthenticated and wrong-role requests are rejected |
| UI | Browser check at 360, 768 and 1440 px, both themes, keyboard only |
| Performance | A before and after measurement, not an estimate |

### 5.3 Save the evidence

Write command output, response bodies and screenshots into
`docs/tasks/<task-name>/evidence/`. Name files by what they prove, for example:

```text
01-lint.txt
02-tsc.txt
03-build.txt
04-api-response.json
05-before.png
06-after.png
```

**Exit criteria:** a reviewer can reproduce every claim from the evidence folder.

---

## 6. Phase 5 - QA checklist

Security:

- [ ] Session checked in every new action and route.
- [ ] Permission checked before the record lookup.
- [ ] Every query filters by `companyId`.
- [ ] Client-supplied IDs resolved with `{ id, companyId }`.
- [ ] Inputs parsed with `zod`; business rules validated after parsing.
- [ ] No secret, hash or password in a response or a log.
- [ ] No new unauthenticated endpoint.
- [ ] No raw SQL with interpolated input.

Data:

- [ ] Multi-row writes are in a transaction.
- [ ] Retries cannot duplicate rows.
- [ ] Money rounded to two decimals; totals reconcile.
- [ ] Payments cannot exceed the invoice total.
- [ ] Migration exists and `ERD.md` is updated.

Interface:

- [ ] Loading, empty, error and populated states.
- [ ] Semantic tokens only; no new hex.
- [ ] Design-system controls, not native `<select>` or raw date inputs.
- [ ] Labels, `aria-label` on icon buttons, visible focus.
- [ ] Keyboard reachable; dialogs trap focus and close on `Esc`.
- [ ] Light and dark themes; 360 px and up.

Hygiene:

- [ ] No `@ts-ignore`, `eslint-disable` or `ignoreBuildErrors` added.
- [ ] No dead code or unused dependency left behind.
- [ ] `README.md`, `.env.example` and ADRs updated when affected.
- [ ] No secret, dump or local artefact staged.

**Exit criteria:** every box is either true or explicitly waived with a reason.

---

## 7. Phase 6 - Delivery record

Every task folder contains `report.md`. Complex tasks also keep `plan.md` and
`evidence/`.

```text
docs/tasks/<task-name>/
  plan.md        the plan, kept current during the work
  report.md      the final delivery record
  evidence/      command output, JSON, screenshots, logs
```

`report.md` uses this shape:

```markdown
# <Task name>

## Outcome
One paragraph: what now works that did not before.

## Changes
| File | Change | Why |
| ---- | ------ | --- |

## Verification
| Command | Result | Evidence file |
| ------- | ------ | ------------- |

## Acceptance criteria
| # | Criterion | Status | Proof |
| - | --------- | ------ | ----- |

## Not tested
Explicit list of paths that were not exercised, and why.

## Remaining risk
Links to Risk Register entries affected or created.

## Follow-up
Small, concrete next tasks.
```

Rules:

1. The report describes what happened, not what was intended.
2. Failed or skipped checks are listed, never omitted.
3. "Done" requires the definition of done in [`../AGENTS.md`](../AGENTS.md).
4. The report is written in English.

---

## 8. Risk Register

Status values: **open**, **mitigating**, **accepted**, **closed**.
Severity is impact x likelihood: high, medium, low.

| ID | Risk | Evidence | Impact | Severity | Status | Mitigation / next step |
| -- | ---- | -------- | ------ | -------- | ------ | ---------------------- |
| R-01 | Money stored as `Float` | `prisma/schema.prisma` uses `Float` on all monetary columns | Rounding drift on totals and reports | High | open | Keep all math in `lib/billing/*` with 2-decimal rounding; plan a `DECIMAL(12,2)` migration with a backfill |
| R-02 | `zod` coverage far below the rule | 1 of 27 action files imports `zod` | Unvalidated payloads reach Prisma | High | open | Add one schema per action, starting with billing and auth; review requires a schema |
| R-03 | Invoice number not unique in the database | `Invoice.number` has no unique index | Duplicate numbers under concurrency | High | open | Add `@@unique([companyId, number])` plus a retry on conflict |
| R-04 | Raw error text returned to clients | 98 `error: String(error)` returns in `app/actions` | Leaks internals, poor UX | Medium | open | Return stable messages; log details server-side |
| R-05 | Shared client data context loads the whole tenant | `context/InvoiceContext.tsx` bulk read actions | Large payloads, slow pages, hard tenancy reasoning | Medium | mitigating | Freeze the context; new screens use server components; migrate one screen per task |
| R-06 | Native controls remain in product code | 7 raw `<select>`, 24 native date/time/colour inputs and 8 raw `<textarea>` elements; 85 design-system `<Select>` usages show the intended pattern | Breaks the controls contract and mobile UX | Medium | open | New and touched screens must use `components/ui/*`; track the count down with `docs/scripts/check-ui-controls.py` |
| R-07 | 55 hex colours in 3 TSX files, 38 outside the invoice template | `app/` and `components/` scan | Theme drift, dark mode defects | Medium | open | Move to semantic tokens; invoice and email templates are the documented exception |
| R-08 | No RTL support | `app/layout.tsx` sets `lang="en"` only | Arabic UI is unusable | Medium | open | Add locale and `dir` handling as a feature with mirrored layout tests |
| R-09 | WCAG 2.2 AA not fully verified | No automated audit recorded; 24 raw date/time inputs | Accessibility non-conformance | Medium | open | Run an axe audit, fix target size and focus-not-obscured, verify keyboard paths |
| R-10 | Default admin credentials documented | README bootstrap login | Account takeover if deployed unchanged | High | open | Force a password change on first login; block deployment until rotated |
| R-11 | Vendored skills are about 117 MiB | `.agents/skills` measurement | Slow clones, accidental large commits | Medium | accepted | Pinned in `docs/tooling/skills.lock.json`; owner may prune `rea` later |
| R-12 | SMTP, PDF export and SSH migration not end-to-end verified | Prior audit notes | Features may fail in production | Medium | open | Send a real test email, export a real PDF, run one migration against a staging host |
| R-13 | Next 16 `middleware` to `proxy` deprecation | Build warning | Future upgrade breakage | Low | accepted | Migrate in a dedicated task when the upgrade path is confirmed |
| R-14 | 284 uncommitted changes on `main` | `git status --short` count | Lost work, unclear review baseline | High | open | Commit or stash in coherent slices before starting new work |
| R-15 | Soft references can dangle | `MobileApp.domainId`, `hostingId`, `vpsId`, `emailIds`, `Subscription.serviceId`, `ReminderLog.clientId`, `BusinessEmail.clientId` | Broken links, orphaned data | Medium | open | Validate on write against `companyId`; tolerate missing rows on read |
| R-16 | `InvoiceItem` has no `companyId` | Schema | Direct item queries can cross tenants | Medium | open | Always scope through the parent invoice; add `companyId` in a future migration if needed |
| R-17 | `WebsiteMigration` stores SSH credentials | Schema, encrypted column | Credential exposure if decrypted or exported | High | mitigating | Never return the password; exclude it from `/api/database`; rotate after use |
| R-18 | `pnpm build` and `next dev` compete for `.next` | Local observation | Corrupted dev state or failed build | Low | open | Stop the dev server before a production build, or build in a worktree |
| R-19 | REA MCP disabled by default | `opencode.jsonc` | Reverse-engineering tasks need approval and a 49 MB download | Low | accepted | Enable only for a genuine artifact analysis task |
| R-20 | Repository has two governance roots | `CONSTITUTION.md` and `docs/constitution.md` | Confusion about which rule wins | Low | mitigating | Precedence is stated in both files; `docs/constitution.md` defers to the ratified articles |

Update the register in the same task that discovers or closes a risk. A risk
removed from this table must be marked **closed** with the evidence that closed
it, not deleted.

---

## 9. Escalation

Stop and ask the owner before:

- a destructive migration, `db reset`, or deleting user data;
- adding a dependency or an MCP server;
- changing the database provider, auth model or deployment topology;
- enabling the REA toolchain for the first time;
- bulk or metered generation through the 21st.dev MCP server;
- any change that would weaken a gate in this document.

When blocked, report: what you tried, what happened, what you need, and the
safest fallback.
