import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookingLinesEditor } from "@/components/booking-lines-editor";
import { bookingVisibilityWhere, requireWorkspaceUser } from "@/lib/auth";
import { centsToDollars } from "@/lib/money";
import { recommendedSecurityDepositCents, replacementValueCents } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { generateContract } from "@/app/contracts/actions";
import {
  authorizeBookingDeposit,
  captureBookingDeposit,
  createCustomerSigningLink,
  createPaymentLink,
  refundBookingDeposit,
  releaseBookingDeposit,
  revokeSigningLinks,
} from "../financial-actions";
import {
  addBookingMember,
  assignBookingOwner,
  removeBookingMember,
  revertBookingToContractValues,
  updateBookingPricing,
  updateBookingStatus,
} from "../actions";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ signingLink?: string; error?: string }>;
}) {
  const { id } = await params;
  const user = await requireWorkspaceUser();
  const [booking, products, bundles, statuses, query] = await Promise.all([
    prisma.booking.findFirst({
      where: { id, ...bookingVisibilityWhere(user) },
      include: {
        customer: true,
        bookingType: true,
        bookingStatus: true,
        lines: { include: { bundleComponentSnapshots: true }, orderBy: { displayOrder: "asc" } },
        activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
        ownerUser: { select: { id: true, email: true } },
        members: { include: { user: { select: { id: true, email: true } } } },
        generatedContracts: { orderBy: { version: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        savedPaymentMethods: { orderBy: { createdAt: "desc" } },
        depositAuthorizations: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.product.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.bundle.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.bookingStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    searchParams,
  ]);
  if (!booking) notFound();
  const teamMembers =
    user.membership.role === "ADMIN"
      ? await prisma.teamMembership.findMany({
          where: { teamId: user.membership.teamId },
          include: { user: { select: { id: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : [];
  const replacementValue = replacementValueCents(booking.lines);
  const recommendedDeposit = recommendedSecurityDepositCents(booking.lines);
  const isAutomaticDeposit = booking.securityDepositOverrideCents === null;
  const latestContract = booking.generatedContracts[0];
  const latestPayment = booking.payments[0];
  const savedCard = booking.savedPaymentMethods[0];
  const latestDeposit = booking.depositAuthorizations[0];
  return (
    <AppShell activeItem="Bookings">
      <header className="page-header">
        <div>
          <p className="page-kicker">
            {booking.bookingNumber} · {booking.startDate.toISOString().slice(0, 10)} to{" "}
            {booking.endDate.toISOString().slice(0, 10)}
          </p>
          <h1 className="page-title">
            {booking.title || `${booking.customer.firstName} ${booking.customer.lastName}`}
          </h1>
          <p className="page-subtitle">
            {booking.customer.email} · {booking.bookingType.name}
          </p>
        </div>
        <form action={updateBookingStatus} className="flex flex-wrap gap-2">
          <input name="bookingId" type="hidden" value={id} />
          <select
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            defaultValue={booking.bookingStatusId}
            name="bookingStatusId"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
          <button className="secondary-button">Update status</button>
        </form>
      </header>
      {query.error === "contract-items" && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This contract cannot be restored automatically because its item list is different from the
          current booking. You can still use it as a reference or generate a new contract.
        </p>
      )}
      <section className="section-card mt-7 text-sm">
        <h2 className="text-base font-semibold text-slate-800">Event and billing details</h2>
        <p className="mt-2 text-slate-600">
          Event:{" "}
          {[
            booking.eventAddressLine1,
            booking.eventAddressLine2,
            booking.eventCity,
            booking.eventRegion,
            booking.eventPostalCode,
            booking.eventCountry,
          ]
            .filter(Boolean)
            .join(", ") || "No event location saved."}
        </p>
        <p className="mt-2 text-slate-600">
          Billing snapshot:{" "}
          {[
            booking.billingAddressLine1Snapshot,
            booking.billingAddressLine2Snapshot,
            booking.billingCitySnapshot,
            booking.billingRegionSnapshot,
            booking.billingPostalCodeSnapshot,
            booking.billingCountrySnapshot,
          ]
            .filter(Boolean)
            .join(", ") || "No billing address saved."}
        </p>
        {booking.notes && <p className="mt-2 text-slate-600">Notes: {booking.notes}</p>}
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Booking access</h2>
        <p className="mt-1 text-sm text-slate-600">
          Owner: {booking.ownerUser?.email ?? "Unassigned"}
        </p>
        {booking.members.length > 0 && (
          <p className="mt-1 text-sm text-slate-600">
            Members: {booking.members.map((member) => member.user.email).join(", ")}
          </p>
        )}
        {user.membership.role === "ADMIN" && (
          <div className="mt-4 grid gap-3 sm:max-w-xl">
            <form action={assignBookingOwner} className="flex flex-wrap items-end gap-2">
              <input name="bookingId" type="hidden" value={id} />
              <label className="grid gap-1 text-sm text-slate-700">
                Owner
                <select
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
                  defaultValue={booking.ownerUserId ?? ""}
                  name="ownerUserId"
                >
                  {teamMembers.map((membership) => (
                    <option key={membership.userId} value={membership.userId}>
                      {membership.user.email}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="submit">
                Save owner
              </button>
            </form>
            <form action={addBookingMember} className="flex flex-wrap items-end gap-2">
              <input name="bookingId" type="hidden" value={id} />
              <label className="grid gap-1 text-sm text-slate-700">
                Add member
                <select
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
                  name="userId"
                >
                  {teamMembers.map((membership) => (
                    <option key={membership.userId} value={membership.userId}>
                      {membership.user.email}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="submit">
                Add
              </button>
            </form>
            {booking.members.map((member) => (
              <form
                action={removeBookingMember}
                className="flex items-center gap-2 text-sm"
                key={member.id}
              >
                <input name="bookingId" type="hidden" value={id} />
                <input name="userId" type="hidden" value={member.userId} />
                <span>{member.user.email}</span>
                <button className="text-action text-red-700" type="submit">
                  Remove
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Booking lines</h2>
        <BookingLinesEditor
          bookingId={id}
          bundles={bundles}
          lines={booking.lines}
          products={products}
        />
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Totals</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt>Subtotal</dt>
          <dd>${(booking.subtotalCents / 100).toFixed(2)}</dd>
          <dt>Discount</dt>
          <dd>−${(booking.discountCents / 100).toFixed(2)}</dd>
          <dt>Tax</dt>
          <dd>${(booking.taxCents / 100).toFixed(2)}</dd>
          <dt>Security deposit</dt>
          <dd>${(booking.securityDepositCents / 100).toFixed(2)}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="font-semibold">${(booking.totalCents / 100).toFixed(2)}</dd>
        </dl>
        <p className="mt-4 text-sm text-slate-600">
          {isAutomaticDeposit
            ? `Automatic: 60% of $${centsToDollars(replacementValue)} replacement value.`
            : `Custom deposit override. Automatic recommendation: $${centsToDollars(recommendedDeposit)}.`}
        </p>
        <form action={updateBookingPricing} className="mt-5 grid gap-2 sm:grid-cols-5">
          <input name="bookingId" type="hidden" value={id} />
          <select
            className="rounded border p-2 text-sm"
            defaultValue={booking.discountType ?? ""}
            name="discountType"
          >
            <option value="">No discount</option>
            <option value="FIXED">Fixed cents</option>
            <option value="PERCENT">Percent (basis points)</option>
          </select>
          <input
            className="rounded border p-2 text-sm"
            defaultValue={booking.discountValue}
            min="0"
            name="discountValue"
            type="number"
          />
          <input
            className="rounded border p-2 text-sm"
            defaultValue={booking.taxRateBasisPoints}
            min="0"
            max="10000"
            name="taxRateBasisPoints"
            type="number"
          />
          <select
            className="rounded border p-2 text-sm"
            defaultValue={isAutomaticDeposit ? "AUTO" : "OVERRIDE"}
            name="securityDepositMode"
          >
            <option value="AUTO">Automatic deposit</option>
            <option value="OVERRIDE">Custom deposit</option>
          </select>
          <input
            className="rounded border p-2 text-sm"
            defaultValue={centsToDollars(
              booking.securityDepositOverrideCents ?? recommendedDeposit,
            )}
            min="0"
            name="securityDepositOverrideDollars"
            step="0.01"
            type="number"
          />
          <button className="secondary-button w-fit">Update pricing</button>
        </form>
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Contracts</h2>
        <form action={generateContract} className="mt-3">
          <input name="bookingId" type="hidden" value={id} />
          <button className="primary-button">Generate new PDF version</button>
        </form>
        <ul className="mt-4 space-y-3 text-sm">
          {booking.generatedContracts.length === 0 ? (
            <li className="text-slate-600">No contracts generated yet.</li>
          ) : (
            booking.generatedContracts.map((contract) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                key={contract.id}
              >
                <div>
                  <p className="font-medium text-slate-800">Contract version {contract.version}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Generated {contract.generatedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {contract.requiresResignature && (
                    <span
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                      title="Booking values have changed since this contract was generated"
                    >
                      ⚠ Out of date
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      contract.status === "SIGNED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {contract.status === "SIGNED" ? "Signed" : "Pending signature"}
                  </span>
                  <Link className="secondary-button" href={`/contracts/${contract.id}`}>
                    View contract
                  </Link>
                  <form action={revertBookingToContractValues}>
                    <input name="bookingId" type="hidden" value={id} />
                    <input name="contractId" type="hidden" value={contract.id} />
                    <button
                      aria-label="Restore values"
                      className="secondary-button h-10 w-10 px-0 text-lg"
                      title="Restore values"
                      type="submit"
                    >
                      ↺
                    </button>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>
        {latestContract && latestContract.status !== "SIGNED" && (
          <form action={createCustomerSigningLink} className="mt-4 inline-block">
            <input name="bookingId" type="hidden" value={id} />
            <button className="secondary-button">Create signing link</button>
          </form>
        )}
        {query.signingLink && (
          <p className="mt-4 break-all rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Customer signing link:{" "}
            {`${process.env.APP_URL || "http://localhost:3000"}/sign/${query.signingLink}`}
          </p>
        )}
        {latestContract && (
          <p className="mt-3 text-sm text-slate-600">
            Latest contract: {latestContract.status.replaceAll("_", " ").toLowerCase()}
            {latestContract.requiresResignature ? " · Changes require a new signature." : ""}
          </p>
        )}
        <form action={revokeSigningLinks} className="mt-3 inline-block">
          <input name="bookingId" type="hidden" value={id} />
          <button className="text-action text-red-700">Revoke signing links</button>
        </form>
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Rental payment</h2>
        <p className="mt-2 text-sm text-slate-600">
          {latestPayment
            ? `${latestPayment.status.replaceAll("_", " ").toLowerCase()} · $${(latestPayment.amountRequestedCents / 100).toFixed(2)} requested`
            : "No rental payment link created."}
        </p>
        <form action={createPaymentLink} className="mt-4 inline-block">
          <input name="bookingId" type="hidden" value={id} />
          <button className="secondary-button">Create payment link</button>
        </form>
        {latestPayment?.paymentUrl && (
          <a
            className="ml-3 text-action"
            href={latestPayment.paymentUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open payment link
          </a>
        )}
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Security deposit</h2>
        <p className="mt-2 text-sm text-slate-600">
          {savedCard
            ? `Card saved: ${savedCard.cardBrand ?? "card"} •••• ${savedCard.cardLast4 ?? ""}`
            : "No customer card saved yet."}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {latestDeposit
            ? `Deposit state: ${latestDeposit.status.replaceAll("_", " ").toLowerCase()}`
            : "No deposit authorization exists."}
        </p>
        {latestDeposit?.authorizationExpiresAt && (
          <p className="mt-1 text-sm text-amber-700">
            Authorization expires {latestDeposit.authorizationExpiresAt.toISOString().slice(0, 10)}.
          </p>
        )}
        {!latestDeposit && savedCard && (
          <form action={authorizeBookingDeposit} className="mt-4">
            <input name="bookingId" type="hidden" value={id} />
            <button className="secondary-button">Authorize deposit</button>
          </form>
        )}
        {latestDeposit?.status === "AUTHORIZED" && (
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={releaseBookingDeposit}>
              <input name="bookingId" type="hidden" value={id} />
              <input name="depositId" type="hidden" value={latestDeposit.id} />
              <button className="secondary-button">Release deposit hold</button>
            </form>
            <form action={captureBookingDeposit} className="flex flex-wrap gap-2">
              <input name="bookingId" type="hidden" value={id} />
              <input name="depositId" type="hidden" value={latestDeposit.id} />
              <input
                className="w-28 rounded border p-2 text-sm"
                defaultValue={latestDeposit.amountAuthorizedCents}
                min="1"
                name="amountCents"
                type="number"
              />
              <input
                className="rounded border p-2 text-sm"
                name="reason"
                placeholder="Reason for capture"
                required
              />
              <button className="primary-button">Capture deposit</button>
            </form>
          </div>
        )}
        {(latestDeposit?.status === "CAPTURED" ||
          latestDeposit?.status === "PARTIALLY_CAPTURED") && (
          <form action={refundBookingDeposit} className="mt-4 flex flex-wrap gap-2">
            <input name="bookingId" type="hidden" value={id} />
            <input name="depositId" type="hidden" value={latestDeposit.id} />
            <input
              className="w-28 rounded border p-2 text-sm"
              defaultValue={latestDeposit.amountCapturedCents}
              min="1"
              name="amountCents"
              type="number"
            />
            <input
              className="rounded border p-2 text-sm"
              name="reason"
              placeholder="Reason for refund"
              required
            />
            <button className="secondary-button">Refund deposit</button>
          </form>
        )}
      </section>
      <section className="section-card mt-6">
        <h2 className="text-base font-semibold text-slate-800">Activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {booking.activities.map((activity) => (
            <li key={activity.id}>
              {activity.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {activity.summary}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
