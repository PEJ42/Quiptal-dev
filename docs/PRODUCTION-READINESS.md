# Production Readiness Guide

## Supported deployment shape

Deploy this MVP to one long-lived Node.js host with a persistent, encrypted filesystem. The host must keep the SQLite database, uploaded images, and contracts on durable storage that survives process restarts and deploys.

Do not deploy this version to serverless, edge, or multiple concurrent application instances. SQLite locking and private local contract files require a single writer and a shared persistent filesystem. Move to PostgreSQL plus managed object storage before horizontal scaling or serverless deployment.

## Required configuration

- Node.js: use the version pinned by `.nvmrc`.
- `DATABASE_URL`: set an explicit persistent SQLite path in production. The application rejects a production boot without it.
- `APP_DATA_DIR`: set this to a persistent directory outside the source checkout, such as `/var/lib/rental-booking`. Product images and generated contracts are stored in its `uploads/` and `contracts/` subdirectories.
- HTTPS: terminate TLS at the host or reverse proxy. Secure session cookies are enabled in production.
- Rate limiting: configure the reverse proxy to rate-limit `/login` and `/setup` attempts. The MVP does not yet provide distributed application-level throttling.
- Filesystem: restrict database, uploads, generated contracts, environment files, and backups to the service account.
- Backups: follow [the backup and restore guide](BACKUP-RESTORE.md) before launch.

## Deployment procedure

1. Take and verify an encrypted backup of the current database and contract directory.
2. Provision a single host and persistent data volume; copy neither fictional seed data nor local `.env` files to production.
3. Set the production `DATABASE_URL` and `APP_DATA_DIR`, then install dependencies with `npm ci`.
4. Generate Prisma client with `npm run db:generate`.
5. Apply reviewed migrations using `npx prisma migrate deploy`, then run `npm run db:seed:production` to add only reference configuration. Never run `npm run db:seed` in production because it creates fictional catalog and customer data.
6. Run `npm run build`, then start with `npm run start` behind HTTPS.
7. Create the first Admin through `/setup`; never seed a production password.
8. Confirm sign-in, a booking read, a protected contract download, and a backup restore on a staging copy.

## Acceptance checklist

- [ ] Production hostname serves HTTPS only.
- [ ] `DATABASE_URL` points to durable storage outside the source checkout.
- [ ] `APP_DATA_DIR` points to durable storage outside the source checkout.
- [ ] The database and private contract directory are excluded from source control and web-served paths.
- [ ] First Admin is created through setup; no test credentials exist.
- [ ] Production reference categories, booking statuses/types, services, and contract template are initialized with `npm run db:seed:production`.
- [ ] Reverse-proxy rate limiting protects `/login` and `/setup`.
- [ ] Anonymous `/`, `/bookings`, `/catalog`, `/contracts`, and contract-download requests redirect or reject safely.
- [ ] Product image upload rejects unsupported/oversized files.
- [ ] Generated contract downloads require an authenticated Admin and return `Cache-Control: private, no-store`.
- [ ] A scheduled, encrypted backup includes matching database and contract files.
- [ ] Restore is rehearsed on a separate staging copy.
- [ ] `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- [ ] `npm run test:e2e` passes on the deployment host or a comparable local/staging environment.

## Release notes

The 2026-08-07 production review found zero production dependency vulnerabilities from `npm audit --omit=dev --audit-level=high`. Browser security headers and an application-wide no-index robots rule are enabled. A strict Content Security Policy is deliberately not set yet because Next.js inline script/nonces need a separately tested rollout.

PWA/offline caching remains deferred: caching booking, customer, and contract data requires explicit device-security, cache expiration, and privacy design work.
