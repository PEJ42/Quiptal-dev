# Product Requirements Document

## Product and scope

A responsive private web app for an internal sound/lighting equipment-rental business, used first by one owner on iPhone and Mac. It supports manual bookings only. It excludes public customer access, online booking/payment, inventory availability/quantity enforcement, serial/warehouse tracking, calendar, reports, Outlook/Microsoft sign-in, e-signatures, invoices, checkout, and native apps.

## Users and navigation

First run securely creates the first Admin without source changes or default credentials. Sign-in supports username/email and password; protected routes and sign-out are required. Future Editor/Viewer compatibility is retained. Navigation: Dashboard, Bookings, Customers, Catalog, Products, Bundles, Contracts, Settings.

## Functional requirements

- **Customers:** required first/last name/email; optional phone/billing address; additional contacts; create/view/edit/search/archive/restore; normalized-email duplicate warning; detail displays booking/contract history.
- **Catalog:** editable default categories; products with one optional validated image, default rental/replacement cents, taxable/archive state; bundles with fixed authoritative price, cover image, positive ordered product components; editable services with price/taxability. Catalog browses product and bundles with filters/search.
- **Bookings:** unique readable number, customer/contact, title, required valid date range, editable type/status, event address, billing snapshot, notes, activity, contracts, and date-ordered upcoming list determined from configured timezone. Default statuses are Reserved, Picked Up, Returned.
- **Lines and pricing:** product/bundle/service lines snapshot catalog values. Support quantity and booking-only price overrides, fixed _or_ percent discount, deterministic taxable discount/tax calculation, subtotal, deposit, total, and revenue excluding refundable deposit. The calculation is pure and tested.
- **Contracts:** render immutable protected US Letter PDFs from sanitized editable templates; include company/customer/booking, item details, totals/deposit, terms, footer, and future signature area. Draft/Generated are MVP statuses; downloads require authorization.
- **Settings/dashboard/search:** Admin manages company details/timezone/currency/tax/configuration/template. Referenced settings archive rather than delete. Dashboard shows upcoming bookings and defined revenue. Global search groups bookings/customers/products/bundles.

## Quality

Use accessible semantic responsive UI, readable mobile tables, keyboard/touch support, clear states, server validation/authorization, integer cents, date-only bookings, immutable history, and focused automated coverage.
