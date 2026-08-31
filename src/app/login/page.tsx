import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/auth";
import Link from "next/link";
import { signIn } from "./actions";

const messages: Record<string, string> = {
  account: "An account already exists for that email. Sign in to continue.",
  email: "This invitation is for a different email address.",
  expired: "This invitation has expired. Ask your administrator for a new one.",
  invalid: "Your email or password was not recognized.",
  revoked: "This invitation was revoked. Ask your administrator for a new one.",
  used: "This invitation has already been used.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const { error, invite } = await searchParams;
  if (!(await hasAdmin()))
    redirect(invite ? `/signup?invite=${encodeURIComponent(invite)}` : "/signup");
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {error && (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {messages[error] ?? messages.invalid}
        </p>
      )}
      <form action={signIn} className="mt-6 space-y-4">
        <input name="invite" type="hidden" value={invite ?? ""} />
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
      <p className="mt-5 text-sm text-slate-600">
        New here?{" "}
        <Link
          className="font-semibold text-blue-700"
          href={invite ? `/signup?invite=${encodeURIComponent(invite)}` : "/signup"}
        >
          Create your account
        </Link>
      </p>
    </main>
  );
}
