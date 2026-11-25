# Module Architecture and Ownership

> Who owns what, where the boundary is, and which imports are legal. This file
> is the map used during review: a change that crosses a boundary without a
> public interface is a defect, even if it compiles.

**Related:** [`../constitution.md`](../constitution.md),
[`../project-guide.md`](../project-guide.md), [`../ERD.md`](../ERD.md).

---

## 1. Module ownership map

| Module | Screens | Components | Mutations (Server Actions) | Domain logic | Primary models |
| ------ | ------- | ---------- | -------------------------- | ------------ | -------------- |
| Tenancy and auth | `app/login`, `app/dashboard/management` | `components/layout` | `app/actions/auth/*` | `lib/auth/*` | `Company`, `Role`, `User` |
| Clients | `app/dashboard/clients` | `components/clients` | `app/actions/clients/clients.ts` | `lib/core/types` | `Client`, `ClientGroup` |
| Domains and transfers | `app/dashboard/domains` | `components/domains` | `app/actions/services/domains.ts`, `app/actions/services/transfers.ts` | `lib/services/hosting-domain.ts`, `lib/services/subscription-service-id.ts` | `Domain`, `DomainTransfer` |
| Hosting | `app/dashboard/hosting` | `components/hosting` | `app/actions/services/hosting.ts` | `lib/services/hosting-*`, `lib/services/panel-url.ts` | `Hosting` |
| VPS | `app/dashboard/vps` | `components/vps` | `app/actions/services/vps.ts` | `lib/services/subscription-display-status.ts` | `VPS` |
| Business email | `app/dashboard/emails` | (shared tables) | `app/actions/services/emails.ts` | `lib/email/*` | `Email`, `BusinessEmail` |
| Websites | `app/dashboard/websites` | `components/websites` | `app/actions/services/websites.ts` | `lib/services/website-type-options.ts` | `Website` |
| Mobile apps | `app/dashboard/mobile-apps` | `components/mobile-apps` | `app/actions/services/mobile-apps.ts` | `lib/services/subscription-service-id.ts` | `MobileApp` |
| Subscriptions | `app/dashboard/billing/subscriptions` | `components/subscriptions` | `app/actions/billing/subscriptions.ts` | `lib/services/hosting-renew-eligibility.ts` | `Subscription` |
| Invoices | `app/dashboard/billing/invoices`, `dipencil-invoices` | `components/invoices` | `app/actions/billing/invoices.ts`, `app/actions/billing/invoice-email.ts` | `lib/billing/invoice-utils.ts`, `lib/billing/billing-utils.ts` | `Invoice`, `InvoiceItem` |
| Payments | `app/dashboard/billing/payments` | `components/invoices` | `app/actions/billing/payments.ts` | `lib/billing/money.ts` | `Payment` |
| Reminders and email drafts | `app/dashboard/billing/reminders`, `business-emails` | `components/reminders`, `components/business-emails` | `app/actions/communications/*` | `lib/email/*` | `ReminderLog`, `BusinessEmail` |
| Website migration | `app/dashboard/websites` | `components/websites` | `app/api/websites/migrate/**` | `lib/migration/*` | `WebsiteMigration` |
| Settings and branding | `app/dashboard/settings` | `components/settings` | `app/actions/communications/email-config.ts`, `app/actions/auth/company.ts` | `lib/billing/dipencil-invoice-branding.ts` | `Company` |
| Storage and backup | `app/dashboard/storage` | (shared) | `app/api/database/route.ts` | `lib/services/storage-utils.ts` | all models (export) |
| Search | header command palette | `components/layout` | `app/actions/search/search.ts` | (thin) | read-only |
| Export | dashboard export buttons | (shared) | none | `lib/export/dashboard-export.ts` | read-only |

`app/dashboard/resources`, `app/dashboard/help` and `app/dashboard/agents` are
informational screens and own no data.

---

## 2. Public boundaries

A module is a folder plus a contract. Everything not exported by its barrel is
private.

| Module | Public surface |
| ------ | -------------- |
| Auth | `app/actions/auth/index.ts`, `lib/auth/index.ts` |
| Clients | `app/actions/clients/index.ts` |
| Billing | `app/actions/billing/index.ts`, `lib/billing/index.ts` |
| Services | `app/actions/services/index.ts`, `lib/services/index.ts` |
| Communications | `app/actions/communications/index.ts`, `lib/email/index.ts` |
| Migration | `lib/migration/index.ts` |
| Export | `lib/export/index.ts` |
| Core | `lib/core/index.ts` |
| Database | `lib/db/index.ts` (server only) |
| UI primitives | `components/ui/*` (import the file, not an index) |

