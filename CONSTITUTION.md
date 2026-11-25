# diPencil Panel - Constitution

> The non-negotiable rules of this repository. A change that violates the
> constitution must not be merged - even if it "works". If a rule must change,
> change this document first, in a dedicated reviewed commit.

**Version:** 1.1 · **Ratified:** 2026-11-05 · **Scope:** the entire repository.

---

## Preamble

diPencil Panel is a multi-tenant back office that holds client identity,
service inventory, invoices and payment records. Mistakes here cost money and
leak data. These articles encode the minimum standard every contributor -
human or AI agent - must uphold.

---

## Article I - Data and tenant isolation

1. **Every business record belongs to exactly one `Company`.** New models MUST
   include `companyId` with a cascading relation to `Company`.
2. **Every query that returns tenant data MUST filter by the caller's
   `companyId`.** A `findMany`/`findFirst`/`updateMany` without a tenant filter
   is a defect, not a shortcut.
3. **Never trust an ID from the client.** Resolve the record with
   `where: { id, companyId }`; never `findUnique({ where: { id } })` alone for
   tenant-scoped data.
4. **Cascades are deliberate.** `onDelete: Cascade` for owned children,
   `Restrict` for records with financial value (clients, invoices),
   `SetNull` for optional links.
5. **Soft references** (plain ID strings without a foreign key, e.g.
   `MobileApp.domainId`) must be validated in the server action before use and
   must tolerate dangling IDs on read.

---

## Article II - Authentication and authorisation

1. **Every dashboard route requires a valid session.** The middleware and the
   server-side session check are both mandatory; client-side checks are not
   security.
2. **Every Server Action and Route Handler re-checks the session and the
   permission** - they are public HTTP endpoints regardless of where they are
   imported.
3. **Never expose a database dump, migration runner or filesystem endpoint
   without authentication and an explicit allow-list.** Known offenders
   (`/api/database`, `/api/websites/migrate`) are tracked in the README and must
   be closed before public deployment.
4. **Passwords are hashed with bcrypt (cost ≥ 12).** Never log, return or
   serialise a password hash.
5. **Secrets live in `.env` only.** Never commit credentials, tokens or real
   SMTP passwords. `.env.example` documents keys with placeholder values.
6. **Session cookies are `HttpOnly`, `SameSite=Lax` and `Secure` in
   production.**
7. **Authorisation is deny-by-default.** A missing permission means "no".

---

## Article III - Money, invoices and billing

1. **Never use binary floating point for authoritative money math.** Prisma
   `Float` is the current storage format; all arithmetic must go through
   `lib/billing/billing-utils.ts` / `lib/billing/invoice-utils.ts` with explicit
   rounding to
   two decimals at every boundary.
2. **Totals are derived, never guessed.** `subtotal`, `discountAmount`,
   `vatAmount` and `total` must satisfy
   `total = subtotal − discount + vat` (within rounding).
3. **Invoice numbers are unique per company and generated server-side.** Never
   accept a client-supplied number on create.
4. **Currency is explicit.** Every monetary row stores its `currency`; display
   conversion uses the company `exchangeRates`, never a hard-coded rate.
5. **Price changes must persist to the service record**, not only to the
   invoice line. A renewal invoice must reflect the current service price.
6. **Payments can never exceed the invoice total**, and deleting a payment must
   recompute the invoice `paymentStatus`.
7. **Issued invoices are append-only in spirit.** Corrections are new records
   (credit note / adjustment), not silent edits to historical totals.
8. **Email templates are data, not code.** Rendering must escape user-provided
   values and must never execute template content.

---

## Article IV - Database and migrations

1. **MySQL / MariaDB is the only supported database.** PostgreSQL, SQLite and
   their drivers, adapters and migrations must not be reintroduced.
2. **`prisma/schema.prisma` is the single source of truth.** Never hand-edit
   applied migration SQL; create a new migration.
3. **Every schema change ships with a migration** under `prisma/migrations/`.
   `prisma db push` is for local prototyping only and must not reach `main`.
4. **Long text and JSON columns use `@db.Text` or `@db.LongText`.** A bare
   `String` is `VARCHAR(191)` and will truncate real data.
5. **`TEXT`/`LONGTEXT` columns have no default value.** Initialise them in
   application code.
6. **Migrations must be reversible in intent.** Document destructive steps
   (dropped columns, narrowed types) in the PR description and back up before
   applying to production.
7. **Production deploys run `prisma migrate deploy`**, never `migrate dev` and
   never `migrate reset`.
8. **Seed data is idempotent.** Re-running `pnpm db:seed` must not duplicate
   companies, roles or users.

---

## Article V - Code and architecture

