# Rental Booking App — Agent Instructions

Build a private internal booking app for a small sound and lighting rental business. Use Next.js App Router, React, TypeScript, Tailwind, Prisma, SQLite locally, Zod, a maintained credentials-auth solution, Vitest, Playwright, ESLint, and Prettier. Use server components by default and client components only for needed interaction. Prefer server actions; use route handlers for downloads and when clearer. Keep code straightforward, strongly typed, and free of `any` unless documented.

Validate all user input on the server with schemas and authorize every protected action on the server. Use secure password hashing, secure production session cookies, safe errors, safe upload validation/names, non-public contract storage, and no committed secrets. Do not use real customer data.

Money is integer cents. Booking dates are date-only; validate the end date is not before the start. Snapshot catalog names, descriptions, prices, taxability, and bundle components into booking lines. Contracts use snapshots. Normal UI behavior archives/restores records and never hard-deletes customers, catalog records, bookings, or contracts.

Before completing a milestone run formatting, format check, lint, typecheck, tests, and production build. Keep docs synchronized. Stop for review at each milestone. Do not implement Version 2 features without explicit approval: public portal, online booking/payments, inventory/availability, calendar, reports, Outlook/Microsoft sign-in, e-signatures, or native apps. Do not commit unless explicitly requested.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
