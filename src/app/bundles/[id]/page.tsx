import { notFound } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogImageConstraints } from "@/lib/upload-storage";
import {
  addBundleComponent,
  moveBundleComponent,
  removeBundleComponent,
  toggleBundle,
  updateBundle,
  updateBundleComponent,
} from "../actions";

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
          Fixed rental price (cents)
          <input
            className="mt-1 w-full rounded border p-2"
            defaultValue={bundle.fixedRentalCents}
            name="fixedRentalCents"
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
      <section className="section-card mt-8">
        <h2 className="text-base font-semibold text-slate-800">Components</h2>
        <p className="mt-1 text-sm text-slate-600">
          Changing components never changes the fixed bundle price.
        </p>
        <div className="mt-4 space-y-3">
          {bundle.components.map((component, index) => (
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3"
              key={component.id}
            >
              <span className="min-w-44 text-sm">{component.product.name}</span>
              <form action={updateBundleComponent}>
                <input name="id" type="hidden" value={component.id} />
                <input name="bundleId" type="hidden" value={id} />
                <input
                  className="w-20 rounded border p-1 text-sm"
                  defaultValue={component.quantity}
                  min="1"
                  name="quantity"
                  type="number"
                />
                <button className="text-action">Save quantity</button>
              </form>
              <form action={moveBundleComponent}>
                <input name="id" type="hidden" value={component.id} />
                <input name="bundleId" type="hidden" value={id} />
                <input name="direction" type="hidden" value="up" />
                <button className="text-action" disabled={index === 0}>
                  Up
                </button>
              </form>
              <form action={moveBundleComponent}>
                <input name="id" type="hidden" value={component.id} />
                <input name="bundleId" type="hidden" value={id} />
                <input name="direction" type="hidden" value="down" />
                <button className="text-action" disabled={index === bundle.components.length - 1}>
                  Down
                </button>
              </form>
              <form action={removeBundleComponent}>
                <input name="id" type="hidden" value={component.id} />
                <input name="bundleId" type="hidden" value={id} />
                <button className="text-action" disabled={bundle.components.length === 1}>
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={addBundleComponent} className="mt-5 flex flex-wrap gap-2">
          <input name="bundleId" type="hidden" value={id} />
          <select className="rounded border p-2 text-sm" name="productId">
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input
            className="w-20 rounded border p-2 text-sm"
            defaultValue="1"
            min="1"
            name="quantity"
            type="number"
          />
          <button className="primary-button">Add product</button>
        </form>
      </section>
    </AppShell>
  );
}
