# Force Password Rotation (R-10) - Plan

**Task:** R-10 from the Risk Register in [`../../workflow.md`](../../workflow.md):
force a password change on first login and block deployment while the
published default credentials still work.
**Owner:** Principal Lead Architect (System Custodian).
**Started:** 2026-11-25.
**Status:** delivered - see [`report.md`](report.md).

---

## 1. Outcome

No account can use the panel with the password published in this repository.
The seeded bootstrap admin is forced to choose a new password on first sign-in,
every data path refuses a session that has not done so, and production refuses
the published password outright.

## 2. Context (verified, not assumed)

| Fact | Evidence |
| ---- | -------- |
| Seed creates `dipencil` / `@diPencil1907@` (bcrypt cost 12) and prints it | `prisma/seed.ts` lines 36-61 |
| README documents the same credentials twice | `README.md` lines 131, 348 |
| `User` model has no forced-change field | `prisma/schema.prisma` `model User` |
| No force-change mechanism exists anywhere | grep for `mustChangePassword`, `forcePassword`, `firstLogin` returned nothing |
| `loginAction` sets the session and redirects with no extra gate | `app/actions/auth/auth.ts` lines 51-106 |
| `updateAccountAction` already changes passwords (verifies current) | same file, lines 153-216 |
| Middleware only verifies JWT presence, no DB access (edge runtime) | `middleware.ts` |
| `getSession()` loads the user from MySQL per request | `lib/auth/auth.ts` lines 118-144 |
| `scripts/fix-password.ts` resets to the published default with no flag | `scripts/fix-password.ts` |
| `scripts/create-admin.ts` hardcodes a second published password | `scripts/create-admin.ts` line 24 |
| Risk register describes exactly this remediation | `docs/workflow.md` R-10 row |

## 3. Design

The flag has two homes on purpose:

- **`User.mustChangePassword` (MySQL) is the source of truth.** Every guard
  that touches data reads it from the database through `getSession()`.
- **The session JWT mirrors it** so `middleware.ts` (edge runtime, no database)
  can redirect in one hop without a round trip.

Three gates, strongest first:

1. **`requireSession()` / `requireApiSession()`** (the security boundary per
   Constitution Article II): a flagged session never reaches Prisma. Server
   actions redirect to `/change-password`, route handlers return a stable
   `{ success: false, error }` with 403.
2. **`middleware.ts`**: a flagged JWT is redirected to `/change-password`
   before the dashboard renders (UX only, not a security boundary).
3. **`loginAction`**: returns `mustChangePassword` so the login page routes
   straight to `/change-password` instead of flashing the dashboard.

The change itself happens in a dedicated screen (`/change-password`), not in
account settings, because a flagged session cannot lawfully render the
dashboard where settings live.

Production block: when `NODE_ENV === 'production'`, `loginAction` refuses any
password equal to the published bootstrap password. The operator bootstraps
once from the CLI (`scripts/fix-password.ts "<new password>"`), which is the
"block deployment until rotated" half of R-10. Without this, an attacker who
reads the public README can log in first and simply set their own password,
which the forced-change flag alone would not stop.

## 4. Acceptance criteria

| # | Criterion | Proof |
| - | --------- | ----- |
| 1 | `User.mustChangePassword` exists, default `false`, with a migration under `prisma/migrations/` | migration file + `pnpm db:smoke` |
| 2 | Seed flags the bootstrap admin on create, and flags an existing account only while its password still equals the published default | `pnpm db:seed` output + DB row |
| 3 | Login with a flagged account lands on `/change-password`, never the dashboard | browser evidence |
| 4 | Every `requireSession()` path refuses a flagged session; `requireApiSession()` returns 403 with a stable error | code evidence + browser/API check |
| 5 | `/change-password` validates with `zod` (min 8, confirmation match, differs from current), clears the flag, re-issues the session, lands on the dashboard | browser evidence |
| 6 | `updateAccountAction` password change also clears the flag | code evidence |
| 7 | `fix-password.ts` and `create-admin.ts` set the flag when they (re)introduce a published password | code evidence |
| 8 | Production refuses the published password at login | code evidence + documented behaviour |
| 9 | README default-login section and Security notes describe bootstrap-only behaviour | `verify-project.py` |
| 10 | Risk register R-10 status moves to `mitigated` | `docs/workflow.md` |
| 11 | Full gate passes: `pnpm lint`, `npx tsc --noEmit`, `pnpm build`, `pnpm db:smoke`, `verify-project.py`, `check-ui-controls.py` on touched files | evidence files |
| 12 | UI verified in a real browser: forced screen renders, keyboard works, both themes, 360 px | screenshots in `evidence/` |

