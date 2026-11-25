# diPencil Panel

A Next.js 16 admin panel for a hosting reseller: clients, domains, hosting, VPS,
business email, websites, mobile apps, subscriptions, invoices, payments and
automated renewal reminders - all in one dashboard.

The app talks to **MySQL / MariaDB** through Prisma 7 with the
[`@prisma/adapter-mariadb`](https://www.npmjs.com/package/@prisma/adapter-mariadb)
driver adapter. The default local setup uses **XAMPP MySQL**.

---

## Governance and evidence

This repository is run under a written constitution. Read these before changing
code; they are binding, not advisory.

| Document | What it defines |
| -------- | --------------- |
| [`AGENTS.md`](AGENTS.md) | The agent contract: scope, language policy, zero-hallucination rule, strict types, UI controls, roles and gates |
| [`CONSTITUTION.md`](CONSTITUTION.md) | The ratified, non-negotiable articles |
| [`docs/constitution.md`](docs/constitution.md) | Layer responsibilities, security laws and data-integrity laws |
| [`docs/project-guide.md`](docs/project-guide.md) | How the system runs, the request lifecycle, ports and deployment |
| [`docs/architecture/modules.md`](docs/architecture/modules.md) | Module ownership and legal imports |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, the form-controls contract, WCAG 2.2 AA and RTL rules |
| [`docs/ERD.md`](docs/ERD.md) | The data model of record, with constraints and known gaps |
| [`docs/workflow.md`](docs/workflow.md) | The six-phase task lifecycle and the Risk Register |
| [`docs/tooling/skills.md`](docs/tooling/skills.md) | Vendored agent skills, pinned commits and trust rules |

Every non-trivial task leaves a record under `docs/tasks/<task-name>/` with a
`plan.md`, a `report.md` and an `evidence/` folder. A claim without evidence is
not a delivery.

Verify the governance layer itself with:

```powershell
python docs/scripts/verify-project.py
python docs/scripts/check-ui-controls.py
```

---


## Tech stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, Server Actions)          |
| Language   | TypeScript 5.7                                             |
| Styling    | Tailwind CSS 4 + shadcn/ui (new-york) + Radix primitives   |
| Icons      | lucide-react                                               |
| Database   | MySQL 8 / MariaDB 10.4+ (XAMPP)                            |
| ORM        | Prisma 7 + `@prisma/adapter-mariadb` (driver adapter)      |
| Auth       | `jose` (JWT sessions) + `bcryptjs`                         |
| Email      | Nodemailer (SMTP)                                          |
| PDF/Export | jsPDF, html2canvas                                         |
| Package Mgr| pnpm 10                                                    |

---

## Requirements

- **Node.js 20+** (22 LTS recommended)
- **pnpm 10+** - `corepack enable && corepack prepare pnpm@10.33.0 --activate`
- **XAMPP** with MySQL/MariaDB (or any MySQL 8 / MariaDB 10.4+ server)

---

## Quick start (XAMPP MySQL)

### 1. Start MySQL

Open the XAMPP Control Panel and start **MySQL**. The default connection is:

| Setting  | Value       |
| -------- | ----------- |
| Host     | `127.0.0.1` |
| Port     | `3306`      |
| User     | `root`      |
| Password | *(empty)*   |

### 2. Create the database

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS dipencil_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

> Already created it once? The command is idempotent - running it again is safe.

### 3. Install dependencies

```powershell
pnpm install
```

### 4. Configure environment variables

```powershell
Copy-Item .env.example .env
```

Then make sure `.env` contains:

```dotenv
DATABASE_URL="mysql://root@127.0.0.1:3306/dipencil_panel"
AUTH_SECRET="change-me-to-a-long-random-string"
```

If your MySQL `root` account has a password, use
`mysql://root:YOUR_PASSWORD@127.0.0.1:3306/dipencil_panel`.
Special characters must be URL-encoded (e.g. `@` → `%40`).

### 5. Apply the schema and seed the first admin

```powershell
pnpm db:generate      # generate the Prisma client
pnpm db:migrate       # apply migrations (creates the tables)
pnpm db:seed          # create the default company, role and admin user
```

### 6. Run the app

```powershell
pnpm dev
```

Open <http://localhost:3000> and sign in with the seeded account:

| Username   | Password         |
| ---------- | ---------------- |
| `dipencil` | `@diPencil1907@` |

> ⚠️ **Change this password immediately** in production. See
> [Security notes](#security-notes).

---

## Environment variables

| Variable              | Required | Description                                                      |
| --------------------- | :------: | ---------------------------------------------------------------- |
| `DATABASE_URL`        |    ✅    | MySQL/MariaDB connection string (`mysql://user:pass@host:port/db`) |
| `AUTH_SECRET`         |    ✅    | Secret used to sign JWT session cookies (32+ random characters)  |
| `NEXT_PUBLIC_APP_URL` |    -     | Public base URL used in emails (`https://panel.example.com`)      |
| `SMTP_HOST`           |    -     | SMTP server (e.g. `smtp.hostinger.com`)                          |
| `SMTP_PORT`           |    -     | SMTP port (`465` for SSL)                                        |
| `SMTP_USER`           |    -     | SMTP username                                                    |
| `SMTP_PASS`           |    -     | SMTP password                                                    |
| `SMTP_FROM`           |    -     | From address shown to recipients                                 |

`.env` is **not** committed. `.env.example` documents every variable.

---

## Database workflow

| Command           | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `pnpm db:generate`| Regenerate the Prisma client after editing `prisma/schema.prisma`.  |
| `pnpm db:migrate` | Create + apply a new migration during development.                  |
| `pnpm db:deploy`  | Apply existing migrations in CI/production (no prompts).            |
| `pnpm db:push`    | Push the schema without creating a migration (prototyping only).    |
| `pnpm db:seed`    | Create the default company, role and admin user.                    |
| `pnpm db:studio`  | Open Prisma Studio to browse the data.                              |
| `pnpm db:smoke`   | Read/write/delete round-trip against the live database.             |
| `pnpm db:reset`   | ⚠️ Drop the database, re-apply all migrations and re-seed.          |

### Schema conventions (MySQL)

- **Every model uses `cuid()` string IDs.**
- Long free-text and JSON columns use `@db.Text` or `@db.LongText`. Prisma maps a
  bare `String` to `VARCHAR(191)`, which is too short for addresses, HTML email
  templates, JSON arrays and logs.
- `TEXT`/`LONGTEXT` columns **cannot have a default value** in MySQL/MariaDB, so
  JSON columns are written explicitly by the app (`"[]"` for empty arrays).
- Enums are stored as `String` columns - the allowed values are documented at
  the top of `prisma/schema.prisma`.
- Tenant isolation: every business model carries a `companyId` with a cascading
  foreign key.

### Switching to a different MySQL server

Change only `DATABASE_URL`. For example, a remote server:

```dotenv
DATABASE_URL="mysql://panel:secret@db.example.com:3306/dipencil_panel"
```

---

## Project structure

```text
.
├─ app/
│  ├─ actions/            # Server Actions (create/update/delete per domain)
│  ├─ api/                # Route handlers (export, migration, database dump)
│  ├─ dashboard/          # Authenticated screens
│  ├─ login/              # Sign-in screen
│  └─ globals.css         # Design tokens + Tailwind theme
├─ components/
│  ├─ ui/                 # shadcn/ui primitives
│  ├─ layout/             # Sidebar, header, command palette, mobile nav
│  ├─ dashboard/          # KPI cards, charts, widgets
│  └─ <feature>/          # Domain-specific UI
├─ context/               # React context providers (invoices, auth, …)
├─ lib/                   # Prisma client, auth, billing/formatting helpers
├─ prisma/
│  ├─ schema.prisma       # Single source of truth for the database
│  ├─ migrations/         # MySQL migrations (committed)
│  └─ seed.ts             # First-run bootstrap data
├─ scripts/               # Docker entrypoint and maintenance scripts
├─ AGENTS.md              # Agent roles, rules, skill routing and MCP policy
├─ opencode.jsonc         # OpenCode config: instructions + MCP servers
├─ docs/DESIGN_SYSTEM.md  # Visual language, tokens, component rules
└─ CONSTITUTION.md        # Engineering principles and non-negotiables
```

---

## Design system

The visual language, design tokens, component conventions and accessibility
rules live in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md). Read it before
adding or restyling UI.

Key rules:

- Use **semantic tokens** (`bg-background`, `text-muted-foreground`,
  `border-border`) - never raw hex colours.
- Compose screens from `components/ui/*` primitives; don't fork them.
- Dark mode is driven by the `.dark` class (`next-themes`).
- Every interactive element must be keyboard-reachable and have a visible
  `focus-visible` ring.

---

## Engineering constitution

[`CONSTITUTION.md`](CONSTITUTION.md) defines the non-negotiable rules for
changes in this repository: tenant isolation, auth checks on every route,
money handling, migration discipline, accessibility and review expectations.

Article XI also bans the em dash character (U+2014) in first-party content. Use
a plain hyphen, comma, colon, parentheses or a period instead.
`pnpm check:no-ai-dash` enforces the rule and runs as part of `pnpm lint`.

---

## Agent instructions, skills and MCP

[`AGENTS.md`](AGENTS.md) is the operating manual for AI agents working in this
repository. It defines:

- **roles** (orchestrator, spec analyst, architect, implementer, UI engineer,
  data steward, debugger, reviewer, security/release, researcher);
- **prime directives** that mirror the constitution;
- a **routing table for all 37 vendored skills**;
- the **MCP-first policy**, workflow, verification gates and Definition of Done.

[`opencode.jsonc`](opencode.jsonc) wires the toolchain:

- loads `CONSTITUTION.md` and `docs/DESIGN_SYSTEM.md` into every session;
- registers the **21st.dev MCP** server (`twentyfirst`);
- registers the **REA MCP** server (`rea`) as a disabled local server.

### 21st.dev MCP

The remote server `https://21st.dev/api/mcp` is enabled. It needs an API key in
the environment of the shell that launches OpenCode:

```powershell
$env:API_KEY_21ST = "21st_sk_..."   # https://21st.dev/settings/api-keys
```

Then restart OpenCode and run `/mcps` to confirm `twentyfirst` is connected.
Catalog search is free; component-code retrieval and generation are metered.
Never send `.env` contents, customer data or database dumps to this remote
server.

### REA MCP

The REA server is configured but disabled because the package is large and is
only relevant to reverse-engineering work. Enable it when needed by removing
`"disabled": true` from the `rea` entry in `opencode.jsonc`, then restart and
run `/mcps`:

```jsonc
"rea": {
  "type": "local",
  "command": ["npx", "-y", "rea-agents@latest", "mcp"],
  "cwd": "."
}
```

### Skills

Reusable agent skills are vendored under `.opencode/skills/` (37 skills). They
are automatically discovered by OpenCode and cover frontend engineering, API
design, debugging, testing, documentation, reverse engineering and 21st.dev UI
workflows. See [`.opencode/skills/README.md`](.opencode/skills/README.md) for
sources, commits and licenses. Project documents always win over a skill.

---

## Docker deployment

`docker-compose.yml` starts the app and a `mariadb:10.11` database:

```bash
docker compose up -d --build
```

The app container runs `prisma migrate deploy` and optionally seeds on first
boot (`RUN_SEED_ON_STARTUP=true`, the default). Override
`DATABASE_URL`/`AUTH_SECRET` in the compose environment or your `.env` file for
production.

For a VPS deployment:

1. Point `panel.example.com` at the server.
2. Create `.env` from `.env.example` and set a strong `AUTH_SECRET`.
3. Run `docker compose up -d --build`.
4. Put a reverse proxy (Caddy/Nginx) with TLS in front of port `3000`.

---

## Troubleshooting

| Symptom                                                | Fix                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `P1001: Can't reach database server`                   | Start MySQL in XAMPP; confirm host/port in `DATABASE_URL`.                                       |
| `ER_ACCESS_DENIED_ERROR`                               | Wrong user/password. XAMPP default is `root` with **no** password.                               |
| `Unknown database 'dipencil_panel'`                    | Run the `CREATE DATABASE` command in step 2.                                                     |
| `Environment variable not found: DATABASE_URL`         | `.env` is missing or `prisma.config.ts` was changed; it imports `dotenv/config`.                 |
| `BLOB/TEXT column can't have a default value`          | Remove the `@default(...)` from that `@db.Text`/`@db.LongText` column and set it in code.        |
| `Prisma Client did not initialize yet`                 | Run `pnpm db:generate`.                                                                          |
| Port `3000` already in use                             | `pnpm dev --port 3001` or stop the other process.                                                |
| Tables exist but the app shows no data                 | Run `pnpm db:seed` (or sign in and create data).                                                 |

---

## Security notes

Before exposing this panel to the internet:

- **Change the seeded admin password.** `prisma/seed.ts` creates
  `dipencil` / `@diPencil1907@` for local bootstrap only.
- **Rotate `AUTH_SECRET`** and never commit `.env`.
- **Restrict `app/api/database/route.ts`** - it currently exports a full
  database dump without an authorization check.
- **Restrict `app/api/websites/migrate/route.ts`** - the migration endpoint is
  reachable without authentication.
- Run behind HTTPS; session cookies should be `Secure` in production.

---

## Scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Start the development server         |
| `pnpm build`      | Production build                     |
| `pnpm start`      | Run the production build             |
| `pnpm lint`       | Lint the project and enforce the no-AI-dash rule |
| `pnpm check:no-ai-dash` | Fail if U+2014 appears in first-party content |
| `pnpm db:*`       | Database helpers (see the table above) |

---

## License

Proprietary - © diPencil. All rights reserved.