1. **TypeScript strictness is the baseline.** `any` requires a comment
   explaining why; `@ts-ignore`/`@ts-expect-error` require a linked issue.
2. **`ignoreBuildErrors` is technical debt, not policy.** The build must not
   regress; fix type errors instead of adding suppressions.
3. **Server-only code stays server-only.** Database access, secrets and
   privileged helpers live under `lib/*.server.ts` or server components; never
   import them into a `'use client'` module.
4. **Server Actions own mutations.** Route Handlers are for exports, webhooks
   and streaming - not for form CRUD that could be an action.
5. **Validate every input at the boundary** with `zod` before it reaches
   Prisma.
6. **Return typed results** (`{ success: true } | { success: false, error }`)
   from actions; do not throw raw errors to the client.
7. **No dead code.** Delete unused files, exports and dependencies in the same
   change that orphans them.
8. **Prefer composition over duplication.** If two features need the same
   logic, extract it to `lib/` with tests.

---

## Article VI - Interface and accessibility

1. **`docs/DESIGN_SYSTEM.md` is binding.** Semantic tokens only; no raw hex.
2. **WCAG 2.1 AA is the floor.** Keyboard access, visible focus, labelled
   controls, sufficient contrast in both themes.
3. **Every async view handles four states:** loading, empty, error, populated.
4. **Destructive actions require confirmation** and name the object being
   destroyed.
5. **Both light and dark mode must be verified** before a UI change is
   considered done.
6. **Mobile is not an afterthought.** Every screen must work from 360px up.

---

## Article VII - Verification

1. **A change is not done until it is verified.** Minimum gate:
   `pnpm lint` and `pnpm build` pass.
2. **Schema changes require a live check** against MySQL: migrate, generate,
   seed, and exercise the affected query.
3. **Bug fixes require a reproduction** (test, script or documented manual
   steps) that fails before and passes after.
4. **Never disable a failing check to make CI green.** Fix the cause or revert.
5. **Performance regressions are bugs.** Avoid N+1 queries; select only the
   columns a view needs.

---

## Article VIII - Documentation

1. **`README.md` must let a new developer go from clone to logged-in** without
   asking a question.
2. **Setup, environment variables and database commands are documented in one
   place** - the README - and kept in sync with the code.
3. **Every new environment variable is added to `.env.example`** in the same
   commit.
4. **Architectural decisions that are expensive to reverse get an ADR** under
   `docs/adr/` (context, decision, consequences).
5. **Known security gaps and known bugs are documented, not hidden.** See
   "Security notes" in the README.

---

## Article IX - Version control and review

1. **`main` is always deployable.** Work happens on a branch; merges are
   reviewed.
2. **Commit messages describe intent** (`fix(invoices): persist domain price on
   renewal`), not activity (`update files`).
3. **One logical change per commit/PR.** Do not mix refactors with behaviour
   changes.
4. **Never commit** `node_modules`, `.next`, `.env`, local databases, or build
   artefacts.
5. **Reviewers check the constitution**, not just the diff: tenant filters,
   auth checks, money math, migration safety, accessibility.
6. **AI-generated changes follow the same rules.** The author is accountable
   for every line, regardless of who typed it.

---

## Article X - Amendments

1. Any contributor may propose an amendment via a PR that edits this file.
2. An amendment requires review by a maintainer and a short rationale in the
   commit message.
3. The version number increases on every amendment; the effective date is the
   merge date.
4. Removing a rule requires stating what replaces it. Silence is not a
   replacement.

---

## Article XI - No AI-style dash

1. **The em dash character (U+2014) is prohibited in first-party project
   content.** This includes UI copy, emails, invoices, PDFs, code comments,
   documentation, commit messages, metadata and generated text.
2. **Use a comma, colon, period, parentheses or a plain hyphen-minus (`-`)
   instead.** The goal is to remove the character, not to remove the pause.
3. **Vendored third-party content under `.opencode/skills/`, generated
   lockfiles and binary assets are exempt.** Do not rewrite upstream files to
   satisfy this rule.
4. **`pnpm check:no-ai-dash` enforces the rule.** A failing check blocks the
   change; run it with `--fix` only for a mechanical cleanup you intend to
   review.

---

## Quick reference - the non-negotiables

1. Filter every tenant query by `companyId`.
2. Re-check auth in every action and route handler.
3. Hash passwords; never log secrets.
4. Round money explicitly; derive totals.
5. MySQL only; schema changes ship migrations.
6. Long text uses `@db.Text`/`@db.LongText`.
7. Validate inputs with `zod`.
8. Use design tokens; meet WCAG AA in both themes.
9. `pnpm lint` and `pnpm build` must pass.
10. Document what you change - README, `.env.example`, ADRs.
11. Never use the em dash character (U+2014) in first-party content.
