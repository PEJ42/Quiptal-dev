# Milestones

0. **Repository and architecture:** inspect environment; write durable docs and architecture/schema/security/test plan; stop for review.
1. **Application foundation:** configure Next/TypeScript/Tailwind/lint/format/tests; Prisma SQLite/migrations/seed; shell/navigation; first-admin authentication/protected routes; stop.
2. **Settings foundation:** company settings, defaults, editable categories/statuses/types/services/tax, admin-only archival editing; stop.
3. **Customers:** CRUD excluding deletion, contacts/address, duplicate warning, search/archive/detail/history placeholders/tests; stop.
4. **Products and bundles:** CRUD, one validated photo, components/order/quantity, catalog/search/filter/archive/tests; stop.
5. **Bookings and pricing:** booking numbers/dates/lines/snapshots/overrides/tax/discount/deposit/activity/upcoming/tests; stop.
6. **Contracts:** editable sanitized template, PDF generation, immutable protected versions/download/history/tests; complete.
7. **Dashboard and search:** upcoming list, revenue, grouped global search, responsive tests; complete.
8. **UX/PWA readiness:** mobile/accessibility/states review, optional stable PWA, backup documentation, final E2E; ready for final E2E review. PWA caching is intentionally deferred pending a private-data cache review.
9. **Production readiness:** security/dependency/performance review, migration/deployment/acceptance/backup-restore/release docs; ready for approval.

Each milestone requires formatting, format check, lint, typecheck, tests, and production build before review.
