import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toggleCustomerArchive } from "./actions";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  await requireAdmin();
  const { q = "", archived } = await searchParams;
  const showArchived = archived === "true";
  const customers = await prisma.customer.findMany({
    where: {
      archivedAt: showArchived ? { not: null } : null,
      OR: q
        ? [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ]
        : undefined,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return (
    <AppShell activeItem="Customers">
      <header className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            Keep contact and billing information ready for every event.
          </p>
        </div>
        <Link className="primary-button" href="/customers/new">
          New customer
        </Link>
      </header>
      <form className="form-card mt-7 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          defaultValue={q}
          name="q"
          placeholder="Search name, email, or phone"
        />
        <button className="secondary-button" type="submit">
          Search
        </button>
        <Link
          className="secondary-button"
          href={showArchived ? "/customers" : "/customers?archived=true"}
        >
          {showArchived ? "Active" : "Archived"}
        </Link>
      </form>
      <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-semibold text-slate-800">No customers found.</p>
            <p className="mt-2 text-sm text-slate-500">
              Add a customer to start creating bookings.
            </p>
          </div>
        ) : (
          customers.map((customer) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0 sm:p-5"
              key={customer.id}
            >
              <Link className="group" href={`/customers/${customer.id}`}>
                <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
              </Link>
              <form action={toggleCustomerArchive}>
                <input name="id" type="hidden" value={customer.id} />
                <input name="archive" type="hidden" value={String(!showArchived)} />
                <button className="text-action" type="submit">
                  {showArchived ? "Restore" : "Archive"}
                </button>
              </form>
            </div>
          ))
        )}
      </section>
    </AppShell>
  );
}
