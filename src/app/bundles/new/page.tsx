import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogImageConstraints } from "@/lib/upload-storage";
import { createBundle } from "../actions";

export default async function NewBundlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [products, { error }] = await Promise.all([
    prisma.product.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    searchParams,
  ]);
  return (
    <AppShell activeItem="Catalog">
      <Link className="back-link" href="/catalog?view=bundles">
        ← Catalog
      </Link>
      <header className="mt-4">
        <p className="page-kicker">Catalog · Bundles</p>
        <h1 className="page-title">New bundle</h1>
        <p className="page-subtitle">Build a curated package with a fixed rental price.</p>
      </header>
      {products.length === 0 ? (
        <p className="section-card mt-6 text-sm text-slate-600">
          Create an active product before creating a bundle.
        </p>
      ) : (
        <form
          action={createBundle}
          className="form-card mt-6 grid max-w-2xl gap-4"
          encType="multipart/form-data"
        >
          {error && (
            <p className="text-sm text-red-700">
              Enter valid bundle details. {error === "image" && catalogImageConstraints}
            </p>
          )}
          <label className="text-sm">
            Name
            <input className="mt-1 w-full rounded border p-2" name="name" required />
          </label>
          <label className="text-sm">
            Description
            <textarea className="mt-1 w-full rounded border p-2" name="description" />
          </label>
          <label className="text-sm">
            Fixed rental price (cents)
            <input
              className="mt-1 w-full rounded border p-2"
              name="fixedRentalCents"
              min="0"
              required
              type="number"
            />
          </label>
          <label className="text-sm">
            First product
            <select className="mt-1 w-full rounded border p-2" name="productId">
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Quantity
            <input
              className="mt-1 w-full rounded border p-2"
              defaultValue="1"
              name="quantity"
              min="1"
              required
              type="number"
            />
          </label>
          <label className="text-sm">
            Cover photo
            <input
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block"
              name="image"
              type="file"
            />
            <span className="block text-slate-600">{catalogImageConstraints}</span>
          </label>
          <label className="text-sm">
            <input defaultChecked name="isTaxable" type="checkbox" /> Taxable
          </label>
          <button className="primary-button w-fit" type="submit">
            Save bundle
          </button>
        </form>
      )}
    </AppShell>
  );
}
