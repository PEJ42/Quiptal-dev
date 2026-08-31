# Database Proposal

Milestone 1 will configure Prisma for SQLite local development and initial migrations. The current preliminary PostgreSQL datasource is a baseline artifact, not the approved MVP datastore. Schema design remains portable to PostgreSQL.

| Area      | Models                                                                                              | Rules                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Identity  | `User`                                                                                              | normalized unique email, optional username, password hash, role, archival/session fields, timestamps                              |
| Teams     | `Team`, `TeamMembership`, `TeamInvitation`                                                          | a first creator is an admin; invitation tokens are hashed and single-use; standard members are invite-only                        |
| Settings  | `CompanySettings`, `ProductCategory`, `BookingType`, `BookingStatus`, `Service`, `ContractTemplate` | editable rows with ordering/active/archive fields; template versions are snapshotted                                              |
| Customers | `Customer`, `CustomerContact`                                                                       | names/email/phone/address; normalized email is indexed for warning, not hard uniqueness; archived, never normally deleted         |
| Catalog   | `Product`, `Bundle`, `BundleComponent`                                                              | integer-cent prices, one opaque image reference, archive fields; components have positive quantity and display order              |
| Booking   | `Booking`, `BookingLine`, `BookingBundleComponentSnapshot`, `BookingActivity`                       | readable unique booking number, dates, customer/settings/address snapshots, all catalog line snapshots, audit events              |
| Contract  | `ContractTemplate`, `GeneratedContract`                                                             | editable active template; immutable booking/template snapshot and version, opaque file ref, generated/download timestamps, status |

Every model has `createdAt` and `updatedAt`; archiveable records also have `archivedAt`. Index names/descriptions, normalized customer fields, booking number/date/status/type/customer, and active/archive filters. Historical relations use restrictive deletion rather than cascading. Service-layer transactions enforce cross-row snapshot, quantity, date, and discount rules. Money is cents; configured values are rows rather than enums when Settings must edit them.

Bookings store summary cents as well as booking lines. The summary is recalculated from immutable line snapshots whenever lines or booking-level pricing settings change. A fixed discount is cents; a percentage discount is basis points and capped at 100%. Discount is allocated proportionally to taxable subtotal before tax. The refundable security deposit defaults to 60% of the replacement-value snapshots and is stored as a summary value; a nullable override field records an explicit custom amount.

Each booking belongs to one team and records a creator and owner. `BookingMember` supplies additional access. The booking visibility predicate is the single authorization rule: workspace admins see all workspace bookings; standard members see only bookings they created, own, or are assigned. All contract and payment reads first apply that predicate through their booking relation.

An idempotent development seed will upsert categories (Audio, Lighting, Video, Power, Rigging, Accessories, Furniture, Miscellaneous, Owner), statuses (Reserved, Picked Up, Returned), types, services (Pickup, Delivery, Setup, Teardown), settings, and fictional data. It never creates a known production password.
