"use client";

import { useState } from "react";
import { createItem, updateItem } from "@/app/items/actions";

type ItemValues = Record<string, string | number | Date | null | undefined>;

const conditions = ["", "NEW", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"];
const accountingCategories = [
  "",
  "Rental Equipment",
  "Tools",
  "Office Equipment",
  "Vehicle Equipment",
  "Storage Equipment",
  "Computer / Technology",
  "Supplies",
  "Other",
];

function Label({ children }: Readonly<{ children: React.ReactNode }>) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700">{children}</label>;
}

export function ItemForm({
  item,
  products,
  owners,
}: Readonly<{
  item?: ItemValues;
  products: { id: string; name: string }[];
  owners: { id: string; email: string }[];
}>) {
  const [itemType, setItemType] = useState(item?.itemType === "LOT" ? "LOT" : "INDIVIDUAL");
  const action = item ? updateItem : createItem;
  const value = (name: string) => String(item?.[name] ?? "");
  return (
    <form action={action} className="form-card mt-7 grid gap-5" encType="multipart/form-data">
      {item && <input name="id" type="hidden" value={value("id")} />}
      <section className="grid gap-4 md:grid-cols-2">
        <Label>
          Item name
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("name")}
            name="name"
            required
          />
        </Label>
        <Label>
          Item type
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            name="itemType"
            onChange={(event) => setItemType(event.target.value)}
            value={itemType}
          >
            <option value="INDIVIDUAL">Individual item</option>
            <option value="LOT">Lot</option>
          </select>
        </Label>
        {itemType === "LOT" && (
          <Label>
            Original quantity
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("originalQuantity") || "1"}
              min="1"
              name="originalQuantity"
              required
              type="number"
            />
          </Label>
        )}
        <Label>
          Owner
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("ownerId") || owners[0]?.id}
            name="ownerId"
            required
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.email}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          Linked product
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("productId")}
            name="productId"
          >
            <option value="">No linked product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          Category
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("category")}
            name="category"
          />
        </Label>
        <Label>
          Manufacturer
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("manufacturer")}
            name="manufacturer"
          />
        </Label>
        <Label>
          Model
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("model")}
            name="model"
          />
        </Label>
        <Label>
          Serial number
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("serialNumber")}
            name="serialNumber"
          />
        </Label>
        <Label>
          Internal asset number
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("assetNumber")}
            name="assetNumber"
          />
        </Label>
        <Label>
          Current condition
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("currentCondition")}
            name="currentCondition"
          >
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition ? condition.replaceAll("_", " ") : "Not specified"}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          Replacement value ($)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            defaultValue={value("replacementValueDollars")}
            min="0"
            name="replacementValueDollars"
            step="0.01"
            type="number"
          />
        </Label>
      </section>
      <section className="border-t border-slate-100 pt-5">
        <h2 className="font-semibold text-slate-900">Purchase details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Label>
            Purchase date
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("purchaseDate").slice(0, 10)}
              name="purchaseDate"
              type="date"
            />
          </Label>
          <Label>
            Purchase price ($)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("purchasePriceDollars")}
              min="0"
              name="purchasePriceDollars"
              step="0.01"
              type="number"
            />
          </Label>
          <Label>
            Vendor / seller
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("vendor")}
              name="vendor"
            />
          </Label>
          <Label>
            Purchase source
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("purchaseSource")}
              name="purchaseSource"
              placeholder="Reverb, eBay, local seller…"
            />
          </Label>
          <Label>
            Condition at purchase
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("purchaseCondition")}
              name="purchaseCondition"
            >
              {conditions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition ? condition.replaceAll("_", " ") : "Not specified"}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Shipping ($)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("shippingDollars")}
              min="0"
              name="shippingDollars"
              step="0.01"
              type="number"
            />
          </Label>
          <Label>
            Sales tax ($)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("salesTaxDollars")}
              min="0"
              name="salesTaxDollars"
              step="0.01"
              type="number"
            />
          </Label>
          <Label>
            Other fees ($)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("otherFeesDollars")}
              min="0"
              name="otherFeesDollars"
              step="0.01"
              type="number"
            />
          </Label>
          <Label>
            Total acquisition override ($)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("totalAcquisitionOverrideDollars")}
              min="0"
              name="totalAcquisitionOverrideDollars"
              step="0.01"
              type="number"
            />
          </Label>
          <Label>
            Business use %
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("businessUsePercent") || "100"}
              max="100"
              min="0"
              name="businessUsePercent"
              required
              type="number"
            />
          </Label>
          <Label>
            Accounting category
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              defaultValue={value("accountingCategory")}
              name="accountingCategory"
            >
              {accountingCategories.map((category) => (
                <option key={category} value={category}>
                  {category || "Not specified"}
                </option>
              ))}
            </select>
          </Label>
        </div>
      </section>
      <Label>
        Notes
        <textarea
          className="min-h-28 rounded-lg border border-slate-200 px-3 py-2"
          defaultValue={value("notes")}
          name="notes"
        />
      </Label>
      {!item && (
        <Label>
          Documents & receipts
          <input
            accept="application/pdf,image/jpeg,image/png"
            className="text-sm"
            multiple
            name="documents"
            type="file"
          />
          <span className="text-xs font-normal text-slate-500">
            PDF, JPEG, or PNG; maximum 10 MB each.
          </span>
        </Label>
      )}
      <button className="primary-button w-fit" type="submit">
        {item ? "Save item" : "Create item"}
      </button>
    </form>
  );
}
