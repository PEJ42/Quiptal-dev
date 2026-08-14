import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/auth";
import { createFirstAdmin } from "./actions";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasAdmin()) redirect("/login");
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Set up Rental Booking</h1>
      <p className="mt-2 text-sm text-slate-600">
        Create the first administrator. There are no default credentials.
      </p>
      {error === "invalid" && (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          Enter a valid email address and a password between 12 and 128 characters.
        </p>
      )}
      <form action={createFirstAdmin} className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input className="mt-1 w-full rounded border p-2" name="email" required type="email" />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded border p-2"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
            type="password"
          />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">
          Create administrator
        </button>
      </form>
    </main>
  );
}
