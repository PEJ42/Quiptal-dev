"use client";

import { useState } from "react";
import { updateServicePrice } from "@/app/settings/actions";

export function ServicePriceEditor({
  id,
  name,
  priceCents,
}: Readonly<{ id: string; name: string; priceCents: number }>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        aria-label={`Edit ${name} price`}
        className="ml-1 inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => setIsOpen(true)}
        title="Edit price"
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          className="size-4"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="presentation"
        >
          <div
            aria-modal="true"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby={`service-price-${id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900" id={`service-price-${id}`}>
                  Edit service price
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Set the default rental price for {name}.
                </p>
              </div>
              <button
                aria-label="Close"
                className="text-lg text-slate-500 hover:text-slate-900"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form action={updateServicePrice} className="mt-5 space-y-4">
              <input name="id" type="hidden" value={id} />
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Price
                <span className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-3 flex items-center text-slate-500"
                  >
                    $
                  </span>
                  <input
                    autoFocus
                    className="min-h-11 w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3"
                    defaultValue={(priceCents / 100).toFixed(2)}
                    min="0"
                    name="priceDollars"
                    required
                    step="0.01"
                    type="number"
                  />
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <button className="secondary-button" onClick={() => setIsOpen(false)} type="button">
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Save price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
