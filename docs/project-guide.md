# Project Guide

> The system map: what the panel is, how a request flows through it, how to run
> it locally, and how it is deployed. Setup commands live in the
> [`README.md`](../README.md); this document explains the shape behind them.

**Audience:** a developer or agent joining the project.
**Related:** [`constitution.md`](constitution.md), [`architecture/modules.md`](architecture/modules.md), [`ERD.md`](ERD.md), [`workflow.md`](workflow.md).

---

## 1. What the system is

diPencil Panel is a multi-tenant back office for a hosting reseller. One
deployment serves one company (tenant) with many users and roles, and tracks:

- clients and client groups;
- domains and domain transfers;
- hosting, VPS, business email, websites and mobile apps;
- subscriptions and their renewal dates;
- invoices, invoice items and payments;
- reminder emails and business email drafts;
- website migrations and database backup/restore for super admins.

Every business row carries `companyId`. Tenant isolation is enforced in the
query layer, not in the UI. See [`ERD.md`](ERD.md) for the full model.

---

## 2. Technology

| Concern | Choice |
| ------- | ------ |
| Framework | Next.js 16 App Router, React 19, Server Actions |
| Language | TypeScript 5.7, `strict` |
| UI | Tailwind CSS 4, shadcn/ui (`new-york`), Radix, lucide-react, Geist |
| Database | MySQL 8 / MariaDB 10.4+ (XAMPP locally, MariaDB 10.11 in compose) |
| ORM | Prisma 7 with `@prisma/adapter-mariadb` |
| Auth | `jose` JWT in an `HttpOnly` cookie, `bcryptjs` cost 12 |
| Email | Nodemailer with per-company SMTP/IMAP settings |
| PDF | Client-side invoice export through `lib/billing/export-invoice-pdf.ts` |
| Package manager | pnpm 10 |

There is no second database. PostgreSQL, SQLite, their drivers and their
migrations are prohibited.

---

## 3. Runtime topology

```text
Browser
  |
  | HTTPS
  v
Next.js server (node)
  |-- middleware.ts        session cookie gate for page routes
  |-- app/**/page.tsx      server components, read path
  |-- app/actions/**       Server Actions, write path
  |-- app/api/**           exports, imports, migration control
  |
  v
Prisma 7 + mariadb adapter
  |
  v
MySQL / MariaDB
```

External systems:

- **SMTP / IMAP** per company, configured in Settings. Credentials are stored
  in the `Company` row; they are never returned to the browser in full.
- **Remote hosting panels** opened through `panelUrl` in a new tab.
- **SSH target** for website migration, credentials encrypted with AES-256-CBC.

---

## 4. Directory map

```text
app/
  actions/            Server Actions grouped by domain (auth, billing, clients, ...)
  api/                Route Handlers (database backup, website migration)
  dashboard/          Authenticated screens, one folder per feature
  login/              Public sign-in
components/
  ui/                 Design primitives (do not fork)
  layout/             Sidebar, header, mobile navigation
  shared/             Cross-feature widgets (confirm dialog, empty state)
  <feature>/          Feature components
lib/
  auth/               Session, permissions, API guards
  billing/            Money, invoices, PDF export
  core/               Formatting, constants, shared types
  db/                 Prisma singleton
  email/              Template rendering and sending
  export/             Dashboard export
  migration/          Website migration helpers
  services/           Service-level domain rules
prisma/
  schema.prisma       Source of truth
  migrations/         Applied migrations, one folder per change
scripts/              Verification and maintenance scripts
docs/                 Governance, architecture, design, tasks, tooling
.agents/skills/       Vendored third-party agent skills
```

Module ownership and import rules are defined in
[`architecture/modules.md`](architecture/modules.md).

---

## 5. Request lifecycle

### 5.1 Read path (a dashboard page)

1. `middleware.ts` verifies the `dipencil_session` cookie and redirects
   unauthenticated page requests to `/login`.
2. The page server component calls `getSession()` again and checks the
   permission for the screen.
3. The page queries Prisma with an explicit `companyId` filter and selects only
   the columns it renders.
4. The page renders loading and error boundaries and passes plain data to client
   components. Client components never import Prisma.

### 5.2 Write path (a form)

1. A client component submits a Server Action from `app/actions/<domain>/`.
2. The action re-checks the session and permission.
3. The action parses the payload with `zod` and validates ownership of every
   referenced ID against the caller's `companyId`.
