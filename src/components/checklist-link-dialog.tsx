"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createChecklistLinkAction,
  type ChecklistLinkActionState,
} from "@/app/bookings/checklist-actions";

const initialState: ChecklistLinkActionState = {};

export function ChecklistLinkDialog({
  bookingId,
  flow,
  hasActiveLink,
}: Readonly<{ bookingId: string; flow: "DROPOFF" | "PICKUP"; hasActiveLink: boolean }>) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createChecklistLinkAction, initialState);
  const label = flow === "DROPOFF" ? "dropoff" : "pickup";
  const link = useMemo(
    () =>
      state.token && typeof window !== "undefined"
        ? `${window.location.origin}/checklists/${state.token}`
        : null,
    [state.token],
  );
  return (
    <>
      <button className="secondary-button" onClick={() => setOpen(true)} type="button">
        {hasActiveLink ? "Replace link" : `Generate ${label} link`}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="presentation"
        >
          <div
            aria-labelledby={`checklist-link-${flow}`}
            aria-modal="true"
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-base font-semibold text-slate-900"
                  id={`checklist-link-${flow}`}
                >
                  Share {label} checklist
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Anyone using this link must sign in and be attached to this booking.
                </p>
              </div>
              <button
                aria-label="Close"
                className="text-lg text-slate-500 hover:text-slate-900"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form action={action} className="mt-5 grid gap-4">
              <input name="bookingId" type="hidden" value={bookingId} />
              <input name="flow" type="hidden" value={flow} />
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Add a person by email (optional)
                <input
                  className="min-h-10 rounded-lg border border-slate-200 px-3"
                  name="pendingEmail"
                  placeholder="name@example.com"
                  type="email"
                />
                <span className="text-xs font-normal text-slate-500">
                  Their account will gain access to this booking when they sign up or next sign in
                  with this email.
                </span>
              </label>
              <button className="primary-button w-fit" disabled={pending} type="submit">
                {pending ? "Creating…" : "Create link"}
              </button>
            </form>
            {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
            {link && (
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">Copy this link now</p>
                <input
                  aria-label={`${label} checklist link`}
                  className="mt-2 w-full rounded border border-emerald-200 bg-white px-2 py-1 text-slate-700"
                  readOnly
                  value={link}
                />
                <p className="mt-1 text-xs">
                  Creating another link replaces this one. The link also stops working when the
                  checklist is completed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
