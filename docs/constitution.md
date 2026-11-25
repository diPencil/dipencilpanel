# Engineering Constitution

> The engineering law of the repository: layer ownership, security boundaries and
> data-integrity rules. It translates the ratified articles in
> [`../CONSTITUTION.md`](../CONSTITUTION.md) into concrete rules for this
> Next.js codebase.

**Version:** 1.0
**Ratified:** 2026-11-25
**Owner:** Principal Lead Architect (System Custodian)
**Applies to:** every human contributor, every AI agent, every automated tool.

---

## 0. Precedence

The documents bind in this order. A lower document may never weaken a higher one.

1. [`../CONSTITUTION.md`](../CONSTITUTION.md) - the ratified articles. Supreme.
2. This file - engineering rules that implement those articles.
3. [`../AGENTS.md`](../AGENTS.md) - the agent operating contract and roles.
4. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - binding for every pixel.
5. [`workflow.md`](workflow.md) - the mandatory task lifecycle.

If this file and the ratified constitution disagree, the ratified constitution
wins and this file must be corrected in a dedicated commit.

If a request conflicts with any of the above, stop, state the conflict, propose a
compliant alternative, and wait for explicit approval. Convenience is not a
reason to break a rule.

---

## 1. Layer responsibilities

The application is a Next.js 16 App Router project. Each layer has exactly one
job. Code that does two jobs is moved, not duplicated.

| Layer | Location | Owns | Must not |
| ----- | -------- | ---- | -------- |
| Route entry | `middleware.ts` | Coarse session gate and redirects for page routes | Make authorisation decisions that the page or action does not repeat |
| Pages (server) | `app/**/page.tsx`, `app/**/layout.tsx` | Data loading for one screen, composition, the four UI states | Contain mutation logic, business rules or raw SQL |
| Client views | `app/**/*-client.tsx`, files with `'use client'` | Interaction, local UI state, calling Server Actions | Read the database, import `lib/db/*`, or hold secrets |
| Reusable product components | `components/<feature>/*` | Feature-specific presentation and forms | Own data fetching or billing rules |
| Design primitives | `components/ui/*` | Accessible, unstyled-by-default building blocks | Contain business logic or feature copy |
| Shared shell | `components/layout/*`, `components/shared/*` | Navigation, header, dialogs, empty states | Import feature modules |
| Server Actions | `app/actions/<domain>/*.ts` | The only mutation boundary for forms, session plus permission checks, input validation, transaction orchestration | Return raw errors, trust client IDs, or format money by hand |
| Route Handlers | `app/api/**/route.ts` | Exports, imports, webhooks, streaming | Implement form CRUD that belongs in a Server Action |
| Business logic | `lib/billing/*`, `lib/services/*`, `lib/email/*`, `lib/migration/*`, `lib/export/*` | Pure or server-only domain rules, money math, templates | Import React, touch cookies, or know about request objects |
| Auth and tenancy | `lib/auth/*` | Session verification, permission checks, API guards | Render UI or contain feature-specific rules |
| Data access | `lib/db/prisma.ts` | The single Prisma client singleton | Leak the client into a `'use client'` module |
| Schema | `prisma/schema.prisma`, `prisma/migrations/*` | Tables, relations, indexes, migration history | Be edited outside a migration |

### 1.1 Import direction

Imports flow downward only. An arrow means "may import".

```text
app/**/page.tsx  ->  app/actions/*   ->  lib/<domain>/*  ->  lib/auth/*  ->  lib/db/*
app/**/page.tsx  ->  components/*    ->  components/ui/*
components/**    -X->  lib/db/*            (forbidden)
components/**    -X->  app/actions/*       (forbidden; pass callbacks from the page instead)
lib/<domain>/*   -X->  components/*        (forbidden)
lib/<domain>/*   -X->  app/**             (forbidden)
```

Additional rules:

1. **Cross-module access uses a public barrel.** A module exposes its surface
   through `lib/<domain>/index.ts` or `app/actions/<domain>/index.ts`. Importing
   a deep internal file from another module is only allowed when the barrel does
   not export the symbol yet; add it to the barrel in the same change.
2. **No circular imports.** If two modules need each other, extract the shared
   part into `lib/core/` or `lib/services/`.
3. **Server-only code stays server-only.** Any file that touches Prisma,
   cookies, `process.env` secrets or Node APIs is a server module. Name it
   `*.server.ts` when the boundary is otherwise ambiguous.
4. **`lib/core/` is presentation-safe.** Formatting and types may be imported by
   client components; everything else under `lib/` assumes the server unless it
   is explicitly typed otherwise.

See [`architecture/modules.md`](architecture/modules.md) for the module map and
the full dependency matrix.

---

## 2. Security laws

Security is a property of the server. A hidden button is not a permission.

### S1 - Authenticate at the boundary

Every Server Action and Route Handler re-checks the session. Middleware is a
convenience gate, never the only check.

- Session: `getSession()` from `lib/auth/auth.ts`.
- API: `requireApiSession()` from `lib/auth/api-auth.ts`; it returns a typed
  result instead of throwing.
- Never trust an identifier supplied by the client.

### S2 - Authorise by permission and tenant

1. Check the permission (`hasPermission`) before the record lookup.
2. Resolve every tenant record with `where: { id, companyId }`. Never
   `findUnique({ where: { id } })` on tenant data.
3. For API routes that receive a company identifier, call
   `requireCompanyAccess(...)` and reject cross-tenant IDs.
4. Deny by default. A missing permission means no.

### S3 - Validate before Prisma

1. Parse every external input with `zod` at the boundary: form data, JSON
   bodies, query parameters, route parameters and file metadata.
