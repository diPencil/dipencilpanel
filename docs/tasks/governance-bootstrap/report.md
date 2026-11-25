# Governance Bootstrap - Delivery Report

**Task:** governance bootstrap.
**Date:** 2026-11-25.
**Branch:** `main` (285 uncommitted entries before this task; nothing was
committed).
**Status:** complete, with the gates green.

---

## 1. Outcome

The repository now has a single, linked governance chain: an agent contract in
[`../../../AGENTS.md`](../../../AGENTS.md), a ratified constitution in
[`../../../CONSTITUTION.md`](../../../CONSTITUTION.md), an engineering
constitution in [`../../constitution.md`](../../constitution.md), a system guide,
a module map, a design system with a form-controls contract, an ERD that mirrors
the schema, a six-phase workflow with a Risk Register, and a pinned inventory of
five vendored skill repositories.

A single command verifies the governance layer:
`python docs/scripts/verify-project.py` returns `PASS`.

---

## 2. Changes

| File | Change | Why |
| ---- | ------ | --- |
| `.agents/skills/*` | Five repositories cloned at depth 1, nested `.git` removed | Reproducible, pinned skill library |
| `docs/tooling/skills.md` | New inventory, trust rules and update procedure | Make the vendor tree usable and reviewable |
| `docs/tooling/skills.lock.json` | New lock file with commit, path, licence, size and capabilities | Pin what is vendored |
| `AGENTS.md` | Added section 0.1 agent contract; linked the new documents; corrected the API-auth status, port note, money paths and known gaps | Make the agent rules explicit and accurate |
| `docs/constitution.md` | New: layer responsibilities, import direction, security laws S1-S8, data laws D1-D8 | Turn the ratified articles into codebase rules |
| `docs/project-guide.md` | New: system map, request lifecycle, setup, ports, deployment, verification | One place to understand how the system runs |
| `docs/architecture/modules.md` | New: ownership map, public boundaries, import matrix, current debt | Define module ownership and legal imports |
| `docs/DESIGN_SYSTEM.md` | Added the form-controls contract, states, LTR/RTL rules, WCAG 2.2 AA additions and enforcement | Close the gap between tokens and actual controls |
| `docs/ERD.md` | New: Mermaid diagram, 19 model dictionaries, constraint inventory, schema gaps | Data model of record |
| `docs/workflow.md` | New: six phases, evidence rules, QA checklist, Risk Register R-01 to R-20 | Make every task provable |
| `README.md` | Added a governance and evidence section with links | Entry point for a new contributor |
| `docs/scripts/verify-project.py` | New: required files, links, English, em dash, skills lock | Automated governance check |
| `docs/scripts/check-ui-controls.py` | New: native controls and hex colour drift | Automated design-system check |
| `docs/tasks/README.md`, `docs/context/README.md` | New folder guides | Make the new directories self-explanatory |
| `scripts/check-no-ai-dash.mjs` | Added `.agents` to the skip list | Vendored skills are exempt |
| `eslint.config.mjs` | Ignored `.agents/**` and `.opencode/**` | Do not lint vendored code |
| `tsconfig.json` | Excluded `.agents` and `.opencode` | Do not type-check vendored code |

No application source file was deleted or rewritten.

---

## 3. Verification

| Command | Result | Evidence |
| ------- | ------ | -------- |
| `python docs/scripts/verify-project.py` | PASS: 16 files, 7 directories, 108 links, 15 English docs, no em dash, 5 pinned skills | `evidence/02-verify-project.txt` |
| `python docs/scripts/check-ui-controls.py` | 121 files, 77 findings: 24 date/time inputs, 7 native selects, 8 textareas, 38 hex colours (17 invoice hex exempt) | `evidence/06-ui-controls.txt` |
| `pnpm lint` | 0 errors, 370 warnings; dash check clean | `evidence/03-lint.txt` |
| `npx tsc --noEmit` | exit 0 | `evidence/04-tsc.txt` |
| `pnpm build` | success; `BUILD_ID=rMryEooaMuiG6ruTqbiX5` at 17:49:05 | `evidence/05-build.txt` |
| Skills lock validation | 5 repositories present, 40-character commits, discoverable `SKILL.md` | `evidence/07-skills-lock.txt` |
| Full claim audit (42 checks) | 42/42 passed: ERD vs schema, all numeric and path claims, risk IDs, WCAG wording | `evidence/08-claim-audit.txt` |

