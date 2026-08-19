import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBooking } from "../actions";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [customers, types, statuses, settings, { error }] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.bookingType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.bookingStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    searchParams,
  ]);
  return (
    <AppShell activeItem="Bookings">
      <Link className="back-link" href="/bookings">
        ← Bookings
      </Link>
      <header className="mt-4">
        <h1 className="page-title">New booking</h1>
        <p className="page-subtitle">Set up an event, customer, pricing, and event location.</p>
      </header>
      {customers.length === 0 ? (
        <p className="section-card mt-6 text-sm text-slate-600">
          Create a customer before creating a booking.
        </p>
      ) : (
        <form action={createBooking} className="form-card mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
          {error && (
            <p className="text-sm text-red-700 sm:col-span-2">
              Check booking dates and required values.
            </p>
          )}
          <label className="text-sm">
            Customer
            <select className="mt-1 w-full rounded border p-2" name="customerId">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName}, {c.firstName} · {c.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Title
            <input className="mt-1 w-full rounded border p-2" name="title" />
          </label>
          <label className="text-sm">
            Start date
            <input
              className="mt-1 w-full rounded border p-2"
              name="startDate"
              required
              type="date"
            />
          </label>
          <label className="text-sm">
            End date
            <input className="mt-1 w-full rounded border p-2" name="endDate" required type="date" />
          </label>
          <label className="text-sm">
            Booking type
            <select className="mt-1 w-full rounded border p-2" name="bookingTypeId">
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Status
            <select className="mt-1 w-full rounded border p-2" name="bookingStatusId">
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tax rate (basis points)
            <input
              className="mt-1 w-full rounded border p-2"
              name="taxRateBasisPoints"
              defaultValue={settings?.defaultTaxRateBasisPoints ?? 0}
              min="0"
              max="10000"
              required
              type="number"
            />
          </label>
          <label className="text-sm">
            Discount type
            <select className="mt-1 w-full rounded border p-2" name="discountType">
              <option value="">None</option>
              <option value="FIXED">Fixed cents</option>
              <option value="PERCENT">Percent (basis points)</option>
            </select>
          </label>
          <label className="text-sm">
            Discount value
            <input
              className="mt-1 w-full rounded border p-2"
              name="discountValue"
              defaultValue="0"
              min="0"
              required
              type="number"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Event address line 1
            <input className="mt-1 w-full rounded border p-2" name="eventAddressLine1" />
          </label>
          <label className="text-sm">
            Event city
            <input className="mt-1 w-full rounded border p-2" name="eventCity" />
          </label>
          <label className="text-sm">
            Event state or region
            <input className="mt-1 w-full rounded border p-2" name="eventRegion" />
          </label>
          <label className="text-sm">
            Event postal code
            <input className="mt-1 w-full rounded border p-2" name="eventPostalCode" />
          </label>
          <label className="text-sm">
            Event country
            <input className="mt-1 w-full rounded border p-2" name="eventCountry" />
          </label>
          <label className="text-sm sm:col-span-2">
            Notes
            <textarea className="mt-1 w-full rounded border p-2" name="notes" />
          </label>
          <button className="primary-button w-fit sm:col-span-2">Create booking</button>
        </form>
      )}
    </AppShell>
  );
}
