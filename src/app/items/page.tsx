import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    ownerId?: string;
    productId?: string;
    category?: string;
    manufacturer?: string;
    used?: string;
  }>;
}) {
  const user = await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 80) || "";
  const where = {
    teamId: user.membership.teamId,
    ...(query.status === "ARCHIVED" ? { status: "ARCHIVED" } : { status: "ACTIVE" }),
    ...(query.type ? { itemType: query.type } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.manufacturer ? { manufacturer: query.manufacturer } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { manufacturer: { contains: q } },
            { model: { contains: q } },
            { serialNumber: { contains: q } },
            { assetNumber: { contains: q } },
            { vendor: { contains: q } },
            { notes: { contains: q } },
            { product: { name: { contains: q } } },
            { owner: { email: { contains: q } } },
          ],
        }
      : {}),
  };
  const [items, owners, products] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { product: true, owner: true },
      orderBy: { name: "asc" },
    }),
    prisma.teamMembership.findMany({
      where: { teamId: user.membership.teamId },
      include: { user: true },
      orderBy: { user: { email: "asc" } },
    }),
    prisma.product.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return (
    <AppShell activeItem="Items">
      <header className="page-header">
        <div>
          <p className="page-kicker">Asset register</p>
          <h1 className="page-title">Items</h1>
          <p className="page-subtitle">
            Track the physical equipment your business owns. Items do not affect booking
            availability.
          </p>
        </div>
        <Link className="primary-button" href="/items/new">
          + Add item
        </Link>
      </header>
      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          defaultValue={q}
          name="q"
          placeholder="Search items"
        />
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          defaultValue={query.status ?? "ACTIVE"}
          name="status"
        >
          <option value="ACTIVE">Active items</option>
          <option value="ARCHIVED">Archived items</option>
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          defaultValue={query.type ?? ""}
          name="type"
        >
          <option value="">All types</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="LOT">Lot</option>
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          defaultValue={query.ownerId ?? ""}
          name="ownerId"
        >
          <option value="">All owners</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.userId}>
              {owner.user.email}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          defaultValue={query.productId ?? ""}
          name="productId"
        >
          <option value="">All products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <button className="secondary-button w-fit" type="submit">
          Apply filters
        </button>
      </form>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-semibold">
                  <Link className="hover:text-blue-700" href={`/items/${item.id}`}>
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.product?.name ?? "—"}</td>
                <td className="px-4 py-3">{item.owner.email}</td>
                <td className="px-4 py-3">{item.itemType === "LOT" ? "Lot" : "Individual"}</td>
                <td className="px-4 py-3">{item.currentQuantity}</td>
                <td className="px-4 py-3">
                  {item.purchasePriceCents === null
                    ? "—"
                    : `$${(item.purchasePriceCents / 100).toFixed(2)}`}
                </td>
                <td className="px-4 py-3">{item.status.toLowerCase()}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No items match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
