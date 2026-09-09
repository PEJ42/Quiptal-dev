"use client";

import { useState } from "react";
import { updateBookingDetails } from "@/app/bookings/actions";

type BookingDetailsProps = {
  bookingId: string;
  billingSnapshot: string;
  eventAddressLine1: string | null;
  eventAddressLine2: string | null;
  eventCity: string | null;
  eventCountry: string | null;
  eventPostalCode: string | null;
  eventRegion: string | null;
  notes: string | null;
};

function savedEventLocation({
  eventAddressLine1,
  eventAddressLine2,
  eventCity,
  eventCountry,
  eventPostalCode,
  eventRegion,
}: BookingDetailsProps) {
  return [
    eventAddressLine1,
    eventAddressLine2,
    eventCity,
    eventRegion,
    eventPostalCode,
    eventCountry,
  ]
    .filter(Boolean)
    .join(", ");
}

export function BookingDetails(props: Readonly<BookingDetailsProps>) {
  const [editing, setEditing] = useState(false);
  const eventLocation = savedEventLocation(props);
  return (
    <section className="section-card mt-7">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-800">Details</h2>
        {!editing && (
          <button
            aria-label="Edit details"
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setEditing(true)}
            title="Edit details"
            type="button"
          >
            ✎
          </button>
        )}
      </div>
      {!editing ? (
        <dl className="mt-4 grid gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-700">Event location</dt>
            <dd className="mt-1 text-slate-600">{eventLocation || "No event location saved"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Billing snapshot</dt>
            <dd className="mt-1 text-slate-600">
              {props.billingSnapshot || "No billing address saved"}
            </dd>
          </div>
          {props.notes && (
            <div>
              <dt className="font-medium text-slate-700">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-600">{props.notes}</dd>
            </div>
          )}
        </dl>
      ) : (
        <form action={updateBookingDetails} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="bookingId" type="hidden" value={props.bookingId} />
          <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
            Event location
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              defaultValue={props.eventAddressLine1 ?? ""}
              name="eventAddressLine1"
              placeholder="No event location saved"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
            Address line 2
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              defaultValue={props.eventAddressLine2 ?? ""}
              name="eventAddressLine2"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            City
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              defaultValue={props.eventCity ?? ""}
              name="eventCity"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            State or region
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              defaultValue={props.eventRegion ?? ""}
              name="eventRegion"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Postal code
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              defaultValue={props.eventPostalCode ?? ""}
              name="eventPostalCode"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Country
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              defaultValue={props.eventCountry ?? ""}
              name="eventCountry"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
            Billing snapshot
            <input
              className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-500"
              defaultValue={props.billingSnapshot || "No billing address saved"}
              disabled
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700 sm:col-span-2">
            Notes
            <textarea
              className="min-h-24 rounded-lg border border-slate-200 bg-white p-3"
              defaultValue={props.notes ?? ""}
              name="notes"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="primary-button" type="submit">
              Save details
            </button>
            <button className="secondary-button" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
