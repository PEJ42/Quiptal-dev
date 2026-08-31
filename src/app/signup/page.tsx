import Link from "next/link";
import { invitationState } from "@/lib/invitations";
import { createAccount } from "./actions";

const messages: Record<string, string> = {
  account: "An account already exists for that email. Sign in to continue.",
  email: "This invitation is for a different email address.",
  expired: "This invitation has expired. Ask your administrator for a new one.",
  invalid: "Enter a valid email address and a password between 12 and 128 characters.",
  revoked: "This invitation was revoked. Ask your administrator for a new one.",
  used: "This invitation has already been used.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const { invite, error } = await searchParams;
  const invitation = invite ? await invitationState(invite) : null;
  const activeInvite = invitation?.state === "valid" ? invite : undefined;
  const message = error
    ? messages[error]
    : invitation && invitation.state !== "valid"
      ? messages[invitation.state]
      : undefined;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">
        {invitation?.state === "valid"
          ? `Join ${invitation.teamName} as a team member.`
          : "Create a private workspace for your rental business."}
      </p>
      {message && (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {message}
        </p>
      )}
      <form action={createAccount} className="mt-6 space-y-4">
        <input name="invite" type="hidden" value={activeInvite ?? ""} />
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border p-2"
            defaultValue={invitation?.state === "valid" ? invitation.recipientEmail : ""}
            name="email"
            required
            type="email"
          />
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
          Create your account
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          className="font-semibold text-blue-700"
          href={invite ? `/login?invite=${encodeURIComponent(invite)}` : "/login"}
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
