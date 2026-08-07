# Rental Booking App — Agent Instructions

Build a private internal booking app for a small sound and lighting rental business. Use Next.js App Router, React, TypeScript, Tailwind, Prisma, SQLite locally, Zod, a maintained credentials-auth solution, Vitest, Playwright, ESLint, and Prettier. Use server components by default and client components only for needed interaction. Prefer server actions; use route handlers for downloads and when clearer. Keep code straightforward, strongly typed, and free of `any` unless documented.

Validate all user input on the server with schemas and authorize every protected action on the server. Use secure password hashing, secure production session cookies, safe errors, safe upload validation/names, non-public contract storage, and no committed secrets. Do not use real customer data.

Money is integer cents. Booking dates are date-only; validate the end date is not before the start. Snapshot catalog names, descriptions, prices, taxability, and bundle components into booking lines. Contracts use snapshots. Normal UI behavior archives/restores records and never hard-deletes customers, catalog records, bookings, or contracts.

Before completing a milestone run formatting, format check, lint, typecheck, tests, and production build. Keep docs synchronized. Stop for review at each milestone. Do not implement Version 2 features without explicit approval: public portal, online booking/payments, inventory/availability, calendar, reports, Outlook/Microsoft sign-in, e-signatures, or native apps. Do not commit unless explicitly requested.
