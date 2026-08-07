import Image from "next/image";
import Link from "next/link";
import { toggleBundle } from "@/app/bundles/actions";
import { toggleProduct } from "@/app/products/actions";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { catalogSearchSchema } from "@/lib/catalog-schema";
import { prisma } from "@/lib/prisma";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const parsed = catalogSearchSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : "",
    view: typeof raw.view === "string" ? raw.view : "products",
    categoryId: typeof raw.categoryId === "string" && raw.categoryId ? raw.categoryId : undefined,
    archived: typeof raw.archived === "string" ? raw.archived : undefined,
  });
  const filters = parsed.success ? parsed.data : catalogSearchSchema.parse({ view: "products" });
  const view = filters.view === "bundles" ? "bundles" : "products";
  const archivedAt = filters.archived === "archived" ? { not: null } : null;
  const [categories, products, bundles] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    view === "products"
      ? prisma.product.findMany({
          where: {
            archivedAt,
            ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
            ...(filters.q
              ? {
                  OR: [{ name: { contains: filters.q } }, { description: { contains: filters.q } }],
                }
              : {}),
          },
          include: { category: true },
          orderBy: { name: "asc" },
        })
      : [],
    view === "bundles"
      ? prisma.bundle.findMany({
          where: {
            archivedAt,
            ...(filters.q
              ? {
                  OR: [{ name: { contains: filters.q } }, { description: { contains: filters.q } }],
                }
              : {}),
          },
          include: { _count: { select: { components: true } } },
          orderBy: { name: "asc" },
        })
      : [],
  ]);
  const toggleHref = (nextView: "products" | "bundles") =>
    `/catalog?view=${nextView}${filters.archived === "archived" ? "&archived=archived" : ""}`;

  return (
    <AppShell activeItem="Catalog">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage rental products and curated equipment bundles.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          href="/catalog/new"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          New
        </Link>
      </header>

      <nav
        aria-label="Catalog view"
        className="mt-7 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
      >
        <Link
          aria-current={view === "products" ? "page" : undefined}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${view === "products" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
          href={toggleHref("products")}
        >
          Products
        </Link>
        <Link
          aria-current={view === "bundles" ? "page" : undefined}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${view === "bundles" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
          href={toggleHref("bundles")}
        >
          Bundles
        </Link>
      </nav>

      <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(11rem,.6fr)_auto]">
        <input name="view" type="hidden" value={view} />
        <label className="sr-only" htmlFor="catalog-search">
          Search {view}
        </label>
        <input
          className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={filters.q}
          id="catalog-search"
          name="q"
          placeholder={`Search ${view}`}
        />
        {view === "products" && (
          <label className="sr-only" htmlFor="catalog-category">
            Category
          </label>
        )}
        {view === "products" && (
          <select
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            defaultValue={filters.categoryId ?? ""}
            id="catalog-category"
            name="categoryId"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          defaultValue={filters.archived}
          name="archived"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button
          className="min-h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700"
          type="submit"
        >
          Apply
        </button>
      </form>

      <section aria-labelledby="catalog-records-heading" className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800" id="catalog-records-heading">
            {view === "products" ? "Products" : "Bundles"}
          </h2>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {view === "products" ? products.length : bundles.length}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              key={product.id}
            >
              {product.imageReference && (
                <Image
                  alt=""
                  className="h-40 w-full object-cover"
                  height={160}
                  src={`/api/catalog-images/${product.imageReference}`}
                  unoptimized
                  width={360}
                />
              )}
              <div className="p-4">
                <p className="text-xs font-medium text-slate-500">
                  Product · {product.category.name}
                </p>
                <Link
                  className="mt-1 block font-semibold text-slate-900 hover:text-blue-700"
                  href={`/products/${product.id}`}
                >
                  {product.name}
                </Link>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  ${(product.defaultRentalCents / 100).toFixed(2)}
                </p>
                <form action={toggleProduct} className="mt-4">
                  <input name="id" type="hidden" value={product.id} />
                  <input
                    name="archive"
                    type="hidden"
                    value={String(filters.archived !== "archived")}
                  />
                  <button
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                    type="submit"
                  >
                    {filters.archived === "archived" ? "Restore product" : "Archive product"}
                  </button>
                </form>
              </div>
            </article>
          ))}
          {bundles.map((bundle) => (
            <article
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              key={bundle.id}
            >
              {bundle.imageReference && (
                <Image
                  alt=""
                  className="h-40 w-full object-cover"
                  height={160}
                  src={`/api/catalog-images/${bundle.imageReference}`}
                  unoptimized
                  width={360}
                />
              )}
              <div className="p-4">
                <p className="text-xs font-medium text-slate-500">
                  Bundle · {bundle._count.components} component
                  {bundle._count.components === 1 ? "" : "s"}
                </p>
                <Link
                  className="mt-1 block font-semibold text-slate-900 hover:text-blue-700"
                  href={`/bundles/${bundle.id}`}
                >
                  {bundle.name}
                </Link>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  ${(bundle.fixedRentalCents / 100).toFixed(2)}
                </p>
                <form action={toggleBundle} className="mt-4">
                  <input name="id" type="hidden" value={bundle.id} />
                  <input
                    name="archive"
                    type="hidden"
                    value={String(filters.archived !== "archived")}
                  />
                  <button
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                    type="submit"
                  >
                    {filters.archived === "archived" ? "Restore bundle" : "Archive bundle"}
                  </button>
                </form>
              </div>
            </article>
          ))}
          {products.length + bundles.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center sm:col-span-2 xl:col-span-3">
              <p className="font-semibold text-slate-800">No {view} match these filters.</p>
              <p className="mt-2 text-sm text-slate-500">
                Try changing the search or create a new record.
              </p>
              <Link
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                href="/catalog/new"
              >
                New {view === "products" ? "product" : "bundle"}
              </Link>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
