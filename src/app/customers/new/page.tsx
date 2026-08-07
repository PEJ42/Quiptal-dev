import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { createCustomer } from "../actions";

const fields = [
  ["firstName", "First name", true],
  ["lastName", "Last name", true],
  ["email", "Email", true],
  ["phone", "Phone"],
  ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"],
  ["city", "City"],
  ["region", "State or region"],
  ["postalCode", "Postal code"],
  ["country", "Country"],
] as const;
export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string; error?: string }>;
}) {
  await requireAdmin();
  const { duplicate, error } = await searchParams;
  return (
    <AppShell activeItem="Customers">
      <Link className="back-link" href="/customers">
        ← Customers
      </Link>
      <header className="mt-4">
        <h1 className="page-title">New customer</h1>
        <p className="page-subtitle">
          Add the customer and their billing address for future bookings.
        </p>
      </header>
      {duplicate && (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          A current customer already uses this email. You may still save intentionally.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700">
          Please complete the required fields with a valid email.
        </p>
      )}
      <form action={createCustomer} className="form-card mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        {fields.map(([name, label, required]) => (
          <label className="text-sm" key={name}>
            {label}
            <input
              className="mt-1 w-full rounded border p-2"
              name={name}
              required={required}
              type={name === "email" ? "email" : "text"}
            />
          </label>
        ))}
        {duplicate && <input name="confirmDuplicate" type="hidden" value="yes" />}
        <button className="primary-button w-fit" type="submit">
          Save customer
        </button>
      </form>
    </AppShell>
  );
}
