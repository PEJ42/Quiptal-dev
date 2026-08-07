import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addContact, toggleContactArchive, toggleCustomerArchive } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { contacts: { orderBy: { createdAt: "asc" } } },
  });
  if (!customer) notFound();
  return (
    <AppShell activeItem="Customers">
      <header className="page-header">
        <div>
          <p className="page-kicker">Customer profile</p>
          <h1 className="page-title">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="page-subtitle">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </p>
        </div>
        <form action={toggleCustomerArchive}>
          <input name="id" type="hidden" value={customer.id} />
          <input name="archive" type="hidden" value={String(!customer.archivedAt)} />
          <button className="secondary-button" type="submit">
            {customer.archivedAt ? "Restore" : "Archive"}
          </button>
        </form>
      </header>
      <section className="section-card mt-7">
        <h2 className="text-base font-semibold text-slate-800">Billing address</h2>
        <p className="mt-2 text-sm text-slate-600">
          {[
            customer.addressLine1,
            customer.addressLine2,
            customer.city,
            customer.region,
            customer.postalCode,
            customer.country,
          ]
            .filter(Boolean)
            .join(", ") || "No billing address saved."}
        </p>
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Additional contacts</h2>
        <div className="mt-3 space-y-2">
          {customer.contacts.map((contact) => (
            <div
              className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm"
              key={contact.id}
            >
              <span>
                {contact.name}
                {contact.relationship ? ` · ${contact.relationship}` : ""}
                {contact.archivedAt ? " (archived)" : ""}
              </span>
              <form action={toggleContactArchive}>
                <input name="id" type="hidden" value={contact.id} />
                <input name="customerId" type="hidden" value={customer.id} />
                <input name="archive" type="hidden" value={String(!contact.archivedAt)} />
                <button className="text-action" type="submit">
                  {contact.archivedAt ? "Restore" : "Archive"}
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={addContact} className="form-card mt-5 grid gap-3 bg-slate-50 sm:grid-cols-2">
          <input name="customerId" type="hidden" value={customer.id} />
          <input
            className="rounded border p-2 text-sm"
            name="name"
            placeholder="Contact name"
            required
          />
          <input
            className="rounded border p-2 text-sm"
            name="relationship"
            placeholder="Relationship"
          />
          <input
            className="rounded border p-2 text-sm"
            name="email"
            placeholder="Email"
            type="email"
          />
          <input className="rounded border p-2 text-sm" name="phone" placeholder="Phone" />
          <button className="primary-button w-fit" type="submit">
            Add contact
          </button>
        </form>
      </section>
      <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-800">Booking history</h2>
        <p className="mt-2 text-sm text-slate-600">
          Bookings for this customer will appear here in a future update.
        </p>
      </section>
    </AppShell>
  );
}
