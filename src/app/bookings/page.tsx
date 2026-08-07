import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { isUpcomingBooking } from "@/lib/booking-schema";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

function statusClass(name: string) {
  const value = name.toLowerCase();
  if (value.includes("returned")) return "border-slate-200 bg-slate-100 text-slate-700";
  if (value.includes("picked")) return "border-blue-100 bg-blue-50 text-blue-700";
  if (value.includes("cancel")) return "border-amber-100 bg-amber-50 text-amber-800";
  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function typeClass(name: string) {
  const value = name.toLowerCase();
  if (value.includes("wedding")) return "bg-violet-50 text-violet-700";
  if (value.includes("corporate")) return "bg-blue-50 text-blue-700";
  if (value.includes("festival")) return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function dateParts(value: Date) {
  return {
    month: month.format(value).toUpperCase(),
    day: value.getUTCDate(),
    year: value.getUTCFullYear(),
  };
}

function MetricIcon({ kind }: Readonly<{ kind: "calendar" | "revenue" | "month" | "customers" }>) {
  const glyphs = { calendar: "□", revenue: "$", month: "↗", customers: "♙" };
  return (
    <span aria-hidden="true" className="text-base font-semibold">
      {glyphs[kind]}
    </span>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statusId?: string; typeId?: string; past?: string }>;
}) {
  await requireAdmin();
  const { q = "", statusId, typeId, past } = await searchParams;
  const [bookings, statuses, types, metricBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        archivedAt: null,
        ...(statusId ? { bookingStatusId: statusId } : {}),
        ...(typeId ? { bookingTypeId: typeId } : {}),
        ...(q
          ? {
              OR: [
                { bookingNumber: { contains: q } },
                { title: { contains: q } },
                { customer: { firstName: { contains: q } } },
                { customer: { lastName: { contains: q } } },
                { customer: { email: { contains: q } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        bookingStatus: true,
        bookingType: true,
        lines: { where: { lineType: "SERVICE" }, select: { snapshotName: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.bookingStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.bookingType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.booking.findMany({
      where: { archivedAt: null },
      select: { startDate: true, totalCents: true, customerId: true },
    }),
  ]);
  const filtered = bookings.filter((booking) =>
    past ? !isUpcomingBooking(booking.startDate) : isUpcomingBooking(booking.startDate),
  );
  const upcoming = metricBookings.filter((booking) => isUpcomingBooking(booking.startDate));
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const thisMonth = metricBookings.filter(
    (booking) => booking.startDate >= monthStart && booking.startDate < nextMonth,
  );
  const metrics = [
    {
      label: "Upcoming bookings",
      value: String(upcoming.length),
      tone: "bg-blue-50 text-blue-700",
      kind: "calendar" as const,
    },
    {
      label: "Upcoming revenue",
      value: currency.format(upcoming.reduce((sum, booking) => sum + booking.totalCents, 0) / 100),
      tone: "bg-emerald-50 text-emerald-700",
      kind: "revenue" as const,
    },
    {
      label: "Bookings this month",
      value: String(thisMonth.length),
      tone: "bg-violet-50 text-violet-700",
      kind: "month" as const,
    },
    {
      label: "Customers with upcoming",
      value: String(new Set(upcoming.map((booking) => booking.customerId)).size),
      tone: "bg-amber-50 text-amber-700",
      kind: "customers" as const,
    },
  ];
  const hasFilters = Boolean(q || statusId || typeId);

  return (
    <AppShell activeItem="Bookings">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage upcoming events, customers, and rental totals.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          href="/bookings/new"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          New booking
        </Link>
      </header>

      <section
        aria-label="Booking summary"
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <div
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {metric.value}
                </p>
              </div>
              <span className={`flex size-9 items-center justify-center rounded-lg ${metric.tone}`}>
                <MetricIcon kind={metric.kind} />
              </span>
            </div>
          </div>
        ))}
      </section>

      <form className="mt-7 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.5fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto]">
        {past && <input name="past" type="hidden" value="true" />}
        <label className="sr-only" htmlFor="booking-search">
          Search bookings
        </label>
        <input
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={q}
          id="booking-search"
          name="q"
          placeholder="Search by event, customer, email, or number"
        />
        <label className="sr-only" htmlFor="booking-status">
          Booking status
        </label>
        <select
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={statusId ?? ""}
          id="booking-status"
          name="statusId"
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="booking-type">
          Booking type
        </label>
        <select
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={typeId ?? ""}
          id="booking-type"
          name="typeId"
        >
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          type="submit"
        >
          Apply
        </button>
      </form>
      <div className="mt-4">
        <Link
          className="text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          href={past ? "/bookings" : "/bookings?past=true"}
        >
          {past ? "Show upcoming" : "Show past"}
        </Link>
      </div>

      <section aria-labelledby="booking-list-heading" className="mt-7">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-800" id="booking-list-heading">
            {past ? "Past bookings" : "Upcoming bookings"}
          </h2>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {filtered.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-800">
              {hasFilters
                ? "No bookings match these filters."
                : `No ${past ? "past" : "upcoming"} bookings yet.`}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Create a booking to begin tracking rental events."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {hasFilters && (
                <Link
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                  href={past ? "/bookings?past=true" : "/bookings"}
                >
                  Clear filters
                </Link>
              )}
              <Link
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                href="/bookings/new"
              >
                New booking
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3">
                      <span className="sr-only">Open booking</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((booking) => {
                    const date = dateParts(booking.startDate);
                    const multiDay = booking.endDate.getTime() !== booking.startDate.getTime();
                    const services = booking.lines.map((line) => line.snapshotName);
                    return (
                      <tr className="transition-colors hover:bg-blue-50/40" key={booking.id}>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="text-xs font-semibold text-slate-500">{date.month}</div>
                          <div className="text-lg font-semibold text-slate-900">
                            {date.day}
                            {multiDay ? `–${booking.endDate.getUTCDate()}` : ""}
                          </div>
                          <div className="text-xs text-slate-500">{date.year}</div>
                        </td>
                        <td className="max-w-52 px-5 py-4">
                          <Link
                            className="block font-semibold text-slate-900 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            href={`/bookings/${booking.id}`}
                          >
                            {booking.title || "Untitled booking"}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{booking.bookingNumber}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {booking.customer.firstName} {booking.customer.lastName}
                          </p>
                          <p className="mt-1 max-w-40 truncate text-xs text-slate-500">
                            {booking.customer.email}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${typeClass(booking.bookingType.name)}`}
                          >
                            {booking.bookingType.name}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(booking.bookingStatus.name)}`}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {booking.bookingStatus.name}
                          </span>
                        </td>
                        <td className="max-w-40 px-5 py-4 text-sm text-slate-600">
                          {services.length ? services.join(", ") : "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                          {currency.format(booking.totalCents / 100)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            aria-label={`Open ${booking.bookingNumber}`}
                            className="rounded-md p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            href={`/bookings/${booking.id}`}
                          >
                            →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {filtered.map((booking) => {
                const date = dateParts(booking.startDate);
                return (
                  <Link
                    className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    href={`/bookings/${booking.id}`}
                    key={booking.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="min-w-12 text-center">
                          <p className="text-[10px] font-semibold text-slate-500">{date.month}</p>
                          <p className="text-xl font-semibold text-slate-900">{date.day}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {booking.title || "Untitled booking"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {booking.customer.firstName} {booking.customer.lastName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{booking.bookingNumber}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {currency.format(booking.totalCents / 100)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${statusClass(booking.bookingStatus.name)}`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {booking.bookingStatus.name}
                      </span>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${typeClass(booking.bookingType.name)}`}
                      >
                        {booking.bookingType.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