4. Multi-row writes run in `prisma.$transaction`.
5. The action returns `{ success: true, ... }` or `{ success: false, error }`
   and the client shows a `sonner` toast.
6. The page is revalidated so the list reflects the new state.

### 5.3 API path

`app/api/**/route.ts` exists for exports, imports, webhooks and streaming.
`middleware.ts` deliberately skips `/api/*`, so every handler calls
`requireApiSession()` itself; company-scoped handlers additionally call
`requireCompanyAccess(...)`, and the database backup requires super admin.

---

## 6. Local setup

The authoritative commands are in [`../README.md`](../README.md). The short
version:

```powershell
pnpm install
# create .env from .env.example, point DATABASE_URL at MySQL
pnpm db:generate
pnpm db:deploy        # apply committed migrations
pnpm db:seed          # idempotent bootstrap
pnpm dev
```

Environment variables (documented with placeholders in
[`../.env.example`](../.env.example)):

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | MySQL connection string used by Prisma |
| `NEXT_PUBLIC_APP_URL` | Absolute base URL used in emails and links |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Fallback mail transport; per-company settings override |
| `AUTH_SECRET` | JWT signing secret. Must be replaced before any deployment |

Never commit `.env`. The default bootstrap credentials in the README are for
local development only and must be changed before deployment.

### 6.1 Port

`package.json` runs `next dev` with no fixed port, so the default is `3000`.
The printed URL is the truth: this machine has hosted the app on both `3000` and
`3001`, and a different app may already own one of them. If the port is taken:

```powershell
pnpm dev -- -p 3001
```

Do not debug the wrong application because a port was assumed.

---

## 7. Deployment

### 7.1 Container path

- `Dockerfile` builds a standalone Next.js output on `node:22-alpine`.
- `docker-compose.yml` runs the app plus MariaDB 10.11 and overrides
  `DATABASE_URL` to the `db` service.
- The build stage runs `prisma generate` with a throwaway `DATABASE_URL`; the
  real URL is injected at runtime.

### 7.2 Migration path

1. Commit migrations under `prisma/migrations/`.
2. Deploy with `pnpm db:deploy` (`prisma migrate deploy`).
3. Never run `migrate dev`, `migrate reset` or `db push` against production.

### 7.3 Pre-deploy checklist

- [ ] `AUTH_SECRET` replaced with a strong random value.
- [ ] Default admin password changed.
- [ ] `NEXT_PUBLIC_APP_URL` matches the public URL.
- [ ] Migrations applied with `db:deploy`.
- [ ] `pnpm lint`, `tsc --noEmit` and `pnpm build` pass.
- [ ] SMTP settings verified by sending a real test email.
- [ ] `/api/database` confirmed super-admin only.
- [ ] Backup and rollback plan written down.

The release role and rollback expectations are in [`../AGENTS.md`](../AGENTS.md).

---

## 8. Verification commands

| Command | Proves |
| ------- | ------ |
| `pnpm lint` | ESLint plus the no-em-dash rule |
| `npx tsc --noEmit` | Strict type safety |
| `pnpm build` | The production build compiles |
| `pnpm check:money` | Money helper invariants (18 checks) |
| `pnpm db:smoke` | MySQL is reachable and the schema responds |
| `pnpm db:audit` | Data-integrity audit |
| `python docs/scripts/verify-project.py` | Governance files, links, English, skills lock |
| `python docs/scripts/check-ui-controls.py` | Raw form-control and hex-colour drift |

UI changes additionally require a real browser check at 360, 768 and 1440 px in
both themes.

---

## 9. Known limitations

Tracked, with owners, in the Risk Register in [`workflow.md`](workflow.md).
Highlights: money stored as `Float`, `zod` coverage that does not yet match the
rule, invoice-number uniqueness not enforced by the database, no RTL support,
and 7 raw `<select>` elements plus 24 native date/time inputs that predate the
form-controls contract.

---

## 10. Where to go next

- New to the rules: [`constitution.md`](constitution.md).
- About to write code: [`workflow.md`](workflow.md).
- About to touch a screen: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
- About to touch the schema: [`ERD.md`](ERD.md).
- About to use an external skill: [`tooling/skills.md`](tooling/skills.md).
