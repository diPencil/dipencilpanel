# diPencil Panel

Next.js app for the diPencil admin panel.

## Recommended deployment

- Deploy the app to the Hostinger VPS with Docker.
- Point `panel.dipencil.com` to the VPS.
- Run PostgreSQL on the same VPS.
- Keep `dipencil.com` on Hostinger for the main website.

## Environment variables

Set these on the VPS for production:

- `DATABASE_URL`
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
2. Use the local PostgreSQL or Docker database URL for development.
3. Run the app with `pnpm dev`.

## Scripts

- `pnpm dev` - start the development server.
- `pnpm build` - build for production.
- `pnpm start` - run the production server.
- `pnpm lint` - run ESLint.