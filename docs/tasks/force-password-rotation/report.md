# Force Password Rotation (R-10) - Delivery Report

**Task:** R-10, force a password change on first login and block the published
default credentials.
**Plan:** [`plan.md`](plan.md) (12 acceptance criteria).
**Date:** 2026-11-26.
**Role(s):** Implementer, Data steward, Reviewer (self), Security.
**Status:** Delivered, with two verification gaps stated in section 6.

---

## 1. Outcome

An account that still uses the bootstrap password cannot use the panel:

- Sign-in returns `mustChangePassword` and the login page routes to
  `/change-password`.
- `requireSession()` (server components and actions) and `requireApiSession()`
  (route handlers) refuse the session until the password is rotated; the first
  reads MySQL, the second answers `403` with a stable error.
- `middleware.ts` redirects a flagged JWT before the dashboard renders.
- `NODE_ENV=production` refuses the published password outright, so reading the
  README cannot give an attacker a working login.

Verified end to end in a browser: flagged login lands on `/change-password`, a
direct `/dashboard` request bounces back, rotation unlocks the dashboard, the
old password stops working, and the production build refuses the published
password.

---

## 2. What changed

### Database

| File | Change |
| ---- | ------ |
| `prisma/schema.prisma` | `User.mustChangePassword Boolean @default(false)` |
| `prisma/migrations/20261125192139_add_must_change_password/migration.sql` | Applied migration adding the column |

### Authentication and gates

| File | Change |
| ---- | ------ |
| `lib/auth/auth.ts` | `SessionPayload.mustChangePassword`, `getSession()` selects the column (database truth) |
| `lib/auth/auth-guard.ts` | `requireSession()` redirects a flagged session to `/change-password` |
| `lib/auth/api-auth.ts` | `requireApiSession()` returns `403 { success: false, error: 'Password change required.' }` |
| `middleware.ts` | Decodes the JWT, redirects flagged sessions, allows `/change-password`, `/login`, `/api` and static assets |
| `app/actions/auth/auth.ts` | `LoginResult.mustChangePassword`; production refusal of `PUBLISHED_BOOTSTRAP_PASSWORD`; new `forceChangePasswordAction` (zod, min 8, max 128, confirmation match, differs from current, refuses unflagged sessions); `updateAccountAction` clears the flag on a real password change and re-issues the session |
| `app/login/page.tsx` | Routes a flagged login to `/change-password` |

### Screen

| File | Change |
| ---- | ------ |
| `app/change-password/page.tsx` | Server page, `dynamic = 'force-dynamic'`, uses `getSession()` directly to avoid a redirect loop |
| `app/change-password/change-password-form.tsx` | Client form: semantic tokens, `components/ui/*`, visible labels, `aria-describedby` hint, `aria-invalid` on mismatch, show/hide password, pending spinner, sign-out escape hatch, `<main>` landmark |

### Bootstrap tooling and docs

| File | Change |
| ---- | ------ |
| `prisma/seed.ts` | Flags on create; flags an existing account only while bcrypt still matches the published default |
| `scripts/fix-password.ts` | Optional new-password argument (sets it, clears the flag) vs no argument (published default, sets the flag) |
| `scripts/create-admin.ts` | Sets the flag |
| `README.md` | Bootstrap-only login note; Security notes corrected (the two API routes were already guarded) and the CLI bootstrap path documented |
| `AGENTS.md` | Two known-gap rows updated |
| `docs/workflow.md` | R-10 moved to `mitigated` |

---

## 3. Acceptance criteria

| # | Criterion | Result | Evidence |
| - | --------- | ------ | -------- |
| 1 | `mustChangePassword` with migration | Pass | `01-migration.txt` |
| 2 | Seed flags create and default-password backfill | Pass | `02-seed-flag.txt` |
| 3 | Flagged login lands on `/change-password` | Pass | `09-browser-forced.txt` |
| 4 | `requireSession`/`requireApiSession` refuse flagged sessions | Pass (server gate exercised; API 403 by code) | `09-browser-forced.txt`, `lib/auth/api-auth.ts` |
| 5 | `/change-password` validates, clears flag, unlocks | Pass | `10-browser-rotated.txt` |
| 6 | `updateAccountAction` clears the flag | Pass (code) | `app/actions/auth/auth.ts` |
| 7 | Scripts set the flag for published passwords | Pass | `scripts/fix-password.ts`, `scripts/create-admin.ts` |
| 8 | Production refuses the published password | Pass | `13-production-refusal.txt` |
| 9 | README sections describe bootstrap-only | Pass | `07-verify-project.txt` |
| 10 | R-10 `mitigated` | Pass | `docs/workflow.md` |
| 11 | Full gate | Pass | `03-lint.txt` to `08-ui-controls.txt` |
| 12 | Browser: render, keyboard, both themes, 360 px | Partial | `11-browser-themes-a11y.txt`, `12-browser-360.txt` |

