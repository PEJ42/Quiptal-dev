import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ItemForm } from "@/components/item-form";
import {
  archiveItem,
  deleteItemDocument,
  duplicateItem,
  updateItemDisposition,
  uploadItemDocuments,
} from "@/app/items/actions";
import { requireAdmin } from "@/lib/auth";
import { centsToDollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const id = (await params).id;
  const [item, products, members] = await Promise.all([
    prisma.item.findFirst({
      where: { id, teamId: user.membership.teamId },
      include: {
        product: true,
        owner: true,
        documents: true,
        dispositions: { orderBy: { dispositionDate: "desc" } },
      },
    }),
    prisma.product.findMany({ where: { archivedAt: null }, select: { id: true, name: true } }),
    prisma.teamMembership.findMany({
      where: { teamId: user.membership.teamId },
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);
  if (!item) notFound();
  const {
    product: _product,
    owner: _owner,
    documents: _documents,
    dispositions: _dispositions,
    ...itemFields
  } = item;
  const values = {
    ...itemFields,
    purchaseDate: item.purchaseDate?.toISOString(),
    purchasePriceDollars: centsToDollars(item.purchasePriceCents),
    shippingDollars: centsToDollars(item.shippingCostCents),
    salesTaxDollars: centsToDollars(item.salesTaxCents),
    otherFeesDollars: centsToDollars(item.otherFeesCents),
    totalAcquisitionOverrideDollars: centsToDollars(item.totalAcquisitionOverrideCents),
    replacementValueDollars: centsToDollars(item.replacementValueCents),
  };
  return (
    <AppShell activeItem="Items">
      <header className="page-header">
        <div>
          <p className="page-kicker">
            {item.status.toLowerCase()} · {item.itemType.toLowerCase()}
          </p>
          <h1 className="page-title">{item.name}</h1>
          <p className="page-subtitle">
            {item.product?.name ?? "No linked product"} · {item.owner.email}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={duplicateItem}>
            <input name="id" type="hidden" value={id} />
            <button className="secondary-button">Duplicate</button>
          </form>
          <Link className="secondary-button" href="/items">
            Back
          </Link>
        </div>
      </header>
      <section className="section-card mt-6">
        <h2 className="font-semibold">Asset details</h2>
        <p className="mt-2 text-sm">
          Quantity: {item.currentQuantity}
          {item.itemType === "LOT" ? ` remaining of ${item.originalQuantity}` : ""} · Replacement
          value:{" "}
          {item.replacementValueCents ? `$${centsToDollars(item.replacementValueCents)}` : "—"}
        </p>
      </section>
      <details className="section-card mt-6">
        <summary className="cursor-pointer font-semibold">Edit item</summary>
        <ItemForm item={values} owners={members.map((member) => member.user)} products={products} />
      </details>
      <section className="section-card mt-6">
        <h2 className="font-semibold">Documents & receipts</h2>
        <form
          action={uploadItemDocuments}
          className="mt-3 flex flex-wrap gap-2"
          encType="multipart/form-data"
        >
          <input name="itemId" type="hidden" value={id} />
          <input
            accept="application/pdf,image/jpeg,image/png"
            multiple
            name="documents"
            required
            type="file"
          />
          <select name="documentType">
            <option value="RECEIPT">Receipt</option>
            <option value="INVOICE">Invoice</option>
            <option value="WARRANTY">Warranty</option>
            <option value="OTHER">Other</option>
          </select>
          <button className="secondary-button">Upload</button>
        </form>
        <ul className="mt-3 divide-y">
          {item.documents.map((document) => (
            <li className="flex justify-between py-2 text-sm" key={document.id}>
              <a
                className="text-action"
                href={`/api/items/documents/${document.id}`}
                target="_blank"
              >
                {document.originalFilename}
              </a>
              <form action={deleteItemDocument}>
                <input name="id" type="hidden" value={document.id} />
                <button className="text-action text-red-700">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section className="section-card mt-6">
        <h2 className="font-semibold">Archive or record sale</h2>
        <form action={archiveItem} className="mt-3 flex flex-wrap gap-2">
          <input name="itemId" type="hidden" value={id} />
          <select name="reason">
            <option value="SOLD">Sold</option>
            <option value="RETIRED">Retired</option>
            <option value="LOST">Lost</option>
            <option value="DAMAGED">Damaged / disposed</option>
            <option value="OTHER">Other</option>
          </select>
          {item.itemType === "LOT" && (
            <input
              defaultValue="1"
              max={item.currentQuantity}
              min="1"
              name="quantity"
              type="number"
            />
          )}
          <input name="grossAmountDollars" placeholder="Sale price ($)" step="0.01" type="number" />
          <input name="buyer" placeholder="Buyer" />
          <input name="platform" placeholder="Platform" />
          <button className="text-action text-red-700">
            {item.itemType === "LOT" ? "Record disposition" : "Archive item"}
          </button>
        </form>
        <ul className="mt-3 text-sm">
          {item.dispositions.map((entry) => (
            <li className="py-2" key={entry.id}>
              {entry.quantity} {entry.type.toLowerCase()} —{" "}
              {entry.dispositionDate.toISOString().slice(0, 10)} · $
              {centsToDollars(entry.netAmountCents)} net
              <details className="mt-2">
                <summary className="cursor-pointer text-action">Edit sale record</summary>
                <form
                  action={updateItemDisposition}
                  className="mt-2 flex flex-wrap gap-2 rounded bg-slate-50 p-2"
                >
                  <input name="id" type="hidden" value={entry.id} />
                  {item.itemType === "LOT" && (
                    <input
                      defaultValue={entry.quantity}
                      max={item.currentQuantity + entry.quantity}
                      min="1"
                      name="quantity"
                      type="number"
                    />
                  )}
                  <input
                    defaultValue={entry.dispositionDate.toISOString().slice(0, 10)}
                    name="dispositionDate"
                    type="date"
                  />
                  <input
                    defaultValue={centsToDollars(entry.grossAmountCents)}
                    name="grossAmountDollars"
                    placeholder="Sale price ($)"
                    step="0.01"
                    type="number"
                  />
                  <input defaultValue={entry.buyer ?? ""} name="buyer" placeholder="Buyer" />
                  <input
                    defaultValue={entry.platform ?? ""}
                    name="platform"
                    placeholder="Platform"
                  />
                  <button className="secondary-button">Save sale record</button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
