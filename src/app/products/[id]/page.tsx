import { notFound } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogImageConstraints } from "@/lib/upload-storage";
import { toggleProduct, updateProduct } from "../actions";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories, { error }] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { category: true } }),
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    searchParams,
  ]);
  if (!product) notFound();
  return (
    <AppShell activeItem="Catalog">
      <header className="page-header">
        <div>
          <p className="page-kicker">Catalog · {product.category.name}</p>
          <h1 className="page-title">{product.name}</h1>
          <p className="page-subtitle">
            Update product information, pricing, and its catalog image.
          </p>
        </div>
        <form action={toggleProduct}>
          <input name="id" type="hidden" value={id} />
          <input name="archive" type="hidden" value={String(!product.archivedAt)} />
          <button className="secondary-button">{product.archivedAt ? "Restore" : "Archive"}</button>
        </form>
      </header>
      {error && (
        <p className="mt-3 text-sm text-red-700">
          Could not save product. {error === "image" && catalogImageConstraints}
        </p>
      )}
      <form
        action={updateProduct}
        className="form-card mt-7 grid max-w-2xl gap-4"
        encType="multipart/form-data"
      >
        <input name="id" type="hidden" value={id} />
        <label className="text-sm">
          Name
          <input
            className="mt-1 w-full rounded border p-2"
            defaultValue={product.name}
            name="name"
            required
          />
        </label>
        <label className="text-sm">
          Description
          <textarea
            className="mt-1 w-full rounded border p-2"
            defaultValue={product.description ?? ""}
            name="description"
          />
        </label>
        <label className="text-sm">
          Category
          <select
            className="mt-1 w-full rounded border p-2"
            defaultValue={product.categoryId}
            name="categoryId"
          >
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
            defaultValue={product.defaultRentalCents}
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
            defaultValue={product.replacementCostCents ?? ""}
            name="replacementCostCents"
            min="0"
            type="number"
          />
        </label>
        {product.imageReference && (
          <Image
            alt={`${product.name} product`}
            className="h-40 w-40 rounded-xl border border-slate-200 object-cover shadow-sm"
            height={160}
            src={`/api/catalog-images/${product.imageReference}`}
            unoptimized
            width={160}
          />
        )}
        <label className="text-sm">
          Replace photo
          <input
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block"
            name="image"
            type="file"
          />
          <span className="block text-slate-600">{catalogImageConstraints}</span>
        </label>
        <label className="text-sm">
          <input defaultChecked={product.isTaxable} name="isTaxable" type="checkbox" /> Taxable
        </label>
        <button className="primary-button w-fit" type="submit">
          Save changes
        </button>
      </form>
    </AppShell>
  );
}
