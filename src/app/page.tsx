import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { calculateDashboardMetrics } from "@/lib/dashboard";
import { isUpcomingBooking } from "@/lib/booking-schema";
import { prisma } from "@/lib/prisma";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function Home() {
  await requireAdmin();
  const bookings = await prisma.booking.findMany({
    where: { archivedAt: null },
    include: { customer: true, bookingStatus: true, bookingType: true },
    orderBy: { startDate: "asc" },
  });
  const metrics = calculateDashboardMetrics(bookings);
  const upcoming = bookings.filter((booking) => isUpcomingBooking(booking.startDate)).slice(0, 5);
  const cards = [
    {
      label: "Upcoming bookings",
      value: String(metrics.upcomingBookings),
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Upcoming revenue",
      value: currency.format(metrics.upcomingRevenueCents / 100),
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Bookings this month",
      value: String(metrics.bookingsThisMonth),
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Customers with upcoming",
      value: String(metrics.customersWithUpcomingBookings),
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <AppShell activeItem="Dashboard">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Rental operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            A current view of your upcoming rental activity.
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
        aria-label="Dashboard summary"
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <div
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            key={card.label}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={`flex size-9 items-center justify-center rounded-lg text-base font-semibold ${card.tone}`}
              >
                {card.label.includes("revenue")
                  ? "$"
                  : card.label.includes("Customers")
                    ? "♙"
                    : "□"}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section
        aria-labelledby="upcoming-heading"
        className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900" id="upcoming-heading">
              Upcoming bookings
            </h2>
            <p className="mt-1 text-sm text-slate-500">Your next five scheduled events.</p>
          </div>
          <Link
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
            href="/bookings"
          >
            View all
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold text-slate-800">No upcoming bookings yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Create a booking to populate your schedule.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((booking) => (
              <li key={booking.id}>
                <Link
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"
                  href={`/bookings/${booking.id}`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="hidden min-w-24 text-sm text-slate-500 sm:block">
                      {date.format(booking.startDate)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {booking.title ||
                          `${booking.customer.firstName} ${booking.customer.lastName}`}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {booking.customer.firstName} {booking.customer.lastName} ·{" "}
                        {booking.bookingType.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                      {booking.bookingStatus.name}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {currency.format(booking.totalCents / 100)}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
