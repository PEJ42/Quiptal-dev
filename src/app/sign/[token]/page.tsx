import { notFound } from "next/navigation";
import { contractTermsToBlocks, sanitizeContractTerms } from "@/lib/contract-terms";
import { parseContractSnapshot } from "@/lib/contract-snapshot";
import { CARD_CONSENT } from "@/lib/payment-service";
import { ELECTRONIC_SIGNATURE_CONSENT, signingLinkForToken } from "@/lib/signing";
import { agreeAndSign } from "./actions";

export default async function SigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; signed?: string; payment?: string }>;
}) {
  const { token } = await params;
  const [link, query] = await Promise.all([signingLinkForToken(token), searchParams]);
  if (!link) notFound();
  const snapshot = parseContractSnapshot(link.contract.pricingSnapshotJson);
  if (query.payment === "complete") {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-12">
        <section className="section-card text-center">
          <p className="page-kicker">Thank you</p>
          <h1 className="page-title mt-2">Payment submitted</h1>
          <p className="page-subtitle mt-3">
            Your payment is being confirmed. You may safely close this page.
          </p>
        </section>
      </main>
    );
  }
  if (link.contract.status === "SIGNED" || query.signed) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-12">
        <section className="section-card text-center">
          <p className="page-kicker">Agreement complete</p>
          <h1 className="page-title mt-2">Your contract has been signed</h1>
          <p className="page-subtitle mt-3">
            The rental business will contact you with next steps.
          </p>
        </section>
      </main>
    );
  }
  if (link.contract.requiresResignature) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-12">
        <section className="section-card text-center">
          <p className="page-kicker">Agreement updated</p>
          <h1 className="page-title mt-2">This contract is out of date</h1>
          <p className="page-subtitle mt-3">
            The booking details changed. The rental business will send an updated agreement.
          </p>
        </section>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-12">
      <header className="mb-6">
        <p className="page-kicker">Rental agreement</p>
        <h1 className="page-title mt-2">{snapshot.title}</h1>
        <p className="page-subtitle mt-2">
          {snapshot.company.name} · Booking {snapshot.booking.number}
        </p>
      </header>
      {query.error && (
        <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          Please confirm both acknowledgements and enter your legal name to sign.
        </p>
      )}
      <section className="section-card">
        <h2 className="text-lg font-semibold text-slate-900">Booking summary</h2>
        <p className="mt-2 text-sm text-slate-600">
          {snapshot.booking.startDate} to {snapshot.booking.endDate} ·{" "}
          {snapshot.booking.customerName}
        </p>
        <div className="mt-4 divide-y divide-slate-100 text-sm">
          {snapshot.lines.map((line) => (
            <div className="flex justify-between gap-4 py-3" key={`${line.type}-${line.name}`}>
              <span>
                {line.name} × {line.quantity}
              </span>
              <span className="font-medium">${(line.subtotalCents / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt>Rental total</dt>
          <dd>${(snapshot.totals.rentalTotalCents / 100).toFixed(2)}</dd>
          <dt>Refundable security deposit</dt>
          <dd>${(snapshot.totals.securityDepositCents / 100).toFixed(2)}</dd>
          <dt>Total replacement value</dt>
          <dd>${(snapshot.totals.replacementValueCents / 100).toFixed(2)}</dd>
        </dl>
      </section>
      <section className="section-card mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Rental agreement terms</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700 [&_strong]:font-semibold">
          {contractTermsToBlocks(snapshot.legalTerms).map((block, index) =>
            block.kind === "bullet" ? (
              <div className="flex gap-2" key={index}>
                <span aria-hidden="true">•</span>
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizeContractTerms(block.html) }}
                  className="min-w-0"
                />
              </div>
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: sanitizeContractTerms(block.html) }}
                key={index}
              />
            ),
          )}
        </div>
      </section>
      <form action={agreeAndSign} className="section-card mt-6 grid gap-4">
        <input name="token" type="hidden" value={token} />
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input className="mt-1" name="electronicConsent" required type="checkbox" />
          <span>{ELECTRONIC_SIGNATURE_CONSENT}</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input className="mt-1" name="cardConsent" required type="checkbox" />
          <span>{CARD_CONSENT}</span>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Full legal name
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            name="signerName"
            required
          />
        </label>
        <button className="primary-button w-fit" type="submit">
          Agree &amp; Sign, then pay
        </button>
      </form>
    </main>
  );
}
