import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { bookingVisibilityWhere, requireWorkspaceUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const maxResults = 8;

function ResultGroup({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
        {title}
      </h2>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireWorkspaceUser();
  const rawQuery = (await searchParams).q ?? "";
  const q = rawQuery.trim().slice(0, 80);
  const hasQuery = q.length > 0;
  const [bookings, customers, products, bundles] = hasQuery
    ? await Promise.all([
        prisma.booking.findMany({
          where: {
            AND: [
              bookingVisibilityWhere(user),
              {
                archivedAt: null,
                OR: [
                  { bookingNumber: { contains: q } },
                  { title: { contains: q } },
                  { customer: { firstName: { contains: q } } },
                  { customer: { lastName: { contains: q } } },
                  { customer: { email: { contains: q } } },
                ],
              },
            ],
          },
          include: { customer: true, bookingType: true },
          orderBy: { startDate: "asc" },
          take: maxResults,
        }),
        prisma.customer.findMany({
          where: {
            archivedAt: null,
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          take: maxResults,
        }),
        prisma.product.findMany({
          where: {
            archivedAt: null,
            OR: [{ name: { contains: q } }, { description: { contains: q } }],
          },
          include: { category: true },
          orderBy: { name: "asc" },
          take: maxResults,
        }),
        prisma.bundle.findMany({
          where: {
            archivedAt: null,
            OR: [{ name: { contains: q } }, { description: { contains: q } }],
          },
          orderBy: { name: "asc" },
          take: maxResults,
        }),
      ])
    : ([[], [], [], []] as const);
  const count = bookings.length + customers.length + products.length + bundles.length;

  return (
    <AppShell>
      <header>
        <p className="text-sm font-medium text-blue-700">Global search</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Search</h1>
        <form action="/search" className="mt-5 flex max-w-2xl gap-2" method="get">
          <label className="sr-only" htmlFor="search-page-query">
            Search
          </label>
          <input
            autoFocus
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            defaultValue={q}
            id="search-page-query"
            name="q"
            placeholder="Search bookings, customers, products, and bundles"
            type="search"
          />
          <button
            className="rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700"
            type="submit"
          >
            Search
          </button>
        </form>
      </header>
      {!hasQuery ? (
        <p className="mt-8 text-sm text-slate-500">
          Enter a booking number, customer name, email, product, or bundle to search internal
          records.
        </p>
      ) : (
        <>
          <p className="mt-7 text-sm text-slate-500">
            {count
              ? `${count} result${count === 1 ? "" : "s"} for “${q}”`
              : `No results for “${q}”.`}
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ResultGroup title="Bookings">
              {bookings.length ? (
                bookings.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      className="block px-5 py-3 hover:bg-blue-50/50"
                      href={`/bookings/${booking.id}`}
                    >
                      <p className="font-semibold text-slate-900">
                        {booking.title || booking.bookingNumber}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {booking.bookingNumber} · {booking.customer.firstName}{" "}
                        {booking.customer.lastName} · {booking.bookingType.name}
                      </p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-5 py-4 text-sm text-slate-500">No matching bookings.</li>
              )}
            </ResultGroup>
            <ResultGroup title="Customers">
              {customers.length ? (
                customers.map((customer) => (
                  <li key={customer.id}>
                    <Link
                      className="block px-5 py-3 hover:bg-blue-50/50"
                      href={`/customers/${customer.id}`}
                    >
                      <p className="font-semibold text-slate-900">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-5 py-4 text-sm text-slate-500">No matching customers.</li>
              )}
            </ResultGroup>
            <ResultGroup title="Products">
              {products.length ? (
                products.map((product) => (
                  <li key={product.id}>
                    <Link
                      className="block px-5 py-3 hover:bg-blue-50/50"
                      href={`/products/${product.id}`}
                    >
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{product.category.name}</p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-5 py-4 text-sm text-slate-500">No matching products.</li>
              )}
            </ResultGroup>
            <ResultGroup title="Bundles">
              {bundles.length ? (
                bundles.map((bundle) => (
                  <li key={bundle.id}>
                    <Link
                      className="block px-5 py-3 hover:bg-blue-50/50"
                      href={`/bundles/${bundle.id}`}
                    >
                      <p className="font-semibold text-slate-900">{bundle.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {bundle.description || "Rental bundle"}
                      </p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-5 py-4 text-sm text-slate-500">No matching bundles.</li>
              )}
            </ResultGroup>
          </div>
        </>
      )}
    </AppShell>
  );
}