---

## 4. Verification commands and results

| Command | Result |
| ------- | ------ |
| `pnpm db:generate` | ok |
| `pnpm db:migrate --name add_must_change_password` | applied (20261125192139) |
| `pnpm db:seed` | `⚠️ Default password still active - forced rotation enabled for "dipencil"` |
| `pnpm lint` | 0 errors, 369 warnings, no em dash |
| `npx tsc --noEmit` | exit 0 |
| `pnpm build` | exit 0, `ƒ /change-password` in the route table |
| `pnpm db:smoke` | exit 0 |
| `python docs/scripts/verify-project.py` | PASS |
| `python docs/scripts/check-ui-controls.py --strict app/change-password app/login/page.tsx` | PASS, 0 findings |
| Lighthouse on `/change-password` | accessibility 100, best-practices 100, SEO 100 |

The only accessibility finding during the pass was `landmark-one-main` at
score 98; the outer element became `<main>` and the re-run scored 100.

---

## 5. Database state left behind

The local account is deliberately left in the documented bootstrap state so the
owner sees the feature on the next login:

```text
username  status  mustChangePassword  bcrypt.match('@diPencil1907@')
dipencil  active  1                   true
```

The first sign-in will land on `/change-password`. To skip the rotation locally:

```powershell
npx tsx scripts/fix-password.ts "YourNewPassword!"
```

---

## 6. Not verified (stated, not implied)

1. **360 / 768 / 1440 px rendering and full keyboard traversal.** The in-app
   browser has no viewport emulation and the desktop window was not visible, so
   `browser.screenshot` and `browser.press` could not be used. The layout is a
   single `w-full max-w-md` card with no fixed widths and no horizontal overflow
   at the live viewport (`12-browser-360.txt`), but a real 360 px render and Tab
   traversal remain untested.
2. **`requireApiSession()` 403 for a flagged session.** The code path is
   implemented and the server gate was proven through `/dashboard`, but no route
   handler was called with a flagged session to observe the 403 body.
3. **`forceChangePasswordAction` refusal of an unflagged session.** Implemented,
   not exercised in the browser.

---

## 7. Remaining risks

| Risk | Note |
| ---- | ---- |
| JWT flag vs database truth | Middleware trusts the JWT and can be stale for one request; `requireSession()` reads MySQL, so data stays protected. Re-login clears the JWT. |
| Bootstrap flow depends on the operator | Production has no admin until `scripts/fix-password.ts "<password>"` runs on the server. Documented in the README. |
| Unexplained intermediate DB row state | During the production test the user row briefly held a hash matching neither password with the flag cleared; it was restored and the test repeated cleanly. Cause not identified; recorded in `13-production-refusal.txt`. |
| `next start` with `output: standalone` | The production server warned it should be run as `node .next/standalone/server.js`. It served requests correctly for this test; deployment must use the standalone entry point. |
| Login error not in a live region | The pre-existing login page prints errors as text, not `role="alert"`. Out of scope for R-10. |
| `middleware` -> `proxy` deprecation | Non-blocking Next 16 warning, unchanged. |

---

## 8. Files touched

```text
prisma/schema.prisma
prisma/migrations/20261125192139_add_must_change_password/migration.sql
prisma/seed.ts
lib/auth/auth.ts
lib/auth/auth-guard.ts
lib/auth/api-auth.ts
middleware.ts
app/actions/auth/auth.ts
app/login/page.tsx
app/change-password/page.tsx
app/change-password/change-password-form.tsx
scripts/fix-password.ts
scripts/create-admin.ts
README.md
AGENTS.md
docs/workflow.md
docs/tasks/force-password-rotation/plan.md
docs/tasks/force-password-rotation/report.md
docs/tasks/force-password-rotation/evidence/*.txt
```
