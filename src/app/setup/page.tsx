import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/auth";
import { createFirstAdmin } from "./actions";

export default async function SetupPage() {
  if (await hasAdmin()) redirect("/login");
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Set up Rental Booking</h1>
      <p className="mt-2 text-sm text-slate-600">
        Create the first administrator. There are no default credentials.
      </p>
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
