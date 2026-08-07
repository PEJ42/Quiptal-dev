import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/auth";
import { signIn } from "./actions";

export default async function LoginPage() {
  if (!(await hasAdmin())) redirect("/setup");
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form action={signIn} className="mt-6 space-y-4">
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
            type="password"
          />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
