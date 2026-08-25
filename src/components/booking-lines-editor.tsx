"use client";

import { useState } from "react";
import {
  addBookingLine,
  removeBookingLine,
  saveBookingLineQuantities,
} from "@/app/bookings/actions";

type BookingLine = {
  id: string;
  lineType: string;
  snapshotName: string;
  quantity: number;
  unitPriceCents: number;
  lineSubtotalCents: number;
  bundleComponentSnapshots: {
    id: string;
    productNameSnapshot: string;
    quantityPerBundle: number;
  }[];
};

type Product = { id: string; name: string; defaultRentalCents: number };
type Bundle = { id: string; name: string; fixedRentalCents: number };

function currency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BookingLinesEditor({
  bookingId,
  lines,
  products,
  bundles,
}: {
  bookingId: string;
  lines: BookingLine[];
  products: Product[];
  bundles: Bundle[];
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(
    products[0] ? `PRODUCT:${products[0].id}` : bundles[0] ? `BUNDLE:${bundles[0].id}` : "",
  );
  const selectedKind = selectedSource.split(":")[0];

  return (
    <>
      <div className="mt-4 space-y-3">
        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            No products or bundles have been added yet.
          </p>
        ) : (
          <form action={saveBookingLineQuantities} className="space-y-3">
            <input name="bookingId" type="hidden" value={bookingId} />
            {lines.map((line) => {
              const isProduct = line.lineType === "PRODUCT";
              const isBundle = line.lineType === "BUNDLE";
              return (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={line.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-slate-900">{line.snapshotName}</b>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                          {line.lineType.toLowerCase()}
                        </span>
                      </div>
                      {line.bundleComponentSnapshots.length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          {line.bundleComponentSnapshots
                            .map(
                              (component) =>
                                `${component.productNameSnapshot} × ${component.quantityPerBundle}`,
                            )
                            .join(", ")}
                        </p>
                      )}
                      {isBundle && (
                        <p className="mt-1 text-xs text-slate-600">
                          Fixed bundle price: {currency(line.unitPriceCents)}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900">
                        {currency(line.lineSubtotalCents)}
                      </p>
                      {!isProduct && <p className="mt-1 text-xs text-slate-500">Fixed quantity</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-3">
                    {isProduct ? (
                      <label className="grid gap-1 text-xs font-medium text-slate-600">
                        Quantity
                        <input
                          className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                          defaultValue={line.quantity}
                          min="1"
                          name={`quantity:${line.id}`}
                          type="number"
                        />
                      </label>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {isBundle
                          ? "Bundle quantities are fixed at one per booking line."
                          : "Service quantity is fixed."}
                      </span>
                    )}
                    <button
                      className="text-sm font-medium text-red-700 hover:text-red-800"
                      formAction={removeBookingLine}
                      name="id"
                      type="submit"
                      value={line.id}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            {lines.some((line) => line.lineType === "PRODUCT") && (
              <button className="primary-button" type="submit">
                Save quantities
              </button>
            )}
          </form>
        )}
      </div>

      <button
        aria-label="Add product"
        className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-xl font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={products.length + bundles.length === 0}
        onClick={() => setIsPickerOpen(true)}
        type="button"
      >
        +
      </button>
      <p className="mt-2 text-xs text-slate-500">
        {products.length + bundles.length
          ? "Add a product or bundle to this booking."
          : "Create a product or bundle in Catalog before adding it here."}
      </p>

      {isPickerOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
        >
          <form
            action={addBookingLine}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <input name="bookingId" type="hidden" value={bookingId} />
            <input name="source" type="hidden" value={selectedSource} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="page-kicker">Booking items</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Add to booking</h3>
              </div>
              <button
                aria-label="Close product picker"
                className="text-xl leading-none text-slate-500 hover:text-slate-800"
                onClick={() => setIsPickerOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <label className="mt-5 grid gap-1 text-sm font-medium text-slate-700">
              Catalog item
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                onChange={(event) => setSelectedSource(event.target.value)}
                value={selectedSource}
              >
                {products.length > 0 && (
                  <optgroup label="Products">
                    {products.map((product) => (
                      <option key={product.id} value={`PRODUCT:${product.id}`}>
                        {product.name} · {currency(product.defaultRentalCents)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {bundles.length > 0 && (
                  <optgroup label="Bundles">
                    {bundles.map((bundle) => (
                      <option key={bundle.id} value={`BUNDLE:${bundle.id}`}>
                        {bundle.name} · {currency(bundle.fixedRentalCents)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            {selectedKind === "PRODUCT" ? (
              <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
                Quantity
                <input
                  className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  defaultValue="1"
                  min="1"
                  name="quantity"
                  required
                  type="number"
                />
              </label>
            ) : (
              <input name="quantity" type="hidden" value="1" />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="secondary-button"
                onClick={() => setIsPickerOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Add to booking
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
