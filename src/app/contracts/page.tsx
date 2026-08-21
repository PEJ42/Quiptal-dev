import { AppShell } from "@/components/app-shell";
import { ContractTermsEditor } from "@/components/contract-terms-editor";
import { requireAdmin } from "@/lib/auth";
import { contractTermsToEditorHtml } from "@/lib/contract-terms";
import { prisma } from "@/lib/prisma";
import { saveContractTemplate } from "./actions";

export default async function ContractsPage() {
  await requireAdmin();
  const [template, contracts] = await Promise.all([
    prisma.contractTemplate.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } }),
    prisma.generatedContract.findMany({
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
      {template && (
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
          <form action={saveContractTemplate} className="form-card mt-5 grid max-w-3xl gap-4">
            <input name="id" type="hidden" value={template.id} />
            <label className="text-sm">
              Title
              <input
                className="mt-1 w-full border p-2"
                defaultValue={template.title}
                name="title"
                required
              />
            </label>
            <div>
              <p className="text-sm font-medium text-slate-700">Legal terms</p>
              <div className="mt-1">
                <ContractTermsEditor initialHtml={contractTermsToEditorHtml(template.legalTerms)} />
              </div>
            </div>
            <label className="text-sm">
              Footer text
              <input
                className="mt-1 w-full border p-2"
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
                <a className="secondary-button shrink-0" href={`/api/contracts/${contract.id}`}>
                  Download PDF
                </a>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
