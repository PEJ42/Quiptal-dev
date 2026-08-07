import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogImageConstraints } from "@/lib/upload-storage";
import { createProduct } from "../actions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const { error } = await searchParams;
  return (
    <AppShell activeItem="Catalog">
      <Link className="back-link" href="/catalog?view=products">
        ← Catalog
      </Link>
      <header className="mt-4">
        <p className="page-kicker">Catalog · Products</p>
        <h1 className="page-title">New product</h1>
        <p className="page-subtitle">
          Create an item that can be added to rental bookings and bundles.
        </p>
      </header>
      {error && (
        <p className="mt-3 text-sm text-red-700">
          Enter valid product details. {error === "image" && catalogImageConstraints}
        </p>
      )}
      <form
        action={createProduct}
        className="form-card mt-6 grid max-w-2xl gap-4"
        encType="multipart/form-data"
      >
        <label className="text-sm">
          Name
          <input className="mt-1 w-full rounded border p-2" name="name" required />
        </label>
        <label className="text-sm">
          Description
          <textarea className="mt-1 w-full rounded border p-2" name="description" />
        </label>
        <label className="text-sm">
          Category
          <select className="mt-1 w-full rounded border p-2" name="categoryId">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Default rental price (cents)
          <input
            className="mt-1 w-full rounded border p-2"
            name="defaultRentalCents"
            min="0"
            required
            type="number"
          />
        </label>
        <label className="text-sm">
          Replacement cost (cents)
          <input
            className="mt-1 w-full rounded border p-2"
            name="replacementCostCents"
            min="0"
            type="number"
          />
        </label>
        <label className="text-sm">
          Photo
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
          Save product
        </button>
      </form>
    </AppShell>
  );
}
