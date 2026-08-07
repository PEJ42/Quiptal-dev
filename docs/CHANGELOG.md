# Changelog

## Unreleased

### Navigation and catalog consolidation

- Moved product and bundle browsing under the Catalog destination with a Products/Bundles toggle and a single New choice page.
- Preserved existing product/bundle detail, creation, archive, restore, and direct-route behavior; list routes now redirect to the matching Catalog view.
- Applied consistent active navigation styling across all protected areas.

### Milestone 0 — repository and architecture

- Added required product, architecture, database, security, testing, milestone, roadmap, decision, and contract-template documentation.
- Added durable agent instructions and documented the existing scaffold as an unapproved baseline.
- Strengthened ignore rules for secrets, local data, uploads, contracts, and private references.
- Recorded the external nvm shell-loader configuration risk that must be resolved before Milestone 1.

### Milestone 1 — application foundation

- Configured project-local formatting, Vitest, Playwright configuration, SQLite Prisma migration, and idempotent seed.
- Added protected dashboard shell, first-admin setup, bcrypt password hashing, and database-backed opaque sessions.
- Removed external Google font downloads to make production builds deterministic.

### Milestone 2 — settings foundation

- Added editable company settings, default tax rate, product categories, booking types/statuses, and services.
- Added idempotent default configuration seed data and an SQLite migration.
- Added Admin-only server actions with validation and archive/restore behavior for configuration records.

### Milestone 3 — customers

- Added customer and additional-contact schema, migration, protected list/detail/create routes, search, and billing-address fields.
- Added normalized-email duplicate warning that permits an intentional save.
- Added customer/contact archive and restore behavior without normal UI deletion.

### Milestone 4 — products, bundles, and catalog

- Added products, bundles, ordered bundle components, and the associated SQLite migration.
- Added product and bundle creation/editing, archive/restore, search/filtering, and fixed bundle pricing.
- Added one optional protected image per product or bundle with type, size, generated-filename, and authorized-delivery safeguards.
- Added a unified responsive Catalog view and idempotent fictional sample catalog data.

### Milestone 5 — bookings and pricing

- Added booking, booking-line snapshot, bundle-component snapshot, and activity-history models with a SQLite migration.
- Added protected upcoming/past booking views, line snapshots, line-level price overrides, status changes, activity history, and pricing updates.
- Added a pure pricing module for deterministic fixed/percentage discounts, tax allocation, deposits, and totals.

### Milestone 6 — contracts

- Added editable sanitized contract template settings with versioned text snapshots.
- Added protected generated-contract records, opaque local PDF storage, authorized downloads, and booking activity history.
- Added US Letter multipage PDF generation with booking/customer/line/totals snapshots and renderer coverage.

### Milestone 7 — dashboard and search

- Added a protected dashboard with server-calculated upcoming booking, upcoming revenue, month, and customer metrics.
- Added a next-five upcoming booking list that links directly to booking details.
- Added protected grouped global search for bookings, customers, products, and bundles, including a shared desktop search entry point.

### Milestone 8 — UX/PWA readiness

- Added a skip link, shared visible focus states, disabled-control states, and reduced-motion support.
- Added protected-route Playwright smoke coverage and local SQLite/contract backup and restore guidance.
- Deferred PWA caching until private-data cache and device-security requirements are reviewed.

### Milestone 9 — production readiness

- Added explicit production database configuration, no-index robots output, and response security headers.
- Added supported-hosting constraints plus deployment, acceptance, backup/restore, and release guidance.
- Completed production dependency audit with zero reported vulnerabilities.
