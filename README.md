# Rental Booking App

Private, responsive booking software for a small sound and lighting equipment-rental business. It supports internal manual booking entry only; it is not a public customer portal or checkout.

## Status

**Milestone 9 — production readiness ready for approval.** The app has deployment, backup/restore, acceptance, and release guidance; explicit production database configuration; private-app response headers; and a zero-vulnerability production dependency audit. PWA caching remains intentionally deferred.

The working tree already contains a previous Next.js/Prisma starter scaffold. It is not treated as approved Milestone 1 implementation, and Milestone 0 does not alter it.

## Planned stack

Next.js App Router, React, TypeScript, Tailwind, Prisma with SQLite locally and a PostgreSQL-ready design, Zod, React Hook Form where useful, maintained credentials auth, Vitest, Playwright, ESLint, and Prettier.

## Prerequisites and planned commands

Use nvm and enter the project with `nvm use`, then npm. Available commands are `dev`, `build`, `start`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:watch`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`, and `db:studio`.

## Safety

Never commit environment files, SQLite databases, uploads, generated contracts, or private contract references. Use fictional development data only. Money is integer cents; booking dates are date-only where practical; bookings and contracts retain immutable snapshots.

Read [the PRD](docs/PRD.md), [milestones](docs/MILESTONES.md), and [agent instructions](AGENTS.md).

Before any deployment, follow the [production readiness guide](docs/PRODUCTION-READINESS.md).
