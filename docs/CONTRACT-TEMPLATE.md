# Sanitized Contract Template Specification

Never add the original private reference contract or real customer data to the repository. Milestone 6 creates a new PDF from editable sanitized legal text.

Required sections: company information; creation date; booking/contract number, type, title, start/end; customer/contact/billing/event address; products, bundles and components, services; subtotal, discount, tax, totals, deposit; readable legal terms/footer; future signature area without e-signature workflow.

Required placeholders include `companyName`, `companyAddress`, `companyPhone`, `companyEmail`, `customerName`, `customerEmail`, `customerPhone`, `billingAddress`, `eventLocation`, `bookingNumber`, `bookingTitle`, `bookingType`, `startDate`, `endDate`, `products`, `bundles`, `bundleComponents`, `services`, `subtotal`, `discount`, `tax`, `total`, `securityDeposit`, and `creationDate`.

Generated versions use booking/template snapshots, protected non-guessable storage, US Letter multipage-safe layout, and names such as `booking-<number>-contract-<version>.pdf`.

## Implemented editor and versioning

Admins can edit the active template's title, legal terms, and footer at `/contracts`. The legal-terms editor supports paragraphs, bold text, and unordered bullet lists; only this limited formatting is retained and rendered in generated PDFs. Saving increments its version. Generating from a booking writes a new immutable generated-contract record that snapshots all template text, booking values, line items, components, and calculated totals. Existing versions are never overwritten.

PDF files are stored outside public static assets under an opaque UUID filename. Downloads flow through an authenticated route, use a friendly attachment filename, are marked private/no-store, and record a download activity event.
