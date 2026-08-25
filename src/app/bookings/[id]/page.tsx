import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookingLinesEditor } from "@/components/booking-lines-editor";
import { requireAdmin } from "@/lib/auth";
import { centsToDollars } from "@/lib/money";
import { recommendedSecurityDepositCents, replacementValueCents } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { generateContract } from "@/app/contracts/actions";
import { updateBookingPricing, updateBookingStatus } from "../actions";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [booking, products, bundles, statuses] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        bookingType: true,
        bookingStatus: true,
        lines: { include: { bundleComponentSnapshots: true }, orderBy: { displayOrder: "asc" } },
        activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
        generatedContracts: { orderBy: { version: "desc" } },
      },
    }),
    prisma.product.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.bundle.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.bookingStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!booking) notFound();
  const replacementValue = replacementValueCents(booking.lines);
  const recommendedDeposit = recommendedSecurityDepositCents(booking.lines);
  const isAutomaticDeposit = booking.securityDepositOverrideCents === null;
  return (
    <AppShell activeItem="Bookings">
      <header className="page-header">
        <div>
          <p className="page-kicker">
            {booking.bookingNumber} · {booking.startDate.toISOString().slice(0, 10)} to{" "}
            {booking.endDate.toISOString().slice(0, 10)}
          </p>
          <h1 className="page-title">
            {booking.title || `${booking.customer.firstName} ${booking.customer.lastName}`}
          </h1>
          <p className="page-subtitle">
            {booking.customer.email} · {booking.bookingType.name}
          </p>
        </div>
        <form action={updateBookingStatus} className="flex flex-wrap gap-2">
          <input name="bookingId" type="hidden" value={id} />
          <select
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            defaultValue={booking.bookingStatusId}
            name="bookingStatusId"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
          <button className="secondary-button">Update status</button>
        </form>
      </header>
      <section className="section-card mt-7 text-sm">
        <h2 className="text-base font-semibold text-slate-800">Event and billing details</h2>
        <p className="mt-2 text-slate-600">
          Event:{" "}
          {[
            booking.eventAddressLine1,
            booking.eventAddressLine2,
            booking.eventCity,
            booking.eventRegion,
            booking.eventPostalCode,
            booking.eventCountry,
          ]
            .filter(Boolean)
            .join(", ") || "No event location saved."}
        </p>
        <p className="mt-2 text-slate-600">
          Billing snapshot:{" "}
          {[
            booking.billingAddressLine1Snapshot,
            booking.billingAddressLine2Snapshot,
            booking.billingCitySnapshot,
            booking.billingRegionSnapshot,
            booking.billingPostalCodeSnapshot,
            booking.billingCountrySnapshot,
          ]
            .filter(Boolean)
            .join(", ") || "No billing address saved."}
        </p>
        {booking.notes && <p className="mt-2 text-slate-600">Notes: {booking.notes}</p>}
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Booking lines</h2>
        <BookingLinesEditor
          bookingId={id}
          bundles={bundles}
          lines={booking.lines}
          products={products}
        />
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Totals</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt>Subtotal</dt>
          <dd>${(booking.subtotalCents / 100).toFixed(2)}</dd>
          <dt>Discount</dt>
          <dd>−${(booking.discountCents / 100).toFixed(2)}</dd>
          <dt>Tax</dt>
          <dd>${(booking.taxCents / 100).toFixed(2)}</dd>
          <dt>Security deposit</dt>
          <dd>${(booking.securityDepositCents / 100).toFixed(2)}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="font-semibold">${(booking.totalCents / 100).toFixed(2)}</dd>
        </dl>
        <p className="mt-4 text-sm text-slate-600">
          {isAutomaticDeposit
            ? `Automatic: 60% of $${centsToDollars(replacementValue)} replacement value.`
            : `Custom deposit override. Automatic recommendation: $${centsToDollars(recommendedDeposit)}.`}
        </p>
        <form action={updateBookingPricing} className="mt-5 grid gap-2 sm:grid-cols-5">
          <input name="bookingId" type="hidden" value={id} />
          <select
            className="rounded border p-2 text-sm"
            defaultValue={booking.discountType ?? ""}
            name="discountType"
          >
            <option value="">No discount</option>
            <option value="FIXED">Fixed cents</option>
            <option value="PERCENT">Percent (basis points)</option>
          </select>
          <input
            className="rounded border p-2 text-sm"
            defaultValue={booking.discountValue}
            min="0"
            name="discountValue"
            type="number"
          />
          <input
            className="rounded border p-2 text-sm"
            defaultValue={booking.taxRateBasisPoints}
            min="0"
            max="10000"
            name="taxRateBasisPoints"
            type="number"
          />
          <select
            className="rounded border p-2 text-sm"
            defaultValue={isAutomaticDeposit ? "AUTO" : "OVERRIDE"}
            name="securityDepositMode"
          >
            <option value="AUTO">Automatic deposit</option>
            <option value="OVERRIDE">Custom deposit</option>
          </select>
          <input
            className="rounded border p-2 text-sm"
            defaultValue={centsToDollars(
              booking.securityDepositOverrideCents ?? recommendedDeposit,
            )}
            min="0"
            name="securityDepositOverrideDollars"
            step="0.01"
            type="number"
          />
          <button className="secondary-button w-fit">Update pricing</button>
        </form>
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Contracts</h2>
        <form action={generateContract} className="mt-3">
          <input name="bookingId" type="hidden" value={id} />
          <button className="primary-button">Generate new PDF version</button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {booking.generatedContracts.length === 0 ? (
            <li className="text-slate-600">No contracts generated yet.</li>
          ) : (
            booking.generatedContracts.map((contract) => (
              <li key={contract.id}>
                <a className="text-action" href={`/api/contracts/${contract.id}`}>
                  Download contract version {contract.version}
                </a>{" "}
                · {contract.generatedAt.toISOString().slice(0, 10)}
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {booking.activities.map((activity) => (
            <li key={activity.id}>
              {activity.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {activity.summary}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
