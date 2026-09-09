"use client";

import { useActionState, useState } from "react";
import {
  addBookingOwnerAction,
  promoteBookingOwner,
  removeBookingMember,
  type BookingOwnerActionState,
} from "@/app/bookings/actions";

type Person = { id: string; email: string };

const initialState: BookingOwnerActionState = {};

function PersonIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"
    >
      <svg
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
      </svg>
    </span>
  );
}

function OwnerRow({
  bookingId,
  canManage,
  person,
  primary = false,
}: Readonly<{ bookingId: string; canManage: boolean; person: Person; primary?: boolean }>) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
      <PersonIcon />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{person.email}</span>
      {canManage && (
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-label={`Owner options for ${person.email}`}
            className="rounded-md px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              {primary ? (
                <>
                  <span className="block px-3 py-2 text-sm text-slate-400">Primary owner</span>
                  <span className="block px-3 py-2 text-sm text-slate-400">
                    Promote someone else before deleting
                  </span>
                </>
              ) : (
                <form action={promoteBookingOwner}>
                  <input name="bookingId" type="hidden" value={bookingId} />
                  <input name="userId" type="hidden" value={person.id} />
                  <button
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                    type="submit"
                  >
                    Make primary
                  </button>
                </form>
              )}
              {!primary && (
                <form action={removeBookingMember}>
                  <input name="bookingId" type="hidden" value={bookingId} />
                  <input name="userId" type="hidden" value={person.id} />
                  <button
                    className="w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    type="submit"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function AddOwnerDialog({ bookingId, people }: Readonly<{ bookingId: string; people: Person[] }>) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"member" | "email">("member");
  const [state, action, pending] = useActionState(addBookingOwnerAction, initialState);
  return (
    <>
      <button
        aria-label="Add owner"
        className="primary-button mt-4 min-h-10 min-w-10 px-3"
        onClick={() => setOpen(true)}
        title="Add owner"
        type="button"
      >
        +
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="presentation"
        >
          <div
            aria-labelledby="add-booking-owner"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900" id="add-booking-owner">
                  Add owner
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Give an existing team member access or prepare access for someone new.
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
              <div className="flex gap-4 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    checked={mode === "member"}
                    name="ownerMode"
                    onChange={() => setMode("member")}
                    type="radio"
                    value="member"
                  />{" "}
                  Existing team member
                </label>
                <label className="flex items-center gap-2">
                  <input
                    checked={mode === "email"}
                    name="ownerMode"
                    onChange={() => setMode("email")}
                    type="radio"
                    value="email"
                  />{" "}
                  New person by email
                </label>
              </div>
              {mode === "member" ? (
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Team member
                  <select
                    className="min-h-10 rounded-lg border border-slate-200 px-3"
                    name="userId"
                  >
                    <option value="">Choose a person</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Email address
                  <input
                    className="min-h-10 rounded-lg border border-slate-200 px-3"
                    name="pendingEmail"
                    placeholder="name@example.com"
                    type="email"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    They gain access after creating an account or next signing in with this email.
                  </span>
                </label>
              )}
              <button className="primary-button w-fit" disabled={pending} type="submit">
                {pending ? "Adding…" : "Add owner"}
              </button>
            </form>
            {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
            {state.message && <p className="mt-3 text-sm text-emerald-700">{state.message}</p>}
          </div>
        </div>
      )}
    </>
  );
}

export function BookingAccess({
  bookingId,
  canManage,
  members,
  primaryOwner,
  teamMembers,
}: Readonly<{
  bookingId: string;
  canManage: boolean;
  members: Person[];
  primaryOwner: Person | null;
  teamMembers: Person[];
}>) {
  const availablePeople = teamMembers.filter(
    (person) =>
      person.id !== primaryOwner?.id && !members.some((member) => member.id === person.id),
  );
  return (
    <section className="section-card mt-6">
      <h2 className="text-base font-semibold text-slate-800">Booking access</h2>
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-700">Primary owner</h3>
        <ul className="mt-2">
          {primaryOwner ? (
            <OwnerRow bookingId={bookingId} canManage={canManage} person={primaryOwner} primary />
          ) : (
            <li className="text-sm text-slate-500">No primary owner assigned.</li>
          )}
        </ul>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-700">Additional owners</h3>
        {members.length ? (
          <ul className="mt-2 grid gap-2">
            {members.map((person) => (
              <OwnerRow
                bookingId={bookingId}
                canManage={canManage}
                key={person.id}
                person={person}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No additional owners.</p>
        )}
        {canManage && <AddOwnerDialog bookingId={bookingId} people={availablePeople} />}
      </div>
    </section>
  );
}