Rules:

1. **No deep imports across modules.** `components/domains/*` may not import
   `app/actions/billing/invoices.ts`; it calls the action passed from the page or
   imports from the barrel.
2. **A new export is a contract change.** Add it to the barrel and mention it in
   the delivery record.
3. **Feature components own presentation, not policy.** A component may decide
   how to render a discount; it may not decide how a discount is calculated.
4. **Shared widgets live in `components/shared/`.** If two features need the
   same table or dialog, extract it instead of copying.

### 2.1 Import matrix

| From \ To | `components/ui` | `components/<feature>` | `app/actions` | `lib/<domain>` | `lib/db` |
| --------- | --------------- | ---------------------- | ------------- | -------------- | -------- |
| `app/**/page.tsx` | yes | yes | yes | yes | yes, server only |
| client component | yes | yes | yes | `lib/core` only | **no** |
| `components/<feature>` | yes | same feature only | **no** | **no** | **no** |
| `app/actions/<domain>` | **no** | **no** | same domain | yes | yes |
| `lib/<domain>` | **no** | **no** | **no** | `lib/core`, `lib/auth`, `lib/db` | yes |

A client component calls a Server Action imported from `app/actions/*`; that is
the intended boundary, not a violation of the table above.

---

## 3. Current architecture and its debt

The application predates this constitution. Two patterns are in production and
must be described honestly rather than hidden.

### 3.1 The shared client data context (legacy)

`context/InvoiceContext.tsx` is a `'use client'` provider mounted in the
dashboard layout. On mount it calls bulk read actions (`getAllClients`,
`getAllDomains`, `getAllHosting`, ...) and keeps the whole tenant dataset in
client state for every dashboard page.

Consequences:

- pages are client components and read from context instead of the server;
- read actions accept a `companyId` argument, guarded by
  `requireTenantAccess(companyId)` inside the action;
- the browser receives far more data than a single screen needs;
- a refresh re-fetches everything.

**Ruling:** the context is frozen for new work.

1. No new data domain may be added to `InvoiceContext`.
2. New screens load their own data in a server component with an explicit
   `companyId` filter and `select`.
3. Migrating an existing screen out of the context is a valid, reviewable task;
   mixing a migration with a feature change is not.
4. Removing the context is tracked as a risk in [`../workflow.md`](../workflow.md).

### 3.2 Server Actions as the read API

Bulk read actions are exported from the same files as mutations
(`app/actions/<domain>/*.ts`). This is accepted for now because it keeps session
and tenant checks in one place.

**Ruling:** every read action must call `requireTenantAccess(companyId)` or
`requireSession()` before Prisma, and must filter by `companyId`. A read action
without a guard is a security defect, not a style issue.

### 3.3 Known boundary gaps

| Gap | Evidence (2026-11-25) | Required direction |
| --- | --------------------- | ------------------ |
| Input validation | `zod` is imported in 1 of 27 action files | Add zod schemas per action, starting with billing and auth |
| Raw error text | 98 `error: String(error)` returns | Return a stable message; log details server-side |
| Native form controls | 7 raw `<select>`, 24 native date/time inputs, 8 raw `<textarea>` in `app/` and `components/` (2026-11-25 scan) | Migrate touched screens to `components/ui/*` |
| Hex colours in TSX | 55 matches in 3 files (17 in the invoice template, which is the documented print exception) | Move to tokens; invoice and email templates are the only exception |
| RTL | `<html lang="en">` only, no `dir` switching | Add locale and direction support as a feature, not a CSS patch |

---

## 4. Adding a module

1. Create `app/dashboard/<module>/page.tsx` and, if needed, nested routes.
2. Create `app/actions/<module>/index.ts` plus implementation files. Every
   action starts with the session or tenant guard.
3. Put domain rules in `lib/<module>/` with an index barrel. No React, no
   request objects.
4. Put feature components in `components/<module>/`. Compose `components/ui/*`.
5. Add the models to `prisma/schema.prisma` with `companyId` and a cascading
   relation, then create a migration.
6. Update [`../ERD.md`](../ERD.md) in the same task.
7. Add the module to this file and to the navigation in `components/layout`.
8. Verify with the gates in [`../workflow.md`](../workflow.md).

---

## 5. Review questions

A reviewer asks these before approving a change:

- Which module owns this code, and is the file in that module's folder?
- Does the change import across a boundary without a barrel export?
- Does every new query filter by `companyId`?
- Does every new action check session and permission before touching data?
- Is new business logic in `lib/`, or did it leak into a component?
- Did a new model get a migration and an ERD update?
- Did a screen add another native control instead of a design-system control?
