"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addBundleComponent,
  moveBundleComponent,
  removeBundleComponent,
  updateBundleComponent,
} from "@/app/bundles/actions";

type Component = { id: string; productName: string; quantity: number };
type Product = { id: string; name: string };

function IconButton({
  children,
  label,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function BundleComponentsEditor({
  bundleId,
  components,
  products,
}: {
  bundleId: string;
  components: Component[];
  products: Product[];
}) {
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(action: (formData: FormData) => Promise<void>, fields: Record<string, string>) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
    startTransition(async () => {
      await action(formData);
      router.refresh();
    });
  }

  function addComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPickerOpen(false);
    startTransition(async () => {
      await addBundleComponent(formData);
      router.refresh();
    });
  }

  return (
    <section className="section-card mt-8">
      <h2 className="text-base font-semibold text-slate-800">Components</h2>
      <p className="mt-1 text-sm text-slate-600">
        Changing components never changes the fixed bundle price.
      </p>
      <div className="mt-4 space-y-3">
        {components.map((component, index) => (
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            key={component.id}
          >
            <span className="min-w-44 flex-1 text-sm font-medium text-slate-800">
              {component.productName}
            </span>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Qty
              <input
                className="w-16 rounded-lg border border-slate-200 bg-white p-2 text-sm"
                defaultValue={component.quantity}
                min="1"
                onBlur={(event) =>
                  submit(updateBundleComponent, {
                    bundleId,
                    id: component.id,
                    quantity: event.currentTarget.value,
                  })
                }
                type="number"
              />
            </label>
            <div className="flex items-center border-l border-slate-200 pl-2">
              <IconButton
                disabled={isPending || index === 0}
                label="Move component up"
                onClick={() =>
                  submit(moveBundleComponent, { bundleId, id: component.id, direction: "up" })
                }
              >
                ↑
              </IconButton>
              <IconButton
                disabled={isPending || index === components.length - 1}
                label="Move component down"
                onClick={() =>
                  submit(moveBundleComponent, { bundleId, id: component.id, direction: "down" })
                }
              >
                ↓
              </IconButton>
              <IconButton
                disabled={isPending || components.length === 1}
                label="Remove component"
                onClick={() => submit(removeBundleComponent, { bundleId, id: component.id })}
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                  width="18"
                >
                  <path d="M4 7h16M10 11v6m4-6v6M9 7l1-2h4l1 2m-9 0 1 13h10l1-13" />
                </svg>
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      <button className="secondary-button mt-5" onClick={() => setIsPickerOpen(true)} type="button">
        + Add component
      </button>
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4"
          role="presentation"
        >
          <form
            aria-labelledby="add-component-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={addComponent}
            role="dialog"
          >
            <input name="bundleId" type="hidden" value={bundleId} />
            <h3 className="text-lg font-semibold text-slate-900" id="add-component-title">
              Add a component
            </h3>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Product
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 p-2"
                name="productId"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Quantity
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 p-2"
                defaultValue="1"
                min="1"
                name="quantity"
                type="number"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="secondary-button"
                onClick={() => setIsPickerOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" disabled={isPending}>
                Add component
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