## 5. Out of scope

- Password strength meter, password history, expiry schedules.
- Email-based forgot-password flow (SMTP is unverified, R-12).
- Flagging users created through `createUser` with an admin-chosen password
  (worth doing later; R-10 covers the published credentials only).
- `scripts/mint-test-sessions.ts` publishes a local-only test password; it is
  an evidence helper marked "never run against production" and stays as is.
- Rotating the `FALLBACK_AUTH_SECRET` in `lib/auth/auth.ts` and `middleware.ts`
  (a separate exposure; not part of R-10).
- R-02 zod coverage beyond the one new action.

## 6. Steps (ordered)

1. **Schema:** add `mustChangePassword Boolean @default(false)` to `User`;
   `pnpm db:migrate --name add_must_change_password`; `pnpm db:generate`.
2. **Session plumbing:** add the field to `SessionPayload`, to the
   `getSession()` select, and to the payload `loginAction` signs.
3. **Guards:** `requireSession()` redirects flagged sessions to
   `/change-password`; `requireApiSession()` answers 403 with a stable error;
   `middleware.ts` redirects a flagged JWT (allowing `/change-password`,
   `/login`, static and `/api`).
4. **Login:** `loginAction` returns `mustChangePassword`; the login page routes
   accordingly; production rejects the published password.
5. **Screen:** `app/change-password/page.tsx` plus a client form and
   `forceChangePasswordAction` (`zod`, hash, clear flag, re-issue session,
   redirect). Loading, error and success states; semantic tokens only.
6. **Clear on normal change:** `updateAccountAction` sets the flag to `false`
   when the password changes.
7. **Scripts:** `fix-password.ts` gains an optional new-password argument
   (with argument: set it and clear the flag; without: reset to the published
   default and set the flag) and sets the flag on the default path;
   `create-admin.ts` sets the flag.
8. **Docs:** README default-login section and Security notes; `AGENTS.md`
   known-gap row; R-10 row in `docs/workflow.md` to `mitigated`.
9. **Verify:** full gate, then browser pass at 360 / 768 / 1440 px, both
   themes, keyboard path.
10. **Record:** evidence files and `report.md` in this folder.

## 7. Risks considered

| Risk | Handling |
| ----| -------- |
| Sessions issued before the migration carry no JWT flag | `middleware.ts` may let them through once, but `requireSession()` reads MySQL and still blocks data; re-login clears it |
| Forcing the owner to rotate on next local login | Intended; `fix-password.ts` without arguments restores the local default and re-flags it |
| Redirect loop on `/change-password` | The screen and its action use `getSession()` directly, never `requireSession()` |
| Production lockout before first login | Documented CLI bootstrap path in README Security notes |
| Blocking a flagged session breaks the change-password action itself | That action is exempt by construction (step 5) |

## 8. Evidence plan

```text
docs/tasks/force-password-rotation/evidence/
  01-migration.txt        migrate output and schema diff
  02-seed-flag.txt        seed output and the flagged DB row
  03-lint.txt             pnpm lint
  04-tsc.txt              npx tsc --noEmit
  05-build.txt            pnpm build
  06-db-smoke.txt         pnpm db:smoke
  07-verify-project.txt   docs/scripts/verify-project.py
  08-ui-controls.txt      check-ui-controls.py on touched files
  09-browser-forced.png   flagged login lands on /change-password
  10-browser-rotated.png  after rotation, dashboard renders
  11-browser-360.png      forced screen at 360 px
```