### 3.1 Correction made during the task

An early scan counted 517 `<select` matches, which was reported as native
selects. The count was case-insensitive and included 85 design-system `<Select>`
usages. A case-sensitive re-measurement found 7 native `<select>` elements. The
documents were corrected before delivery. This is recorded because the
zero-hallucination rule requires the report to describe what was measured, not
what was assumed.

### 3.2 Re-verification after the audit

A claim-by-claim audit compared every number, path and constraint stated in the
governance documents against the live codebase. It found stale file paths
(`lib/billing-utils.ts` instead of `lib/billing/billing-utils.ts`, bare script
names in tables) and one WCAG wording gap in `AGENTS.md`. All findings were
fixed, then both gates were re-run:

- `python docs/scripts/verify-project.py` -> `RESULT: PASS` (16 files, 7
  directories, 108 links, 15 English docs, 5 pinned skills).
- Claim audit -> 42/42 checks passed, including ERD field-level equality with
  `prisma/schema.prisma` (19 models, no missing and no invented fields) and all
  126 file paths mentioned in the documents existing on disk.

The audit script itself is outside the repository (it is a one-shot tool, not a
product gate); its full output is stored in `evidence/08-claim-audit.txt`.

---

## 4. Acceptance criteria

| # | Criterion | Status | Proof |
| - | --------- | ------ | ----- |
| 1 | Five pinned skill repositories under `.agents/skills/` | met | lock file, directory listing |
| 2 | Skills documented and locked | met | `docs/tooling/skills.md`, `docs/tooling/skills.lock.json` |
| 3 | Seven governance documents cross-linked | met | verify script, 108 links |
| 4 | English documentation, no em dash | met | verify script |
| 5 | Verification script green | met | `RESULT: PASS` |
| 6 | Application gates unaffected | met | lint, tsc, build |
| 7 | Durable task record | met | this folder |

---

## 5. Not tested

- **Browser behaviour:** no UI logic changed, so no browser session was run. The
  design-system changes are contractual text, not rendering changes.
- **Database:** no schema or query change, so `db:smoke` was not required for
  this task. The ERD was verified against `prisma/schema.prisma` by reading all
  19 models.
- **Vendored skill scripts:** none were executed. They are untrusted third-party
  content and are excluded from the build.
- **Commit or push:** deliberately not done. The working tree had 284
  uncommitted entries before this task and the owner has not asked for a commit.
- **RTL rendering:** not tested because the feature does not exist. The rules are
  documented; the gap is R-08.

---

## 6. Remaining risk

The live register is [`../../workflow.md`](../../workflow.md), section 8.
Highlights introduced or confirmed by this task:

- **R-11:** the vendored tree is about 117 MiB (122,332,655 bytes), dominated by
  the full `rea` monorepo at 92.8 MB.
- **R-14:** 285 uncommitted entries on `main`; there is no clean review baseline.
- **R-02:** `zod` is imported in 1 of 27 action files.
- **R-03:** invoice numbers are not unique in the database.
- **R-06:** 7 native selects, 24 native date/time inputs, 8 raw textareas.
- **R-08:** no RTL support.

No new security endpoint, dependency or schema change was introduced.

---

## 7. Follow-up

1. Commit the work in coherent slices (governance docs, tooling, config) so R-14
   stops growing.
2. Decide whether `.agents/skills/rea` is committed in full or restored from the
   lock file, and document the decision.
3. Add `@@unique([companyId, number])` to `Invoice` with a migration and a retry
   path (R-03).
4. Add zod schemas to the billing and auth actions first (R-02).
5. Convert one screen with native controls to the design-system controls and
   lower the R-06 baseline.
