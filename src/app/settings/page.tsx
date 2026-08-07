import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSettingItem, saveCompanySettings, toggleSettingItem } from "./actions";

function ConfigurationList({
  title,
  kind,
  items,
}: {
  title: string;
  kind: "category" | "bookingType" | "bookingStatus" | "service";
  items: {
    id: string;
    name: string;
    isActive: boolean;
    description?: string | null;
    defaultPriceCents?: number;
  }[];
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 divide-y">
        {items.map((item) => (
          <li className="flex items-center justify-between py-2 text-sm" key={item.id}>
            <span>
              {item.name}
              {item.description ? ` — ${item.description}` : ""}
              {item.defaultPriceCents !== undefined
                ? ` · $${(item.defaultPriceCents / 100).toFixed(2)}`
                : ""}
            </span>
            <form action={toggleSettingItem}>
              <input name="id" type="hidden" value={item.id} />
              <input name="kind" type="hidden" value={kind} />
              <input name="isActive" type="hidden" value={String(!item.isActive)} />
              <button className="text-slate-600 underline" type="submit">
                {item.isActive ? "Archive" : "Restore"}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form action={createSettingItem} className="mt-4 flex flex-wrap gap-2">
        <input name="kind" type="hidden" value={kind} />
        <input
          className="min-w-40 flex-1 rounded border p-2 text-sm"
          name="name"
          placeholder={`New ${title.slice(0, -1).toLowerCase()}`}
          required
        />
        {kind === "service" && (
          <>
            <input
              className="w-28 rounded border p-2 text-sm"
              name="defaultPriceCents"
              placeholder="Cents"
              type="number"
              min="0"
              defaultValue="0"
              required
            />
            <label className="flex items-center gap-1 text-sm">
              <input defaultChecked name="isTaxable" type="checkbox" />
              Taxable
            </label>
          </>
        )}
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="submit">
          Add
        </button>
      </form>
    </section>
  );
}

export default async function SettingsPage() {
  await requireAdmin();
  const [company, categories, types, statuses, services] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.bookingType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.bookingStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <AppShell activeItem="Settings">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-5 lg:col-span-2">
          <h2 className="font-semibold">Company settings</h2>
          <form action={saveCompanySettings} className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["name", "Company name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["website", "Website"],
              ["addressLine1", "Address line 1"],
              ["addressLine2", "Address line 2"],
              ["city", "City"],
              ["region", "State or region"],
              ["postalCode", "Postal code"],
              ["country", "Country"],
              ["timezone", "Timezone"],
            ].map(([name, label]) => (
              <label className="text-sm" key={name}>
                {label}
                <input
                  className="mt-1 w-full rounded border p-2"
                  name={name}
                  defaultValue={company?.[name as keyof typeof company] as string | undefined}
                  required={name === "timezone"}
                />
              </label>
            ))}
            <label className="text-sm">
              Default tax rate (basis points)
              <input
                className="mt-1 w-full rounded border p-2"
                name="defaultTaxRateBasisPoints"
                type="number"
                min="0"
                max="10000"
                defaultValue={company?.defaultTaxRateBasisPoints ?? 0}
                required
              />
            </label>
            <button
              className="w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white"
              type="submit"
            >
              Save company settings
            </button>
          </form>
        </section>
        <ConfigurationList title="Product categories" kind="category" items={categories} />
        <ConfigurationList title="Booking types" kind="bookingType" items={types} />
        <ConfigurationList title="Booking statuses" kind="bookingStatus" items={statuses} />
        <ConfigurationList title="Services" kind="service" items={services} />
      </div>
    </AppShell>
  );
}
