import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ContractTermsEditor } from "@/components/contract-terms-editor";
import { bookingVisibilityWhere, requireWorkspaceUser } from "@/lib/auth";
import { contractTermsToEditorHtml } from "@/lib/contract-terms";
import { prisma } from "@/lib/prisma";
import { saveContractTemplate } from "./actions";

function statusLabel(status: string) {
  return status === "SIGNED" ? "Signed" : "Pending signature";
}

export default async function ContractsPage() {
  const user = await requireWorkspaceUser();
  const [template, contracts] = await Promise.all([
    user.membership.role === "ADMIN"
      ? prisma.contractTemplate.findFirst({
          where: { isActive: true },
          orderBy: { version: "desc" },
        })
      : null,
    prisma.generatedContract.findMany({
      where: { booking: bookingVisibilityWhere(user) },
      include: { booking: { include: { customer: true } } },
      orderBy: { generatedAt: "desc" },
    }),
  ]);
  return (
    <AppShell activeItem="Contracts">
      <header className="page-header">
        <div>
          <p className="page-kicker">Documents</p>
          <h1 className="page-title">Contracts</h1>
          <p className="page-subtitle">
            Maintain the contract template and access every generated booking agreement.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
          {contracts.length} {contracts.length === 1 ? "contract" : "contracts"}
        </span>
      </header>
      {template && user.membership.role === "ADMIN" && (
        <section className="section-card mt-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Contract template</h2>
              <p className="mt-1 text-sm text-slate-600">
                Changes create the next version for future contracts only.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Version {template.version}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Existing generated contracts preserve a snapshot of the version used to create them.
          </p>
          <form action={saveContractTemplate} className="mt-5 grid max-w-3xl gap-5">
            <input name="id" type="hidden" value={template.id} />
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Title
              <input
                className="w-full border px-3 py-2"
                defaultValue={template.title}
                name="title"
                required
              />
            </label>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-slate-700">Legal terms</p>
              <ContractTermsEditor initialHtml={contractTermsToEditorHtml(template.legalTerms)} />
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Footer text
              <input
                className="w-full border px-3 py-2"
                defaultValue={template.footerText ?? ""}
                name="footerText"
              />
            </label>
            <button className="primary-button w-fit">Save new template version</button>
          </form>
        </section>
      )}
      <section className="section-card mt-7 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Generated contracts</h2>
            <p className="mt-1 text-sm text-slate-500">Newest documents appear first.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {contracts.length}
          </span>
        </div>
        <div>
          {contracts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-semibold text-slate-800">No contracts generated yet.</p>
              <p className="mt-2 text-sm text-slate-500">
                Generate a contract from a booking when it is ready to send.
              </p>
            </div>
          ) : (
            contracts.map((contract) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:px-6"
                key={contract.id}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {contract.booking.customer.firstName} {contract.booking.customer.lastName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {contract.booking.bookingNumber} · Version {contract.version} · Generated{" "}
                    {contract.generatedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      contract.status === "SIGNED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {statusLabel(contract.status)}
                  </span>
                  <Link className="secondary-button shrink-0" href={`/contracts/${contract.id}`}>
                    View contract
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
