# Architecture

The MVP is one Next.js App Router deployment: browser → server components/actions or route handlers → typed domain services → Prisma → SQLite locally. No containers, queues, microservices, event buses, or client global-state library are needed. The schema avoids SQLite-specific application logic to permit future PostgreSQL migration.

Use server components by default. Client components are limited to forms, mobile navigation, dialogs, and required interaction. Zod validates server inputs; server actions authorize mutations; route handlers authorize files and downloads. Pages do not own pricing, snapshots, or permission logic.

`src/app` owns routes/layouts/handlers; `src/features` will own domain forms, services, repositories, and schemas; `src/lib` will own auth, Prisma, money, date, storage, and shared utilities; `prisma` owns schema/migrations/seed; `tests` owns Vitest and Playwright coverage.

Desktop navigation is Dashboard, Bookings, Customers, Catalog, Products, Bundles, Contracts, Settings; mobile uses compact accessible navigation. Bookings is operationally central. Catalog browses products/bundles while management remains separate. No calendar route is planned.

Booking lines and bundle component snapshots preserve historical catalog values. Contract records preserve a booking/template snapshot and opaque protected file reference. Normal deletion is archival. Admin is the only active MVP role, with future role extension allowed by the model.
