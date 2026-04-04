# diPencil Panel

Next.js app for the diPencil admin panel.

## Recommended deployment

- Deploy the app to Vercel.
- Point `panel.dipencil.com` to the Vercel deployment.
- Keep `dipencil.com` on Hostinger for the main website.
- Use Turso for the production database.

## Environment variables

Set these in Vercel for production:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- SMTP variables if email sending is needed:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`

## Local development

1. Copy `.env.example` to `.env`.
2. Keep `DATABASE_URL=file:./dev.db` for local SQLite development.
3. Run the app with `pnpm dev`.

## Scripts

- `pnpm dev` - start the development server.
- `pnpm build` - build for production.
- `pnpm start` - run the production server.
- `pnpm lint` - run ESLint.