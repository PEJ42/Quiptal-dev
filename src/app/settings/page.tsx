import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyLogoConstraints } from "@/lib/upload-storage";
import {
  createSettingItem,
  saveCompanySettings,
  toggleSettingItem,
  updateCategory,
} from "./actions";

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
    <section className="section-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {items.filter((item) => item.isActive).length} active
        </span>
      </div>
      <ul className="divide-y divide-slate-100 px-5">
        {items.map((item) => (
          <li
            className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm"
            key={item.id}
          >
            <div className="min-w-0">
              {kind === "category" ? (
                <form action={updateCategory} className="flex flex-wrap items-center gap-2">
                  <input name="id" type="hidden" value={item.id} />
                  <input
                    aria-label={`Category name for ${item.name}`}
                    className="min-h-9 w-48 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-800"
                    defaultValue={item.name}
                    name="name"
                    required
                  />
                  <button className="text-action" type="submit">
                    Save
                  </button>
                </form>
              ) : (
                <p className="font-medium text-slate-800">{item.name}</p>
              )}
              {(item.description || item.defaultPriceCents !== undefined) && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {[
                    item.description,
                    item.defaultPriceCents !== undefined
                      ? `$${(item.defaultPriceCents / 100).toFixed(2)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <form action={toggleSettingItem}>
              <input name="id" type="hidden" value={item.id} />
              <input name="kind" type="hidden" value={kind} />
              <input name="isActive" type="hidden" value={String(!item.isActive)} />
              <button className="text-action" type="submit">
                {item.isActive ? "Archive" : "Restore"}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form action={createSettingItem} className="border-t border-slate-100 bg-slate-50 p-4">
        <input name="kind" type="hidden" value={kind} />
        <div className="flex flex-wrap gap-2">
          <input
            className="min-h-10 min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            name="name"
            placeholder={`New ${title.slice(0, -1).toLowerCase()}`}
            required
          />
          {kind === "service" && (
            <>
              <input
                className="min-h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                defaultValue="0"
                min="0"
                name="defaultPriceCents"
                placeholder="Cents"
                required
                type="number"
              />
              <label className="flex items-center gap-2 px-1 text-sm text-slate-600">
                <input defaultChecked name="isTaxable" type="checkbox" /> Taxable
              </label>
            </>
          )}
          <button className="primary-button" type="submit">
            Add
          </button>
        </div>
      </form>
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;
  const [company, categories, types, statuses, services] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.bookingType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.bookingStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const fields = [
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
  ] as const;

  return (
    <AppShell activeItem="Settings">
      <header className="page-header">
        <div>
          <p className="page-kicker">Workspace</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Set up the company information and reference data used across bookings.
          </p>
        </div>
      </header>
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "logo"
            ? "The logo could not be saved. Use a JPEG or PNG image no larger than 2 MB."
            : error === "category"
              ? "The category could not be saved. Category names must be unique."
              : "Company settings could not be saved. Check the email address and website, then try again."}
        </p>
      )}

      <section className="section-card mt-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Company profile</h2>
            <p className="mt-1 text-sm text-slate-600">
              This information appears on new contracts and customer-facing documents.
            </p>
          </div>
        </div>
        <form
          action={saveCompanySettings}
          className="form-card mt-5 grid gap-4 sm:grid-cols-2"
          encType="multipart/form-data"
        >
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-slate-700">Company logo</p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {company?.logoReference ? (
                <Image
                  alt="Company logo"
                  className="h-20 w-40 rounded-lg border border-slate-200 bg-white object-contain p-2"
                  height={80}
                  src={`/api/company-logo/${company.logoReference}`}
                  unoptimized
                  width={160}
                />
              ) : (
                <div className="grid h-20 w-40 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                  No logo uploaded
                </div>
              )}
              <label className="text-sm">
                Upload a replacement
                <input
                  accept="image/jpeg,image/png"
                  className="mt-1 block text-sm"
                  name="logo"
                  type="file"
                />
                <span className="mt-1 block text-xs text-slate-500">{companyLogoConstraints}</span>
              </label>
            </div>
          </div>
          {fields.map(([name, label]) => (
            <label className="text-sm" key={name}>
              {label}
              <input
                className="mt-1 w-full border p-2"
                defaultValue={company?.[name] ?? ""}
                name={name}
                required={name === "timezone"}
              />
            </label>
          ))}
          <label className="text-sm">
            Default tax rate (basis points)
            <input
              className="mt-1 w-full border p-2"
              defaultValue={company?.defaultTaxRateBasisPoints ?? 0}
              max="10000"
              min="0"
              name="defaultTaxRateBasisPoints"
              required
              type="number"
            />
          </label>
          <div className="flex items-end sm:col-span-2">
            <button className="primary-button" type="submit">
              Save company settings
            </button>
          </div>
        </form>
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-2">
        <ConfigurationList title="Product categories" kind="category" items={categories} />
        <ConfigurationList title="Booking types" kind="bookingType" items={types} />
        <ConfigurationList title="Booking statuses" kind="bookingStatus" items={statuses} />
        <ConfigurationList title="Services" kind="service" items={services} />
      </section>
    </AppShell>
  );
}
