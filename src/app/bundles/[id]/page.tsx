import { notFound } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { BundleComponentsEditor } from "@/components/bundle-components-editor";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogImageConstraints } from "@/lib/upload-storage";
import { centsToDollars } from "@/lib/money";
import { toggleBundle, updateBundle } from "../actions";

export default async function BundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [bundle, products, { error }] = await Promise.all([
    prisma.bundle.findUnique({
      where: { id },
      include: { components: { include: { product: true }, orderBy: { displayOrder: "asc" } } },
    }),
    prisma.product.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    searchParams,
  ]);
  if (!bundle) notFound();
  return (
    <AppShell activeItem="Catalog">
      <header className="page-header">
        <div>
          <p className="page-kicker">Catalog · Bundle</p>
          <h1 className="page-title">{bundle.name}</h1>
          <p className="page-subtitle">Manage the fixed-price package and its included products.</p>
        </div>
        <form action={toggleBundle}>
          <input name="id" type="hidden" value={id} />
          <input name="archive" type="hidden" value={String(!bundle.archivedAt)} />
          <button className="secondary-button">{bundle.archivedAt ? "Restore" : "Archive"}</button>
        </form>
      </header>
      {error && (
        <p className="mt-3 text-sm text-red-700">
          Could not save bundle. {error === "image" && catalogImageConstraints}
        </p>
      )}
      <form
        action={updateBundle}
        className="form-card mt-7 grid max-w-2xl gap-4"
        encType="multipart/form-data"
      >
        <input name="id" type="hidden" value={id} />
        <label className="text-sm">
          Name
          <input
            className="mt-1 w-full rounded border p-2"
            defaultValue={bundle.name}
            name="name"
            required
          />
        </label>
        <label className="text-sm">
          Description
          <textarea
            className="mt-1 w-full rounded border p-2"
            defaultValue={bundle.description ?? ""}
            name="description"
          />
        </label>
        <label className="text-sm">
          Fixed rental price ($)
          <input
            className="mt-1 w-full rounded border p-2"
            defaultValue={centsToDollars(bundle.fixedRentalCents)}
            name="fixedRentalDollars"
            step="0.01"
            min="0"
            required
            type="number"
          />
        </label>
        {bundle.imageReference && (
          <Image
            alt={`${bundle.name} bundle`}
            className="h-40 w-40 rounded-xl border border-slate-200 object-cover shadow-sm"
            height={160}
            src={`/api/catalog-images/${bundle.imageReference}`}
            unoptimized
            width={160}
          />
        )}
        <label className="text-sm">
          Replace cover photo
          <input
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block"
            name="image"
            type="file"
          />
          <span className="block text-slate-600">{catalogImageConstraints}</span>
        </label>
        <label className="text-sm">
          <input defaultChecked={bundle.isTaxable} name="isTaxable" type="checkbox" /> Taxable
        </label>
        <button className="primary-button w-fit">Save bundle details</button>
      </form>
      <BundleComponentsEditor
        bundleId={id}
        components={bundle.components.map((component) => ({
          id: component.id,
          productName: component.product.name,
          quantity: component.quantity,
        }))}
        products={products.map((product) => ({ id: product.id, name: product.name }))}
      />
    </AppShell>
  );
}
