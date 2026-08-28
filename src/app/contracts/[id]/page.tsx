import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { signatureDeviceLabel } from "@/lib/contracts";
import { prisma } from "@/lib/prisma";

export default async function ContractViewerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const contract = await prisma.generatedContract.findUnique({
    where: { id },
    include: { booking: { include: { customer: true } }, signature: true },
  });
  if (!contract) notFound();

  const isSigned = contract.status === "SIGNED";
  return (
    <AppShell activeItem="Contracts">
      <Link className="back-link" href={`/bookings/${contract.bookingId}`}>
        ← Back to booking
      </Link>
      <header className="page-header mt-4">
        <div>
          <p className="page-kicker">{contract.booking.bookingNumber}</p>
          <h1 className="page-title">Contract version {contract.version}</h1>
          <p className="page-subtitle">
            {contract.booking.customer.firstName} {contract.booking.customer.lastName} · Generated{" "}
            {contract.generatedAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              isSigned ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {isSigned ? "Signed" : "Pending signature"}
          </span>
          <a className="secondary-button" href={`/api/contracts/${contract.id}`}>
            Download PDF
          </a>
        </div>
      </header>
      {isSigned && contract.signature && (
        <p className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Signed by {contract.signature.signerName} on{" "}
          {contract.signature.signedAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          using {signatureDeviceLabel(contract.signature.userAgent)}. This is the signed contract.
        </p>
      )}
      <section className="section-card mt-6 overflow-hidden p-0">
        <iframe
          className="h-[75vh] w-full bg-slate-100"
          src={`/api/contracts/${contract.id}?disposition=inline`}
          title={`Contract version ${contract.version}`}
        />
      </section>
    </AppShell>
  );
}