2. Reject unknown keys. Coerce numbers and dates explicitly.
3. Validate business rules that zod cannot express (ownership of a linked ID,
   date ordering, allowed state transitions) immediately after parsing and
   before any write.
4. Soft references (plain ID columns without a foreign key) must be validated
   against the same `companyId` before use, and must tolerate dangling IDs on
   read.

### S4 - Parameterised queries only

Prisma is parameterised by default. Raw SQL is allowed only through tagged
templates (`$queryRaw`, `$executeRaw`) and never through
`$queryRawUnsafe`/`$executeRawUnsafe` with interpolated user input. Any raw SQL
must carry a comment explaining why Prisma's query API is insufficient.

### S5 - Secrets and personal data

1. Secrets live in `.env`. Never log, return or serialise a token, password
   hash, SMTP password, IMAP password or migration SSH password.
2. `WebsiteMigration.password` is encrypted at rest. Never decrypt it for
   display; never include it in an export.
3. Error responses are generic to the client and detailed only in server logs.
4. Database dumps are never publicly reachable. `/api/database` is super-admin
   only and must stay that way.

### S6 - Session hardening

Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Passwords
are hashed with bcrypt at cost 12. A password change invalidates prior sessions
where the session payload allows it.

### S7 - Untrusted output

Email templates, invoice HTML and imported content are data. Escape
user-provided values before rendering, never execute template content, and never
pass untrusted HTML to a client component without sanitisation.

### S8 - No new unauthenticated surface

Adding a public route requires explicit owner approval, a written threat note
and an entry in the Risk Register in [`workflow.md`](workflow.md).

---

## 3. Data-integrity laws

### D1 - One tenant per record

Every business model has `companyId` with a cascading relation to `Company`.
`Role`, `Client`, all services, `Subscription`, `Invoice`, `Payment`,
`ReminderLog`, `BusinessEmail` and `WebsiteMigration` are tenant-scoped.

### D2 - Explicit money

1. Storage uses Prisma `Float` today; that is known debt, not a licence to guess.
2. All arithmetic goes through `lib/billing/billing-utils.ts`,
   `lib/billing/invoice-utils.ts` or `lib/billing/money.ts`.
3. Round to two decimals at every boundary.
4. Invariants: `total = subtotal - discountAmount + vatAmount`, and the sum of
   successful payments never exceeds `total`.
5. Deleting or refunding a payment recomputes `paymentStatus`.

### D3 - Transactions for multi-write operations

Any operation that writes more than one row (invoice plus items, payment plus
invoice status, service plus subscription) runs inside `prisma.$transaction`.
Partial writes are defects.

### D4 - Idempotency

1. Seeds are idempotent. Re-running `pnpm db:seed` must not duplicate companies,
   roles or users.
2. Migration and import endpoints must tolerate a retry without duplicating
   rows.
3. Reminder sends are deduplicated through `ReminderLog` before the email is
   dispatched.

### D5 - Backward-compatible schema changes

Use expand and contract:

1. Expand: add nullable columns or new tables, deploy code that writes both.
2. Migrate: backfill in a bounded, resumable job.
3. Contract: drop the old column only after the new path is verified in
   production.

A migration must be reversible in intent, and destructive steps are named in the
delivery record before they run.

### D6 - Long text and JSON

`@db.Text` or `@db.LongText` for free text and JSON payloads. `TEXT` columns have
no database default; initialise them in application code.

### D7 - Keys and cascades

Owned children cascade from their parent. Records with financial value
(`Client`, `Invoice`) use `Restrict`. Optional links use `SetNull`. A new
relation must state its cascade behaviour in the review.

### D8 - Single source of truth

`prisma/schema.prisma` defines the database. [`ERD.md`](ERD.md) mirrors it and
must be updated in the same task as any schema change. If they disagree, the
schema is right and the document is a bug.

---

## 4. Interface law

The visual contract is [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). The non-negotiables:

1. Semantic tokens only. No raw hex, no arbitrary palette classes.
2. Compose `components/ui/*`. Never fork a primitive into a feature folder.
3. Every async view handles loading, empty, error and populated.
4. Destructive actions confirm and name the object.
5. WCAG 2.2 AA, keyboard reachable, visible focus, labelled controls.
6. Both themes and 360 px and up are verified before "done".

---

## 5. Verification law

A change is done only when the evidence exists. The minimum gate is in
[`workflow.md`](workflow.md), phase 4.

1. Never claim a test, build, request or database result that was not observed.
2. Never weaken a check to reach green: no `ignoreBuildErrors`, no blanket
   `@ts-ignore`, no disabled lint rule, no deleted test.
3. A bug fix ships with a reproduction that failed before and passes after.
4. Performance claims need a before and after measurement.
5. Unverified paths are reported as unverified, not as working.

---

## 6. Amendment procedure

1. Propose the change in a dedicated commit that edits this file.
2. Add the rationale, the affected layers and the migration impact.
3. Increase the version number and update the date.
4. Removing a rule requires stating what replaces it.
5. The owner approves before the rule takes effect. Agents may not amend the
   constitution on their own authority.

---

## 7. Related documents

- [`../CONSTITUTION.md`](../CONSTITUTION.md) - ratified articles
- [`../AGENTS.md`](../AGENTS.md) - agent contract and role matrix
- [`project-guide.md`](project-guide.md) - how the system runs
- [`architecture/modules.md`](architecture/modules.md) - module ownership
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - visual and accessibility contract
- [`ERD.md`](ERD.md) - data model of record
- [`workflow.md`](workflow.md) - task lifecycle and risk register
- [`tooling/skills.md`](tooling/skills.md) - vendored skills and trust rules
- [`../README.md`](../README.md) - setup entry point
