import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function NewCatalogRecordPage() {
  await requireAdmin();
  return (
    <AppShell activeItem="Catalog">
      <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800" href="/catalog">
        ← Catalog
      </Link>
      <div className="mt-5 max-w-2xl">
        <p className="text-sm font-medium text-blue-700">New catalog record</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          What would you like to create?
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose the record type that fits this rental item.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Link
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            href="/products/new"
          >
            <p className="text-sm font-medium text-blue-700">Product</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Create a product</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add one rental item with a category, rental price, and optional photo.
            </p>
          </Link>
          <Link
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            href="/bundles/new"
          >
            <p className="text-sm font-medium text-violet-700">Bundle</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Create a bundle</h2>
            <p className="mt-2 text-sm text-slate-500">
              Combine products into a fixed-price rental package.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
