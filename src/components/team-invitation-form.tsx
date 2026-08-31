"use client";

import { useActionState, useMemo } from "react";
import { createTeamInvitation, type InvitationActionState } from "@/app/settings/actions";

const initialState: InvitationActionState = {};

export function TeamInvitationForm() {
  const [state, action, pending] = useActionState(createTeamInvitation, initialState);
  const url = useMemo(
    () =>
      state.token && typeof window !== "undefined"
        ? `${window.location.origin}/signup?invite=${encodeURIComponent(state.token)}`
        : null,
    [state.token],
  );
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="grid gap-1 text-sm text-slate-700">
        Recipient email
        <input
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
          name="email"
          required
          type="email"
        />
      </label>
      <button className="primary-button self-end" disabled={pending} type="submit">
        {pending ? "Creating…" : "Create invitation"}
      </button>
      {state.error && <p className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {url && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 sm:col-span-2">
          <p className="font-semibold">Invitation link — copy it now</p>
          <input
            aria-label="Invitation link"
            className="mt-2 w-full rounded border border-emerald-200 bg-white px-2 py-1 text-slate-700"
            readOnly
            value={url}
          />
          <p className="mt-1 text-xs">
            For security, this link is shown only once and expires in 14 days.
          </p>
        </div>
      )}
    </form>
  );
}
