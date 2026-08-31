# Architecture

The MVP is one Next.js App Router deployment: browser → server components/actions or route handlers → typed domain services → Prisma → SQLite locally. No containers, queues, microservices, event buses, or client global-state library are needed. The schema avoids SQLite-specific application logic to permit future PostgreSQL migration.

Use server components by default. Client components are limited to forms, mobile navigation, dialogs, and required interaction. Zod validates server inputs; server actions authorize mutations; route handlers authorize files and downloads. Pages do not own pricing, snapshots, or permission logic.

`src/app` owns routes/layouts/handlers; `src/features` will own domain forms, services, repositories, and schemas; `src/lib` will own auth, Prisma, money, date, storage, and shared utilities; `prisma` owns schema/migrations/seed; `tests` owns Vitest and Playwright coverage.

Desktop navigation is Dashboard, Bookings, Customers, Catalog, Products, Bundles, Contracts, Settings; mobile uses compact accessible navigation. Bookings is operationally central. Catalog browses products/bundles while management remains separate. No calendar route is planned.

Booking lines and bundle component snapshots preserve historical catalog values. Contract records preserve a booking/template snapshot and opaque protected file reference. Normal deletion is archival.

## Teams and booking access

Every account has an active workspace. A public account creates its own workspace and becomes its only admin. Admins can make a one-time, recipient-email-bound invitation for their workspace. The token stored in the database is a SHA-256 hash; the plain invitation link is shown to the administrator only when it is created.

Invited people use the ordinary sign-up or sign-in route. The application checks the normalized email address, atomically marks the invitation used, creates a standard membership, and selects the inviting workspace. Standard members can create bookings, and they only see bookings where they are the creator, owner, or an explicit booking member. Admins see all bookings in their workspace. Contracts and payments inherit their booking's server-side access check, including direct URL access, search, dashboard totals, and downloads.

## Booking handoffs

Each booking has independent Dropoff and Pickup checklists. A checklist stores its current step, per-step completion record, damage report, and private photo references. The final confirmation completes the flow, invalidates its active shared link, and sets the booking status to Picked Up. Handoff links are random, hashed at rest, and protected: a visitor must be signed in and be an owner, creator, or booking member. A pending booking email is matched during future sign-up or sign-in so the new user is attached to the intended booking.
